'use client';
import { useState, useEffect, useCallback } from 'react';
import { DynamicIcon } from '@/lib/icons';

/**
 * PersonalExplorer — Panel de Administración e Integración de Personal (Custodios)
 * Muestra el directorio completo de empleados con su puesto, área,
 * cantidad de bienes a su resguardo y el valor total acumulado.
 * Permite gestionar CRUD de personal y desglosar todos los bienes a su cargo.
 */
export default function PersonalExplorer({ departamentos, showToast, refreshBienes, isAdmin }) {
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
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, minHeight: '80vh', width: '100%', padding: '0 24px 24px' }}>
      
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
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, transparent 60%)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '20px 24px', gap: 16, flexWrap: 'wrap'
        }}>
          <div>
            <div className="content-panel-label" style={{ color: 'var(--primary)', fontWeight: 700 }}>Control de Custodios</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4, color: 'var(--text-primary)', margin: 0 }}>
              Directorio de Personal
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4, margin: 0 }}>
              Administra al personal académico y administrativo con resguardo de activos.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setShowExpediente(!showExpediente)}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
              title={showExpediente ? "Ocultar panel de expediente" : "Mostrar panel de expediente"}
            >
              {showExpediente ? '📁 Ocultar Ficha' : '📂 Ver Ficha'}
            </button>
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
              >
                ＋ Agregar Empleado
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)' }}>
          <table className="inventory-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ minWidth: '200px', padding: '12px 20px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Nombre y Puesto</th>
                <th style={{ minWidth: '160px', padding: '12px 20px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Depto. / Coordinación</th>
                <th style={{ textAlign: 'center', minWidth: '100px', padding: '12px 20px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Bienes</th>
                <th style={{ textAlign: 'right', minWidth: '100px', padding: '12px 20px', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    <div className="dash-pulse" style={{ margin: '0 auto 12px', width: 12, height: 12 }}></div>
                    Cargando directorio...
                  </td>
                </tr>
              ) : personal.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
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
                      style={{ 
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.2s',
                        background: isSelected ? 'rgba(13, 148, 136, 0.05)' : 'transparent'
                      }}
                      className={isSelected ? 'selected' : 'hover-highlight'}
                    >
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: '50%', 
                            background: p.noRegistrado
                              ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                              : 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)', 
                            color: '#fff', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 'bold', 
                            fontSize: 13,
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                          }}>
                            {p.nombre.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px' }}>
                              <span style={{ whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{p.nombre}</span>
                              {p.noRegistrado && (
                                <span style={{ 
                                  color: '#D97706', 
                                  background: 'rgba(245, 158, 11, 0.12)', 
                                  fontSize: '9px', 
                                  fontWeight: '700', 
                                  padding: '2px 6px', 
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
                      <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--text-primary)' }}>
                            <DynamicIcon name={p.departamento?.icono || '🏢'} size={12} style={{ color: 'var(--primary)' }} />
                            <span>{p.departamento?.nombre || 'General'}</span>
                          </div>
                          {p.departamento?.ubicacion && (
                             <div style={{ fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 4, opacity: 0.85 }}>
                              <DynamicIcon name={p.departamento.ubicacion.icono || '🏫'} size={11} style={{ color: 'var(--primary)' }} />
                              <span>{p.departamento.ubicacion.nombre}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: totalBienes > 0 ? 'rgba(59, 130, 246, 0.08)' : 'var(--border)',
                            color: totalBienes > 0 ? '#3b82f6' : 'var(--text-secondary)',
                            display: 'inline-block'
                          }}>
                            💻 {totalBienes}
                          </span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: totalInmob > 0 ? 'rgba(20, 184, 166, 0.08)' : 'var(--border)',
                            color: totalInmob > 0 ? 'var(--primary)' : 'var(--text-secondary)',
                            display: 'inline-block'
                          }}>
                            🪑 {totalInmob}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
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
          flex: '1 1 380px',
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
                  {isAdmin 
                    ? <>Este custodio se agregó de forma automática. Haz clic en <strong>✏️ Editar</strong> para registrar su correo institucional, puesto y departamento.</>
                    : <>Este custodio se agregó de forma automática. Contacte a un administrador para registrar su información institucional.</>
                  }
                </p>
              </div>
            )}

            {/* Cabecera del Expediente */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              borderBottom: '1px solid var(--border)',
              paddingBottom: 20
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
                boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0
              }}>
                {selectedEmpleado.nombre.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.05em' }}>Expediente de Resguardo</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedEmpleado.nombre}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedEmpleado.noRegistrado ? '⚠️ Custodio Temporal' : (selectedEmpleado.puesto || 'Puesto no especificado')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {isAdmin && (
                  <>
                    <button onClick={() => handleOpenModal(selectedEmpleado)} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>✏️</button>
                    <button onClick={() => handleDelete(selectedEmpleado.id)} className="btn" style={{ padding: '6px 10px', fontSize: 12, borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>🗑️</button>
                  </>
                )}
                <button 
                  type="button"
                  onClick={() => setShowExpediente(false)} 
                  className="btn btn-ghost" 
                  style={{ padding: '6px 10px', fontSize: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
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
              borderRadius: 'var(--radius-lg)',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Correo Electrónico:</span>
                <span style={{ fontWeight: 600, color: selectedEmpleado.noRegistrado ? '#F59E0B' : 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {selectedEmpleado.noRegistrado ? 'temp-generado-por-sistema' : selectedEmpleado.correo}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Depto. / Coordinación:</span>
                  <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                    <DynamicIcon name={selectedEmpleado.departamento?.icono || '🏢'} size={12} style={{ color: 'var(--primary)' }} />
                    <span>{selectedEmpleado.departamento?.nombre || 'General'}</span>
                  </span>
                </div>
                {selectedEmpleado.departamento?.ubicacion && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Oficina Física:</span>
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)' }}>
                      <DynamicIcon name={selectedEmpleado.departamento.ubicacion.icono || '🏫'} size={12} style={{ color: 'var(--primary)' }} />
                      <span>{selectedEmpleado.departamento.ubicacion.nombre}</span>
                      {selectedEmpleado.departamento.ubicacion.edificio && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 'normal' }}>({selectedEmpleado.departamento.ubicacion.edificio})</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 12, alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Valor Custodiado:</span>
                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 15 }}>{formatCurrency(getValorAcumulado(selectedEmpleado))}</span>
              </div>
            </div>

            {/* Listado de Bienes en Custodia */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h4 style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>💻 Bienes Tecnológicos ({selectedEmpleado.asignaciones?.length || 0})</span>
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: '18vh',
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
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{formatCurrency(item.bien.valor_estimado)}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>🪑 Mobiliario ({selectedEmpleado.inmobiliarios?.length || 0})</span>
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  maxHeight: '18vh',
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
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
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
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 450, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div className="modal-header" style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, transparent 60%)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <div className="modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {isEdit ? '✏️ Editar' : '➕ Nuevo'} Empleado
                </div>
                <div className="modal-sub" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Ingresa la información institucional del resguardante
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre Completo:</label>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Correo Institucional:</label>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Puesto o Cargo:</label>
                  <input
                    className="form-input"
                    name="puesto"
                    value={form.puesto}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Ej. Coordinador de Ingeniería Mecatrónica"
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Depto. o Coordinación de Adscripción:</label>
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
    </div>
  );
}
