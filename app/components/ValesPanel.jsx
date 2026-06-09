'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatDateLong as formatDate } from '@/lib/formatters';

export default function ValesPanel({ bienes, personal, configuracion = {}, showToast, refreshBienes }) {
  const [vales, setVales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState('ALL'); // ALL, PENDIENTE, DEVUELTO
  const [searchQuery, setSearchQuery] = useState('');

  // Estados de Modales
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [selectedVale, setSelectedVale] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Campos del Formulario de Nuevo Vale
  const [responsableId, setResponsableId] = useState('');
  const [responsableSearch, setResponsableSearch] = useState('');
  const [showPersonalDropdown, setShowPersonalDropdown] = useState(false);
  const [bienesSeleccionados, setBienesSeleccionados] = useState([]);
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [bienesSearch, setBienesSearch] = useState('');

  const personalDropdownRef = useRef(null);

  // Cerrar dropdows al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (personalDropdownRef.current && !personalDropdownRef.current.contains(e.target)) {
        setShowPersonalDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar vales al montar el componente
  const fetchVales = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/vales');
      if (res.ok) {
        const data = await res.json();
        setVales(data);
      } else {
        showToast('Error al cargar los vales de salida', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Error de red al cargar vales', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchVales();
  }, []);

  // Filtrar Vales
  const filteredVales = useMemo(() => {
    return vales.filter(vale => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        vale.folio.toLowerCase().includes(q) ||
        vale.personal?.nombre.toLowerCase().includes(q) ||
        vale.motivo.toLowerCase().includes(q);
      
      const matchesEstado = filterEstado === 'ALL' || vale.estado === filterEstado;
      
      return matchesSearch && matchesEstado;
    });
  }, [vales, searchQuery, filterEstado]);

  // Contadores analíticos
  const statsVales = useMemo(() => {
    const total = vales.length;
    const pendientes = vales.filter(v => v.estado === 'PENDIENTE').length;
    const devueltos = vales.filter(v => v.estado === 'DEVUELTO').length;
    return { total, pendientes, devueltos };
  }, [vales]);

  // Bienes disponibles para préstamo (No deben estar eliminados ni en Baja)
  const bienesDisponibles = useMemo(() => {
    const activos = bienes.filter(b => !b.eliminado && b.estado !== 'Baja');
    if (!bienesSearch.trim()) return activos;
    const q = bienesSearch.toLowerCase();
    return activos.filter(b => 
      b.nombre.toLowerCase().includes(q) ||
      b.serial.toLowerCase().includes(q) ||
      b.etiqueta.toLowerCase().includes(q)
    );
  }, [bienes, bienesSearch]);

  const filteredPersonal = useMemo(() => {
    if (!responsableSearch.trim()) return personal;
    const q = responsableSearch.toLowerCase();
    return personal.filter(p => p.nombre.toLowerCase().includes(q));
  }, [personal, responsableSearch]);

  // Handlers
  const handleSelectPersonal = (p) => {
    setResponsableId(p.id);
    setResponsableSearch(p.nombre);
    setShowPersonalDropdown(false);
  };

  const handleToggleBien = (id) => {
    setBienesSeleccionados(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCrearVale = async (e) => {
    e.preventDefault();
    if (!responsableId) {
      showToast('Por favor, selecciona a un responsable.', 'warning');
      return;
    }
    if (bienesSeleccionados.length === 0) {
      showToast('Debes seleccionar al menos un equipo.', 'warning');
      return;
    }
    if (!fechaEstimada) {
      showToast('Selecciona la fecha estimada de retorno.', 'warning');
      return;
    }
    if (!motivo.trim()) {
      showToast('El motivo de la salida es requerido.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/vales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalId: responsableId,
          bienesIds: bienesSeleccionados,
          fecha_estimada: fechaEstimada,
          motivo,
          observaciones
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast(`Vale ${data.folio} generado con éxito ✓`);
        setShowNuevoModal(false);
        // Resetear formulario
        setResponsableId('');
        setResponsableSearch('');
        setBienesSeleccionados([]);
        setFechaEstimada('');
        setMotivo('');
        setObservaciones('');
        setBienesSearch('');
        
        fetchVales();
        refreshBienes();
      } else {
        showToast(data.error || 'Error al guardar vale', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegistrarRetorno = async (valeId) => {
    if (!confirm('¿Deseas registrar el retorno de los equipos de este vale de salida?')) return;

    try {
      const res = await fetch('/api/vales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: valeId,
          registrarRetorno: true
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        showToast('Retorno de equipos registrado ✓');
        fetchVales();
        refreshBienes();
        if (selectedVale && selectedVale.id === valeId) {
          setSelectedVale(data);
        }
      } else {
        showToast(data.error || 'Error al actualizar vale', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de conexión', 'error');
    }
  };

  const handleEliminarVale = async (valeId, folio) => {
    if (!confirm(`¿Estás seguro de eliminar permanentemente el Vale de Salida ${folio}?`)) return;

    try {
      const res = await fetch(`/api/vales?id=${valeId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Vale de salida eliminado con éxito ✓');
        fetchVales();
        refreshBienes();
      } else {
        const data = await res.json();
        showToast(data.error || 'Error al eliminar', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de red', 'error');
    }
  };

  const handlePrintVale = () => {
    window.print();
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="content-panel-label">Operación Externa</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 4 }}>Vales de Salida y Préstamos Temporales</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Control de equipos técnicos autorizados para salir de la institución por comisiones.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNuevoModal(true)}>
          ＋ Registrar Vale de Salida
        </button>
      </div>

      {/* Tarjetas Analíticas */}
      <div className="stats-row-compact" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className={`stat-card-compact interactive ${filterEstado === 'ALL' ? 'active' : ''}`} onClick={() => setFilterEstado('ALL')}>
          <div className="stat-icon-compact stat-icon-compact-blue">🗂</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Total Vales</div>
            <div className="stat-value-compact">{statsVales.total}</div>
          </div>
        </div>
        <div className={`stat-card-compact interactive ${filterEstado === 'PENDIENTE' ? 'active' : ''}`} onClick={() => setFilterEstado('PENDIENTE')}>
          <div className="stat-icon-compact stat-icon-compact-orange">⏱️</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Salidas Activas</div>
            <div className="stat-value-compact">{statsVales.pendientes}</div>
          </div>
        </div>
        <div className={`stat-card-compact interactive ${filterEstado === 'DEVUELTO' ? 'active' : ''}`} onClick={() => setFilterEstado('DEVUELTO')}>
          <div className="stat-icon-compact stat-icon-compact-green">✅</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Devueltos</div>
            <div className="stat-value-compact">{statsVales.devueltos}</div>
          </div>
        </div>
      </div>

      {/* Filtros e Historial */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
        
        <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)', padding: '12px 18px' }}>
          <div className="search-input-wrap" style={{ flex: 1, maxWidth: 360 }}>
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Buscar por folio, responsable o motivo..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla de Vales */}
        <div style={{ overflowX: 'auto' }}>
          <table className="inventory-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Folio</th>
                <th>Responsable</th>
                <th>Fecha Salida</th>
                <th>Devolución Estimada</th>
                <th>Equipos</th>
                <th>Estatus</th>
                <th style={{ textAlign: 'center', width: 140 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                      <div className="dash-pulse" style={{ width: 12, height: 12, margin: '0 auto 12px' }}></div>
                      <div className="empty-state-text">Cargando vales...</div>
                    </div>
                  </td>
                </tr>
              ) : filteredVales.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                      <div className="empty-state-icon" style={{ fontSize: 28 }}>⏱️</div>
                      <div className="empty-state-text">No se encontraron vales de salida</div>
                      <div className="empty-state-sub">Genera un nuevo vale o ajusta el filtro de búsqueda.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVales.map(vale => {
                  const itemsCount = vale.bienes?.length || 0;
                  const isPendiente = vale.estado === 'PENDIENTE';
                  
                  // Verificar si está vencido
                  const esVencido = isPendiente && new Date(vale.fecha_estimada) < new Date();

                  return (
                    <tr key={vale.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedVale(vale)}>
                      <td>
                        <strong style={{ color: 'var(--primary)', letterSpacing: '0.2px' }}>{vale.folio}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{vale.personal?.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {vale.personal?.puesto} | {vale.personal?.departamento?.nombre || 'General'}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{new Date(vale.fecha_salida).toLocaleDateString('es-MX')}</td>
                      <td style={{ fontSize: 12 }}>
                        <span style={esVencido ? { color: '#EF4444', fontWeight: 'bold' } : {}}>
                          {new Date(vale.fecha_estimada).toLocaleDateString('es-MX')}
                          {esVencido && ' (Vencido ⚠️)'}
                        </span>
                      </td>
                      <td>
                        <span className="tag-code" style={{ fontSize: 11, padding: '3px 8px' }}>
                          📦 {itemsCount} {itemsCount === 1 ? 'equipo' : 'equipos'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          vale.estado === 'DEVUELTO' ? 'badge-green' : esVencido ? 'badge-danger' : 'badge-warning'
                        }`} style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700 }}>
                          {vale.estado === 'DEVUELTO' ? 'DEVUELTO ✓' : esVencido ? 'VENCIDO ⚠️' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 8px', fontSize: 12 }} 
                            onClick={() => setSelectedVale(vale)}
                            title="Ver detalles e imprimir Vale"
                          >
                            👁️
                          </button>
                          {isPendiente && (
                            <button 
                              className="btn" 
                              style={{ padding: '6px 8px', fontSize: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)' }} 
                              onClick={() => handleRegistrarRetorno(vale.id)}
                              title="Registrar Retorno de Equipos"
                            >
                              ↩️
                            </button>
                          )}
                          <button 
                            className="btn" 
                            style={{ padding: '6px 8px', fontSize: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} 
                            onClick={() => handleEliminarVale(vale.id, vale.folio)}
                            title="Eliminar Vale de Salida"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ========================================== */}
      {/* MODAL: REGISTRAR NUEVO VALE DE SALIDA     */}
      {/* ========================================== */}
      {isMounted && showNuevoModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowNuevoModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 850, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div>
                <div className="modal-title">📦 Nuevo Vale de Salida Temporal</div>
                <div className="modal-sub">Registra la salida de equipos fuera de la institución y asigna un custodio temporal.</div>
              </div>
              <button className="btn-icon" onClick={() => setShowNuevoModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCrearVale} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20, overflowY: 'auto', flex: 1, padding: 20 }}>
                
                {/* Lado Izquierdo: Datos Generales */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  
                  {/* Selector de Personal Responsable */}
                  <div style={{ position: 'relative' }} ref={personalDropdownRef}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Personal Responsable de la Comisión</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Escribe el nombre del custodio..."
                      value={responsableSearch}
                      onChange={(e) => {
                        setResponsableSearch(e.target.value);
                        setResponsableId('');
                        setShowPersonalDropdown(true);
                      }}
                      onFocus={() => setShowPersonalDropdown(true)}
                      required
                      style={{ height: 38 }}
                    />
                    
                    {showPersonalDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-card, #FFFFFF)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 1100,
                        maxHeight: 180,
                        overflowY: 'auto'
                      }}>
                        {filteredPersonal.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPersonal(p)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: 12,
                              color: 'var(--text-primary)',
                              background: responsableId === p.id ? 'rgba(13, 148, 136, 0.08)' : 'transparent',
                              borderBottom: '1px solid rgba(0,0,0,0.02)',
                              display: 'flex',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{p.puesto}</span>
                          </div>
                        ))}
                        {filteredPersonal.length === 0 && (
                          <div style={{ padding: 10, textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
                            No se encontraron coincidencias.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fecha Comprometida de Retorno */}
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>Fecha Comprometida de Retorno</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={fechaEstimada} 
                      onChange={e => setFechaEstimada(e.target.value)} 
                      min={new Date().toISOString().split('T')[0]}
                      required
                      style={{ height: 38 }}
                    />
                  </div>

                  {/* Motivo de la Salida */}
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>Motivo o Comisión</label>
                    <textarea 
                      className="form-input" 
                      placeholder="Ej. Salida a la coordinación regional para auditoría interna o evento institucional..."
                      value={motivo} 
                      onChange={e => setMotivo(e.target.value)} 
                      required
                      style={{ minHeight: 80, resize: 'vertical' }}
                    />
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="form-label" style={{ fontWeight: 600 }}>Observaciones Especiales</label>
                    <textarea 
                      className="form-input" 
                      placeholder="Detalles sobre el estado del empaque, accesorios que salen o condiciones de entrega..."
                      value={observaciones} 
                      onChange={e => setObservaciones(e.target.value)} 
                      style={{ minHeight: 140, resize: 'vertical' }}
                    />
                  </div>

                </div>

                {/* Lado Derecho: Selector de Bienes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Seleccionar Equipos para Salida</span>
                    <span style={{ color: 'var(--primary)', fontSize: 12 }}>{bienesSeleccionados.length} seleccionados</span>
                  </label>
                  
                  {/* Buscador de Bienes */}
                  <div className="search-input-wrap" style={{ flex: 'none' }}>
                    <span className="search-icon">🔍</span>
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="Buscar por marca, modelo, serie o no. de inventario..."
                      value={bienesSearch}
                      onChange={e => setBienesSearch(e.target.value)}
                    />
                  </div>

                  {/* Rejilla de Bienes con Checkbox */}
                  <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-body)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                          <th style={{ width: 40, padding: 8 }}></th>
                          <th style={{ padding: 8, textAlign: 'left' }}>Equipo</th>
                          <th style={{ padding: 8, textAlign: 'left' }}>No. Inv</th>
                          <th style={{ padding: 8, textAlign: 'left' }}>Ubicación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bienesDisponibles.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                              No hay equipos activos disponibles para préstamo.
                            </td>
                          </tr>
                        ) : (
                          bienesDisponibles.map(bien => {
                            const isChecked = bienesSeleccionados.includes(bien.id);
                            return (
                              <tr 
                                key={bien.id} 
                                onClick={() => handleToggleBien(bien.id)}
                                style={{ 
                                  borderBottom: '1px solid var(--border)', 
                                  cursor: 'pointer',
                                  background: isChecked ? 'rgba(13, 148, 136, 0.04)' : 'transparent'
                                }}
                              >
                                <td style={{ textAlign: 'center', padding: 8 }} onClick={e => e.stopPropagation()}>
                                  <input 
                                    type="checkbox" 
                                    className="checkbox-custom"
                                    checked={isChecked} 
                                    onChange={() => handleToggleBien(bien.id)}
                                  />
                                </td>
                                <td style={{ padding: 8 }}>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span>{bien.icono || '💻'}</span>
                                    <div>
                                      <div style={{ fontWeight: 600 }}>{bien.nombre}</div>
                                      <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>S/N: {bien.serial}</div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: 8 }}>
                                  <span className="tag-code">{bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}</span>
                                </td>
                                <td style={{ padding: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
                                  {bien.area}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

              </div>

              <div className="modal-footer" style={{ flexShrink: 0, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowNuevoModal(false)} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || bienesSeleccionados.length === 0} style={{ minWidth: 160 }}>
                  {isSubmitting ? 'Generando Vale...' : '📋 Generar Vale'}
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ========================================== */}
      {/* MODAL: VER DETALLE / VALE DE SALIDA IMPRIMIBLE */}
      {/* ========================================== */}
      {isMounted && selectedVale && createPortal(
        <div className="modal-overlay modal-vale-print-overlay" onClick={() => setSelectedVale(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-box modal-vale-print-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            <div className="modal-header no-print" style={{ flexShrink: 0 }}>
              <div>
                <div className="modal-title">📄 Vale de Salida Temporal {selectedVale.folio}</div>
                <div className="modal-sub">Detalles y formato imprimible para resguardo de la comisión.</div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedVale(null)}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 30px' }} className="print-area">
              
              {/* Estilos locales para impresión limpia tipo Documento Oficial */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  .print-area, .print-area * {
                    visibility: visible;
                  }
                  .print-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    padding: 0;
                    margin: 0;
                    color: #000000 !important;
                    background: #FFFFFF !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  .modal-vale-print-overlay {
                    background: none !important;
                    position: static !important;
                    display: block !important;
                    padding: 0 !important;
                  }
                  .modal-vale-print-box {
                    box-shadow: none !important;
                    border: none !important;
                    max-width: 100% !important;
                    width: 100% !important;
                    max-height: 100% !important;
                    height: 100% !important;
                    position: static !important;
                    display: block !important;
                  }
                  .print-signature-row {
                    margin-top: 60px !important;
                  }
                }
              `}} />

              {/* Membrete Oficial */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {configuracion.logo_institucion ? (
                    <img src={configuracion.logo_institucion} alt="Logo" style={{ width: 50, height: 50, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 50, height: 50, background: '#00716A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold', borderRadius: 6 }}>
                      {configuracion.siglas_institucion || 'UPEN'}
                    </div>
                  )}
                  <div>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', color: '#000000' }}>
                      Universidad Politécnica del Estado de Nayarit
                    </h3>
                    <h4 style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: '#333333' }}>
                      Departamento de Informática y Telecomunicaciones
                    </h4>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#00716A' }}>VALE DE SALIDA TEMPORAL</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Folio: <strong style={{ color: '#000' }}>{selectedVale.folio}</strong></div>
                </div>
              </div>

              {/* Tabla de Metadatos */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f9f9f9', width: '25%', fontWeight: 'bold' }}>Empleado Responsable:</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', width: '40%' }}>{selectedVale.personal?.nombre}</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f9f9f9', width: '20%', fontWeight: 'bold' }}>Fecha de Salida:</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>{new Date(selectedVale.fecha_salida).toLocaleDateString('es-MX')}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f9f9f9', fontWeight: 'bold' }}>Puesto y Área:</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>
                      {selectedVale.personal?.puesto} | {selectedVale.personal?.departamento?.nombre || 'General'}
                    </td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f9f9f9', fontWeight: 'bold' }}>Fecha Comprometida:</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd' }}>
                      {new Date(selectedVale.fecha_estimada).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f9f9f9', fontWeight: 'bold' }}>Motivo de Comisión:</td>
                    <td style={{ padding: '6px 8px', border: '1px solid #ddd' }} colSpan={3}>{selectedVale.motivo}</td>
                  </tr>
                  {selectedVale.observaciones && (
                    <tr>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', background: '#f9f9f9', fontWeight: 'bold' }}>Observaciones:</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd' }} colSpan={3}>{selectedVale.observaciones}</td>
                    </tr>
                  )}
                  {selectedVale.fecha_retorno && (
                    <tr>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', background: 'rgba(16, 185, 129, 0.08)', color: '#10B981', fontWeight: 'bold' }}>Fecha de Retorno Real:</td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontWeight: 'bold', color: '#10B981' }} colSpan={3}>
                        {new Date(selectedVale.fecha_retorno).toLocaleDateString('es-MX')} (Equipos devueltos a bodega ✓)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Título de Equipos */}
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
                Detalle de Bienes y Equipos en Tránsito
              </div>

              {/* Tabla de Equipos */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#f0f0f0', borderBottom: '2px solid #000' }}>
                    <th style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'left', width: '25%' }}>No. de Inventario</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'left', width: '45%' }}>Descripción del Equipo</th>
                    <th style={{ padding: '6px 8px', border: '1px solid #ddd', textAlign: 'left', width: '30%' }}>Número de Serie</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedVale.bienes?.map(bien => (
                    <tr key={bien.id}>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                        {bien.codigo_inventario?.startsWith('SIN-NUMERO-') ? 'S/N' : bien.codigo_inventario}
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontWeight: 600 }}>
                        {bien.nombre}
                      </td>
                      <td style={{ padding: '6px 8px', border: '1px solid #ddd', fontFamily: 'monospace' }}>
                        {bien.numero_serie || 'N/S'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Términos y Condiciones */}
              <div style={{ fontSize: 9, color: '#333', lineHeight: 1.4, padding: 10, background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, marginBottom: 30 }}>
                <strong>TÉRMINOS Y COMPROMISO DE RESGUARDO:</strong><br />
                El firmante en calidad de Responsable declara recibir a entera conformidad el equipo arriba especificado y se compromete a: (1) Utilizarlo únicamente para labores y comisiones oficiales del Departamento/Universidad. (2) Velar por su cuidado, mantenimiento y protección física. (3) Devolverlo a las instalaciones del almacén general del Departamento de Informática en la fecha comprometida. (4) Responder administrativamente por cualquier daño físico o extravío derivado del descuido del bien en tránsito.
              </div>

              {/* Bloque de Firmas */}
              <div className="print-signature-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30, marginTop: 40, textAlign: 'center', fontSize: 10 }}>
                
                <div>
                  <div style={{ height: 45, borderBottom: '1px solid #000', width: '85%', margin: '0 auto' }}></div>
                  <div style={{ fontWeight: 'bold', marginTop: 8 }}>Entregó / Autorizó</div>
                  <div style={{ fontSize: 9, color: '#666' }}>Control Operativo de Bienes</div>
                </div>

                <div>
                  <div style={{ height: 45, borderBottom: '1px solid #000', width: '85%', margin: '0 auto' }}></div>
                  <div style={{ fontWeight: 'bold', marginTop: 8 }}>Recibió de Conformidad</div>
                  <div style={{ fontSize: 9, color: '#666' }}>{selectedVale.personal?.nombre}</div>
                  <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>Responsable de Comisión</div>
                </div>

                <div>
                  <div style={{ 
                    height: 45, 
                    borderBottom: selectedVale.fecha_retorno ? '1px solid #000' : '1px dashed #ccc', 
                    width: '85%', 
                    margin: '0 auto' 
                  }}>
                    {selectedVale.fecha_retorno && (
                      <div style={{ color: '#10B981', fontSize: 16, paddingTop: 15, fontWeight: 'bold' }}>DEVUELTO</div>
                    )}
                  </div>
                  <div style={{ fontWeight: 'bold', marginTop: 8 }}>Recibió de Retorno</div>
                  <div style={{ fontSize: 9, color: '#666' }}>Control Operativo de Bienes</div>
                  <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>
                    {selectedVale.fecha_retorno ? `Fecha: ${new Date(selectedVale.fecha_retorno).toLocaleDateString('es-MX')}` : '(Firma al regresar)'}
                  </div>
                </div>

              </div>

            </div>

            <div className="modal-footer no-print" style={{ flexShrink: 0, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  {selectedVale.estado === 'PENDIENTE' && (
                    <button 
                      type="button" 
                      className="btn" 
                      style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                      onClick={() => handleRegistrarRetorno(selectedVale.id)}
                    >
                      ↩️ Registrar Retorno de Equipos
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setSelectedVale(null)}>
                    Cerrar
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handlePrintVale}>
                    🖨️ Imprimir Vale
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
