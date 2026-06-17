'use client';
import { useRef, useState } from 'react';

// ── Componente: Tarjeta de firma individual ────────────────────────────────
function FirmaCard({ role, icon, nombre, onNombreChange, puesto, onPuestoChange }) {
  return (
    <div style={{
      background: 'var(--bg-body)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}
      className="firma-card"
    >
      {/* Cabecera de la tarjeta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(13,148,136,0.15) 0%, rgba(13,148,136,0.05) 100%)',
          border: '1px solid rgba(13,148,136,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {role}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
            Aparece al calzar documentos y actas
          </div>
        </div>
      </div>

      {/* Separador */}
      <div style={{ borderBottom: '1px solid var(--border)' }} />

      {/* Campos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: 'var(--text-secondary)', textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: 6
          }}>
            Nombre completo
          </label>
          <input
            className="form-input"
            value={nombre}
            onChange={e => onNombreChange(e.target.value)}
            placeholder="Nombre del responsable"
            style={{ fontSize: 13 }}
          />
        </div>
        <div>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: 'var(--text-secondary)', textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: 6
          }}>
            Puesto / Cargo oficial
          </label>
          <input
            className="form-input"
            value={puesto}
            onChange={e => onPuestoChange(e.target.value)}
            placeholder="Cargo del responsable"
            style={{ fontSize: 13 }}
          />
        </div>
      </div>

      {/* Preview de cómo se verá en el documento */}
      {(nombre || puesto) && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          textAlign: 'center',
        }}>
          <div style={{ borderTop: '2px solid var(--text-primary)', width: 160, margin: '0 auto 8px' }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>
            {nombre || '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
            {puesto || '—'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1, opacity: 0.7 }}>
            Vista previa de firma
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function TabIdentidad({
  univName, setUnivName,
  univAcronym, setUnivAcronym,
  logoBase64, setLogoBase64,
  saving, onSave,
  firmaPatrimonioNombre, setFirmaPatrimonioNombre,
  firmaPatrimonioPuesto, setFirmaPatrimonioPuesto,
  firmaJefeNombre, setFirmaJefeNombre,
  firmaJefePuesto, setFirmaJefePuesto,
  firmaTecnicoNombre, setFirmaTecnicoNombre,
  firmaTecnicoPuesto, setFirmaTecnicoPuesto
}) {
  const logoInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen del logotipo supera el límite de 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setLogoBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const handleLogoChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleClearLogo = () => {
    setLogoBase64('');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  return (
    <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>

      {/* ── Sección 1: Perfil Institucional ─────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden'
      }}>
        {/* Header con gradiente */}
        <div style={{
          padding: '20px 28px',
          background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, transparent 60%)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 4px 12px rgba(13,148,136,0.3)', flexShrink: 0
          }}>
            🏫
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Perfil Institucional
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
              Nombre, siglas y logotipo oficial de la institución
            </p>
          </div>
        </div>

        <div style={{ padding: '28px', display: 'flex', gap: 32 }}>

          {/* Columna izquierda: datos */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.07em'
              }}>
                Nombre completo de la institución
              </label>
              <input
                className="form-input"
                value={univName}
                onChange={e => setUnivName(e.target.value)}
                required
                placeholder="Ej. Universidad Politécnica del Estado de Nayarit"
                style={{ fontSize: 14, fontWeight: 500 }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Aparece en cabeceras de reportes y documentos institucionales
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.07em'
              }}>
                Siglas / Acrónimo oficial
              </label>
              <input
                className="form-input"
                value={univAcronym}
                onChange={e => setUnivAcronym(e.target.value)}
                required
                placeholder="Ej. UPEN"
                style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.1em', maxWidth: 200, textAlign: 'center' }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Se usa en la generación de códigos de inventario
              </span>
            </div>

            {/* Vista previa del código con el acrónimo */}
            {univAcronym && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(13,148,136,0.03) 100%)',
                border: '1px solid rgba(13,148,136,0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{ fontSize: 20 }}>🏷️</div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Ejemplo de código generado
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, fontFamily: 'monospace',
                    color: 'var(--text-primary)', marginTop: 3, letterSpacing: '0.05em'
                  }}>
                    {univAcronym}-TEC-2026-0001
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha: logo */}
          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{
              fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.07em'
            }}>
              Logotipo oficial
            </label>

            {/* Zona de arrastre */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => logoInputRef.current?.click()}
              style={{
                flex: 1, minHeight: 180,
                border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                background: isDragging
                  ? 'rgba(13,148,136,0.06)'
                  : (logoBase64 ? 'var(--bg-body)' : 'var(--bg-body)'),
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.2s ease',
                overflow: 'hidden', position: 'relative', gap: 12
              }}
              className="logo-drop-zone"
            >
              {logoBase64 ? (
                <img
                  src={logoBase64}
                  alt="Logotipo institucional"
                  style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }}
                />
              ) : (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'rgba(13,148,136,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                  }}>
                    🖼️
                  </div>
                  <div style={{ textAlign: 'center', padding: '0 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Arrastra tu logo aquí
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      o haz clic para seleccionar
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
                      PNG · JPG · SVG · Máx 2MB
                    </div>
                  </div>
                </>
              )}

              {isDragging && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(13,148,136,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(2px)'
                }}>
                  <div style={{ fontSize: 32 }}>📥</div>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={logoInputRef}
              onChange={handleLogoChange}
              accept="image/*"
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => logoInputRef.current?.click()}
                style={{ flex: 1, fontSize: 12, padding: '8px', height: 'auto', border: '1px solid var(--border)' }}
              >
                📷 Cambiar
              </button>
              {logoBase64 && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleClearLogo}
                  style={{
                    fontSize: 12, padding: '8px 12px', height: 'auto',
                    background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                    border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer'
                  }}
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección 2: Firmas y Cargos ──────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 28px',
          background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, transparent 60%)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 4px 12px rgba(13,148,136,0.3)', flexShrink: 0
          }}>
            ✍️
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Firmas y Cargos Oficiales
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
              Configura los titulares que firmarán actas, vales y constancias de resguardo
            </p>
          </div>

          {/* Indicador de cuántas firmas están configuradas */}
          <div style={{ marginLeft: 'auto' }}>
            {(() => {
              const count = [firmaPatrimonioNombre, firmaJefeNombre, firmaTecnicoNombre].filter(Boolean).length;
              return (
                <div style={{
                  background: count === 3
                    ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  border: `1px solid ${count === 3 ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  color: count === 3 ? '#10B981' : '#D97706',
                  borderRadius: 'var(--radius-md)',
                  padding: '5px 12px',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  {count === 3 ? '✅' : '⚠️'} {count}/3 configuradas
                </div>
              );
            })()}
          </div>
        </div>

        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <FirmaCard
            role="Control de Bienes / Almacén"
            icon="📦"
            nombre={firmaPatrimonioNombre}
            onNombreChange={setFirmaPatrimonioNombre}
            puesto={firmaPatrimonioPuesto}
            onPuestoChange={setFirmaPatrimonioPuesto}
          />
          <FirmaCard
            role="Jefa/e de Departamento"
            icon="👔"
            nombre={firmaJefeNombre}
            onNombreChange={setFirmaJefeNombre}
            puesto={firmaJefePuesto}
            onPuestoChange={setFirmaJefePuesto}
          />
          <FirmaCard
            role="Técnico de Soporte"
            icon="🔧"
            nombre={firmaTecnicoNombre}
            onNombreChange={setFirmaTecnicoNombre}
            puesto={firmaTecnicoPuesto}
            onPuestoChange={setFirmaTecnicoPuesto}
          />
        </div>
      </div>

      {/* ── Botón guardar ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="submit"
          disabled={saving}
          className="btn btn-primary"
          style={{
            minWidth: 240, fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px 28px',
            boxShadow: saving ? 'none' : '0 4px 14px rgba(13,148,136,0.35)'
          }}
        >
          {saving ? (
            <>
              <span className="sync-pulse" style={{ backgroundColor: '#fff', boxShadow: 'none' }} />
              Guardando cambios…
            </>
          ) : (
            <>
              💾 Guardar Identidad Institucional
            </>
          )}
        </button>
      </div>

      {/* Estilos scoped */}
      <style>{`
        .firma-card:hover {
          border-color: rgba(13, 148, 136, 0.3);
          box-shadow: 0 4px 20px rgba(13,148,136,0.08);
        }
        .logo-drop-zone:hover {
          border-color: var(--primary);
          background: rgba(13, 148, 136, 0.04) !important;
        }
      `}</style>
    </form>
  );
}
