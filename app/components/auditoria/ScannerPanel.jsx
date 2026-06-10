'use client';
import { useState, useEffect, useRef } from 'react';

/**
 * Audio cue helper using Web Audio API to play synthetic sound feedback.
 */
const playAudioCue = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      // Beep agudo ascendente: Correcto
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'warning') {
      // Buzzer áspero descendente: Desubicado o No registrado
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(380, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(260, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'duplicate') {
      // Sonido corto grave: Ya escaneado
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch (err) {
    console.warn('Web Audio API not supported or blocked:', err);
  }
};

/**
 * ScannerPanel — Paso 2 de la Auditoría.
 * Permite capturar códigos de barras en ráfaga (por cámara o lector físico)
 * y muestra retroalimentación interactiva.
 */
export default function ScannerPanel({ 
  ubicacion, 
  bienes = [], 
  scannedCodes = [], 
  onScanCode, 
  onRemoveCode, 
  onFinish, 
  onCancel 
}) {
  const [codeInputValue, setCodeInputValue] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [flashMessage, setFlashMessage] = useState(null);
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);

  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const lastScannedTimeRef = useRef({}); // Cooldown por código
  const SCANNER_DIV_ID = "continuous-camera-scanner-preview";

  // Carga dinámica de html5-qrcode
  useEffect(() => {
    if (window.Html5Qrcode) {
      setLibraryLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.async = true;
    script.onload = () => setLibraryLoaded(true);
    script.onerror = () => setCameraError("No se pudo cargar la librería de escaneo.");
    document.body.appendChild(script);
  }, []);

  // Autofoco agresivo para lector físico (HID)
  useEffect(() => {
    if (autoFocusEnabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocusEnabled, scannedCodes]);

  const handleBlur = () => {
    if (autoFocusEnabled) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 150);
    }
  };

  // Encender/apagar cámara
  useEffect(() => {
    if (!cameraActive || !libraryLoaded) {
      if (scannerRef.current && isScanning) {
        stopCamera();
      }
      return;
    }

    const container = document.getElementById(SCANNER_DIV_ID);
    if (!container) return;

    setCameraError(null);
    setIsScanning(true);

    let html5QrCode;
    try {
      html5QrCode = new window.Html5Qrcode(SCANNER_DIV_ID);
      scannerRef.current = html5QrCode;
    } catch (e) {
      console.error(e);
      setCameraError("Error al iniciar el módulo de cámara.");
      setIsScanning(false);
      return;
    }

    // Configurar formatos y detector experimental para maximizar velocidad en móviles
    const formatsToSupport = window.Html5QrcodeSupportedFormats ? [
      window.Html5QrcodeSupportedFormats.CODE_128,
      window.Html5QrcodeSupportedFormats.CODE_39,
      window.Html5QrcodeSupportedFormats.EAN_13,
      window.Html5QrcodeSupportedFormats.EAN_8,
      window.Html5QrcodeSupportedFormats.UPC_A,
      window.Html5QrcodeSupportedFormats.QR_CODE
    ] : [];

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 20,
        qrbox: (width, height) => {
          const w = Math.min(width * 0.85, 320);
          const h = Math.min(height * 0.3, 100);
          return { width: w, height: h };
        },
        formatsToSupport: formatsToSupport,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      },
      (decodedText) => {
        const cleanCode = decodedText.trim();
        if (!cleanCode) return;

        // Cooldown de 1.8 segundos por código para evitar falsos positivos repetidos
        const now = Date.now();
        const lastTime = lastScannedTimeRef.current[cleanCode] || 0;
        if (now - lastTime < 1800) {
          return;
        }
        lastScannedTimeRef.current[cleanCode] = now;

        processCode(cleanCode);
      },
      () => {
        // Silenciar fallos de lectura de frames
      }
    ).catch(err => {
      console.error(err);
      setCameraError("Permiso denegado o cámara no disponible.");
      setIsScanning(false);
      setCameraActive(false);
    });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error(err));
      }
    };
  }, [cameraActive, libraryLoaded]);

  const stopCamera = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        setIsScanning(false);
        scannerRef.current = null;
      }).catch(err => {
        console.error(err);
        setIsScanning(false);
        scannerRef.current = null;
      });
    } else {
      setIsScanning(false);
    }
  };

  // Procesar código leído (sea de cámara, manual o lector físico)
  const processCode = (rawCode) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    // Verificar si ya se escaneó en esta sesión
    const isDuplicate = scannedCodes.some(c => c.toUpperCase() === cleanCode.toUpperCase());
    
    // Buscar coincidencia en bienes
    const match = bienes.find(b => 
      (b.etiqueta && b.etiqueta.toUpperCase() === cleanCode.toUpperCase()) || 
      (b.serial && b.serial.toUpperCase() === cleanCode.toUpperCase())
    );

    if (isDuplicate) {
      playAudioCue('duplicate');
      triggerFlashMessage(`Duplicado: "${cleanCode}" ya fue escaneado`, 'duplicate');
      return;
    }

    if (match) {
      const isCorrectLocation = match.ubicacionId === ubicacion.id;
      if (isCorrectLocation) {
        playAudioCue('success');
        triggerFlashMessage(`✅ Correcto: ${match.nombre} (${match.marca})`, 'success');
      } else {
        playAudioCue('warning');
        triggerFlashMessage(`⚠️ Otra área: ${match.nombre} (Registrado en: ${match.area || 'Bodega'})`, 'warning');
      }
      onScanCode(match.etiqueta); // Guardar por código de inventario
    } else {
      playAudioCue('warning');
      triggerFlashMessage(`❓ No registrado: "${cleanCode}" no existe en el sistema`, 'not_found');
      onScanCode(cleanCode); // Guardar el código crudo para listar como no registrado
    }

    if (navigator.vibrate) {
      navigator.vibrate(80);
    }
  };

  const triggerFlashMessage = (msg, type) => {
    setFlashMessage({ msg, type });
    // Limpiar flash en 3 segundos
    const timer = setTimeout(() => {
      setFlashMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  };

  const handleSubmitManual = (e) => {
    e.preventDefault();
    const val = codeInputValue.trim();
    if (!val) return;
    processCode(val);
    setCodeInputValue('');
  };

  // Mapear los códigos escaneados a sus datos reales para mostrarlos en el feed lateral
  const scannedBienesDetails = scannedCodes.map(code => {
    const match = bienes.find(b => 
      (b.etiqueta && b.etiqueta.toUpperCase() === code.toUpperCase()) || 
      (b.serial && b.serial.toUpperCase() === code.toUpperCase())
    );
    if (match) {
      return {
        code,
        id: match.id,
        nombre: match.nombre,
        marca: match.marca,
        modelo: match.modelo,
        serial: match.serial,
        esCorrecto: match.ubicacionId === ubicacion.id,
        areaRegistrada: match.area || 'Sin ubicación',
        status: 'registered'
      };
    }
    return {
      code,
      id: code,
      nombre: 'Equipo no registrado',
      marca: 'Desconocido',
      modelo: 'Desconocido',
      serial: 'N/A',
      esCorrecto: false,
      areaRegistrada: 'Ninguna',
      status: 'unregistered'
    };
  }).reverse(); // Mostrar el último arriba

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, padding: '10px 0' }}>
      
      {/* Columna Izquierda: Escaneo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Cabecera del Escáner */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auditoría Activa</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0', color: 'var(--text-primary)' }}>
                🏫 {ubicacion.nombre}
              </h2>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Edificio: <strong>{ubicacion.edificio || 'N/A'}</strong> | Custodio: <strong>{ubicacion.encargado || 'Sin asignar'}</strong>
              </p>
            </div>
            <button className="btn btn-ghost" onClick={onCancel} style={{ padding: '6px 12px', fontSize: 12 }}>
              ✕ Cancelar
            </button>
          </div>
        </div>

        {/* Cámara o Panel de Lector USB */}
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border)', 
          borderRadius: 'var(--radius-lg)', 
          padding: 20, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          {/* Flash alert animado */}
          {flashMessage && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '10px 16px',
              zIndex: 10,
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 12,
              animation: 'slide-down 0.2s ease-out',
              background: flashMessage.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 
                          flashMessage.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 
                          flashMessage.type === 'duplicate' ? 'rgba(107, 114, 128, 0.95)' : 'rgba(239, 68, 68, 0.95)',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {flashMessage.msg}
            </div>
          )}

          {/* Selector de Lector de Cámara */}
          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Lector de Códigos en Ráfaga
            </span>
            <button
              onClick={() => {
                setCameraActive(!cameraActive);
                setCameraError(null);
              }}
              className={`btn ${cameraActive ? 'btn-secondary' : 'btn-primary'}`}
              style={{
                fontSize: 12,
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {cameraActive ? '📴 Apagar Cámara' : '📷 Encender Cámara'}
            </button>
          </div>

          {/* Contenedor de Previsualización de Cámara */}
          {cameraActive ? (
            <div style={{ width: '100%', position: 'relative', minHeight: 200, marginBottom: 16 }}>
              {cameraError ? (
                <div style={{
                  minHeight: 200,
                  background: 'rgba(244, 63, 94, 0.08)',
                  border: '1px dashed rgba(244, 63, 94, 0.25)',
                  color: '#F87171',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  textAlign: 'center'
                }}>
                  ⚠️ {cameraError}
                </div>
              ) : (
                <div id={SCANNER_DIV_ID} style={{ overflow: 'hidden', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}></div>
              )}
              {!libraryLoaded && !cameraError && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'var(--bg-body)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: 'var(--text-secondary)'
                }}>
                  Cargando escáner...
                </div>
              )}
            </div>
          ) : (
            /* Láser Simulado de Modo HID */
            <div style={{
              width: '100%',
              height: 180,
              background: '#090D16',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #1E293B',
              boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              marginBottom: 16,
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                left: 0,
                width: '100%',
                height: 2,
                background: '#EF4444',
                boxShadow: '0 0 14px #EF4444, 0 0 4px #EF4444',
                animation: 'laser-scan 3s infinite ease-in-out',
                zIndex: 2
              }} />
              <span style={{ fontSize: 32, opacity: 0.15, marginBottom: 8 }}>🏷️</span>
              <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, letterSpacing: '0.1em', zIndex: 3 }}>
                MODO LECTOR FÍSICO ACTIVO
              </div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 4, zIndex: 3 }}>
                Dispara el lector de mano sobre la etiqueta del equipo
              </div>
            </div>
          )}

          {/* Formulario Manual y de Lector Físico */}
          <form onSubmit={handleSubmitManual} style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                ref={inputRef}
                type="text"
                className="form-input"
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  background: 'var(--bg-body)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  height: 40,
                  padding: '0 12px'
                }}
                placeholder="Escribe código o escanea con lector..."
                value={codeInputValue}
                onChange={e => setCodeInputValue(e.target.value)}
                onBlur={handleBlur}
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', height: 40 }}>
                Añadir
              </button>
            </div>

            {/* Opciones de Autofoco */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={autoFocusEnabled}
                  onChange={e => setAutoFocusEnabled(e.target.checked)}
                  style={{ width: 14, height: 14 }}
                />
                Mantener enfoque automático (Recomendado para lector físico)
              </label>
              <span>{scannedCodes.length} escaneados</span>
            </div>
          </form>
        </div>

        {/* Acciones principales */}
        <button
          className="btn btn-primary"
          onClick={onFinish}
          disabled={scannedCodes.length === 0}
          style={{
            height: 46,
            borderRadius: 'var(--radius-lg)',
            fontWeight: 800,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
          }}
        >
          📊 Finalizar Escaneo y Ver Reporte ({scannedCodes.length})
        </button>

      </div>

      {/* Columna Derecha: Historial en tiempo real */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 180px)',
        overflow: 'hidden'
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          📋 Bitácora de Lectura
          <span className="badge" style={{ background: 'var(--bg-body)', fontSize: 10 }}>Tiempo real</span>
        </h3>

        {scannedBienesDetails.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-body)',
            padding: 16
          }}>
            <span style={{ fontSize: 28, marginBottom: 8 }}>🥫</span>
            <p style={{ fontWeight: 600, fontSize: 12, margin: 0 }}>Ningún código escaneado aún</p>
            <p style={{ fontSize: 11, margin: '4px 0 0', opacity: 0.7 }}>Usa la cámara o el lector físico sobre las etiquetas.</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
            {scannedBienesDetails.map((item, index) => (
              <div
                key={`${item.code}-${index}`}
                style={{
                  background: 'var(--bg-body)',
                  border: '1px solid var(--border)',
                  borderLeft: `4px solid ${
                    item.status === 'unregistered' ? '#A78BFA' : // Púrpura no registrado
                    item.esCorrecto ? '#10B981' : '#F59E0B' // Verde correcto, Naranja desubicado
                  }`,
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  animation: index === 0 ? 'fade-in 0.25s ease-out' : 'none'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <strong style={{ 
                      fontFamily: 'monospace', 
                      fontSize: 12,
                      background: 'var(--bg-card)', 
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid var(--border)'
                    }}>
                      {item.code}
                    </strong>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: item.status === 'unregistered' ? '#8B5CF6' :
                             item.esCorrecto ? '#10B981' : '#F59E0B'
                    }}>
                      {item.status === 'unregistered' ? 'No reg.' :
                       item.esCorrecto ? 'Correcto' : 'Otra área'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.nombre}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Marca: {item.marca} | Serie: {item.serial}
                  </div>
                  {!item.esCorrecto && item.status !== 'unregistered' && (
                    <div style={{ fontSize: 9, color: '#F59E0B', fontWeight: 600, marginTop: 2 }}>
                      📍 Ubicación sistema: {item.areaRegistrada}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onRemoveCode(item.code)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#EF4444',
                    fontSize: 16,
                    padding: 8,
                    cursor: 'pointer',
                    opacity: 0.6,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={e => e.target.style.opacity = 1}
                  onMouseLeave={e => e.target.style.opacity = 0.6}
                  title="Eliminar de la lista"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes laser-scan {
          0%, 100% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
        }
        @keyframes slide-down {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
