'use client';
import { useRef } from 'react';
import CatalogManager from '@/app/components/CatalogManager';

/**
 * TabSistema — Pestaña de Accesos y Respaldos
 *
 * Gestiona backups del sistema PostgreSQL, importación/exportación
 * y la gestión de usuarios operadores.
 * Antes era el bloque condicional `activeTab === 'sistema'`
 * en ConfiguracionPanel.jsx (líneas 763–975).
 *
 * @param {object[]} backupsList         - Lista de respaldos del servidor
 * @param {boolean}  loadingBackups      - Estado de carga de la lista
 * @param {boolean}  saving             - Si hay una operación de backup en curso
 * @param {number}   bienesCount        - Cantidad de bienes para el widget de estatus
 * @param {Function} onCreateBackup      - Crear instantánea
 * @param {Function} onExportDatabase    - Exportar + descargar
 * @param {Function} onImportFileClick   - Trigger del input de archivo
 * @param {Function} onImportFile        - Handler al seleccionar archivo
 * @param {Function} onTriggerRestore    - Abrir modal de confirmación de restauración
 * @param {Function} onDownloadBackup    - Descargar respaldo
 * @param {Function} onDeleteBackup      - Eliminar respaldo
 * @param {React.Ref} fileInputRef       - Ref del input oculto de archivos
 */
export default function TabSistema({
  backupsList, loadingBackups, saving, bienesCount,
  onCreateBackup, onExportDatabase, onImportFileClick, onImportFile,
  onTriggerRestore, onDownloadBackup, onDeleteBackup,
  fileInputRef
}) {
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
              Monitorea la integridad de tu base de datos PostgreSQL de GDI UPEN y gestiona copias de seguridad portátiles.
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
          fields={[
            { name: 'nombre', label: 'Nombre Completo del Operador', required: true },
            { name: 'correo', label: 'Correo de Acceso (Institucional)', type: 'email', required: true },
            { name: 'rol', label: 'Rol / Nivel de Acceso', type: 'select', options: [{ label: 'Usuario (Consulta y Edición)', value: 'USUARIO' }, { label: 'Administrador (Control Total)', value: 'ADMINISTRADOR' }], defaultValue: 'USUARIO' },
            { name: 'password', label: 'Nueva Contraseña (Opcional - por defecto: upen123)', type: 'password' }
          ]}
        />
      </div>

    </div>
  );
}
