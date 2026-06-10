'use client';
import { useState, useEffect, useCallback } from 'react';

/**
 * PersonalExplorer — Panel de Administración e Integración de Personal (Custodios)
 * Muestra el directorio completo de empleados con su puesto, área,
 * cantidad de bienes a su resguardo y el valor total acumulado.
 * Permite gestionar CRUD de personal y desglosar todos los bienes a su cargo.
 */
export default function PersonalExplorer({ departamentos, showToast, refreshBienes }) {
  const [personal, setPersonal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({ nombre: '', correo: '', puesto: '', departamentoId: '' });
  const [saving, setSaving] = useState(false);
  const [showExpediente, setShowExpediente] = useState(true);

  // Cargar directorio de personal desde la API
  const fetchPersonal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/personal');
      if (!res.ok) throw new Error('Error al cargar personal');
      const data = await res.json();
      setPersonal(data);

      // Si había un empleado seleccionado, refrescar sus datos
      setSelectedEmpleado(prev => {
        if (!prev) return null;
        const actualizado = data.find(p => p.id === prev.id);
        return actualizado || prev;
      });
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error al conectar con el directorio de personal', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchPersonal();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchPersonal]);

  const handleOpenModal = (empleado = null) => {
    if (empleado) {
      setIsEdit(true);
      setForm({
        id: empleado.id,
        nombre: empleado.nombre,
        correo: empleado.noRegistrado ? '' : (empleado.correo || ''),
        puesto: empleado.noRegistrado ? '' : (empleado.puesto || ''),
        departamentoId: empleado.departamentoId || ''
      });
    } else {
      setIsEdit(false);
      setForm({ nombre: '', correo: '', puesto: '', departamentoId: '' });
    }
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
      const payload = {
        ...form,
        departamentoId: form.departamentoId ? parseInt(form.departamentoId, 10) : null
      };

      const res = await fetch('/api/personal', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      if (showToast) showToast(`Empleado ${isEdit ? 'actualizado' : 'registrado'} con éxito ✓`);
      setShowModal(false);
      fetchPersonal();
      if (refreshBienes) refreshBienes(); // Refrescar inventario principal si cambió
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar a este empleado? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/personal?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');

      if (showToast) showToast('Empleado retirado del directorio con éxito ✓');
      setSelectedEmpleado(null);
      fetchPersonal();
      if (refreshBienes) refreshBienes();
    } catch (err) {
      alert(err.message);
    }
  };

  // Calcular valor acumulado de los bienes a cargo de una persona
  const getValorAcumulado = (empleado) => {
    if (!empleado) return 0;
    const bienesValor = empleado.asignaciones
      ? empleado.asignaciones.reduce((sum, item) => sum + (item.bien?.valor_estimado || 0), 0)
      : 0;
    const inmobValor = empleado.inmobiliarios
      ? empleado.inmobiliarios.reduce((sum, item) => sum + (item.valor_estimado || 0), 0)
      : 0;
    return bienesValor + inmobValor;
  };

  // Formatear valor como moneda
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, minHeight: '80vh', width: '100%' }}>
      
      {/* Columna Izquierda: Directorio de Personal */}
      <div style={{
        flex: '1 1 500px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="content-panel-label">Control de Custodios</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 4 }}>
              Directorio de Personal
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              Administra al personal académico y administrativo con resguardo de equipos tecnológicos.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setShowExpediente(!showExpediente)}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
              title={showExpediente ? "Ocultar panel de expediente" : "Mostrar panel de expediente"}
            >
              {showExpediente ? '📁 Ocultar Ficha' : '📂 Ver Ficha'}
            </button>
            <button onClick={() => handleOpenModal()} className="btn btn-primary">
              ＋ Agregar Empleado
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto' }}>
          <table className="inventory-table">
            <thead>
              <tr>
                <th style={{ minWidth: '220px' }}>Nombre y Puesto</th>
                <th style={{ minWidth: '180px' }}>Depto. / Coordinación</th>
                <th style={{ textAlign: 'center', minWidth: '120px' }}>Bienes a Cargo</th>
                <th style={{ textAlign: 'right', minWidth: '100px' }}>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    Cargando directorio...
                  </td>
                </tr>
              ) : personal.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    No hay personal registrado en el directorio.
                  </td>
                </tr>
              ) : (
                personal.map(p => {
                  const isSelected = selectedEmpleado?.id === p.id;
                  const totalBienes = p.asignaciones?.length || 0;
                  const totalInmob = p.inmobiliarios?.length || 0;
                  const valorTotal = getValorAcumulado(p);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedEmpleado(p);
                        setShowExpediente(true);
                      }}
                      style={{ cursor: 'pointer' }}
                      className={isSelected ? 'selected' : ''}
                    >
                      <td>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: '50%', 
                            background: p.noRegistrado ? 'rgba(245, 158, 11, 0.1)' : 'rgba(13, 148, 136, 0.1)', 
                            color: p.noRegistrado ? '#F59E0B' : 'var(--primary)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 'bold', 
                            fontSize: 13,
                            flexShrink: 0
                          }}>
                            {p.nombre.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px' }}>
                              <span style={{ whiteSpace: 'nowrap' }}>{p.nombre}</span>
                              {p.noRegistrado && (
                                <span style={{ 
                                  color: '#F59E0B', 
                                  background: 'rgba(245, 158, 11, 0.1)', 
                                  fontSize: '9px', 
                                  fontWeight: 'bold', 
                                  padding: '1px 5px', 
                                  borderRadius: '4px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  ⚠️ Temporal
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.noRegistrado ? 'Registro Incompleto' : (p.puesto || 'Sin puesto')}>
                              {p.noRegistrado ? 'Registro Incompleto' : (p.puesto || 'Sin puesto')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 550, color: 'var(--text-primary)' }}>
                            <span>{p.departamento?.icono || '🏢'}</span>
                            <span>{p.departamento?.nombre || 'General'}</span>
                          </div>
                          {p.departamento?.ubicacion && (
                            <div style={{ fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 4, opacity: 0.85 }}>
                              <span>{p.departamento.ubicacion.icono || '🏫'}</span>
                              <span>{p.departamento.ubicacion.nombre}</span>
                              {p.departamento.ubicacion.edificio && (
                                <span style={{ opacity: 0.7 }}>({p.departamento.ubicacion.edificio})</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 8,
                            background: totalBienes > 0 ? 'rgba(59, 130, 246, 0.1)' : 'var(--border)',
                            color: totalBienes > 0 ? '#3B82F6' : 'var(--text-secondary)',
                            display: 'inline-block'
                          }}>
                            💻 {totalBienes} eq.
                          </span>
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: 8,
                            background: totalInmob > 0 ? 'rgba(20, 184, 166, 0.1)' : 'var(--border)',
                            color: totalInmob > 0 ? '#14B8A6' : 'var(--text-secondary)',
                            display: 'inline-block'
                          }}>
                            🪑 {totalInmob} mob.
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                        {formatCurrency(valorTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showExpediente && (
        <div style={{
          flex: '1 1 350px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          position: 'relative'
        }}>
        {selectedEmpleado ? (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
            
            {/* Mensaje de registro temporal */}
            {selectedEmpleado.noRegistrado && (
              <div style={{ 
                background: 'rgba(245, 158, 11, 0.08)', 
                border: '1px solid rgba(245, 158, 11, 0.2)', 
                borderRadius: '8px', 
                padding: '12px', 
                fontSize: '12px', 
                color: '#B45309', 
                lineHeight: 1.4
              }}>
                <strong>⚠️ Registro Temporal / Incompleto</strong>
                <p style={{ marginTop: '4px', marginBottom: 0, fontSize: '11px' }}>
                  Este custodio se agregó de forma automática. Haz clic en <strong>✏️ Editar</strong> para registrar su correo institucional, puesto y departamento.
                </p>
              </div>
            )}

            {/* Cabecera del Expediente */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid var(--border)',
              paddingBottom: 16
            }}>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700 }}>Expediente de Resguardo</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{selectedEmpleado.nombre}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {selectedEmpleado.noRegistrado ? '⚠️ Custodio Temporal' : (selectedEmpleado.puesto || 'Puesto no especificado')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleOpenModal(selectedEmpleado)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>✏️ Editar</button>
                <button onClick={() => handleDelete(selectedEmpleado.id)} className="btn" style={{ padding: '6px 12px', fontSize: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>🗑️</button>
                <button 
                  type="button"
                  onClick={() => setShowExpediente(false)} 
                  className="btn btn-ghost" 
                  style={{ padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                  title="Ocultar expediente"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Ficha de Info de Contacto */}
            <div style={{
              background: 'var(--bg-body)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Correo Electrónico:</span>
                <span style={{ fontWeight: 600, color: selectedEmpleado.noRegistrado ? '#F59E0B' : 'var(--text)' }}>
                  {selectedEmpleado.noRegistrado ? 'temp-generado-por-sistema' : selectedEmpleado.correo}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border-light)', paddingTop: 10, paddingBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Depto. / Coordinación:</span>
                  <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{selectedEmpleado.departamento?.icono || '🏢'}</span>
                    <span>{selectedEmpleado.departamento?.nombre || 'General'}</span>
                  </span>
                </div>
                {selectedEmpleado.departamento?.ubicacion && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Oficina Física:</span>
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}>
                      <span>{selectedEmpleado.departamento.ubicacion.icono || '🏫'}</span>
                      <span>{selectedEmpleado.departamento.ubicacion.nombre}</span>
                      {selectedEmpleado.departamento.ubicacion.edificio && (
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 'normal' }}>({selectedEmpleado.departamento.ubicacion.edificio})</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Valor Acumulado en Custodia:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(getValorAcumulado(selectedEmpleado))}</span>
              </div>
            </div>

            {/* Listado de Bienes en Custodia */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>💻 Bienes Tecnológicos ({selectedEmpleado.asignaciones?.length || 0})</span>
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: '20vh',
                  overflowY: 'auto',
                  paddingRight: 4
                }}>
                  {(!selectedEmpleado.asignaciones || selectedEmpleado.asignaciones.length === 0) ? (
                    <div style={{ padding: '15px 0', textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.05em', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: 6 }}>
                      Sin bienes tecnológicos asignados
                    </div>
                  ) : (
                    selectedEmpleado.asignaciones.map(item => {
                      if (!item.bien) return null;
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-body)'
                          }}
                        >
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: 14 }}>💻</span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.bien.marca} {item.bien.modelo}</div>
                              <div style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: 1 }}>{item.bien.codigo_inventario}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{formatCurrency(item.bien.valor_estimado)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>🪑 Mobiliario e Inmobiliario ({selectedEmpleado.inmobiliarios?.length || 0})</span>
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: '20vh',
                  overflowY: 'auto',
                  paddingRight: 4
                }}>
                  {(!selectedEmpleado.inmobiliarios || selectedEmpleado.inmobiliarios.length === 0) ? (
                    <div style={{ padding: '15px 0', textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.05em', color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic', border: '1px dashed var(--border)', borderRadius: 6 }}>
                      Sin mobiliario asignado
                    </div>
                  ) : (
                    selectedEmpleado.inmobiliarios.map(item => {
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 10px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-body)'
                          }}
                        >
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: 14 }}>🪑</span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descripcion}</div>
                              <div style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: 1 }}>{item.codigo_inventario}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{formatCurrency(item.valor_estimado)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            padding: 40
          }}>
            <button
              type="button"
              onClick={() => setShowExpediente(false)}
              className="btn-icon"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 28,
                height: 28,
                border: 'none',
                background: 'var(--border-light)',
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Ocultar expediente"
            >
              ✕
            </button>
            <div style={{ fontSize: 56, marginBottom: 16 }}>👤</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Expediente del Empleado</h3>
            <p style={{ fontSize: 12, marginTop: 4, maxWidth: 260 }}>
              Selecciona a una persona del directorio para consultar su expediente, puesto y bienes asignados bajo firma.
            </p>
          </div>
        )}
      </div>
      )}

      {/* Modal CRUD Empleado */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{isEdit ? 'Editar' : 'Nuevo'} Empleado</div>
                <div className="modal-sub">Ingresa la información institucional del resguardante</div>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)} disabled={saving} style={{ border: 'none' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Nombre Completo:</label>
                  <input
                    className="form-input"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                    disabled={saving}
                    placeholder="Ej. Dr. Carlos Peña"
                  />
                </div>

                <div>
                  <label className="form-label">Correo Institucional:</label>
                  <input
                    className="form-input"
                    type="email"
                    name="correo"
                    value={form.correo}
                    onChange={handleChange}
                    required
                    disabled={saving}
                    placeholder="Ej. c.pena@upen.edu.mx"
                  />
                </div>

                <div>
                  <label className="form-label">Puesto o Cargo:</label>
                  <input
                    className="form-input"
                    name="puesto"
                    value={form.puesto}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Ej. Coordinador de Ingeniería Mecatrónica"
                  />
                </div>

                <div>
                  <label className="form-label">Depto. o Coordinación de Adscripción:</label>
                  <select
                    className="form-select"
                    name="departamentoId"
                    value={form.departamentoId}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="">Seleccione Departamento o Coordinación...</option>
                    {departamentos.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 120 }}>
                  {saving ? '⏳ Guardando…' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
