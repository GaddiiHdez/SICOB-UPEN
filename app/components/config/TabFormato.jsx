'use client';
import { useState, useEffect } from 'react';
import { generateBarcodeSVG } from '@/lib/barcode';
import {
  getCorrelativoPadding,
  updateCorrelativoPadding,
  generatePreviewCode
} from '@/lib/configHelpers';

/**
 * TabFormato — Pestaña de Formato de Códigos de Inventario
 *
 * Gestiona la plantilla de generación automática de códigos y el
 * encabezado membretado de las etiquetas de impresión.
 *
 * Props recibidas del padre ConfiguracionPanel:
 * @param {string}   format            - Plantilla activa (ej. "UPEN-{CAT}-{YEAR}-{CORRELATIVO:4}")
 * @param {Function} setFormat         - Setter del formato
 * @param {string}   cabecera          - Encabezado membretado
 * @param {Function} setCabecera       - Setter del encabezado
 * @param {string}   previewCategory   - Abreviatura de categoría para la previsualización
 * @param {Function} setPreviewCategory- Setter de la categoría de preview
 * @param {string[]} categoriesList    - Lista de categorías de los bienes
 * @param {boolean}  loading           - Si todavía se está cargando la config
 * @param {boolean}  saving            - Si se está guardando
 * @param {string}   univAcronym       - Acrónimo institucional (para el header de la etiqueta preview)
 * @param {Function} onSave            - Callback de guardado
 * @param {Function} appendTag         - Helper para inyectar tags en la plantilla
 */
