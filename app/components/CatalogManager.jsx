'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * Gestor Genérico de Catálogos (CRUD) - Premium Design
 * Props:
 * - title: Título del panel
 * - subtitle: Subtítulo
 * - endpoint: URL base de la API (ej. '/api/categorias')
 * - icon: Emoji icono
 * - fields: [{ name: 'nombre', label: 'Nombre', type: 'text', required: true }]
 */
export default function CatalogManager({ title, subtitle, endpoint, icon, fields, isAdmin = false, extraRowAction = null }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  
  // Estado del formulario (dinámico basado en `fields`)
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Error al cargar datos');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
      showToast('Error de conexión', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchData();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchData]);

  const handleOpenModal = (item = null) => {
    if (item) {
      setIsEdit(true);
      setForm({ ...item });
    } else {
      setIsEdit(false);
      const initialForm = {};
      fields.forEach(f => initialForm[f.name] = f.defaultValue || '');
      setForm(initialForm);
    }
    setShowEmojiPicker(false);
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'Error al guardar');
      
      showToast(`Registro ${isEdit ? 'actualizado' : 'creado'} exitosamente`);
      setShowModal(false);
      fetchData();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.')) return;
    
    try {
      const res = await fetch(`${endpoint}?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al eliminar');
      
      showToast('Registro eliminado exitosamente');
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={{ padding: '0 24px 24px', width: '100%' }}>
      
      {/* Header del Catálogo */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, transparent 60%)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
        padding: '20px 28px', marginBottom: 24, gap: 16, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, boxShadow: '0 4px 12px rgba(13,148,136,0.3)', flexShrink: 0
          }}>{icon}</div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{title}</h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>{subtitle}</div>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 18px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(13,148,136,0.3)',
              transition: 'all 0.2s ease', whiteSpace: 'nowrap'
            }}
            className="btn-create-catalog"
          >
            ＋ Nuevo Registro
          </button>
        )}
      </div>

      {/* Tabla */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
              {fields.filter(f => f.name !== 'icono').map(f => (
                <th 
                  key={f.name} 
                  style={{ 
                    padding: '14px 24px', 
                    fontSize: '11px', 
                    fontWeight: '700', 
                    color: 'var(--text-secondary)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                  }}
                >
                  {f.label}
                </th>
              ))}
              {(isAdmin || extraRowAction) && (
                <th 
                  style={{ 
                    padding: '14px 24px', 
                    fontSize: '11px', 
                    fontWeight: '700', 
                    color: 'var(--text-secondary)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    width: 280, 
                    textAlign: 'right' 
                  }}
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={fields.filter(f => f.name !== 'icono').length + (isAdmin || extraRowAction ? 1 : 0)} style={{ textAlign: 'center', padding: '50px 24px', color: 'var(--text-secondary)' }}>
                  <div className="dash-pulse" style={{ margin: '0 auto 12px', width: 12, height: 12 }}></div>
                  Cargando registros...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={fields.filter(f => f.name !== 'icono').length + (isAdmin || extraRowAction ? 1 : 0)} style={{ textAlign: 'center', padding: '50px 24px', color: 'var(--text-secondary)', fontSize: 13 }}>
                  No hay registros. Crea el primero.
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr 
                  key={row.id}
                  style={{ 
                    borderBottom: idx === data.length - 1 ? 'none' : '1px solid var(--border)',
                    transition: 'background-color 0.2s',
                  }}
                  className="hover-highlight"
                >
                  {fields.filter(f => f.name !== 'icono').map((f, fIdx) => {
                    let displayVal = row[f.name];
                    if (f.type === 'select' && f.options) {
                      const match = f.options.find(opt => String(opt.value) === String(row[f.name]));
                      if (match) displayVal = match.label;
                    }
                    const isFirst = fIdx === 0;
                    return (
                      <td 
                        key={f.name} 
                        style={{ 
                          padding: '14px 24px', 
                          fontSize: isFirst ? '13.5px' : '13px', 
                          fontWeight: isFirst ? '600' : '400',
                          color: isFirst ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                      >
                        {isFirst ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: 'rgba(13,148,136,0.08)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 16, border: '1px solid rgba(13,148,136,0.2)', flexShrink: 0
                            }}>
                              {row.icono || icon}
                            </div>
                            <span>{displayVal || '—'}</span>
                          </div>
                        ) : (
                          f.type === 'select' ? (
                            <span style={{ 
                              background: 'rgba(13, 148, 136, 0.08)', 
                              color: 'var(--primary)', 
                              padding: '4px 10px', 
                              borderRadius: 'var(--radius-md)',
                              fontWeight: '600',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}>
                              {displayVal || '—'}
                            </span>
                          ) : (
                            displayVal || '—'
                          )
                        )}
                      </td>
                    );
                  })}
                  {(isAdmin || extraRowAction) && (
                    <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                        {extraRowAction && extraRowAction(row)}
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => handleOpenModal(row)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(13, 148, 136, 0.2)',
                                background: 'rgba(13, 148, 136, 0.08)',
                                color: 'var(--primary)',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                outline: 'none'
                              }}
                              className="btn-action-teal"
                              title="Editar registro"
                            >
                              ✏️ Editar
                            </button>
                            <button 
                              onClick={() => handleDelete(row.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#EF4444',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                outline: 'none'
                              }}
                              className="btn-action-red"
                              title="Eliminar registro"
                            >
                              🗑️ Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div className="modal-header" style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, transparent 60%)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div className="modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {isEdit ? '✏️ Editar' : '➕ Nuevo'} {title.split(' ')[0]}
                </div>
                <div className="modal-sub" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Completa los datos del formulario
                </div>
              </div>
              <button onClick={() => setShowModal(false)} disabled={saving} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: 'var(--text-secondary)', transition: 'all 0.15s'
              }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {fields.map(f => (
                  <div key={f.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{f.label}</label>
                    {f.type === 'textarea' ? (
                      <textarea
                        className="form-input"
                        name={f.name}
                        value={form[f.name] || ''}
                        onChange={handleChange}
                        required={f.required}
                        disabled={saving}
                        style={{ minHeight: 80, resize: 'vertical' }}
                      />
                    ) : f.type === 'select' ? (
                      <select
                        className="form-select"
                        name={f.name}
                        value={form[f.name] || ''}
                        onChange={handleChange}
                        required={f.required}
                        disabled={saving}
                      >
                        <option value="">Seleccione...</option>
                        {f.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : f.type === 'emoji' ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-body)',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            outline: 'none'
                          }}
                          className="hover-highlight"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '18px' }}>{form[f.name] || f.defaultValue || icon}</span>
                            <span>{f.label}</span>
                          </div>
                          <span>{showEmojiPicker ? '▲ Ocultar' : '▼ Personalizar'}</span>
                        </button>

                        {showEmojiPicker && (
                          <div style={{ marginTop: 12, animation: 'slideDown 0.2s ease-out' }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              <input
                                className="form-input"
                                type="text"
                                name={f.name}
                                value={form[f.name] || ''}
                                onChange={handleChange}
                                required={f.required}
                                disabled={saving}
                                placeholder="Escribe o pega un emoji..."
                                style={{ flex: 1, textAlign: 'center', fontSize: '20px' }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--bg-body)', padding: 8, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                              {['🏢', '🏫', '🚪', '🏷️', '💻', '🔬', '📚', '📦', '🔧', '⚙️', '🔑', '👤', '🛡️', '📊', '📢', '🎨', '🧪', '🧬', '🖥️', '🔊', '🔋', '🔌', '📡'].map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => setForm(prev => ({ ...prev, [f.name]: emoji }))}
                                  disabled={saving}
                                  style={{
                                    fontSize: '18px',
                                    padding: '4px 8px',
                                    border: '1px solid var(--border)',
                                    background: form[f.name] === emoji ? 'rgba(13, 148, 136, 0.15)' : 'var(--bg-card)',
                                    borderColor: form[f.name] === emoji ? 'var(--primary)' : 'var(--border)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    transition: 'all 0.1s ease',
                                  }}
                                  className="emoji-quick-picker"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        className="form-input"
                        type={f.type || 'text'}
                        name={f.name}
                        value={form[f.name] || ''}
                        onChange={handleChange}
                        required={f.required}
                        disabled={saving}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--bg-body)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" style={{
                  padding: '10px 22px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s'
                }} disabled={saving}>
                  {saving ? '⏳ Guardando…' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/* Estilos Scoped */}
      <style>{`
        .btn-create-catalog:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-action-teal:hover { background: rgba(13,148,136,0.18) !important; }
        .btn-action-red:hover { background: rgba(239,68,68,0.15) !important; }
        .emoji-quick-picker:hover { transform: scale(1.08); background: rgba(13, 148, 136, 0.1) !important; border-color: var(--primary) !important; }
      `}</style>
    </div>
  );
}
