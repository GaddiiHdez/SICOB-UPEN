'use client';
import { useState, useEffect } from 'react';
import { getCorrelativoPadding } from '@/lib/configHelpers';

export default function ModalAutogenerarLote({ configuracion, selectedCount, onClose, onConfirm }) {
  // Use the institutional template as the default value
  const defaultPlantilla = configuracion?.formato_codigo_inventario || 'UPEN-{CAT}-{YEAR}-{CORRELATIVO}';
  const [plantilla, setPlantilla] = useState(defaultPlantilla);
  const [correlativoInicial, setCorrelativoInicial] = useState('');
  const [previewCode, setPreviewCode] = useState('');

  // Live preview logic that updates on template or start-number changes
  useEffect(() => {
    if (!plantilla) {
      setPreviewCode('');
      return;
    }
    const catAbbr = 'COMP';
    const year = new Date().getFullYear().toString();
    const padding = getCorrelativoPadding(plantilla);
    
    const startNum = correlativoInicial !== '' && !isNaN(parseInt(correlativoInicial)) 
      ? parseInt(correlativoInicial) 
      : 1;
    
    const correlativoVal = startNum.toString().padStart(padding, '0');
    
    let result = plantilla;
    result = result.replace('{CAT}', catAbbr);
    result = result.replace('{YEAR}', year);
    
    const matchCorr = result.match(/\{CORRELATIVO(?::\d+)?\}/);
    if (matchCorr) {
      result = result.replace(matchCorr[0], correlativoVal);
    }
    setPreviewCode(result);
  }, [plantilla, correlativoInicial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      plantilla,
      correlativoInicial: correlativoInicial.trim() !== '' ? parseInt(correlativoInicial, 10) : undefined
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '90%' }}>
        
        {/* Encabezado */}
        <div className="modal-header">
          <div>
            <div className="modal-title">🔄 Autogenerar en Lote</div>
            <div className="modal-sub">Personaliza el formato y correlativo para {selectedCount} equipo{selectedCount > 1 ? 's' : ''}</div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Información / Instrucciones */}
            <div style={{ background: 'var(--bg-body, #F3F4F6)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
              <strong style={{ display: 'block', marginBottom: 4, color: 'var(--text-primary)' }}>💡 Variables admitidas:</strong>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li><code>{'{CAT}'}</code> : Siglas de la categoría (ej: <code>COMP</code>)</li>
                <li><code>{'{YEAR}'}</code> : Año actual (ej: <code>{new Date().getFullYear()}</code>)</li>
                <li><code>{'{CORRELATIVO}'}</code> o <code>{'{CORRELATIVO:N}'}</code> : Secuencia (ej: <code>{'{CORRELATIVO:5}'}</code> rellena a 5 dígitos).</li>
              </ul>
            </div>

            {/* Input Plantilla */}
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Plantilla de Formato
              </label>
              <input 
                type="text" 
                className="form-input" 
                value={plantilla} 
                onChange={e => setPlantilla(e.target.value)}
                placeholder="Ej: UPEN-{CAT}-{YEAR}-{CORRELATIVO}"
                required
                style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}
              />
            </div>

            {/* Input Correlativo Inicial */}
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Correlativo de Inicio (Opcional)
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={correlativoInicial} 
                onChange={e => setCorrelativoInicial(e.target.value)}
                placeholder="Ej: 1, 100, 250 (Dejar vacío para el siguiente libre)"
                min="1"
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted, #9CA3AF)', marginTop: 4, display: 'block' }}>
                Si se deja vacío, el sistema continuará la numeración consecutiva global de forma automática.
              </span>
            </div>

            {/* Vista Previa de Etiqueta (Premium Visual Mockup) */}
            <div style={{ marginTop: 8 }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Vista Previa del Primer Código
              </label>
              <div 
                style={{ 
                  background: 'linear-gradient(135deg, var(--bg-card, #FFFFFF) 0%, var(--bg-body, #F9FAFB) 100%)', 
                  border: '2px dashed var(--primary, #0D9488)', 
                  borderRadius: 12, 
                  padding: 16, 
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 110
                }}
              >
                {/* Background tag details */}
                <div style={{ position: 'absolute', top: 6, right: 10, fontSize: 8, color: 'var(--text-muted, #9CA3AF)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>
                  Demo Tag
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-secondary, #4B5563)', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ACTIVO FIJO - {configuracion?.siglas_institucion || 'UPEN'}
                </div>

                <div 
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: 16, 
                    fontWeight: 700, 
                    color: 'var(--primary, #0D9488)',
                    background: 'rgba(13, 148, 136, 0.08)',
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(13, 148, 136, 0.2)',
                    margin: '6px 0',
                    textAlign: 'center',
                    maxWidth: '100%',
                    wordBreak: 'break-all'
                  }}
                >
                  {previewCode || <span style={{ color: '#EF4444', fontStyle: 'italic', fontSize: 13 }}>Formato inválido</span>}
                </div>

                {/* Simulated barcode */}
                <div style={{ display: 'flex', gap: '2px', height: 16, marginTop: 4, opacity: 0.5 }}>
                  {[2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 2, 1, 4, 3, 1].map((w, i) => (
                    <div key={i} style={{ width: w, backgroundColor: 'var(--text-primary, #111827)', height: '100%' }} />
                  ))}
                </div>
              </div>
            </div>

          </div>

          <div className="modal-footer" style={{ marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={!previewCode}
              style={{ minWidth: 160 }}
            >
              🔄 Generar Códigos
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