export default function TabFormato({
  format, setFormat,
  cabecera, setCabecera,
  previewCategory, setPreviewCategory,
  categoriesList,
  loading, saving,
  univAcronym,
  onSave, appendTag,
  etiquetaMostrarCabecera, setEtiquetaMostrarCabecera,
  etiquetaMostrarMarcaModelo, setEtiquetaMostrarMarcaModelo,
  etiquetaMostrarSerial, setEtiquetaMostrarSerial,
  etiquetaAnchoMm, setEtiquetaAnchoMm,
  etiquetaAltoMm, setEtiquetaAltoMm,
  etiquetaAlturaCodigoBarrasMm, setEtiquetaAlturaCodigoBarrasMm,
  etiquetaLetraCabeceraPt, setEtiquetaLetraCabeceraPt,
  etiquetaLetraMarcaModeloPt, setEtiquetaLetraMarcaModeloPt,
  etiquetaLetraCodigoPt, setEtiquetaLetraCodigoPt,
  etiquetaLetraSerialPt, setEtiquetaLetraSerialPt,
  etiquetaFormatoPapel, setEtiquetaFormatoPapel,
  etiquetaCabeceraBold, setEtiquetaCabeceraBold,
  etiquetaCabeceraItalic, setEtiquetaCabeceraItalic,
  etiquetaMarcaBold, setEtiquetaMarcaBold,
  etiquetaMarcaItalic, setEtiquetaMarcaItalic,
  etiquetaCodigoBold, setEtiquetaCodigoBold,
  etiquetaCodigoItalic, setEtiquetaCodigoItalic,
  etiquetaSerialBold, setEtiquetaSerialBold,
  etiquetaSerialItalic, setEtiquetaSerialItalic,
  etiquetaMargenSuperior, setEtiquetaMargenSuperior,
  etiquetaMargenInferior, setEtiquetaMargenInferior,
  etiquetaMargenIzquierdo, setEtiquetaMargenIzquierdo,
  etiquetaMargenDerecho, setEtiquetaMargenDerecho,
  etiquetaGapColumnas, setEtiquetaGapColumnas,
  etiquetaGapFilas, setEtiquetaGapFilas
}) {
  const handleFormatoPapelChange = (e) => {
    const val = e.target.value;
    setEtiquetaFormatoPapel(val);
    if (val === 'avery_5167') {
      setEtiquetaAnchoMm(44);
      setEtiquetaAltoMm(13);
      setEtiquetaAlturaCodigoBarrasMm(4.8);
      setEtiquetaLetraCabeceraPt(3.8);
      setEtiquetaLetraMarcaModeloPt(3.5);
      setEtiquetaLetraCodigoPt(4.5);
      setEtiquetaLetraSerialPt(4.0);
    } else {
      setEtiquetaAnchoMm(30);
      setEtiquetaAltoMm(15);
      setEtiquetaAlturaCodigoBarrasMm(5.6);
      setEtiquetaLetraCabeceraPt(4.5);
      setEtiquetaLetraMarcaModeloPt(4.2);
      setEtiquetaLetraCodigoPt(5.5);
      setEtiquetaLetraSerialPt(5.0);
    }
  };

  const [previewMode, setPreviewMode] = useState('single');
  const [zoom, setZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (etiquetaFormatoPapel !== 'avery_5167' && previewMode !== 'single') {
      setPreviewMode('single');
    }
  }, [etiquetaFormatoPapel, previewMode]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
      gap: isMobile ? 16 : 24
    }}>

      {/* Controles de Configuración */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Estructura de Códigos de Inventario</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Configura la auto-generación de folios y etiquetas para la lectura de activos.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando plantilla...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Presets */}
            <div>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Preajustes Rápidos (Presets):</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  {
                    value: 'UPEN {CORRELATIVO:7}',
                    label: '🔢 Formato Numérico Compacto (UPEN XXXXXXX)',
                    desc: 'Etiqueta de densidad compacta (30mm x 15mm) con primer dígito dinámico. Ej: ',
                    example: 'UPEN 3192110',
                    active: format === 'UPEN {CORRELATIVO:7}'
                  },
                  {
                    value: 'UPEN-{CAT}-{YEAR}-{CORRELATIVO:4}',
                    label: '🏷️ Formato Moderno Institucional',
                    desc: 'Estructura completa con año y categoría. Ej: ',
                    example: 'UPEN-COMP-2026-0042',
                    active: format.includes('{CAT}') && format.includes('{YEAR}')
                  },
                  {
                    value: 'UPEN-{YEAR}-{CORRELATIVO:5}',
                    label: '📅 Formato Simple con Año',
                    desc: 'Consecutivo anualizado sin categoría. Ej: ',
                    example: 'UPEN-2026-00042',
                    active: format.includes('{YEAR}') && !format.includes('{CAT}')
                  }
                ].map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setFormat(preset.value)}
                    className="btn btn-ghost"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      justifyContent: 'center', height: 'auto', padding: '12px 16px',
                      textAlign: 'left', borderRadius: 'var(--radius-md)', width: '100%', gap: 4,
                      border: preset.active ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: preset.active ? 'rgba(13, 148, 136, 0.05)' : 'transparent',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                      {preset.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      {preset.desc}<code style={{ color: 'var(--primary)', fontWeight: 600 }}>{preset.example}</code>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />

            {/* Constructor personalizado */}
            <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Plantilla de Código Personalizada:</label>
                <input
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.05em' }}
                  value={format}
                  onChange={e => setFormat(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Insertar etiquetas dinámicas:</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                  {[
                    { tag: '{CAT}', label: '🏷️ {CAT} (Categoría)' },
                    { tag: '{YEAR}', label: '📅 {YEAR} (Año Actual)' },
                    { tag: `{CORRELATIVO:${getCorrelativoPadding(format)}}`, label: '🔢 {CORRELATIVO} (Folio)' }
                  ].map(({ tag, label }) => (
                    <button key={tag} type="button" onClick={() => appendTag(tag)}
                      style={{ cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-body)', padding: '6px 10px', borderRadius: 6, fontSize: 10, fontFamily: 'monospace' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/\{CORRELATIVO(?::\d+)?\}/.test(format) && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Dígitos de correlativo (Padding):</label>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{getCorrelativoPadding(format)} dígitos</span>
                  </div>
                  <input type="range" min="3" max="8"
                    value={getCorrelativoPadding(format)}
                    onChange={e => setFormat(prev => updateCorrelativoPadding(prev, parseInt(e.target.value, 10)))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)', marginTop: 4 }}
                  />
                </div>
              )}

              {format.includes('{CAT}') && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <label className="form-label" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Categoría de Simulación para Preview:</label>
                  <select className="form-select" style={{ fontSize: 12, padding: '6px 10px', height: 'auto' }}
                    value={previewCategory} onChange={e => setPreviewCategory(e.target.value)}>
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4)}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Encabezado Membretado para Etiquetas:</label>
                <input className="form-input" style={{ fontFamily: 'monospace', fontWeight: 600 }}
                  value={cabecera} onChange={e => setCabecera(e.target.value)}
                  placeholder="Ej: CONTROL INTERNO DE ACTIVO FIJO"
                />
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Puedes inyectar la etiqueta <code style={{ color: 'var(--primary)', fontWeight: 600 }}>&#123;siglas&#125;</code> para incluir el acrónimo dinámicamente.
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Personalización de Contenido de la Etiqueta (30mm x 15mm):</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)' }}>
                    <input 
                      type="checkbox" 
                      checked={etiquetaMostrarCabecera} 
                      onChange={e => setEtiquetaMostrarCabecera(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} 
                    />
                    <span>Mostrar Cabecera / Membrete</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)' }}>
                    <input 
                      type="checkbox" 
                      checked={etiquetaMostrarMarcaModelo} 
                      onChange={e => setEtiquetaMostrarMarcaModelo(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} 
                    />
                    <span>Mostrar Marca y Modelo del Bien</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 12, color: 'var(--text-primary)' }}>
                    <input 
                      type="checkbox" 
                      checked={etiquetaMostrarSerial} 
                      onChange={e => setEtiquetaMostrarSerial(e.target.checked)}
                      style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }} 
                    />
                    <span>Mostrar Número de Serie (S/N)</span>
                  </label>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Dimensiones y Fuentes de la Etiqueta:</label>
                
                {/* Formato de Papel */}
                <div>
                  <label className="form-label" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tipo de Papel / Disposición:</label>
                  <select 
                    className="form-select" 
                    value={etiquetaFormatoPapel} 
                    onChange={handleFormatoPapelChange}
                    style={{ fontSize: 12, padding: '8px 12px', height: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)' }}
                  >
                    <option value="rollo">🏷️ Rollo Continuo (Impresora Térmica)</option>
                    <option value="avery_5167">🖨️ Hoja Carta de 80 etiquetas (Avery 5167 / Office Depot 64415)</option>
                  </select>
                </div>

                {/* Calibración de Márgenes de Avery 5167 */}
                {etiquetaFormatoPapel === 'avery_5167' && (
                  <div style={{
                    background: 'rgba(13, 148, 136, 0.04)',
                    border: '1.5px dashed var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    marginTop: 4,
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      🎯 Calibración de Márgenes de Impresión (cm)
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      Si la impresión sale desviada de los bordes físicos del papel de etiquetas, ajusta aquí los márgenes en centímetros (por ejemplo, 1.05 o 0.95).
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Superior:</label>
                        <input 
                          type="number" 
                          step="0.05"
                          min="0"
                          max="5"
                          className="form-input" 
                          style={{ fontSize: 12, padding: '6px 8px', height: 'auto', textAlign: 'center' }}
                          value={etiquetaMargenSuperior} 
                          onChange={e => setEtiquetaMargenSuperior(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Inferior:</label>
                        <input 
                          type="number" 
                          step="0.05"
                          min="0"
                          max="5"
                          className="form-input" 
                          style={{ fontSize: 12, padding: '6px 8px', height: 'auto', textAlign: 'center' }}
                          value={etiquetaMargenInferior} 
                          onChange={e => setEtiquetaMargenInferior(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Izquierdo:</label>
                        <input 
                          type="number" 
                          step="0.05"
                          min="0"
                          max="5"
                          className="form-input" 
                          style={{ fontSize: 12, padding: '6px 8px', height: 'auto', textAlign: 'center' }}
                          value={etiquetaMargenIzquierdo} 
                          onChange={e => setEtiquetaMargenIzquierdo(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Derecho:</label>
                        <input 
                          type="number" 
                          step="0.05"
                          min="0"
                          max="5"
                          className="form-input" 
                          style={{ fontSize: 12, padding: '6px 8px', height: 'auto', textAlign: 'center' }}
                          value={etiquetaMargenDerecho} 
                          onChange={e => setEtiquetaMargenDerecho(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Separación Col:</label>
                        <input 
                          type="number" 
                          step="0.05"
                          min="0"
                          max="2"
                          className="form-input" 
                          style={{ fontSize: 12, padding: '6px 8px', height: 'auto', textAlign: 'center' }}
                          value={etiquetaGapColumnas} 
                          onChange={e => setEtiquetaGapColumnas(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Separación Fil:</label>
                        <input 
                          type="number" 
                          step="0.05"
                          min="0"
                          max="2"
                          className="form-input" 
                          style={{ fontSize: 12, padding: '6px 8px', height: 'auto', textAlign: 'center' }}
                          value={etiquetaGapFilas} 
                          onChange={e => setEtiquetaGapFilas(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Ancho y Alto */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span>Ancho de Etiqueta:</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{etiquetaAnchoMm} mm</span>
                    </div>
                    <input type="range" min="20" max="80" step="1"
                      value={etiquetaAnchoMm}
                      onChange={e => setEtiquetaAnchoMm(parseInt(e.target.value, 10))}
                      style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span>Alto de Etiqueta:</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{etiquetaAltoMm} mm</span>
                    </div>
                    <input type="range" min="10" max="50" step="1"
                      value={etiquetaAltoMm}
                      onChange={e => setEtiquetaAltoMm(parseInt(e.target.value, 10))}
                      style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>
                </div>
                {etiquetaFormatoPapel === 'avery_5167' && (
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: -4 }}>
                    * Modifica las dimensiones de la etiqueta para calibrarla con precisión milimétrica sobre tu plantilla física.
                  </div>
                )}

                {/* Altura de Código de Barras */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                    <span>Altura Código de Barras:</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{etiquetaAlturaCodigoBarrasMm} mm</span>
                  </div>
                  <input type="range" min="3" max="20" step="0.2"
                    value={etiquetaAlturaCodigoBarrasMm}
                    onChange={e => setEtiquetaAlturaCodigoBarrasMm(parseFloat(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                </div>

                {/* Tamaños de Letra en pt */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(0,0,0,0.15)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Tamaño de Fuentes (pt):</div>
                  
                  {etiquetaMostrarCabecera && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                        <span>Cabecera:</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{etiquetaLetraCabeceraPt} pt</span>
                      </div>
                      <input type="range" min="3" max="12" step="0.1"
                        value={etiquetaLetraCabeceraPt}
                        onChange={e => setEtiquetaLetraCabeceraPt(parseFloat(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <div style={{ display: 'flex', gap: 10, marginTop: 2, marginBottom: 6 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={etiquetaCabeceraBold} onChange={e => setEtiquetaCabeceraBold(e.target.checked)} style={{ cursor: 'pointer' }} />
                          <strong>Negrita</strong>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={etiquetaCabeceraItalic} onChange={e => setEtiquetaCabeceraItalic(e.target.checked)} style={{ cursor: 'pointer' }} />
                          <em>Cursiva</em>
                        </label>
                      </div>
                    </div>
                  )}

                  {etiquetaMostrarMarcaModelo && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                        <span>Marca y Modelo (Texto):</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{etiquetaLetraMarcaModeloPt} pt</span>
                      </div>
                      <input type="range" min="3" max="12" step="0.1"
                        value={etiquetaLetraMarcaModeloPt}
                        onChange={e => setEtiquetaLetraMarcaModeloPt(parseFloat(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <div style={{ display: 'flex', gap: 10, marginTop: 2, marginBottom: 6 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={etiquetaMarcaBold} onChange={e => setEtiquetaMarcaBold(e.target.checked)} style={{ cursor: 'pointer' }} />
                          <strong>Negrita</strong>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={etiquetaMarcaItalic} onChange={e => setEtiquetaMarcaItalic(e.target.checked)} style={{ cursor: 'pointer' }} />
                          <em>Cursiva</em>
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                      <span>Código de Barra (Pie):</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{etiquetaLetraCodigoPt} pt</span>
                    </div>
                    <input type="range" min="3" max="12" step="0.1"
                      value={etiquetaLetraCodigoPt}
                      onChange={e => setEtiquetaLetraCodigoPt(parseFloat(e.target.value))}
                      style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 2, marginBottom: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={etiquetaCodigoBold} onChange={e => setEtiquetaCodigoBold(e.target.checked)} style={{ cursor: 'pointer' }} />
                        <strong>Negrita</strong>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={etiquetaCodigoItalic} onChange={e => setEtiquetaCodigoItalic(e.target.checked)} style={{ cursor: 'pointer' }} />
                        <em>Cursiva</em>
                      </label>
                    </div>
                  </div>

                  {etiquetaMostrarSerial && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
                        <span>Número de Serie (Pie):</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{etiquetaLetraSerialPt} pt</span>
                      </div>
                      <input type="range" min="3" max="12" step="0.1"
                        value={etiquetaLetraSerialPt}
                        onChange={e => setEtiquetaLetraSerialPt(parseFloat(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <div style={{ display: 'flex', gap: 10, marginTop: 2, marginBottom: 2 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={etiquetaSerialBold} onChange={e => setEtiquetaSerialBold(e.target.checked)} style={{ cursor: 'pointer' }} />
                          <strong>Negrita</strong>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '9px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={etiquetaSerialItalic} onChange={e => setEtiquetaSerialItalic(e.target.checked)} style={{ cursor: 'pointer' }} />
                          <em>Cursiva</em>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
                {saving ? '⏳ Guardando Configuración…' : '💾 Guardar Formato de Código'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Vista Previa de la Etiqueta */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: isMobile ? '16px' : '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        alignItems: 'center',
        justifyContent: 'flex-start',
        position: isMobile ? 'static' : 'sticky',
        top: isMobile ? 'auto' : '24px',
        alignSelf: 'start',
        zIndex: 10,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ alignSelf: 'flex-start', width: '100%', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(13,148,136,0.15) 0%, rgba(13,148,136,0.05) 100%)',
                border: '1px solid rgba(13,148,136,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16
              }}>
                🏷️
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Vista Previa</h3>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>En tiempo real</span>
              </div>
            </div>
            
            {etiquetaFormatoPapel === 'avery_5167' && (
              <div style={{ 
                display: 'flex', 
                background: 'var(--bg-body)', 
                border: '1px solid var(--border)',
                padding: '3px', 
                borderRadius: '8px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
              }}>
                <button
                  type="button"
                  onClick={() => setPreviewMode('single')}
                  style={{
                    border: 'none',
                    background: previewMode === 'single' ? 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)' : 'transparent',
                    color: previewMode === 'single' ? '#FFF' : 'var(--text-secondary)',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: previewMode === 'single' ? '0 2px 4px rgba(13,148,136,0.2)' : 'none'
                  }}
                >
                  Etiqueta
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('sheet')}
                  style={{
                    border: 'none',
                    background: previewMode === 'sheet' ? 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)' : 'transparent',
                    color: previewMode === 'sheet' ? '#FFF' : 'var(--text-secondary)',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: previewMode === 'sheet' ? '0 2px 4px rgba(13,148,136,0.2)' : 'none'
                  }}
                >
                  Hoja Completa
                </button>
              </div>
            )}
          </div>

          {/* Barra de Herramientas Premium de Zoom */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: 10, 
            marginTop: 14, 
            background: 'var(--bg-body)', 
            padding: '8px 12px', 
            borderRadius: '10px', 
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>🔍 Zoom</span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setZoom(Math.max(0.5, parseFloat((zoom - 0.2).toFixed(1))))}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                  fontSize: 10, fontWeight: 700
                }}
                title="Alejar"
              >
                ➖
              </button>
              
              <input 
                type="range" 
                min="0.5" 
                max="5.0" 
                step="0.1" 
                value={zoom} 
                onChange={e => setZoom(parseFloat(e.target.value))}
                style={{ 
                  width: 100, 
                  cursor: 'pointer', 
                  accentColor: 'var(--primary)',
                  height: 3,
                  borderRadius: 2
                }}
              />
              
              <button
                type="button"
                onClick={() => setZoom(Math.min(5.0, parseFloat((zoom + 0.2).toFixed(1))))}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                  fontSize: 10, fontWeight: 700
                }}
                title="Acercar"
              >
                ➕
              </button>

              <div style={{ width: '1px', height: 12, background: 'var(--border)', margin: '0 2px' }} />

              <button
                type="button"
                onClick={() => setZoom(1.0)}
                style={{
                  padding: '3px 6px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontSize: 9,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                100%
              </button>

              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', minWidth: 32, textAlign: 'right' }}>
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-body)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: previewMode === 'single' ? '32px 16px' : '20px 12px',
          display: previewMode === 'single' ? 'flex' : 'block',
          alignItems: previewMode === 'single' ? 'center' : undefined,
          justifyContent: previewMode === 'single' ? 'center' : undefined,
          width: '100%',
          flex: 1,
          minHeight: 250,
          maxHeight: 520,
          overflow: 'auto',
          boxSizing: 'border-box'
        }}>
          {previewMode === 'single' ? (
            (() => {
              const baseWidth = 240;
              const previewWidth = baseWidth * zoom; // Aplicar zoom scale
              const previewHeight = (previewWidth * etiquetaAltoMm) / etiquetaAnchoMm;
              const scale = previewWidth / etiquetaAnchoMm; // Proporción de píxeles por milímetro
              const ptToPx = (pt) => pt * 0.3527 * scale;
              const barcodePxHeight = etiquetaAlturaCodigoBarrasMm * scale;

              return (
                <div style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #111827',
                  borderRadius: 6,
                  padding: `${0.8 * scale}px ${1.5 * scale}px ${1 * scale}px`,
                  textAlign: 'center',
                  fontFamily: '"Inter", sans-serif',
                  width: previewWidth,
                  height: previewHeight,
                  color: '#000000',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                  transformOrigin: 'center center',
                  transition: 'width 0.1s, height 0.1s',
                  margin: '24px auto'
                }}>
                  <style dangerouslySetInnerHTML={{ __html: `
                    .preview-barcode-svg-container svg {
                      width: 100% !important;
                      height: 100% !important;
                      display: block !important;
                    }
                  ` }} />

                  {/* Cabecera */}
                  {etiquetaMostrarCabecera && (
                    <div style={{
                      fontSize: `${ptToPx(etiquetaLetraCabeceraPt)}px`,
                      fontWeight: etiquetaCabeceraBold ? 900 : 'normal',
                      fontStyle: etiquetaCabeceraItalic ? 'italic' : 'normal',
                      textTransform: 'uppercase',
                      color: '#1F2937',
                      letterSpacing: '0.01em',
                      lineHeight: 1.0,
                      width: '100%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {(() => {
                        const rawHeader = cabecera || `CONTROL INTERNO DE ACTIVO FIJO ${univAcronym}`;
                        return rawHeader.toUpperCase().startsWith("CONTROL INTERNO DE ACTIVO FIJO")
                           ? `ACTIVO FIJO ${univAcronym}`
                           : rawHeader;
                      })()}
                    </div>
                  )}

                  {/* Marca y Modelo */}
                  {etiquetaMostrarMarcaModelo && (
                    <div style={{
                      fontSize: `${ptToPx(etiquetaLetraMarcaModeloPt)}px`,
                      fontWeight: etiquetaMarcaBold ? 700 : 'normal',
                      fontStyle: etiquetaMarcaItalic ? 'italic' : 'normal',
                      textTransform: 'uppercase',
                      color: '#4B5563',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.0,
                      width: '100%'
                    }}>
                      HP ELITEBOOK 840 G8
                    </div>
                  )}

                  {/* Representación de Barras en SVG Real */}
                  <div
                    className="preview-barcode-svg-container"
                    style={{ width: '100%', height: barcodePxHeight, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(generatePreviewCode(format, previewCategory), false) }}
                  />

                  {/* Pie de Etiqueta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 4 }}>
                    <span style={{
                      fontSize: `${ptToPx(etiquetaLetraCodigoPt)}px`,
                      fontWeight: etiquetaCodigoBold ? 900 : 'normal',
                      fontStyle: etiquetaCodigoItalic ? 'italic' : 'normal',
                      fontFamily: 'monospace',
                      color: '#000000',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: etiquetaMostrarSerial ? '55%' : '100%',
                      textAlign: 'left'
                    }}>
                      {generatePreviewCode(format, previewCategory)}
                    </span>
                    {etiquetaMostrarSerial && (
                      <span style={{
                        fontSize: `${ptToPx(etiquetaLetraSerialPt)}px`,
                        fontWeight: etiquetaSerialBold ? 900 : 'normal',
                        fontStyle: etiquetaSerialItalic ? 'italic' : 'normal',
                        fontFamily: 'monospace',
                        color: '#111827',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '45%',
                        textAlign: 'right'
                      }}>
                        S/N: 2UA6120F4Z
                      </span>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            (() => {
              const zoomScale = zoom;
              const letterWidth = 215.9 * zoomScale;
              const letterHeight = 279.4 * zoomScale;
              const letterPadTop = (parseFloat(etiquetaMargenSuperior) || 1.0) * 10 * zoomScale;
              const letterPadBottom = (parseFloat(etiquetaMargenInferior) || 1.0) * 10 * zoomScale;
              const letterPadLeft = (parseFloat(etiquetaMargenIzquierdo) || 1.0) * 10 * zoomScale;
              const letterPadRight = (parseFloat(etiquetaMargenDerecho) || 1.0) * 10 * zoomScale;
              const gridColWidth = (parseFloat(etiquetaAnchoMm) || 44) * zoomScale;
              const gridColGap = (parseFloat(etiquetaGapColumnas) || 0.5) * 10 * zoomScale;
              const gridRowGap = (parseFloat(etiquetaGapFilas) || 0.0) * 10 * zoomScale;
              const labelItemHeight = (parseFloat(etiquetaAltoMm) || 13) * zoomScale;

              return (
                <div style={{
                  background: '#FFFFFF',
                  border: '1.5px solid var(--border)',
                  borderRadius: 4,
                  boxShadow: 'var(--shadow-lg)',
                  width: letterWidth,
                  height: letterHeight,
                  paddingTop: `${letterPadTop}px`,
                  paddingBottom: `${letterPadBottom}px`,
                  paddingLeft: `${letterPadLeft}px`,
                  paddingRight: `${letterPadRight}px`,
                  boxSizing: 'border-box',
                  display: 'grid',
                  gridTemplateColumns: `repeat(4, ${gridColWidth}px)`,
                  columnGap: `${gridColGap}px`,
                  rowGap: `${gridRowGap}px`,
                  overflow: 'hidden',
                  transition: 'width 0.1s, height 0.1s',
                  margin: '24px auto'
                }}>
                  {Array.from({ length: 80 }).map((_, idx) => {
                    const isEven = idx % 2 === 0;
                    const mockCode = `UPEN-${isEven ? 'COMP' : 'LAPT'}-2026-${String(1001 + idx).padStart(4, '0')}`;
                    const mockBrand = isEven ? 'HP PROBOOK' : 'DELL LATITUDE';

                    return (
                      <div
                        key={idx}
                        style={{
                          width: `${gridColWidth}px`,
                          height: `${labelItemHeight}px`,
                          background: '#FFFFFF',
                          border: '0.2px solid #D1D5DB',
                          boxSizing: 'border-box',
                          padding: `${0.4 * zoomScale}px ${0.8 * zoomScale}px`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          overflow: 'hidden',
                          fontFamily: '"Inter", sans-serif',
                          lineHeight: 1.0,
                          color: '#000000'
                        }}
                      >
                        {/* Header */}
                        {etiquetaMostrarCabecera && (
                          <div style={{
                            fontSize: `${1.8 * zoomScale}px`,
                            fontWeight: etiquetaCabeceraBold ? 900 : 'normal',
                            fontStyle: etiquetaCabeceraItalic ? 'italic' : 'normal',
                            textTransform: 'uppercase',
                            color: '#1F2937',
                            width: '100%',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden'
                          }}>
                            {cabecera ? cabecera.replace('{siglas}', univAcronym) : `ACTIVO FIJO ${univAcronym}`}
                          </div>
                        )}

                        {/* Brand/Model */}
                        {etiquetaMostrarMarcaModelo && (
                          <div style={{
                            fontSize: `${1.6 * zoomScale}px`,
                            fontWeight: etiquetaMarcaBold ? 700 : 'normal',
                            fontStyle: etiquetaMarcaItalic ? 'italic' : 'normal',
                            color: '#4B5563',
                            width: '100%',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden'
                          }}>
                            {mockBrand}
                          </div>
                        )}

                        {/* Barcode representation */}
                        <div style={{
                          width: '90%',
                          height: `${3 * zoomScale}px`,
                          display: 'flex',
                          gap: `${0.3 * zoomScale}px`,
                          alignItems: 'center',
                          margin: `${0.2 * zoomScale}px 0`
                        }}>
                          {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2].map((w, i) => (
                            <div key={i} style={{ flex: w, height: '100%', background: i % 2 === 0 ? '#111827' : 'transparent' }} />
                          ))}
                        </div>

                        {/* Footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: `${1.8 * zoomScale}px` }}>
                          <span style={{
                            fontWeight: etiquetaCodigoBold ? 900 : 'normal',
                            fontStyle: etiquetaCodigoItalic ? 'italic' : 'normal',
                            fontFamily: 'monospace',
                            maxWidth: etiquetaMostrarSerial ? '55%' : '100%',
                            overflow: 'hidden'
                          }}>
                            {mockCode}
                          </span>
                          {etiquetaMostrarSerial && (
                            <span style={{
                              fontWeight: etiquetaSerialBold ? 900 : 'normal',
                              fontStyle: etiquetaSerialItalic ? 'italic' : 'normal',
                              color: '#4B5563',
                              fontFamily: 'monospace',
                              maxWidth: '45%',
                              overflow: 'hidden',
                              textAlign: 'right'
                            }}>
                              SN{100234 + idx}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}
