'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, User } from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────
const ROL_CONFIG = {
  ADMINISTRADOR: {
    label: 'Administrador',
    sub: 'Control Total',
    icon: Shield,
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    color: '#059669',
  },
  USUARIO: {
    label: 'Usuario',
    sub: 'Consulta y Edición',
    icon: User,
    gradient: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
    bg: 'rgba(13,148,136,0.08)',
    border: 'rgba(13,148,136,0.2)',
    color: 'var(--primary)',
  },
};

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

// ── Tarjeta de usuario ─────────────────────────────────────────────────────
function UserCard({ user, onEdit, onDelete, onReset }) {
  const rol = ROL_CONFIG[user.rol] || ROL_CONFIG.USUARIO;
  const initials = getInitials(user.nombre);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
      display: 'flex',
      flexDirection: 'column',
    }}
      className="user-card-hover"
    >
      {/* Banda de color superior */}
      <div style={{ height: 4, background: rol.gradient }} />

      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Avatar + nombre + correo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%',
            background: rol.gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff',
            letterSpacing: '-0.02em', flexShrink: 0,
            boxShadow: `0 4px 14px ${rol.color}44`
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.01em', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {user.nombre}
            </div>
            <div style={{
              fontSize: 12, color: 'var(--text-secondary)', marginTop: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {user.correo}
            </div>
          </div>
        </div>

        {/* Badge de rol */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: rol.bg, border: `1px solid ${rol.border}`,
          borderRadius: 'var(--radius-md)', padding: '7px 12px',
          alignSelf: 'flex-start'
        }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(rol.icon, { size: 14 })}
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: rol.color, lineHeight: 1 }}>
              {rol.label}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              {rol.sub}
            </div>
          </div>
        </div>
      </div>

      {/* Footer de acciones */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex', gap: 8, background: 'var(--bg-body)'
      }}>
        <button
          type="button"
          onClick={() => onReset(user)}
          title="Generar código de restablecimiento"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px', borderRadius: 'var(--radius-md)',
            background: 'rgba(245,158,11,0.1)', color: '#D97706',
            border: '1px solid rgba(245,158,11,0.25)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s ease', flex: 1,
            justifyContent: 'center'
          }}
          className="btn-action-amber"
        >
          🔑 Código
        </button>
        <button
          type="button"
          onClick={() => onEdit(user)}
          title="Editar usuario"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 12px', borderRadius: 'var(--radius-md)',
            background: 'rgba(13,148,136,0.1)', color: 'var(--primary)',
            border: '1px solid rgba(13,148,136,0.2)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s ease', flex: 1,
            justifyContent: 'center'
          }}
          className="btn-action-teal"
        >
          ✏️ Editar
        </button>
        <button
          type="button"
          onClick={() => onDelete(user)}
          title="Eliminar usuario"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 10px', borderRadius: 'var(--radius-md)',
            background: 'rgba(239,68,68,0.08)', color: '#EF4444',
            border: '1px solid rgba(239,68,68,0.15)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          className="btn-action-red"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// ── Modal: Crear / Editar usuario ──────────────────────────────────────────
