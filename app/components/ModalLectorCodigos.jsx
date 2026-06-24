'use client';
import { useState, useEffect, useRef } from 'react';

/**
 * ModalLectorCodigos — Modal del Lector/Escáner de Códigos de Barras y QR.
 * Soporta dos modos:
 * 1. Manual/USB (HID): Captura la entrada de lectores físicos USB simulando un lector láser.
 * 2. Cámara: Utiliza la cámara trasera de smartphones y tabletas en tiempo real (html5-qrcode).
 */
export default function ModalLectorCodigos({ onClose, onScan, bienes }) {
  const [code, setCode] = useState('');
  const [scanMode, setScanMode] = useState('manual'); // 'manual' | 'camera'
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [scanStatus, setScanStatus] = useState({ type: 'waiting', msg: 'Apunta con el escáner al código o escribe el número' });

  const inputRef = useRef(null);
  const scannerRef = useRef(null);
  const SCANNER_DIV_ID = "camera-scanner-preview";

  // Carga dinámica de html5-qrcode desde un CDN
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

    return () => {
      // Dejar la librería cargada globalmente para futuras aperturas
    };
  }, []);

  // Auto-enfocar el input al montar el componente (solo en modo manual)
  useEffect(() => {
    if (scanMode === 'manual' && inputRef.current && !isSearching) {
      inputRef.current.focus();
    }
  }, [scanMode, isSearching]);

  // Mantener el enfoque automático de forma agresiva en modo manual si se pierde
  const handleBlur = () => {
    if (scanMode === 'manual') {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  // Controlar el inicio y parada de la cámara basado en el modo de escaneo
  useEffect(() => {
    if (scanMode !== 'camera' || !libraryLoaded) {
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
      console.error("Error al instanciar Html5Qrcode:", e);
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
        // Código escaneado con éxito
        const cleanCode = decodedText.trim();
        if (cleanCode) {
          setCode(cleanCode);
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          setScanMode('manual');
          stopCamera(() => {
            triggerSearch(cleanCode);
          });
        }
      },
      (errorMessage) => {
        // Silenciar errores repetitivos del bucle de escaneo
      }
    ).catch(err => {
      console.error("Error al iniciar la cámara:", err);
      setCameraError("Permiso de cámara denegado o cámara no disponible.");
      setIsScanning(false);
    });

    // Cleanup al desmontar o cambiar de modo
    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("Error al apagar la cámara en cleanup:", err));
      }
    };
     
    // triggerSearch es una función estable redefinida sólo cuando bienes/onScan cambian;
    // el React Compiler de Next.js 16 gestiona la memoización automáticamente.
  }, [scanMode, libraryLoaded]);

  const stopCamera = (callback) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        setIsScanning(false);
        scannerRef.current = null;
        if (callback) callback();
      }).catch(err => {
        console.error("Error al detener cámara:", err);
        setIsScanning(false);
        scannerRef.current = null;
        if (callback) callback();
      });
    } else {
      setIsScanning(false);
      if (callback) callback();
    }
  };

   
  // El React Compiler de Next.js 16 optimiza esta función automáticamente.
  const triggerSearch = (cleanCode) => {
    setIsSearching(true);
    setScanStatus({ type: 'searching', msg: `Buscando código "${cleanCode}"...` });

    setTimeout(() => {
      const match = bienes.find(b => 
        (b.etiqueta          && b.etiqueta.toUpperCase()          === cleanCode.toUpperCase()) || 
        (b.serial            && b.serial.toUpperCase()            === cleanCode.toUpperCase())   ||
        (b.codigo_inventario && b.codigo_inventario.toUpperCase() === cleanCode.toUpperCase()) ||
        (b.numero_serie      && b.numero_serie.toUpperCase()      === cleanCode.toUpperCase())
      );

      if (match) {
        setScanStatus({ type: 'success', msg: `¡Equipo encontrado! Abriendo ficha de "${match.nombre || match.marca}"...` });
        setTimeout(() => {
          onScan(cleanCode, match);
          setCode('');
          setIsSearching(false);
        }, 800);
      } else {
        setScanStatus({ type: 'not_found', msg: `El código "${cleanCode}" no está registrado. Redirigiendo a registro rápido...` });
        setTimeout(() => {
          onScan(cleanCode, null);
          setCode('');
          setIsSearching(false);
        }, 1500);
      }
    }, 500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) return;
    triggerSearch(cleanCode);
  };

  const handleClose = () => {
    if (scannerRef.current && isScanning) {
      scannerRef.current.stop().then(() => {
        onClose();
      }).catch(() => {
        onClose();
      });
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div 
        className="modal-box fade-in" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: 480, 
          width: '90%', 
          padding: '24px', 
          textAlign: 'center',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Cabecera del Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
            <span style={{ fontSize: 24 }}>🏷️</span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Lector de Códigos</h2>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {scanMode === 'manual' 
                  ? 'Sincronizado con escáner físico de mano' 
                  : 'Escaneando en tiempo real con la cámara'}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={handleClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Botones de alternancia de Modo */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--bg-body)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          <button 
            type="button"
            onClick={() => setScanMode('manual')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: scanMode === 'manual' ? 'var(--bg-card)' : 'transparent',
              color: scanMode === 'manual' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: scanMode === 'manual' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            ⌨️ USB / Manual
          </button>
          <button 
            type="button"
            onClick={() => setScanMode('camera')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: scanMode === 'camera' ? 'var(--bg-card)' : 'transparent',
              color: scanMode === 'camera' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: scanMode === 'camera' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            📷 Cámara Móvil
          </button>
        </div>

        {/* Zona de previsualización de cámara */}
        {scanMode === 'camera' && (
          <div style={{ position: 'relative', width: '100%', marginBottom: 20 }}>
            {cameraError ? (
              <div style={{
                height: 180,
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px dashed rgba(244, 63, 94, 0.25)',
                color: '#F87171',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                fontSize: 12,
                fontWeight: 600
              }}>
                ⚠️ {cameraError}
              </div>
            ) : (
              <div id={SCANNER_DIV_ID} style={{ overflow: 'hidden' }}></div>
            )}
            {!libraryLoaded && !cameraError && (
              <div style={{
                height: 180,
                background: 'var(--bg-body)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontWeight: 600
              }}>
                <span className="dash-pulse" style={{ marginRight: 8, width: 8, height: 8 }}></span>
                Iniciando módulo de cámara...
              </div>
            )}
          </div>
        )}

        {/* Zona del Escáner Láser Simulada (Solo Modo Manual/USB) */}
        {scanMode === 'manual' && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: 140,
            background: '#0F172A',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #1E293B',
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)',
            marginBottom: 20
          }}>
            {/* Línea láser animada roja */}
            <div style={{
              position: 'absolute',
              left: 0,
              width: '100%',
              height: 2,
              background: 'var(--danger)',
              boxShadow: '0 0 12px var(--danger), 0 0 4px var(--danger)',
              animation: 'laser-scan 2.5s infinite ease-in-out',
              zIndex: 2
            }} />

            {/* Gráfico de código de barras simulado */}
            <div style={{
              display: 'flex',
              gap: 2,
              opacity: 0.15,
              alignItems: 'center',
              height: 60,
              marginBottom: 8
            }}>
              {[1,3,1,2,4,1,3,2,1,4,1,2,3,1,2,4,1,3,1,2,4,1,3,2,1,2,4,1,2,3,1].map((w, idx) => (
                <div key={idx} style={{ width: w * 2, height: '100%', background: '#FFFFFF' }} />
              ))}
            </div>

            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, zIndex: 3, letterSpacing: '0.05em' }}>
              {code ? code : 'ESPERANDO CÓDIGO...'}
            </div>
          </div>
        )}

        {/* Formulario y Campo de Entrada */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <input
              ref={inputRef}
              type="text"
              className="form-input"
              style={{
                textAlign: 'center',
                fontSize: 16,
                letterSpacing: '0.1em',
                fontWeight: 700,
                fontFamily: 'monospace',
                background: 'var(--bg-body)',
                border: '2px solid var(--border)',
                height: 44,
                borderRadius: 'var(--radius-md)'
              }}
              placeholder="Escribe o escanea..."
              value={code}
              onChange={e => setCode(e.target.value)}
              onBlur={handleBlur}
              disabled={isSearching}
              autoComplete="off"
            />
          </div>

          {/* Estatus / Mensaje */}
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            minHeight: 36,
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: scanStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 
                        scanStatus.type === 'not_found' ? 'rgba(245, 158, 11, 0.1)' : 
                        scanStatus.type === 'searching' ? 'rgba(13, 148, 136, 0.1)' : 'var(--bg-body)',
            color: scanStatus.type === 'success' ? '#10B981' : 
                   scanStatus.type === 'not_found' ? '#F59E0B' : 
                   scanStatus.type === 'searching' ? '#0D9488' : 'var(--text-secondary)',
            border: `1px solid ${
              scanStatus.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 
              scanStatus.type === 'not_found' ? 'rgba(245, 158, 11, 0.2)' : 
              scanStatus.type === 'searching' ? 'rgba(13, 148, 136, 0.2)' : 'var(--border)'
            }`,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}>
            {scanStatus.type === 'searching' && <span className="dash-pulse" style={{ width: 8, height: 8 }}></span>}
            {scanStatus.type === 'success' && '✓ '}
            {scanStatus.type === 'not_found' && '⚠️ '}
            {scanStatus.msg}
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={handleClose}
              disabled={isSearching}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!code.trim() || isSearching}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              🔍 Consultar
            </button>
          </div>
        </form>

        <style jsx global>{`
          @keyframes laser-scan {
            0%, 100% { top: 0%; opacity: 0.8; }
            50% { top: 100%; opacity: 0.8; }
          }
        `}</style>
      </div>
    </div>
  );
}
