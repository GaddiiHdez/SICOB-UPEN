'use client';
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
  etiquetaLetraSerialPt, setEtiquetaLetraSerialPt
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>

      {/* Controles de Configuración */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
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
                
                {/* Ancho y Alto */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span>Ancho de Papel:</span>
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
                      <span>Alto de Papel:</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{etiquetaAltoMm} mm</span>
                    </div>
                    <input type="range" min="10" max="50" step="1"
                      value={etiquetaAltoMm}
                      onChange={e => setEtiquetaAltoMm(parseInt(e.target.value, 10))}
                      style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>
                </div>

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
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        alignItems: 'center',
        justifyContent: 'flex-start'
      }}>
        <div style={{ alignSelf: 'flex-start' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Vista Previa en Tiempo Real</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Previsualiza cómo se imprimirá físicamente el código de barras generado.
          </p>
        </div>

        <div style={{
          background: 'var(--bg-body)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          flex: 1,
          minHeight: 220
        }}>
          {(() => {
            const previewWidth = 240; // Ancho máximo del preview
            const previewHeight = (previewWidth * etiquetaAltoMm) / etiquetaAnchoMm;
            const scale = previewWidth / etiquetaAnchoMm; // Proporción de pixeles por milímetro
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
                boxSizing: 'border-box'
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
                  <div style={{ fontSize: `${ptToPx(etiquetaLetraCabeceraPt)}px`, fontWeight: 900, textTransform: 'uppercase', color: '#1F2937', letterSpacing: '0.01em', lineHeight: 1.0, width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                  <div style={{ fontSize: `${ptToPx(etiquetaLetraMarcaModeloPt)}px`, fontWeight: 700, textTransform: 'uppercase', color: '#4B5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.0, width: '100%' }}>
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
                  <span style={{ fontSize: `${ptToPx(etiquetaLetraCodigoPt)}px`, fontWeight: 900, fontFamily: 'monospace', color: '#000000', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: etiquetaMostrarSerial ? '55%' : '100%', textAlign: 'left' }}>
                    {generatePreviewCode(format, previewCategory)}
                  </span>
                  {etiquetaMostrarSerial && (
                    <span style={{ fontSize: `${ptToPx(etiquetaLetraSerialPt)}px`, fontWeight: 900, fontFamily: 'monospace', color: '#111827', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '45%', textAlign: 'right' }}>
                      S/N: 2UA6120F4Z
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

    </div>
  );
}
