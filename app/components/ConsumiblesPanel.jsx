'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { DynamicIcon } from '@/lib/icons';

const getColorDot = (color) => {
  if (!color || color === 'N/A') return null;
  const colors = {
    'Negro': '#111827',
    'Cyan': '#06B6D4',
    'Magenta': '#EC4899',
    'Amarillo': '#EAB308',
    'Tricolor': 'linear-gradient(135deg, #EF4444 0%, #3B82F6 50%, #F59E0B 100%)'
  };
  const bg = colors[color] || '#6B7280';
  return (
    <span 
      title={`Color: ${color}`} 
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: bg,
        marginLeft: 6,
        verticalAlign: 'middle',
        boxShadow: '0 0 2px rgba(0,0,0,0.5)',
        border: color === 'Amarillo' ? '1px solid #ca8a04' : 'none'
      }}
    />
  );
};

export default function ConsumiblesPanel({
  personal = [],
  ubicaciones = [],
  departamentos = [],
  configuracion = {},
  showToast,
  bienes = [],
  isAdmin = false
}) {
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState('');

  // Modales
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemFormMode, setItemFormMode] = useState('create'); // 'create' | 'edit'
  const [itemForm, setItemForm] = useState({
    id: '',
    nombre: '',
    marca: '',
    modelo: '',
    stock_actual: '0',
    stock_minimo: '5',
    unidad_medida: 'Pieza',
    color: '',
    compatibilidad: '',
    rendimiento: '',
    observaciones: '',
    categoriaConsumibleId: '',
    ubicacionId: ''
  });

  const [showMovModal, setShowMovModal] = useState(false);
  const [movForm, setMovForm] = useState({
    consumibleId: '',
    tipo: 'ENTRADA', // 'ENTRADA' | 'SALIDA'
    cantidad: '',
    motivo: '',
    personalId: '',
    departamentoId: '',
    bienId: ''
  });

  const [saving, setSaving] = useState(false);

  // Cargar consumibles, categorías y movimientos
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resItems, resCats, resMovs] = await Promise.all([
        fetch(`/api/consumibles?_=${Date.now()}`),
        fetch('/api/categorias-consumibles'),
        fetch(`/api/consumibles/movimientos?_=${Date.now()}`)
      ]);

      if (!resItems.ok || !resCats.ok || !resMovs.ok) {
        throw new Error('Error al conectar con la base de datos de consumibles');
      }

      const dataItems = await resItems.json();
      const dataCats = await resCats.json();
      const dataMovs = await resMovs.json();

      setItems(dataItems);
      setCategorias(dataCats);
      setMovements(dataMovs);

      // Si había un consumible seleccionado, actualizar sus datos
      setSelectedItem(prev => {
        if (!prev) return null;
        return dataItems.find(i => i.id === prev.id) || null;
      });
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error al cargar datos del almacén de consumibles', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const impresoras = useMemo(() => {
    return bienes.filter(b => {
      const cat = b.categoria?.nombre?.toLowerCase() || '';
      return cat.includes('impres') || cat.includes('escán') || cat.includes('escan') || cat.includes('copia') || cat.includes('multifuncional');
    });
  }, [bienes]);

  // Filtrado de consumibles
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(item => {
      const matchSearch = !q || 
        item.nombre.toLowerCase().includes(q) ||
        (item.marca && item.marca.toLowerCase().includes(q)) ||
        (item.modelo && item.modelo.toLowerCase().includes(q)) ||
        (item.compatibilidad && item.compatibilidad.toLowerCase().includes(q));

      const matchCategory = !filterCategory || item.categoriaConsumibleId === parseInt(filterCategory, 10);
      
      let matchStatus = true;
      if (filterStockStatus === 'suficiente') {
        matchStatus = item.stock_actual > item.stock_minimo;
      } else if (filterStockStatus === 'bajo') {
        matchStatus = item.stock_actual > 0 && item.stock_actual <= item.stock_minimo;
      } else if (filterStockStatus === 'agotado') {
        matchStatus = item.stock_actual === 0;
      }

      return matchSearch && matchCategory && matchStatus;
    });
  }, [items, search, filterCategory, filterStockStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const active = items.filter(i => !i.eliminado);
    const lowStock = active.filter(i => i.stock_actual > 0 && i.stock_actual <= i.stock_minimo).length;
    const outOfStock = active.filter(i => i.stock_actual === 0).length;

    // Calcular entradas y salidas del mes en curso
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthEntries = movements
      .filter(m => m.tipo === 'ENTRADA' && new Date(m.fecha) >= startOfMonth)
      .reduce((sum, m) => sum + m.cantidad, 0);

    const monthExits = movements
      .filter(m => m.tipo === 'SALIDA' && new Date(m.fecha) >= startOfMonth)
      .reduce((sum, m) => sum + m.cantidad, 0);

    return {
      total: active.length,
      lowStock,
      outOfStock,
      monthEntries,
      monthExits
    };
  }, [items, movements]);

  // Movimientos específicos para el item seleccionado
  const selectedItemMovements = useMemo(() => {
    if (!selectedItem) return [];
    return movements.filter(m => m.consumibleId === selectedItem.id);
  }, [selectedItem, movements]);

  // handlers para Consumible CRUD
  const handleOpenCreateItemModal = () => {
    setItemFormMode('create');
    setItemForm({
      id: '',
      nombre: '',
      marca: '',
      modelo: '',
      stock_actual: '0',
      stock_minimo: '5',
      unidad_medida: 'Pieza',
      color: '',
      compatibilidad: '',
      rendimiento: '',
      observaciones: '',
      categoriaConsumibleId: categorias[0]?.id || '',
      ubicacionId: ubicaciones[0]?.id || ''
    });
    setShowItemModal(true);
  };

  const handleOpenEditItemModal = (item) => {
    setItemFormMode('edit');
    setItemForm({
      id: item.id,
      nombre: item.nombre,
      marca: item.marca || '',
      modelo: item.modelo || '',
      stock_actual: String(item.stock_actual),
      stock_minimo: String(item.stock_minimo),
      unidad_medida: item.unidad_medida || 'Pieza',
      color: item.color || '',
      compatibilidad: item.compatibilidad || '',
      rendimiento: item.rendimiento ? String(item.rendimiento) : '',
      observaciones: item.observaciones || '',
      categoriaConsumibleId: item.categoriaConsumibleId,
      ubicacionId: item.ubicacionId || ''
    });
    setShowItemModal(true);
  };

  const handleItemFormChange = (e) => {
    const { name, value } = e.target;
    setItemForm(prev => ({ ...prev, [name]: value }));
  };

  const handleItemFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = '/api/consumibles';
      const method = itemFormMode === 'create' ? 'POST' : 'PUT';

      const payload = {
        ...itemForm,
        stock_actual: parseInt(itemForm.stock_actual, 10),
        stock_minimo: parseInt(itemForm.stock_minimo, 10),
        color: itemForm.color || null,
        compatibilidad: itemForm.compatibilidad || null,
        rendimiento: itemForm.rendimiento ? parseInt(itemForm.rendimiento, 10) : null,
        categoriaConsumibleId: parseInt(itemForm.categoriaConsumibleId, 10),
        ubicacionId: itemForm.ubicacionId ? parseInt(itemForm.ubicacionId, 10) : null
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el consumible');

      if (showToast) showToast(`Consumible "${payload.nombre}" ${itemFormMode === 'create' ? 'registrado' : 'actualizado'} con éxito ✓`, 'success');
      setShowItemModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!confirm(`¿Estás seguro de eliminar el consumible "${name}" del inventario?`)) return;
    try {
      const res = await fetch(`/api/consumibles?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al dar de baja');
      if (showToast) showToast('Consumible eliminado con éxito ✓', 'success');
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // handlers para Movimientos
  const handleOpenMovModal = (item = null, forceType = 'ENTRADA') => {
    setMovForm({
      consumibleId: item ? String(item.id) : items[0]?.id || '',
      tipo: forceType,
      cantidad: '',
      motivo: '',
      personalId: '',
      departamentoId: '',
      bienId: ''
    });
    setShowMovModal(true);
  };

  const handleMovFormChange = (e) => {
    const { name, value } = e.target;
    setMovForm(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-seleccionar departamento si se cambia el personal en salida
      if (name === 'personalId' && value) {
        const empl = personal.find(p => String(p.id) === String(value));
        if (empl?.departamentoId) {
          updated.departamentoId = String(empl.departamentoId);
        }
      }

      // Auto-completar personal y departamento si se selecciona un bien (impresora)
      if (name === 'bienId' && value) {
        const selectedPrinter = bienes.find(b => String(b.id) === String(value));
        if (selectedPrinter) {
          // Obtener custodio activo
          const activeAsig = selectedPrinter.asignaciones?.[0];
          if (activeAsig && !activeAsig.fecha_retorno && activeAsig.personal?.id) {
            updated.personalId = String(activeAsig.personal.id);
          } else {
            updated.personalId = '';
          }

          // Obtener departamento activo
          if (selectedPrinter.departamentoId) {
            updated.departamentoId = String(selectedPrinter.departamentoId);
          } else {
            updated.departamentoId = '';
          }
        }
      }
      return updated;
    });
  };

  const handleMovFormSubmit = async (e) => {
    e.preventDefault();
    const activeConsumible = items.find(i => String(i.id) === String(movForm.consumibleId));
    if (!activeConsumible) return;

    const cant = parseInt(movForm.cantidad, 10);
    if (isNaN(cant) || cant <= 0) {
      alert('La cantidad debe ser un entero positivo mayor a cero.');
      return;
    }

    if (movForm.tipo === 'SALIDA' && activeConsumible.stock_actual < cant) {
      alert(`No es posible registrar la salida. Stock insuficiente de "${activeConsumible.nombre}" (Disponible: ${activeConsumible.stock_actual} ${activeConsumible.unidad_medida}s).`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        consumibleId: parseInt(movForm.consumibleId, 10),
        tipo: movForm.tipo,
        cantidad: cant,
        motivo: movForm.motivo || null,
        personalId: movForm.personalId ? parseInt(movForm.personalId, 10) : null,
        departamentoId: movForm.departamentoId ? parseInt(movForm.departamentoId, 10) : null,
        bienId: movForm.bienId ? parseInt(movForm.bienId, 10) : null
      };

      const res = await fetch('/api/consumibles/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar el movimiento');

      if (showToast) showToast(`Movimiento de ${movForm.tipo.toLowerCase()} registrado con éxito ✓`, 'success');
      setShowMovModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedItemForMov = items.find(i => String(i.id) === String(movForm.consumibleId));
  const hasInsuficienteStock = movForm.tipo === 'SALIDA' && selectedItemForMov && parseInt(movForm.cantidad || 0, 10) > selectedItemForMov.stock_actual;

  return (
    <>
      {/* ── KPIs DE CONSUMIBLES ──────────────────────────────── */}
      <div className="stats-row-compact no-print">
        <div className="stat-card-compact interactive" onClick={() => setFilterStockStatus('')}>
          <div className="stat-icon-compact stat-icon-compact-blue">📦</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Total Consumibles</div>
            <div className="stat-value-compact">{kpis.total}</div>
          </div>
        </div>
        <div className="stat-card-compact interactive" onClick={() => setFilterStockStatus('bajo')}>
          <div className="stat-icon-compact stat-icon-compact-yellow">⚠️</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Bajo Stock</div>
            <div className="stat-value-compact">{kpis.lowStock}</div>
          </div>
        </div>
        <div className="stat-card-compact interactive" onClick={() => setFilterStockStatus('agotado')}>
          <div className="stat-icon-compact stat-icon-compact-rose">🚫</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Agotados</div>
            <div className="stat-value-compact">{kpis.outOfStock}</div>
          </div>
        </div>
        <div className="stat-card-compact readonly">
          <div className="stat-icon-compact stat-icon-compact-green">📈</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Entradas / Salidas (Mes)</div>
            <div className="stat-value-compact" style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
              ➕ {kpis.monthEntries} / ➖ {kpis.monthExits}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN BOARD ────────────────────────────────────────── */}
      <div className="inventory-board-wrapper no-print" style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', minHeight: '60vh' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Cabecera */}
          <div className="content-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="content-panel-label">Control de Suministros</div>
              <div className="content-panel-title">
                Consumibles y Papelería
                <span className="result-count" style={{ marginLeft: 8, fontSize: 13, fontWeight: 400 }}>
                  {filteredItems.length} registros
                </span>
              </div>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleOpenMovModal(null, 'ENTRADA')} className="btn btn-secondary">
                  🔄 Registrar Movimiento
                </button>
                <button onClick={handleOpenCreateItemModal} className="btn btn-primary">
                  ＋ Registrar Consumible
                </button>
              </div>
            )}
          </div>

          {/* Barra de Filtros */}
          <div className="filter-bar">
            <div className="search-input-wrap" style={{ minWidth: 240 }}>
              <span className="search-icon">🔍</span>
              <input 
                className="search-input"
                placeholder="Buscar por nombre, marca o modelo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Todas las Categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>

            <select className="filter-select" value={filterStockStatus} onChange={e => setFilterStockStatus(e.target.value)}>
              <option value="">Todos los Estados de Stock</option>
              <option value="suficiente">Stock Suficiente</option>
              <option value="bajo">Bajo Stock (Alerta)</option>
              <option value="agotado">Agotados</option>
            </select>

            {(search || filterCategory || filterStockStatus) && (
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => {
                setSearch('');
                setFilterCategory('');
                setFilterStockStatus('');
              }}>
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* Tabla de registros */}
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table className="inventory-table inventory-table-compact">
              <thead>
                <tr>
                  <th style={{ width: '35%', minWidth: '320px' }}>Consumible / Artículo</th>
                  <th>Categoría</th>
                  <th>Ubicación</th>
                  <th>Unidad</th>
                  <th style={{ textAlign: 'center' }}>Mínimo</th>
                  <th style={{ textAlign: 'center' }}>Stock Disponible</th>
                  <th style={{ textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                      Cargando almacén de consumibles...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                      No se encontraron suministros.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const isAgotado = item.stock_actual === 0;
                    const isBajo = item.stock_actual > 0 && item.stock_actual <= item.stock_minimo;

                    return (
                      <tr 
                        key={item.id}
                        className={selectedItem?.id === item.id ? 'selected' : ''}
                        onClick={() => setSelectedItem(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          <div className="bien-cell">
                            <div className="bien-icon">
                              <DynamicIcon name={item.categoriaConsumible?.icono || '📦'} size={15} style={{ color: 'var(--primary)' }} />
                            </div>
                            <div>
                              <div className="bien-name" style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                                {item.nombre}
                                {getColorDot(item.color)}
                              </div>
                              <div className="bien-serial" style={{ fontSize: 12.5, display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                <span>{item.marca ? `${item.marca} ` : ''}{item.modelo || ''}</span>
                                {item.compatibilidad && (
                                  <span style={{ color: 'var(--text-secondary)', background: 'var(--bg-body)', padding: '0 4px', borderRadius: 3, border: '1px solid var(--border-light)', fontSize: 10 }}>
                                    ⚙️ {item.compatibilidad}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>{item.categoriaConsumible?.nombre}</td>
                        <td style={{ fontSize: 12 }}>{item.ubicacion?.nombre || 'Almacén general'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.unidad_medida}s</td>
                        <td style={{ textAlign: 'center', fontSize: 12, fontWeight: 550 }}>{item.stock_minimo}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ 
                            fontSize: 13, 
                            fontWeight: 700, 
                            color: isAgotado ? '#EF4444' : isBajo ? '#F59E0B' : 'var(--primary)' 
                          }}>
                            {item.stock_actual}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${
                            isAgotado ? 'badge-danger' :
                            isBajo ? 'badge-warning' : 'badge-active'
                          }`}>
                            {isAgotado ? 'Agotado' : isBajo ? 'Stock Bajo' : 'Suficiente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── PANEL DE DETALLE LATERAL DE CONSUMIBLES ───────────── */}
        {selectedItem && (
          <div className="detail-sidebar fade-in" style={{ width: 340, background: 'var(--bg-body)', borderLeft: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 0, height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Detalle de Suministro</h3>
              <button className="btn-icon" onClick={() => setSelectedItem(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Metadatos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Nombre:</span>
                <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '65%' }}>{selectedItem.nombre}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Categoría:</span>
                <span style={{ fontWeight: 600 }}>{selectedItem.categoriaConsumible?.nombre}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Marca / Modelo:</span>
                <span style={{ fontWeight: 600 }}>{selectedItem.marca || 'S/M'} {selectedItem.modelo || ''}</span>
              </div>
              {selectedItem.color && selectedItem.color !== 'N/A' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Color:</span>
                  <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {selectedItem.color}
                    {getColorDot(selectedItem.color)}
                  </span>
                </div>
              )}
              {selectedItem.compatibilidad && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Compatibilidad:</span>
                  <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '65%' }}>{selectedItem.compatibilidad}</span>
                </div>
              )}
              {selectedItem.rendimiento && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Rendimiento:</span>
                  <span style={{ fontWeight: 600 }}>{selectedItem.rendimiento.toLocaleString()} págs.</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ubicación Almacén:</span>
                <span style={{ fontWeight: 600 }}>{selectedItem.ubicacion?.nombre || 'General'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Unidad de Medida:</span>
                <span style={{ fontWeight: 600 }}>{selectedItem.unidad_medida}s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Stock Mínimo:</span>
                <span style={{ fontWeight: 600 }}>{selectedItem.stock_minimo} {selectedItem.unidad_medida}s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Stock Disponible:</span>
                <span style={{ 
                  fontWeight: 800, 
                  color: selectedItem.stock_actual === 0 ? '#EF4444' : selectedItem.stock_actual <= selectedItem.stock_minimo ? '#F59E0B' : 'var(--primary)',
                  fontSize: 14 
                }}>
                  {selectedItem.stock_actual} {selectedItem.unidad_medida}s
                </span>
              </div>
              {selectedItem.observaciones && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Observaciones:</span>
                  <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{selectedItem.observaciones}</span>
                </div>
              )}
            </div>

            {/* Acciones principales de stock */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleOpenMovModal(selectedItem, 'ENTRADA')} className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: 11, justifyContent: 'center' }}>
                  ➕ Entrada Stock
                </button>
                <button 
                  onClick={() => handleOpenMovModal(selectedItem, 'SALIDA')} 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '8px', fontSize: 11, justifyContent: 'center' }}
                  disabled={selectedItem.stock_actual === 0}
                >
                  ➖ Registrar Salida
                </button>
              </div>
            )}

            {/* Historial de Movimientos de este item */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                📜 Historial de Movimientos:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: '25vh', paddingRight: 4 }}>
                {selectedItemMovements.length === 0 ? (
                  <div style={{ padding: '20px 0', fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center', fontStyle: 'italic' }}>
                    Sin movimientos registrados
                  </div>
                ) : (
                  selectedItemMovements.map(m => {
                    const dateStr = new Date(m.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                    const isEntrada = m.tipo === 'ENTRADA';
                    return (
                      <div 
                        key={m.id}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: 8,
                          background: 'var(--bg-card)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ 
                            fontSize: 10.5, 
                            fontWeight: 700, 
                            color: isEntrada ? '#10B981' : '#EF4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            {isEntrada ? '➕ ENTRADA' : '➖ SALIDA'}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>
                            {m.cantidad} {selectedItem.unidad_medida}s
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                          🗓️ {dateStr}
                        </div>
                        {m.personal && (
                          <div style={{ fontSize: 10, color: 'var(--text-primary)', marginTop: 2 }}>
                            👤 Para: <strong>{m.personal.nombre}</strong>
                          </div>
                        )}
                        {m.departamento && (
                          <div style={{ fontSize: 9.5, color: 'var(--text-secondary)' }}>
                            🏢 Depto: {m.departamento.nombre}
                          </div>
                        )}
                        {m.bien && (
                          <div style={{ fontSize: 9.5, color: '#00716A', fontWeight: 600, marginTop: 2 }}>
                            🖨️ Equipo: {m.bien.marca} {m.bien.modelo} ({m.bien.codigo_inventario})
                          </div>
                        )}
                        {m.motivo && (
                          <div style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: 2, background: 'var(--bg-body)', padding: '2px 6px', borderRadius: 4 }}>
                            "{m.motivo}"
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Acciones de Edición/Baja del Item */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button onClick={() => handleOpenEditItemModal(selectedItem)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>✏️ Editar Info</button>
                <button 
                  onClick={() => handleDeleteItem(selectedItem.id, selectedItem.nombre)} 
                  className="btn btn-danger" 
                  style={{ flex: 1, justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.15)' }}
                >
                  🗑️ Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: REGISTRAR / EDITAR CONSUMIBLE ────────────────── */}
      {showItemModal && (
        <div className="modal-overlay no-print" onClick={() => setShowItemModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{itemFormMode === 'create' ? 'Registrar' : 'Editar'} Consumible</div>
                <div className="modal-sub">Ingresa la información básica para el catálogo de almacén</div>
              </div>
              <button className="btn-icon" onClick={() => setShowItemModal(false)} disabled={saving} style={{ border: 'none' }}>✕</button>
            </div>
            
            <form onSubmit={handleItemFormSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* Nombre */}
                <div>
                  <label className="form-label">Nombre del Consumible *</label>
                  <input 
                    className="form-input"
                    name="nombre"
                    value={itemForm.nombre}
                    onChange={handleItemFormChange}
                    placeholder="Ej. Tóner HP LaserJet 85A Negro"
                    required
                    disabled={saving}
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="form-label">Categoría de Consumible *</label>
                  <select 
                    className="form-select"
                    name="categoriaConsumibleId"
                    value={itemForm.categoriaConsumibleId}
                    onChange={handleItemFormChange}
                    required
                    disabled={saving}
                  >
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                {/* Marca / Modelo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Marca (Opcional)</label>
                    <input 
                      className="form-input"
                      name="marca"
                      value={itemForm.marca}
                      onChange={handleItemFormChange}
                      placeholder="Ej. Hewlett Packard"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="form-label">Modelo (Opcional)</label>
                    <input 
                      className="form-input"
                      name="modelo"
                      value={itemForm.modelo}
                      onChange={handleItemFormChange}
                      placeholder="Ej. CE285A"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Color, Compatibilidad y Rendimiento (Para Tóners/Tintas) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Color (Opcional)</label>
                    <select 
                      className="form-select"
                      name="color"
                      value={itemForm.color}
                      onChange={handleItemFormChange}
                      disabled={saving}
                    >
                      <option value="">N/A</option>
                      <option value="Negro">⚫ Negro</option>
                      <option value="Cyan">🔵 Cyan</option>
                      <option value="Magenta">🔴 Magenta</option>
                      <option value="Amarillo">🟡 Amarillo</option>
                      <option value="Tricolor">🌈 Tricolor</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Rendimiento (págs)</label>
                    <input 
                      className="form-input"
                      type="number"
                      name="rendimiento"
                      min="0"
                      value={itemForm.rendimiento}
                      onChange={handleItemFormChange}
                      placeholder="Ej. 1600"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Equipos Compatibles (Opcional)</label>
                  <input 
                    className="form-input"
                    name="compatibilidad"
                    value={itemForm.compatibilidad}
                    onChange={handleItemFormChange}
                    placeholder="Ej. HP LaserJet P1102, M1212nf, M1132"
                    disabled={saving}
                  />
                </div>

                {/* Unidad de Medida / Stock Mínimo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Unidad de Medida *</label>
                    <select 
                      className="form-select"
                      name="unidad_medida"
                      value={itemForm.unidad_medida}
                      onChange={handleItemFormChange}
                      required
                      disabled={saving}
                    >
                      <option value="Pieza">Pieza</option>
                      <option value="Paquete">Paquete</option>
                      <option value="Caja">Caja</option>
                      <option value="Litro">Litro</option>
                      <option value="Rollo">Rollo</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Stock Mínimo (Alerta) *</label>
                    <input 
                      className="form-input"
                      type="number"
                      name="stock_minimo"
                      min="0"
                      value={itemForm.stock_minimo}
                      onChange={handleItemFormChange}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* Stock Inicial (Solo en creación) */}
                {itemFormMode === 'create' && (
                  <div>
                    <label className="form-label">Stock Inicial de Entrada</label>
                    <input 
                      className="form-input"
                      type="number"
                      name="stock_actual"
                      min="0"
                      value={itemForm.stock_actual}
                      onChange={handleItemFormChange}
                      placeholder="Cantidad inicial en inventario..."
                      disabled={saving}
                    />
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                      Se generará un movimiento de entrada automática por esta cantidad.
                    </span>
                  </div>
                )}

                {/* Ubicación Física */}
                <div>
                  <label className="form-label">Ubicación de Almacenamiento</label>
                  <select 
                    className="form-select"
                    name="ubicacionId"
                    value={itemForm.ubicacionId}
                    onChange={handleItemFormChange}
                    disabled={saving}
                  >
                    <option value="">Ninguna (Almacén general)</option>
                    {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="form-label">Observaciones / Descripción adicional</label>
                  <textarea 
                    className="form-input"
                    name="observaciones"
                    value={itemForm.observaciones}
                    onChange={handleItemFormChange}
                    placeholder="Ej. Compartimiento B-3, para impresora multifuncional de rectoría..."
                    rows={2}
                    disabled={saving}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowItemModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Guardando...' : '💾 Registrar Consumible'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR ENTRADA / SALIDA DE STOCK ─────────── */}
      {showMovModal && (
        <div className="modal-overlay no-print" onClick={() => setShowMovModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Registrar Movimiento de Consumibles</div>
                <div className="modal-sub">Incrementa o decrementa existencias de forma transaccional</div>
              </div>
              <button className="btn-icon" onClick={() => setShowMovModal(false)} disabled={saving} style={{ border: 'none' }}>✕</button>
            </div>
            
            <form onSubmit={handleMovFormSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* Consumible */}
                <div>
                  <label className="form-label">Artículo Consumible *</label>
                  <select 
                    className="form-select"
                    name="consumibleId"
                    value={movForm.consumibleId}
                    onChange={handleMovFormChange}
                    required
                    disabled={saving}
                  >
                    {items.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.nombre} (Disponibles: {i.stock_actual} {i.unidad_medida}s)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Movimiento */}
                <div>
                  <label className="form-label">Tipo de Operación *</label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', flex: 1, padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: movForm.tipo === 'ENTRADA' ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}>
                      <input 
                        type="radio" 
                        name="tipo" 
                        value="ENTRADA" 
                        checked={movForm.tipo === 'ENTRADA'} 
                        onChange={handleMovFormChange} 
                        disabled={saving}
                      />
                      <span style={{ color: '#10B981', fontWeight: 700 }}>➕ ENTRADA (Surtir)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', flex: 1, padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: movForm.tipo === 'SALIDA' ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                      <input 
                        type="radio" 
                        name="tipo" 
                        value="SALIDA" 
                        checked={movForm.tipo === 'SALIDA'} 
                        onChange={handleMovFormChange} 
                        disabled={saving}
                      />
                      <span style={{ color: '#EF4444', fontWeight: 700 }}>➖ SALIDA (Entregar)</span>
                    </label>
                  </div>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="form-label">Cantidad a mover *</label>
                  <input 
                    className="form-input"
                    type="number"
                    name="cantidad"
                    min="1"
                    placeholder="Cantidad de piezas/cajas..."
                    value={movForm.cantidad}
                    onChange={handleMovFormChange}
                    required
                    disabled={saving}
                  />
                  {hasInsuficienteStock && (
                    <span style={{ color: '#EF4444', fontSize: 11, display: 'block', marginTop: 4, fontWeight: 600 }}>
                      ⚠️ Error: Cantidad excede el stock disponible ({selectedItemForMov?.stock_actual} {selectedItemForMov?.unidad_medida}s).
                    </span>
                  )}
                </div>

                {/* Destinatarios (Solo para SALIDAS) */}
                {movForm.tipo === 'SALIDA' && (
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--bg-body)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 2 }}>Asignación de Salida</div>
                    
                    {/* Equipo Destino (Impresora) */}
                    <div>
                      <label className="form-label" style={{ fontSize: 11 }}>Equipo Destino (Impresora) - Opcional</label>
                      <select 
                        className="form-select"
                        name="bienId"
                        value={movForm.bienId}
                        onChange={handleMovFormChange}
                        disabled={saving}
                      >
                        <option value="">Ninguno / Sin asociar a equipo</option>
                        {impresoras.map(imp => (
                          <option key={imp.id} value={imp.id}>
                            {imp.marca} {imp.modelo} ({imp.codigo_inventario}) {imp.asignaciones?.[0]?.personal?.nombre ? `- ${imp.asignaciones[0].personal.nombre}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Responsable */}
                    <div>
                      <label className="form-label" style={{ fontSize: 11 }}>Personal Solicitante / Custodio</label>
                      <select 
                        className="form-select"
                        name="personalId"
                        value={movForm.personalId}
                        onChange={handleMovFormChange}
                        disabled={saving}
                      >
                        <option value="">Seleccione personal...</option>
                        {personal.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.puesto || 'Docente'})</option>)}
                      </select>
                    </div>

                    {/* Departamento */}
                    <div>
                      <label className="form-label" style={{ fontSize: 11 }}>Departamento de Destino</label>
                      <select 
                        className="form-select"
                        name="departamentoId"
                        value={movForm.departamentoId}
                        onChange={handleMovFormChange}
                        disabled={saving}
                      >
                        <option value="">Seleccione departamento...</option>
                        {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Motivo */}
                <div>
                  <label className="form-label">Motivo o Justificación del Movimiento</label>
                  <input 
                    className="form-input"
                    name="motivo"
                    value={movForm.motivo}
                    onChange={handleMovFormChange}
                    placeholder={movForm.tipo === 'ENTRADA' ? 'Ej. Surtido de almacén por proveedor' : 'Ej. Entrega para exámenes departamentales'}
                    disabled={saving}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowMovModal(false)} disabled={saving}>Cancelar</button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={saving || hasInsuficienteStock}
                >
                  {saving ? '⏳ Procesando...' : '💾 Registrar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
