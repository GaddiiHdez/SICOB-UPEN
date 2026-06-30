'use client';
import { useState, useRef } from 'react';
import CatalogManager from '@/app/components/CatalogManager';

/**
 * TabSistema — Pestaña de Accesos y Respaldos
 *
 * Gestiona backups del sistema PostgreSQL, importación/exportación
 * y la gestión de usuarios operadores (con generación de código de reset).
 */
export default function TabSistema({
  backupsList, loadingBackups, saving, bienesCount,
  onCreateBackup, onExportDatabase, onImportFileClick, onImportFile,
  onTriggerRestore, onDownloadBackup, onDeleteBackup,
  fileInputRef
}) {
  // ── Estado del modal de restablecimiento ──────────────────────
  const [resetModal, setResetModal] = useState(false);
  const [resetCorreo, setResetCorreo] = useState('');
  const [resetResult, setResetResult] = useState(null); // { token, nombreUsuario, expiresAt }
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [copied, setCopied] = useState(false);

  const openResetModal = (correo = '') => {
    setResetCorreo(correo);
    setResetResult(null);
    setResetError(null);
    setCopied(false);
    setResetModal(true);
  };

  const closeResetModal = () => {
    setResetModal(false);
    setResetCorreo('');
    setResetResult(null);
    setResetError(null);
    setCopied(false);
  };

  const handleGenerarCodigo = async () => {
    if (!resetCorreo) return;
    setResetLoading(true);
    setResetError(null);
    setResetResult(null);
    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: resetCorreo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar el código');
      setResetResult(data);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopiarToken = () => {
    if (resetResult?.token) {
      navigator.clipboard.writeText(resetResult.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const expiraEn = resetResult
    ? Math.round((new Date(resetResult.expiresAt) - Date.now()) / 60000)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Estatus del sistema + acciones de dump */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)',
          padding: '24px', display: 'flex', flexDirection: 'column', gap: 16
        }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Estatus del Sistema</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Monitorea la integridad de tu base de datos PostgreSQL de SICOB UPEN y gestiona copias de seguridad portátiles.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-body)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>PostgreSQL DB Estatus</div>
              <div style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>🟢 Activo y Sincronizado</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Total de Activos</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{bienesCount} bienes registrados</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onCreateBackup} disabled={saving} className="btn btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12 }}>
              💾 {saving ? 'Generando...' : 'Crear Instantánea'}
            </button>
            <button type="button" onClick={onExportDatabase} disabled={saving} className="btn btn-ghost"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, border: '1px solid var(--border)' }}>
              📥 Exportar (Descargar)
            </button>
            <button type="button" onClick={onImportFileClick} className="btn btn-ghost"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, border: '1px solid var(--border)' }}>
              📤 Importar (Subir)
            </button>
            <input type="file" ref={fileInputRef} accept=".json" onChange={onImportFile} style={{ display: 'none' }} />
          </div>
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)',
          padding: '24px', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12
        }}>
          <div style={{ fontSize: 32 }}>🛡️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Gestión Segura de Respaldos</div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 220, lineHeight: 1.4 }}>
            Crea una copia física en el disco del servidor antes de realizar auditorías globales. Puedes descargarla o revertir en cualquier momento.
          </p>
        </div>

      </div>

      {/* Historial de instantáneas */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)',
        padding: '24px', display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Instantáneas Guardadas en Servidor</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Historial de respaldos almacenados localmente. Puedes revertir el sistema a cualquiera de estos estados.
          </p>
        </div>

        {loadingBackups ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
            Cargando historial de respaldos...
          </div>
        ) : backupsList.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)',
            fontSize: 12, border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-body)'
          }}>
            🗄️ No se encontraron instantáneas locales en el servidor. Crea una usando el botón &quot;Crear Instantánea&quot;.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                  {['Nombre del Archivo', 'Fecha de Creación', 'Tamaño', 'Acciones'].map((h, i) => (
                    <th key={h} style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)', textAlign: i === 3 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backupsList.map(b => (
                  <tr key={b.filename} style={{ borderBottom: '1px solid var(--border)' }} className="table-row-hover">
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{b.filename}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{new Date(b.timestamp).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{(b.sizeBytes / 1024).toFixed(2)} KB</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => onTriggerRestore(b.filename)} className="btn"
                          style={{ fontSize: 11, padding: '4px 8px', height: 'auto', background: 'rgba(13, 148, 136, 0.1)', color: 'var(--primary)', border: '1px solid rgba(13, 148, 136, 0.15)', cursor: 'pointer' }}
                          title="Revertir base de datos a este estado">🔄 Revertir</button>
                        <button type="button" onClick={() => onDownloadBackup(b.filename)} className="btn"
                          style={{ fontSize: 11, padding: '4px 8px', height: 'auto', background: 'var(--bg-body)', border: '1px solid var(--border)', cursor: 'pointer' }}
                          title="Descargar archivo a tu PC">📥 Descargar</button>
                        <button type="button" onClick={() => onDeleteBackup(b.filename)} className="btn"
                          style={{ fontSize: 11, padding: '4px 8px', height: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.15)', cursor: 'pointer' }}
                          title="Eliminar del servidor">🗑️ Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gestión de Operadores */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', overflow: 'hidden'
      }}>
        <CatalogManager
          title="Gestión de Accesos al Sistema"
          subtitle="Cuentas autorizadas para iniciar sesión, administrar inventarios y firmar actas"
          icon="🔐"
          endpoint="/api/usuarios"
          isAdmin={true}
          fields={[
            { name: 'nombre', label: 'Nombre Completo del Operador', required: true },
            { name: 'correo', label: 'Correo de Acceso (Institucional)', type: 'email', required: true },
            { name: 'rol', label: 'Rol / Nivel de Acceso', type: 'select', options: [{ label: 'Usuario (Consulta y Edición)', value: 'USUARIO' }, { label: 'Administrador (Control Total)', value: 'ADMINISTRADOR' }], defaultValue: 'USUARIO' },
            { name: 'password', label: 'Nueva Contraseña (Opcional)', type: 'password' }
          ]}
          extraRowAction={(item) => (
            <button
              type="button"
              onClick={() => openResetModal(item.correo)}
              className="btn"
              style={{
                fontSize: 11, padding: '4px 10px', height: 'auto',
                background: 'rgba(245, 158, 11, 0.1)', color: '#D97706',
                border: '1px solid rgba(245, 158, 11, 0.25)', cursor: 'pointer',
                borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 4
              }}
              title="Generar código de restablecimiento de contraseña"
            >
              🔑 Generar código
            </button>
          )}
        />
      </div>

      {/* ── Modal: Generar código de restablecimiento ─────────────── */}
      {resetModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
          onClick={(e) => { if (e.target === e.currentTarget) closeResetModal(); }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)', boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            padding: '32px', width: '100%', maxWidth: 440,
            display: 'flex', flexDirection: 'column', gap: 20
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  🔑 Generar Código de Acceso
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  El usuario podrá usarlo para restablecer su contraseña desde el login.
                </p>
              </div>
              <button type="button" onClick={closeResetModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-secondary)', lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* Input correo */}
            {!resetResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Correo del usuario
                </label>
                <input
                  id="reset-correo-input"
                  type="email"
                  value={resetCorreo}
                  onChange={(e) => setResetCorreo(e.target.value)}
                  placeholder="usuario@upnay.edu.mx"
                  style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', background: 'var(--bg-body)',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%'
                  }}
                />
                {resetError && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    color: '#EF4444', fontSize: 12
                  }}>
                    ⚠️ {resetError}
                  </div>
                )}
                <button
                  id="reset-generar-btn"
                  type="button"
                  onClick={handleGenerarCodigo}
                  disabled={resetLoading || !resetCorreo}
                  className="btn btn-primary"
                  style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {resetLoading ? '⏳ Generando...' : '🔑 Generar código'}
                </button>
              </div>
            )}

            {/* Resultado: mostrar token */}
            {resetResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  padding: '20px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 12, color: '#10B981', fontWeight: 600, marginBottom: 8 }}>
                    ✅ Código generado para {resetResult.nombreUsuario}
                  </div>
                  <div style={{
                    fontSize: 42, fontWeight: 800, letterSpacing: '0.25em',
                    color: 'var(--text-primary)', fontFamily: 'monospace',
                    padding: '12px 0'
                  }}>
                    {resetResult.token}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                    ⏱ Válido por aprox. {expiraEn} minutos
                  </div>
                </div>

                <div style={{
                  padding: '12px 16px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)',
                  fontSize: 12, color: '#D97706', lineHeight: 1.5
                }}>
                  📲 <strong>Comparte este código</strong> con {resetResult.nombreUsuario} por WhatsApp, teléfono u otro medio seguro. El usuario lo ingresará en el formulario de &quot;¿Olvidaste tu contraseña?&quot; del login.
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    id="reset-copiar-btn"
                    type="button"
                    onClick={handleCopiarToken}
                    className="btn btn-primary"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {copied ? '✅ Copiado' : '📋 Copiar código'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setResetResult(null); setResetError(null); }}
                    className="btn btn-ghost"
                    style={{ flex: 1, border: '1px solid var(--border)' }}
                  >
                    🔄 Generar otro
                  </button>
                </div>

                <button type="button" onClick={closeResetModal}
                  className="btn btn-ghost"
                  style={{ border: '1px solid var(--border)' }}>
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
