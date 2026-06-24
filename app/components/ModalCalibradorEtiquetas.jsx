'use client';
import { useState, useEffect } from 'react';
import { generateBarcodeSVG } from '@/lib/barcode';

/**
 * ModalCalibradorEtiquetas — Panel de Calibración Premium y Vista Previa en Tiempo Real.
 * Permite al usuario ajustar márgenes, gaps y dimensiones de etiquetas con una
 * superposición de la plantilla física de fondo para una alineación milimétrica.
 */
export default function ModalCalibradorEtiquetas({ 
  isOpen, 
  onClose, 
  bienes = [], 
  configuracion = {}, 
  onSaveConfig, 
  onPrint 
}) {
  // Inicialización de estados locales para calibración basados en la configuración existente
  const [formatoPapel, setFormatoPapel] = useState(configuracion.etiqueta_formato_papel || 'avery_5167');
  const [margenSuperior, setMargenSuperior] = useState(parseFloat(configuracion.etiqueta_margen_superior || '1.0'));
  const [margenInferior, setMargenInferior] = useState(parseFloat(configuracion.etiqueta_margen_inferior || '1.0'));
  const [margenIzquierdo, setMargenIzquierdo] = useState(parseFloat(configuracion.etiqueta_margen_izquierdo || '1.0'));
  const [margenDerecho, setMargenDerecho] = useState(parseFloat(configuracion.etiqueta_margen_derecho || '1.0'));
  const [gapColumnas, setGapColumnas] = useState(parseFloat(configuracion.etiqueta_gap_columnas || '0.5'));
  const [gapFilas, setGapFilas] = useState(parseFloat(configuracion.etiqueta_gap_filas || '0.0'));
  const [anchoMm, setAnchoMm] = useState(parseFloat(configuracion.etiqueta_ancho_mm || '44'));
  const [altoMm, setAltoMm] = useState(parseFloat(configuracion.etiqueta_alto_mm || '13'));

  // Estados visuales del calibrador
  const [mostrarPlantillaFondo, setMostrarPlantillaFondo] = useState(true);
  const [opacidadPlantilla, setOpacidadPlantilla] = useState(0.4);
  const [esEscalaGris, setEsEscalaGris] = useState(false);
  const [mostrarBordesGuia, setMostrarBordesGuia] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Escala del preview en pantalla para que quepa en la interfaz (Letter es 21.59 x 27.94 cm)
  const [scale, setScale] = useState(0.45);

  useEffect(() => {
    // Escuchar el tamaño de la ventana para auto-ajustar la escala si es necesario
    const handleResize = () => {
      if (window.innerWidth < 1200) {
        setScale(0.35);
      } else if (window.innerWidth < 1400) {
        setScale(0.42);
      } else {
        setScale(0.48);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  // Restaurar valores por defecto de Avery 5167
  const handleRestablecerAvery = () => {
    setFormatoPapel('avery_5167');
    setMargenSuperior(1.0);
    setMargenInferior(1.0);
    setMargenIzquierdo(1.0);
    setMargenDerecho(1.0);
    setGapColumnas(0.5);
    setGapFilas(0.0);
    setAnchoMm(44.0);
    setAltoMm(13.0);
  };

  // Guardar configuración permanentemente y proceder a imprimir
  const handleGuardarEImprimir = async () => {
    setGuardando(true);
    try {
      const payload = {
        etiqueta_formato_papel: formatoPapel,
        etiqueta_margen_superior: String(margenSuperior),
        etiqueta_margen_inferior: String(margenInferior),
        etiqueta_margen_izquierdo: String(margenIzquierdo),
        etiqueta_margen_derecho: String(margenDerecho),
        etiqueta_gap_columnas: String(gapColumnas),
        etiqueta_gap_filas: String(gapFilas),
        etiqueta_ancho_mm: String(anchoMm),
        etiqueta_alto_mm: String(altoMm),
      };

      if (onSaveConfig) {
        await onSaveConfig(payload);
      }

      if (onPrint) {
        onPrint(bienes);
      }
      onClose();
    } catch (error) {
      console.error('Error al guardar calibración:', error);
    } finally {
      setGuardando(false);
    }
  };

  // Imprimir directo temporal (Prueba rápida sin guardar a BD)
  const handleImprimirPrueba = () => {
    // Inyectamos estilos temporales en el documento para imprimir con los valores actuales del estado del modal
    const estiloTemporal = document.createElement('style');
    estiloTemporal.id = 'temp-calibration-styles';
    estiloTemporal.innerHTML = `
      @media print {
        @page {
          size: letter !important;
          margin: 0 !important;
        }
        body.printing-labels {
          background: #FFFFFF !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        body.printing-labels .print-labels-container {
          display: grid !important;
          grid-template-columns: repeat(4, ${anchoMm}mm) !important;
          grid-auto-rows: ${altoMm}mm !important;
          align-content: start !important;
          padding-top: ${margenSuperior}cm !important;
          padding-bottom: ${margenInferior}cm !important;
          padding-left: ${margenIzquierdo}cm !important;
          padding-right: ${margenDerecho}cm !important;
          box-sizing: border-box !important;
          width: 21.59cm !important;
          height: 27.94cm !important;
          background: #FFFFFF !important;
          gap: ${gapFilas}cm ${gapColumnas}cm !important;
        }
        body.printing-labels .printable-label {
          width: ${anchoMm}mm !important;
          height: ${altoMm}mm !important;
          box-sizing: border-box !important;
          padding: 0.5mm 1mm !important;
          margin: 0 !important;
          border: none !important;
          display: block !important;
          overflow: hidden !important;
        }
      }
    `;
    document.head.appendChild(estiloTemporal);

    if (onPrint) {
      onPrint(bienes);
    }

    // Remover los estilos temporales después de la impresión
    setTimeout(() => {
      const styles = document.getElementById('temp-calibration-styles');
      if (styles) styles.remove();
    }, 1000);
  };

  // Header textual de las etiquetas
  const rawHeader = configuracion.cabecera_etiqueta_impresion 
    ? configuracion.cabecera_etiqueta_impresion.replace('{siglas}', configuracion.siglas_institucion || 'UPEN')
    : `CONTROL INTERNO DE ACTIVO FIJO ${configuracion.siglas_institucion || 'UPEN'}`;
  const headerText = rawHeader.toUpperCase().startsWith("CONTROL INTERNO DE ACTIVO FIJO")
    ? `ACTIVO FIJO ${configuracion.siglas_institucion || 'UPEN'}`
    : rawHeader;

  // Rellenamos con códigos mock hasta completar una página (80) si hay pocos bienes, 
  // para que el usuario pueda calibrar y visualizar toda la hoja Avery 5167 completa.
  const previewBienes = [...bienes];
  if (formatoPapel === 'avery_5167' && previewBienes.length < 80) {
    const originalLength = previewBienes.length;
    for (let i = 0; i < 80 - originalLength; i++) {
      const mockIndex = i % (originalLength || 1);
      const matchedBien = originalLength > 0 ? previewBienes[mockIndex] : {
        id: `mock-${i}`,
        marca: 'Marca',
        modelo: 'Modelo',
        etiqueta: 'UPEN-0000000',
        serial: 'SER-000000'
      };
      previewBienes.push({
        ...matchedBien,
        id: `mock-${i}`,
        isMock: true
      });
    }
  }

  // Si son más de 80, limitamos a la primera página de preview para optimizar el rendimiento
  const firstPageBienes = previewBienes.slice(0, 80);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
      <div 
        className="modal-box" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '1240px', 
          width: '95%', 
          height: '90vh',
          borderRadius: 18, 
          border: '1px solid var(--border)', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Cabecera del modal */}
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #075E54 0%, #004D40 100%)',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>⚡ Calibración Dinámica en Tiempo Real</h3>
            <span style={{ fontSize: 11, opacity: 0.8 }}>Ajusta los márgenes e imprime con precisión milimétrica usando la hoja plantilla.</span>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: '#fff', 
              fontSize: 16, 
              width: 32, 
              height: 32, 
              borderRadius: '50%', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}
          >✕</button>
        </div>

        {/* Cuerpo del modal (2 columnas) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Columna Izquierda: Controles */}
          <div style={{ 
            width: '380px', 
            borderRight: '1px solid var(--border)', 
            padding: '20px', 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'rgba(255,255,255,0.01)'
          }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Formato de Papel
              </label>
              <select 
                className="form-select"
                value={formatoPapel}
                onChange={e => setFormatoPapel(e.target.value)}
                style={{ width: '100%', height: 36, fontSize: 13 }}
              >
                <option value="avery_5167">Avery 5167 (4 x 20 / Carta)</option>
                <option value="rollo">Rollo Continuo (Térmico)</option>
              </select>
            </div>

            {/* Configuración visual del background */}
            <div style={{ 
              background: 'rgba(13, 148, 136, 0.05)', 
              border: '1px solid rgba(13, 148, 136, 0.15)', 
              borderRadius: 8, 
              padding: '12px' 
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', display: 'block', marginBottom: 8 }}>
                Visualización de Plantilla
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Superponer plantilla de fondo:</span>
                <input 
                  type="checkbox" 
                  checked={mostrarPlantillaFondo} 
                  onChange={e => setMostrarPlantillaFondo(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
              </div>

              {mostrarPlantillaFondo && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                    <span>Opacidad plantilla:</span>
                    <strong>{Math.round(opacidadPlantilla * 100)}%</strong>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05"
                    value={opacidadPlantilla} 
                    onChange={e => setOpacidadPlantilla(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Mostrar bordes de corte:</span>
                <input 
                  type="checkbox" 
                  checked={mostrarBordesGuia} 
                  onChange={e => setMostrarBordesGuia(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Sliders de Calibración */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                Márgenes de la Hoja (CM)
              </span>

              {/* Superior */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Margen Superior:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="number" 
                      value={margenSuperior} 
                      onChange={e => setMargenSuperior(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                      step="0.05"
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0.0" 
                  max="4.0" 
                  step="0.05"
                  value={margenSuperior} 
                  onChange={e => setMargenSuperior(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              {/* Izquierdo */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Margen Izquierdo:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="number" 
                      value={margenIzquierdo} 
                      onChange={e => setMargenIzquierdo(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                      step="0.05"
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0.0" 
                  max="4.0" 
                  step="0.05"
                  value={margenIzquierdo} 
                  onChange={e => setMargenIzquierdo(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              {/* Inferior */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Margen Inferior:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="number" 
                      value={margenInferior} 
                      onChange={e => setMargenInferior(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                      step="0.05"
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0.0" 
                  max="4.0" 
                  step="0.05"
                  value={margenInferior} 
                  onChange={e => setMargenInferior(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              {/* Derecho */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Margen Derecho:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="number" 
                      value={margenDerecho} 
                      onChange={e => setMargenDerecho(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                      step="0.05"
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0.0" 
                  max="4.0" 
                  step="0.05"
                  value={margenDerecho} 
                  onChange={e => setMargenDerecho(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginTop: 8 }}>
                Espaciado entre Etiquetas (CM)
              </span>

              {/* Gap Columnas */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Separación Columnas:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="number" 
                      value={gapColumnas} 
                      onChange={e => setGapColumnas(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                      step="0.02"
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0.0" 
                  max="2.0" 
                  step="0.02"
                  value={gapColumnas} 
                  onChange={e => setGapColumnas(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              {/* Gap Filas */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Separación Filas:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="number" 
                      value={gapFilas} 
                      onChange={e => setGapFilas(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                      step="0.01"
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0.0" 
                  max="1.5" 
                  step="0.01"
                  value={gapFilas} 
                  onChange={e => setGapFilas(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginTop: 8 }}>
                Dimensión Etiqueta (MM)
              </span>

              {/* Ancho Etiqueta */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Ancho de Etiqueta:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="number" 
                      value={anchoMm} 
                      onChange={e => setAnchoMm(Math.max(10, parseFloat(e.target.value) || 10))}
                      style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                      step="0.5"
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>mm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="20.0" 
                  max="100.0" 
                  step="0.5"
                  value={anchoMm} 
                  onChange={e => setAnchoMm(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              {/* Alto Etiqueta */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span>Alto de Etiqueta:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input 
                      type="number" 
                      value={altoMm} 
                      onChange={e => setAltoMm(Math.max(5, parseFloat(e.target.value) || 5))}
                      style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                      step="0.5"
                    />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>mm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="5.0" 
                  max="50.0" 
                  step="0.5"
                  value={altoMm} 
                  onChange={e => setAltoMm(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>
            </div>

            <button 
              className="btn btn-ghost" 
              onClick={handleRestablecerAvery}
              style={{ width: '100%', border: '1px dashed var(--border)', fontSize: 12, marginTop: 8 }}
            >
              🔄 Restablecer Plantilla Avery 5167
            </button>
          </div>

          {/* Columna Derecha: Vista Previa Interactiva */}
          <div style={{ 
            flex: 1, 
            background: 'var(--bg-body)', 
            padding: '24px', 
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {/* Control Flotante de Zoom */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '24px',
              zIndex: 10,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              userSelect: 'none'
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Zoom:
              </span>
              <button 
                type="button"
                onClick={() => setScale(prev => Math.max(0.2, +(prev - 0.05).toFixed(2)))}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 'bold',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                -
              </button>
              <input 
                type="range" 
                min="0.2" 
                max="1.5" 
                step="0.05"
                value={scale} 
                onChange={e => setScale(parseFloat(e.target.value))}
                style={{ width: 100, accentColor: 'var(--primary)', cursor: 'pointer', margin: 0 }}
              />
              <button 
                type="button"
                onClick={() => setScale(prev => Math.min(1.5, +(prev + 0.05).toFixed(2)))}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 'bold',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                +
              </button>
              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: 'right', color: 'var(--text-primary)' }}>
                {Math.round(scale * 100)}%
              </span>
              <button 
                type="button"
                onClick={() => {
                  if (window.innerWidth < 1200) {
                    setScale(0.35);
                  } else if (window.innerWidth < 1400) {
                    setScale(0.42);
                  } else {
                    setScale(0.48);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Ajustar
              </button>
            </div>

            {/* Hoja de papel Carta a escala */}
            <div 
              style={{
                width: '21.59cm',
                height: '27.94cm',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
                position: 'relative',
                flexShrink: 0,
                boxSizing: 'border-box',
                transition: 'all 0.1s ease'
              }}
            >
              {/* Imagen de la plantilla de fondo para calibración */}
              {mostrarPlantillaFondo && formatoPapel === 'avery_5167' && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `url('/images/plantilla_etiquetas.jpg')`,
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    opacity: opacidadPlantilla,
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />
              )}

              {/* Grid contenedor de las etiquetas en tiempo real */}
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '21.59cm',
                  height: '27.94cm',
                  display: 'grid',
                  gridTemplateColumns: `repeat(4, ${anchoMm}mm)`,
                  gridAutoRows: `${altoMm}mm`,
                  alignContent: 'start',
                  paddingTop: `${margenSuperior}cm`,
                  paddingBottom: `${margenInferior}cm`,
                  paddingLeft: `${margenIzquierdo}cm`,
                  paddingRight: `${margenDerecho}cm`,
                  gap: `${gapFilas}cm ${gapColumnas}cm`,
                  boxSizing: 'border-box',
                  zIndex: 2,
                  pointerEvents: 'none'
                }}
              >
                {firstPageBienes.map((bien, idx) => (
                  <div 
                    key={bien.id} 
                    style={{
                      width: `${anchoMm}mm`,
                      height: `${altoMm}mm`,
                      boxSizing: 'border-box',
                      padding: '0.6mm 1.2mm',
                      border: mostrarBordesGuia ? '0.15mm dashed #4F46E5' : 'none',
                      borderRadius: '1.2mm', // Simula bordes redondeados Avery 5167
                      backgroundColor: 'rgba(255, 255, 255, 0.85)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      overflow: 'hidden',
                      opacity: bien.isMock ? 0.6 : 1
                    }}
                  >
                    {/* Contenido de la etiqueta */}
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxSizing: 'border-box'
                    }}>
                      {/* Cabecera */}
                      <div style={{
                        fontSize: '3.6pt',
                        lineHeight: 1.0,
                        fontWeight: '900',
                        color: '#000000',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        width: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {headerText}
                      </div>

                      {/* Marca / Modelo */}
                      <div style={{
                        fontSize: '3.3pt',
                        lineHeight: 1.0,
                        color: '#333333',
                        textAlign: 'center',
                        width: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {bien.marca} {bien.modelo}
                      </div>

                      {/* Código de Barras */}
                      <div 
                        style={{
                          height: '4.8mm',
                          width: '90%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                        dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(bien.etiqueta, false) }}
                      />

                      {/* Footer (No. Inv / Serie) */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        fontSize: '3.8pt',
                        fontWeight: '900',
                        color: '#000000',
                        lineHeight: 1.0
                      }}>
                        <span style={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {bien.etiqueta}
                        </span>
                        <span style={{ fontSize: '3.4pt', fontWeight: '500', opacity: 0.8, maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          S/N: {bien.serial || 'N/S'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer del modal */}
        <div style={{ 
          padding: '16px 24px', 
          background: 'var(--bg-body)', 
          borderTop: '1px solid var(--border)', 
          display: 'flex', 
          gap: 12, 
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 'auto' }}>
            📋 {bienes.length} bienes seleccionados para imprimir ({firstPageBienes.length} en preview).
          </span>

          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={onClose}
            disabled={guardando}
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            Cancelar
          </button>

          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={handleImprimirPrueba}
            disabled={guardando}
            style={{ 
              border: '1px solid var(--primary)', 
              color: 'var(--primary)',
              padding: '8px 18px', 
              borderRadius: 8,
              fontWeight: 600
            }}
          >
            🖨️ Imprimir Prueba Rápida
          </button>

          <button 
            type="button" 
            className="btn" 
            onClick={handleGuardarEImprimir}
            disabled={guardando}
            style={{ 
              background: 'linear-gradient(135deg, var(--primary) 0%, #004D40 100%)', 
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 24px', 
              borderRadius: 8,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
            }}
          >
            {guardando ? 'Guardando...' : '💾 Guardar Calibración e Imprimir'}
          </button>
        </div>
      </div>
    </div>
  );
}
