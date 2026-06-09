'use client';
import { useRef } from 'react';

/**
 * TabIdentidad — Pestaña de Identidad Institucional
 *
 * Gestiona el nombre, acrónimo y logotipo de la institución.
 * Antes era el bloque condicional `activeTab === 'identidad'`
 * en ConfiguracionPanel.jsx (líneas 658–760).
 *
 * @param {string}   univName       - Nombre completo de la institución
 * @param {Function} setUnivName    - Setter del nombre
 * @param {string}   univAcronym    - Siglas oficiales
 * @param {Function} setUnivAcronym - Setter del acrónimo
 * @param {string}   logoBase64     - Imagen del logo en base64
 * @param {Function} setLogoBase64  - Setter del logo
 * @param {boolean}  saving         - Si se está guardando
 * @param {Function} onSave         - Callback de guardado (event handler)
 */
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

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
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

  const handleClearLogo = () => {
    setLogoBase64('');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  return (
    <div style={{ maxWidth: 650, margin: '0 auto', width: '100%' }}>
      <form onSubmit={onSave} style={{
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
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Perfil Institucional</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Personaliza los datos, acrónimos y logotipos de resguardos del sistema.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Nombre de la Institución:</label>
            <input className="form-input" value={univName} onChange={e => setUnivName(e.target.value)}
              required placeholder="Ej. Universidad Politécnica" />
          </div>

          <div>
            <label className="form-label">Siglas oficiales (Acrónimo):</label>
            <input className="form-input" value={univAcronym} onChange={e => setUnivAcronym(e.target.value)}
              required placeholder="Ej. UPEN" />
          </div>

          {/* Subida del Logotipo */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
            <label className="form-label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Logotipo Oficial:</label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Vista Previa del Logo */}
              <div style={{
                width: 70, height: 70, borderRadius: 8,
                border: '1px solid var(--border)', background: '#F9FAFB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0
              }}>
                {logoBase64
                  ? <img src={logoBase64} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <span style={{ fontSize: 24 }}>🏫</span>
                }
              </div>

              <div style={{ flex: 1 }}>
                <input type="file" ref={logoInputRef} onChange={handleLogoChange}
                  accept="image/*" style={{ display: 'none' }} />

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost"
                    onClick={() => logoInputRef.current?.click()}
                    style={{ fontSize: 11, padding: '6px 12px', height: 'auto' }}>
                    📷 Subir Imagen
                  </button>
                  {logoBase64 && (
                    <button type="button" className="btn" onClick={handleClearLogo}
                      style={{ fontSize: 11, padding: '6px 12px', height: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                      🗑️ Quitar
                    </button>
                  )}
                </div>

                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 6 }}>
                  PNG o JPG recomendado con fondo transparente. Máx 2MB.
                </div>
              </div>
            </div>
          </div>

          {/* Firmas y Cargos Oficiales */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Firmas y Cargos Oficiales</h4>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                Configura los nombres y puestos oficiales que aparecerán al calzar las firmas en actas, vales y constancias.
              </p>
            </div>

            {/* 1. Control de Bienes / Almacén */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Firma: Control de Bienes (Nombre)</label>
                <input className="form-input" value={firmaPatrimonioNombre} onChange={e => setFirmaPatrimonioNombre(e.target.value)}
                  placeholder="Nombre del responsable" />
              </div>
              <div>
                <label className="form-label">Puesto / Cargo</label>
                <input className="form-input" value={firmaPatrimonioPuesto} onChange={e => setFirmaPatrimonioPuesto(e.target.value)}
                  placeholder="Cargo del responsable" />
              </div>
            </div>

            {/* 2. Jefe del Departamento */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Firma: Jefa/e de Departamento (Nombre)</label>
                <input className="form-input" value={firmaJefeNombre} onChange={e => setFirmaJefeNombre(e.target.value)}
                  placeholder="Nombre de la/el jefa/e" />
              </div>
              <div>
                <label className="form-label">Puesto / Cargo</label>
                <input className="form-input" value={firmaJefePuesto} onChange={e => setFirmaJefePuesto(e.target.value)}
                  placeholder="Cargo oficial" />
              </div>
            </div>

            {/* 3. Técnico de Soporte */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Firma: Técnico de Soporte (Nombre)</label>
                <input className="form-input" value={firmaTecnicoNombre} onChange={e => setFirmaTecnicoNombre(e.target.value)}
                  placeholder="Nombre del técnico" />
              </div>
              <div>
                <label className="form-label">Puesto / Cargo</label>
                <input className="form-input" value={firmaTecnicoPuesto} onChange={e => setFirmaTecnicoPuesto(e.target.value)}
                  placeholder="Cargo del técnico" />
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>
          {saving ? '⏳ Guardando Perfil…' : '💾 Guardar Datos Institucionales'}
        </button>
      </form>
    </div>
  );
}