function UserModal({ mode, user, onClose, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    correo: user?.correo || '',
    rol: user?.rol || 'USUARIO',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = isEdit ? { id: user.id, ...form } : form;
      const res = await fetch('/api/usuarios', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        width: '100%', maxWidth: 480, overflow: 'hidden',
        animation: 'slideDown 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          background: isEdit
            ? 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, transparent 60%)'
            : 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, transparent 60%)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: isEdit
              ? 'linear-gradient(135deg, var(--primary) 0%, #0891b2 100%)'
              : 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: isEdit
              ? '0 4px 12px rgba(13,148,136,0.3)'
              : '0 4px 12px rgba(13,148,136,0.3)',
            flexShrink: 0
          }}>
            {isEdit ? '✏️' : '➕'}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {isEdit ? 'Editar Operador' : 'Nuevo Operador'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
              {isEdit ? `Modificando: ${user.nombre}` : 'Crear una nueva cuenta de acceso al sistema'}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: 'var(--text-secondary)', transition: 'all 0.15s'
          }}>✕</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: 'var(--radius-md)',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#EF4444', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8
              }}>
                ⚠️ {error}
              </div>
            )}

            {[
              { name: 'nombre', label: 'Nombre completo del operador', placeholder: 'Ej. Juan García López', type: 'text', required: true },
              { name: 'correo', label: 'Correo institucional', placeholder: 'usuario@upnay.edu.mx', type: 'email', required: true },
            ].map(f => (
              <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {f.label}
                </label>
                <input
                  className="form-input"
                  type={f.type}
                  value={form[f.name]}
                  onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                  placeholder={f.placeholder}
                  required={f.required}
                  disabled={saving}
                />
              </div>
            ))}

            {/* Rol */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Rol / Nivel de acceso
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {Object.entries(ROL_CONFIG).map(([val, cfg]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, rol: val }))}
                    disabled={saving}
                    style={{
                      padding: '12px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      background: form.rol === val ? cfg.bg : 'var(--bg-body)',
                      border: `2px solid ${form.rol === val ? cfg.color : 'var(--border)'}`,
                      transition: 'all 0.15s ease', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {React.createElement(cfg.icon, { size: 20 })}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: form.rol === val ? cfg.color : 'var(--text-primary)' }}>
                        {cfg.label}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{cfg.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contraseña */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña inicial (opcional)'}
              </label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder={isEdit ? 'Dejar vacío para no cambiarla' : 'Si se omite, se asigna la predeterminada'}
                disabled={saving}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{
            padding: '16px 28px 24px',
            display: 'flex', gap: 10, borderTop: '1px solid var(--border)'
          }}>
            <button
              type="button" onClick={onClose} disabled={saving}
              style={{
                flex: 1, padding: '12px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-body)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="btn btn-primary"
              style={{
                flex: 2, padding: '12px', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: saving ? 'none' : '0 4px 14px rgba(13,148,136,0.3)'
              }}
            >
              {saving ? (
                <><span className="sync-pulse" style={{ backgroundColor: '#fff', boxShadow: 'none' }} /> Guardando…</>
              ) : (
                isEdit ? '💾 Guardar cambios' : '✅ Crear operador'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Generar código de restablecimiento ──────────────────────────────
function ResetModal({ user, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerar = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: user.correo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar el código');
      setResult(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleCopiar = () => {
    if (result?.token) {
      navigator.clipboard.writeText(result.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const expiraEn = result ? Math.round((new Date(result.expiresAt) - Date.now()) / 60000) : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        width: '100%', maxWidth: 440, overflow: 'hidden',
        animation: 'slideDown 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, transparent 60%)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 4px 12px rgba(245,158,11,0.35)', flexShrink: 0
          }}>🔑</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Código de Restablecimiento
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
              Para: <strong style={{ color: 'var(--text-primary)' }}>{user.nombre}</strong>
            </p>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: 'var(--text-secondary)'
          }}>✕</button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Info del usuario */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-body)', border: '1px solid var(--border)'
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: ROL_CONFIG[user.rol]?.gradient || ROL_CONFIG.USUARIO.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0
            }}>
              {getInitials(user.nombre)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.nombre}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user.correo}</div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#EF4444', fontSize: 12
            }}>⚠️ {error}</div>
          )}

          {/* Resultado: token */}
          {result ? (
            <>
              <div style={{
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                border: '1px solid rgba(16,185,129,0.25)',
              }}>
                <div style={{
                  padding: '12px 16px', background: 'rgba(16,185,129,0.08)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ fontSize: 14 }}>✅</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#10B981' }}>
                    Código generado exitosamente
                  </span>
                </div>
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-body)' }}>
                  <div style={{
                    fontSize: 48, fontWeight: 900, letterSpacing: '0.3em',
                    fontFamily: 'monospace', color: 'var(--text-primary)',
                    textShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    padding: '8px 0'
                  }}>
                    {result.token}
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 'var(--radius-md)', padding: '4px 12px',
                    fontSize: 11, color: '#D97706', fontWeight: 600, marginTop: 8
                  }}>
                    ⏱ Válido por ~{expiraEn} minutos
                  </div>
                </div>
              </div>

              <div style={{
                padding: '12px 16px', borderRadius: 'var(--radius-md)',
                background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)',
                fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6
              }}>
                📲 Comparte este código con <strong style={{ color: 'var(--text-primary)' }}>{result.nombreUsuario}</strong> vía WhatsApp o teléfono. El usuario lo ingresará en <em>"¿Olvidaste tu contraseña?"</em> del login.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button" onClick={handleCopiar}
                  style={{
                    padding: '12px', borderRadius: 'var(--radius-md)',
                    background: copied ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, var(--primary) 0%, #0891b2 100%)',
                    border: copied ? '1px solid rgba(16,185,129,0.3)' : 'none',
                    color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: copied ? 'none' : '0 4px 14px rgba(13,148,136,0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {copied ? '✅ ¡Copiado!' : '📋 Copiar código'}
                </button>
                <button
                  type="button"
                  onClick={() => { setResult(null); setError(null); }}
                  style={{
                    padding: '12px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-body)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  🔄 Generar otro
                </button>
              </div>

              <button type="button" onClick={onClose} style={{
                padding: '11px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-body)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', width: '100%', transition: 'all 0.15s'
              }}>
                Cerrar
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                Al generar el código, el usuario podrá usarlo en la pantalla de login para establecer una nueva contraseña. El código expira en <strong style={{ color: 'var(--text-primary)' }}>30 minutos</strong>.
              </p>
              <button
                id="reset-generar-btn"
                type="button"
                onClick={handleGenerar}
                disabled={loading}
                style={{
                  padding: '14px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  border: 'none', color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(245,158,11,0.4)',
                  transition: 'all 0.2s ease', opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? (
                  <><span className="sync-pulse" style={{ backgroundColor: '#fff', boxShadow: 'none' }} /> Generando…</>
                ) : '🔑 Generar código ahora'}
              </button>
              <button type="button" onClick={onClose} style={{
                padding: '11px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-body)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', width: '100%'
              }}>
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function TabAccesos() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { type: 'create'|'edit'|'reset', user? }
  const [toast, setToast] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) setUsers(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = async (user) => {
    if (!confirm(`¿Eliminar el acceso de "${user.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/usuarios?id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Acceso de ${user.nombre} eliminado`);
      fetchUsers();
    } catch (err) { showToast(err.message, 'error'); }
  };

  const admins = users.filter(u => u.rol === 'ADMINISTRADOR');
  const operadores = users.filter(u => u.rol === 'USUARIO');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header de sección ──────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 28px',
          background: 'linear-gradient(135deg, rgba(13,148,136,0.07) 0%, transparent 60%)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: '0 4px 14px rgba(13,148,136,0.35)', flexShrink: 0
          }}>🔐</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Gestión de Accesos al Sistema
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Cuentas autorizadas para iniciar sesión, administrar inventarios y firmar actas
            </p>
          </div>

          {/* Stats rápidas */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Total', value: users.length, color: 'var(--primary)', bg: 'rgba(13,148,136,0.1)', border: 'rgba(13,148,136,0.2)' },
              { label: 'Admins', value: admins.length, color: '#059669', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
              { label: 'Usuarios', value: operadores.length, color: 'var(--primary)', bg: 'rgba(13,148,136,0.1)', border: 'rgba(13,148,136,0.2)' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, border: `1px solid ${s.border}`,
                borderRadius: 'var(--radius-md)', padding: '8px 14px', textAlign: 'center'
              }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setModal({ type: 'create' })}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 20px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
              transition: 'all 0.2s ease', whiteSpace: 'nowrap'
            }}
            className="btn-create-user"
          >
            ＋ Nuevo Operador
          </button>
        </div>

        {/* Tabla premium de usuarios */}
        <div style={{ padding: '0' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="dash-pulse" style={{ margin: '0 auto 12px', width: 12, height: 12 }} />
              Cargando operadores…
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Sin operadores registrados</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Crea el primero con el botón "Nuevo Operador"</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                  {['Operador', 'Correo institucional', 'Rol', 'Acciones'].map((h, i) => (
                    <th key={h} style={{
                      padding: '13px 24px', fontSize: 11, fontWeight: 700,
                      color: 'var(--text-secondary)', textTransform: 'uppercase',
                      letterSpacing: '0.06em', textAlign: i === 3 ? 'right' : 'left'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => {
                  const rol = ROL_CONFIG[u.rol] || ROL_CONFIG.USUARIO;
                  return (
                    <tr key={u.id} style={{
                      borderBottom: idx === users.length - 1 ? 'none' : '1px solid var(--border)',
                      transition: 'background 0.15s'
                    }}
                      className="hover-highlight"
                    >
                      {/* Operador */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            background: rol.gradient,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0
                          }}>
                            {getInitials(u.nombre)}
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                            {u.nombre}
                          </span>
                        </div>
                      </td>

                      {/* Correo */}
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.correo}</span>
                      </td>

                      {/* Rol */}
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: rol.bg, border: `1px solid ${rol.border}`,
                          borderRadius: 'var(--radius-md)', padding: '5px 12px'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center' }}>
                            {React.createElement(rol.icon, { size: 13 })}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: rol.color }}>
                            {rol.label}
                          </span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button type="button"
                            onClick={() => setModal({ type: 'reset', user: u })}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '7px 12px', borderRadius: 'var(--radius-md)',
                              background: 'rgba(245,158,11,0.1)', color: '#D97706',
                              border: '1px solid rgba(245,158,11,0.25)',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                            }}
                            className="btn-action-amber"
                          >
                            🔑 Código
                          </button>
                          <button type="button"
                            onClick={() => setModal({ type: 'edit', user: u })}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '7px 12px', borderRadius: 'var(--radius-md)',
                              background: 'rgba(13,148,136,0.1)', color: 'var(--primary)',
                              border: '1px solid rgba(13,148,136,0.2)',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                            }}
                            className="btn-action-teal"
                          >
                            ✏️ Editar
                          </button>
                          <button type="button"
                            onClick={() => handleDelete(u)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '7px 10px', borderRadius: 'var(--radius-md)',
                              background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                              border: '1px solid rgba(239,68,68,0.15)',
                              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                            }}
                            className="btn-action-red"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modales ────────────────────────────────────────────────────── */}
      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <UserModal
          mode={modal.type}
          user={modal.user}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            showToast(modal.type === 'edit' ? 'Operador actualizado correctamente' : 'Operador creado exitosamente');
            fetchUsers();
          }}
        />
      )}
      {modal?.type === 'reset' && (
        <ResetModal user={modal.user} onClose={() => setModal(null)} />
      )}

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── Estilos scoped ─────────────────────────────────────────────── */}
      <style>{`
        .btn-action-amber:hover { background: rgba(245,158,11,0.2) !important; }
        .btn-action-teal:hover  { background: rgba(13,148,136,0.2) !important; }
        .btn-action-red:hover   { background: rgba(239,68,68,0.15) !important; }
        .btn-create-user:hover  { opacity: 0.88; transform: translateY(-1px); }
        .user-card-hover:hover  {
          box-shadow: 0 8px 28px rgba(0,0,0,0.12);
          border-color: rgba(13,148,136,0.25);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
