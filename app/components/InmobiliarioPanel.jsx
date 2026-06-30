'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DynamicIcon } from '@/lib/icons';
import { generateBarcodeSVG } from '@/lib/barcode';
import ModalExportador from '@/app/components/ModalExportador';

export default function InmobiliarioPanel({
  personal = [],
  ubicaciones = [],
  departamentos = [],
  configuracion = {},
  showToast,
  isAdmin = false
}) {
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterUbicacion, setFilterUbicacion] = useState('');

  // Modales y Edición
  const [showModal, setShowModal] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [saving, setSaving] = useState(false);
  
  // Estado para impresión
  const [printItems, setPrintItems] = useState([]);
  
  // Estado para grupos expandidos en la vista agrupada
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showExportModal, setShowExportModal] = useState(false);

  const [form, setForm] = useState({
    id: '',
    descripcion: '',
    marca: '',
    modelo: '',
    estado: 'Bueno',
    valor_estimado: '',
    fecha_adquisicion: '',
    programa_adquisicion: '',
    observaciones: '',
    categoriaInmobiliarioId: '',
    ubicacionId: '',
    departamentoId: '',
    personalId: '',
    codigo_manual: '',
    autogenerar_codigo: true,
    cantidad: '1'
  });

  // Cargar datos
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [resItems, resCats] = await Promise.all([
        fetch(`/api/inmobiliario?_=${Date.now()}`),
        fetch('/api/categorias-inmobiliario')
      ]);
      if (!resItems.ok || !resCats.ok) throw new Error('Error al cargar datos');
      const dataItems = await resItems.json();
      const dataCats = await resCats.json();
      
      setItems(dataItems);
      setCategorias(dataCats);

      // Actualizar el elemento seleccionado si existe
      setSelectedItem(prev => {
        if (!prev) return null;
        return dataItems.find(i => i.id === prev.id) || null;
      });
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error al cargar datos de mobiliario', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Manejar impresión
  useEffect(() => {
    if (printItems.length > 0) {
      document.body.classList.add('printing-labels');
      const timer = setTimeout(() => {
        window.print();
      }, 300);

      const handleAfterPrint = () => {
        document.body.classList.remove('printing-labels');
        setPrintItems([]);
      };

      window.addEventListener('afterprint', handleAfterPrint);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [printItems]);

  // Filtrado de items
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(item => {
      const matchSearch = !q || 
        item.codigo_inventario.toLowerCase().includes(q) ||
        item.descripcion.toLowerCase().includes(q) ||
        (item.marca && item.marca.toLowerCase().includes(q)) ||
        (item.modelo && item.modelo.toLowerCase().includes(q));

      const matchCategory = !filterCategory || item.categoriaInmobiliarioId === parseInt(filterCategory, 10);
      const matchEstado = !filterEstado || item.estado === filterEstado;
      const matchUbicacion = !filterUbicacion || item.ubicacionId === parseInt(filterUbicacion, 10);

      return matchSearch && matchCategory && matchEstado && matchUbicacion;
    });
  }, [items, search, filterCategory, filterEstado, filterUbicacion]);

  // Agrupar items idénticos en base a categoría, descripción, marca y modelo
  const groupedItems = useMemo(() => {
    const groups = {};
    filteredItems.forEach(item => {
      const key = `${item.categoriaInmobiliarioId}-${item.descripcion.trim().toLowerCase()}-${(item.marca || '').trim().toLowerCase()}-${(item.modelo || '').trim().toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          descripcion: item.descripcion,
          marca: item.marca,
          modelo: item.modelo,
          categoriaInmobiliarioId: item.categoriaInmobiliarioId,
          categoriaInmobiliario: item.categoriaInmobiliario,
          items: []
        };
      }
      groups[key].items.push(item);
    });
    return Object.values(groups);
  }, [filteredItems]);

  const toggleGroup = useCallback((groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const active = items.filter(i => !i.eliminado);
    return {
      total: active.length,
      enUso: active.filter(i => i.personalId !== null).length,
      bodega: active.filter(i => i.personalId === null).length,
      bajas: items.filter(i => i.eliminado).length,
      valorTotal: active.reduce((acc, i) => acc + (i.valor_estimado || 0), 0)
    };
  }, [items]);

  const handleOpenCreateModal = () => {
    setFormMode('create');
    setForm({
      id: '',
      descripcion: '',
      marca: '',
      modelo: '',
      estado: 'Bueno',
      valor_estimado: '',
      fecha_adquisicion: '',
      programa_adquisicion: '',
      observaciones: '',
      categoriaInmobiliarioId: categorias[0]?.id || '',
      ubicacionId: ubicaciones[0]?.id || '',
      departamentoId: '',
      personalId: '',
      codigo_manual: '',
      autogenerar_codigo: true,
      cantidad: '1'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item) => {
    setFormMode('edit');
    setForm({
      id: item.id,
      descripcion: item.descripcion,
      marca: item.marca || '',
      modelo: item.modelo || '',
      estado: item.estado,
      valor_estimado: item.valor_estimado || '',
      fecha_adquisicion: item.fecha_adquisicion ? item.fecha_adquisicion.substring(0, 10) : '',
      programa_adquisicion: item.programa_adquisicion || '',
      observaciones: item.observaciones || '',
      categoriaInmobiliarioId: item.categoriaInmobiliarioId,
      ubicacionId: item.ubicacionId,
      departamentoId: item.departamentoId || '',
      personalId: item.personalId || '',
      codigo_manual: item.codigo_inventario,
      autogenerar_codigo: false,
      cantidad: '1'
    });
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = '/api/inmobiliario';
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const payload = {
        ...form,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
        categoriaInmobiliarioId: parseInt(form.categoriaInmobiliarioId, 10),
        ubicacionId: parseInt(form.ubicacionId, 10),
        departamentoId: form.departamentoId ? parseInt(form.departamentoId, 10) : null,
        personalId: form.personalId ? parseInt(form.personalId, 10) : null,
        codigo_manual: form.autogenerar_codigo ? null : form.codigo_manual,
        cantidad: formMode === 'create' && form.autogenerar_codigo ? parseInt(form.cantidad, 10) : 1
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');

      const msg = formMode === 'create' 
        ? (payload.cantidad > 1 ? `¡Se registraron ${payload.cantidad} piezas de mobiliario en lote con éxito ✓` : 'Mobiliario registrado con éxito ✓')
        : 'Mobiliario actualizado con éxito ✓';
      showToast(msg, 'success');
      setShowModal(false);
      fetchItems();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!confirm(`¿Estás seguro de dar de baja el mobiliario "${name}"?`)) return;
    try {
      const res = await fetch(`/api/inmobiliario?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al dar de baja');
      showToast('Mobiliario dado de baja con éxito ✓', 'success');
      setSelectedItem(null);
      fetchItems();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedItem) return;

    // Redimensionar e incrementar compatibilidad con Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await fetch('/api/inmobiliario', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedItem.id, imagen_url: reader.result })
        });
        if (!res.ok) throw new Error('Error al subir imagen');
        showToast('Foto de mobiliario cargada con éxito ✓', 'success');
        fetchItems();
      } catch (err) {
        alert(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePrintLabel = (item) => {
    if (!item.codigo_inventario || item.codigo_inventario.startsWith('SIN-NUMERO-')) {
      if (showToast) showToast('Este mobiliario no cuenta con un número de inventario válido para generar un código de barras.', 'warning');
      return;
    }
    setPrintItems([item]);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <>
      {/* ── KPIs DE MOBILIARIO ──────────────────────────────── */}
      <div className="stats-row-compact no-print">
        <div className="stat-card-compact interactive" onClick={() => setFilterEstado('')}>
          <div className="stat-icon-compact stat-icon-compact-blue">🪑</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Total Mobiliario</div>
            <div className="stat-value-compact">{kpis.total}</div>
          </div>
        </div>
        <div className="stat-card-compact interactive" onClick={() => setFilterEstado('Bueno')}>
          <div className="stat-icon-compact stat-icon-compact-green">🟢</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">En Custodia / Uso</div>
            <div className="stat-value-compact">{kpis.enUso}</div>
          </div>
        </div>
        <div className="stat-card-compact interactive" onClick={() => setFilterEstado('Baja')}>
          <div className="stat-icon-compact stat-icon-compact-rose">🔴</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Dados de Baja</div>
            <div className="stat-value-compact">{kpis.bajas}</div>
          </div>
        </div>
        <div className="stat-card-compact readonly">
          <div className="stat-icon-compact stat-icon-compact-green">💰</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Valor Patrimonial</div>
            <div className="stat-value-compact currency">{formatCurrency(kpis.valorTotal)}</div>
          </div>
        </div>
      </div>

      {/* ── TABLA DE CONTROL DE MOBILIARIO ────────────────────── */}
      <div className="inventory-board-wrapper no-print" style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', minHeight: '60vh' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Cabecera */}
          <div className="content-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="content-panel-label">Activos Físicos</div>
              <div className="content-panel-title">
                Mobiliario e Inmobiliario
                <span className="result-count" style={{ marginLeft: 8, fontSize: 13, fontWeight: 400 }}>
                  {filteredItems.length} registros
                </span>
              </div>
            </div>
            {isAdmin && (
              <button onClick={handleOpenCreateModal} className="btn btn-primary">
                ＋ Registrar Mobiliario
              </button>
            )}
          </div>

          {/* Barra de Filtros */}
          <div className="filter-bar">
            <div className="search-input-wrap" style={{ minWidth: 220 }}>
              <span className="search-icon">🔍</span>
              <input 
                className="search-input"
                placeholder="Buscar por código, descripción, marca..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="">Todas las Categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>

            <select className="filter-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
              <option value="">Todos los Estados</option>
              <option value="Nuevo">Nuevo</option>
              <option value="Bueno">Bueno</option>
              <option value="Regular">Regular</option>
              <option value="Malo">Malo</option>
              <option value="Baja">Baja</option>
            </select>

            <select className="filter-select" value={filterUbicacion} onChange={e => setFilterUbicacion(e.target.value)}>
              <option value="">Todas las Ubicaciones</option>
              {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>

            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontWeight: 600 }} onClick={() => setShowExportModal(true)} title="Exportar inventario personalizado a Excel o PDF">
              📥 Exportar
            </button>

            {(search || filterCategory || filterEstado || filterUbicacion) && (
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => {
                setSearch('');
                setFilterCategory('');
                setFilterEstado('');
                setFilterUbicacion('');
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
                  <th style={{ width: '35%', minWidth: '320px' }}>Artículo / Mobiliario</th>
                  <th>No. de Inventario</th>
                  <th>Categoría</th>
                  <th>Ubicación</th>
                  <th>Estado</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                      Cargando mobiliario...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                      No se encontraron activos de mobiliario.
                    </td>
                  </tr>
                ) : (
                  groupedItems.map(group => {
                    const hasMultiple = group.items.length > 1;
                    const isExpanded = !!expandedGroups[group.key];
                    
                    if (!hasMultiple) {
                      // Caso A: Registro único
                      const item = group.items[0];
                      return (
                        <tr 
                          key={item.id}
                          className={selectedItem?.id === item.id ? 'selected' : ''}
                          onClick={() => setSelectedItem(item)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div className="bien-cell" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 16, display: 'inline-block' }} />
                              <div className="bien-icon">
                                <DynamicIcon name={item.categoriaInmobiliario?.icono || '🪑'} size={15} style={{ color: 'var(--primary)' }} />
                              </div>
                              <div>
                                <div className="bien-name" style={{ fontWeight: 600 }}>{item.descripcion}</div>
                                <div className="bien-serial" style={{ fontSize: 12.5 }}>
                                  {item.marca ? `${item.marca} ` : ''}{item.modelo || ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="tag-code">{item.codigo_inventario}</span>
                          </td>
                          <td style={{ fontSize: 12 }}>{item.categoriaInmobiliario?.nombre}</td>
                          <td style={{ fontSize: 12 }}>{item.ubicacion?.nombre}</td>
                          <td>
                            <span className={`badge ${
                              item.estado === 'Nuevo' || item.estado === 'Bueno' ? 'badge-active' :
                              item.estado === 'Regular' ? 'badge-info' :
                              item.estado === 'Malo' ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {item.estado}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {item.personal?.nombre || '—'}
                          </td>
                        </tr>
                      );
                    }

                    // Caso B: Lote de múltiples registros idénticos
                    const firstItem = group.items[0];
                    const allLocations = [...new Set(group.items.map(i => i.ubicacion?.nombre).filter(Boolean))];
                    const allStates = [...new Set(group.items.map(i => i.estado).filter(Boolean))];
                    const allCustodians = [...new Set(group.items.map(i => i.personal?.nombre).filter(Boolean))];

                    return (
                      <React.Fragment key={group.key}>
                        <tr 
                          className={`group-row ${isExpanded ? 'group-expanded' : ''}`}
                          onClick={() => toggleGroup(group.key)}
                          style={{ cursor: 'pointer', background: 'var(--bg-body-dark, rgba(0,0,0,0.015))', fontWeight: 600 }}
                        >
                          <td>
                            <div className="bien-cell" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ 
                                fontSize: 12, 
                                width: 16, 
                                display: 'inline-block', 
                                color: 'var(--primary)', 
                                userSelect: 'none', 
                                transition: 'transform 0.2s', 
                                transform: isExpanded ? 'rotate(90deg)' : 'none',
                                textAlign: 'center'
                              }}>
                                ▶
                              </span>
                              <div className="bien-icon">
                                <DynamicIcon name={firstItem.categoriaInmobiliario?.icono || '🪑'} size={15} style={{ color: 'var(--primary)' }} />
                              </div>
                              <div>
                                <div className="bien-name" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                                  {firstItem.descripcion}
                                  <span className="badge badge-info" style={{ background: 'rgba(0, 113, 106, 0.1)', color: 'var(--primary)', border: '1px solid rgba(0, 113, 106, 0.2)', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                                    {group.items.length} pzas
                                  </span>
                                </div>
                                <div className="bien-serial" style={{ fontSize: 12.5, fontWeight: 400 }}>
                                  {firstItem.marca ? `${firstItem.marca} ` : ''}{firstItem.modelo || ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              [Lote de {group.items.length}]
                            </span>
                          </td>
                          <td style={{ fontSize: 12, fontWeight: 400 }}>{firstItem.categoriaInmobiliario?.nombre}</td>
                          <td style={{ fontSize: 12, fontWeight: 400 }}>
                            {allLocations.length === 1 ? allLocations[0] : `Múltiples (${allLocations.length})`}
                          </td>
                          <td>
                            {allStates.length === 1 ? (
                              <span className={`badge ${
                                allStates[0] === 'Nuevo' || allStates[0] === 'Bueno' ? 'badge-active' :
                                allStates[0] === 'Regular' ? 'badge-info' :
                                allStates[0] === 'Malo' ? 'badge-warning' : 'badge-danger'
                              }`}>
                                {allStates[0]}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Varios</span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400 }}>
                            {allCustodians.length === 1 ? allCustodians[0] : allCustodians.length === 0 ? 'Bodega' : 'Múltiples'}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="nested-table-row" style={{ background: 'rgba(0,0,0,0.02)' }}>
                            <td colSpan={6} style={{ padding: '6px 12px 12px 36px' }}>
                              <div className="fade-in" style={{ 
                                borderLeft: '3px solid var(--primary)', 
                                background: 'var(--bg-card)', 
                                borderRadius: '0 var(--radius-md) var(--radius-md) 0', 
                                borderTop: '1px solid var(--border)',
                                borderBottom: '1px solid var(--border)',
                                borderRight: '1px solid var(--border)',
                                padding: 12,
                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
                              }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                  Desglose de unidades físicas en este lote:
                                </div>
                                <table className="inventory-table inventory-table-compact" style={{ margin: 0, background: 'transparent', width: '100%' }}>
                                  <thead>
                                    <tr style={{ background: 'transparent', borderBottom: '1px solid var(--border-light)' }}>
                                      <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left' }}>No. de Inventario</th>
                                      <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left' }}>Ubicación</th>
                                      <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left' }}>Estado</th>
                                      <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left' }}>Resguardante</th>
                                      <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'right', width: 120 }}>Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.items.map(subItem => (
                                      <tr 
                                        key={subItem.id} 
                                        className={selectedItem?.id === subItem.id ? 'selected' : ''}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedItem(subItem);
                                        }}
                                        style={{ cursor: 'pointer', background: 'transparent' }}
                                      >
                                        <td style={{ padding: '6px 8px' }}>
                                          <span className="tag-code" style={{ fontSize: 11 }}>{subItem.codigo_inventario}</span>
                                        </td>
                                        <td style={{ padding: '6px 8px', fontSize: 11 }}>
                                          {subItem.ubicacion?.nombre}
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                          <span className={`badge ${
                                            subItem.estado === 'Nuevo' || subItem.estado === 'Bueno' ? 'badge-active' :
                                            subItem.estado === 'Regular' ? 'badge-info' :
                                            subItem.estado === 'Malo' ? 'badge-warning' : 'badge-danger'
                                          }`} style={{ fontSize: 10, padding: '2px 6px' }}>
                                            {subItem.estado}
                                          </span>
                                        </td>
                                        <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-secondary)' }}>
                                          {subItem.personal?.nombre || 'Bodega'}
                                        </td>
                                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            {isAdmin && (
                                              <button 
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenEditModal(subItem);
                                                }} 
                                                className="btn btn-ghost" 
                                                style={{ fontSize: 10, padding: '2px 4px', height: 'auto', border: 'none', background: 'transparent' }}
                                                title="Editar"
                                              >
                                                ✏️
                                              </button>
                                            )}
                                            <button 
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handlePrintLabel(subItem);
                                              }} 
                                              className="btn btn-ghost" 
                                              style={{ fontSize: 10, padding: '2px 4px', height: 'auto', border: 'none', background: 'transparent' }}
                                              title="Imprimir Etiqueta"
                                            >
                                              🖨️
                                            </button>
                                            {isAdmin && (
                                              <button 
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteItem(subItem.id, subItem.descripcion);
                                                }} 
                                                className="btn btn-ghost" 
                                                style={{ fontSize: 10, padding: '2px 4px', height: 'auto', border: 'none', background: 'transparent', color: 'var(--danger)' }}
                                                title="Dar de baja"
                                              >
                                                🗑️
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── PANEL DE DETALLE LATERAL DE MOBILIARIO ─────────────── */}
        {selectedItem && (
          <div className="detail-sidebar fade-in" style={{ width: 320, background: 'var(--bg-body)', borderLeft: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 0, height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Detalle de Activo</h3>
              <button className="btn-icon" onClick={() => setSelectedItem(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Imagen del bien */}
            <div style={{ width: '100%', height: 160, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              {selectedItem.imagen_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={selectedItem.imagen_url} alt="Mobiliario" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 48, opacity: 0.2 }}>🪑</span>
              )}
              {isAdmin && (
                <label style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 }} title="Cargar foto">
                  📷
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            {/* Código de barras */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div 
                style={{ width: '100%', height: 50, display: 'flex', justifyContent: 'center' }}
                dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(selectedItem.codigo_inventario, false) }} 
              />
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{selectedItem.codigo_inventario}</span>
            </div>

            {/* Metadatos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Descripción:</span>
                <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '65%' }}>{selectedItem.descripcion}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Categoría:</span>
                <span style={{ fontWeight: 600 }}>{selectedItem.categoriaInmobiliario?.nombre}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ubicación:</span>
                <span style={{ fontWeight: 600 }}>{selectedItem.ubicacion?.nombre}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Depto/Coord:</span>
                <span style={{ fontWeight: 600 }}>{selectedItem.departamento?.nombre || 'General'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Custodio:</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{selectedItem.personal?.nombre || 'Bodega (Sin asignar)'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Estado:</span>
                <span style={{ fontWeight: 600 }}>{selectedItem.estado}</span>
              </div>
              {selectedItem.valor_estimado && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Valor Estimado:</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(selectedItem.valor_estimado)}</span>
                </div>
              )}
              {selectedItem.fecha_adquisicion && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Adquisición:</span>
                  <span style={{ fontWeight: 600 }}>{new Date(selectedItem.fecha_adquisicion).toLocaleDateString('es-MX')}</span>
                </div>
              )}
              {selectedItem.observaciones && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Observaciones:</span>
                  <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{selectedItem.observaciones}</span>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                {isAdmin && (
                  <button onClick={() => handleOpenEditModal(selectedItem)} className="btn btn-ghost" style={{ flex: 1 }}>✏️ Editar</button>
                )}
                <button onClick={() => handlePrintLabel(selectedItem)} className="btn btn-ghost" style={{ flex: 1 }} title="Imprimir etiqueta de barras">🖨️ Etiqueta</button>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => handleDeleteItem(selectedItem.id, selectedItem.descripcion)}
                  className="btn btn-danger"
                  style={{ width: '100%' }}
                >
                  🗑️ Dar de Baja Activo
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL FORMULARIO DE MOBILIARIO ────────────────────── */}
      {showModal && (
        <div className="modal-overlay no-print" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{formMode === 'create' ? 'Registrar' : 'Editar'} Mobiliario</div>
                <div className="modal-sub">Rellena los datos físicos y de asignación del mobiliario</div>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)} disabled={saving} style={{ border: 'none' }}>✕</button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto', paddingRight: 6 }}>
                
                {/* Categoría */}
                <div>
                  <label className="form-label">Categoría del Mobiliario *</label>
                  <select 
                    className="form-select"
                    name="categoriaInmobiliarioId"
                    value={form.categoriaInmobiliarioId}
                    onChange={handleFormChange}
                    required
                  >
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>

                {/* Código de Inventario */}
                {formMode === 'create' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-body)', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox"
                        className="checkbox-custom"
                        id="autogenerar_codigo"
                        name="autogenerar_codigo"
                        checked={form.autogenerar_codigo}
                        onChange={handleFormChange}
                      />
                      <label htmlFor="autogenerar_codigo" style={{ fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Autogenerar código de barras secuencial
                      </label>
                    </div>

                    {!form.autogenerar_codigo && (
                      <div className="fade-in" style={{ marginTop: 8 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Ingresa el código manual del inventario:</label>
                        <input 
                          className="form-input"
                          name="codigo_manual"
                          value={form.codigo_manual}
                          onChange={handleFormChange}
                          placeholder="Ej. UPEN-MOB-0105"
                          required={!form.autogenerar_codigo}
                        />
                      </div>
                    )}
                    {form.autogenerar_codigo && (
                      <div className="fade-in" style={{ marginTop: 8, borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>Cantidad de piezas a registrar (Lote):</label>
                        <input 
                          className="form-input"
                          type="number"
                          name="cantidad"
                          min="1"
                          max="200"
                          value={form.cantidad}
                          onChange={handleFormChange}
                          placeholder="Ej. 1"
                          required={form.autogenerar_codigo}
                        />
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                          Se generarán múltiples registros secuenciales con las mismas características.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {formMode === 'edit' && (
                  <div>
                    <label className="form-label">Número de Inventario</label>
                    <input 
                      className="form-input"
                      name="codigo_manual"
                      value={form.codigo_manual}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                )}

                {/* Descripción */}
                <div>
                  <label className="form-label">Descripción o Artículo *</label>
                  <input 
                    className="form-input"
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleFormChange}
                    placeholder="Ej. Escritorio modular de madera con 3 cajones"
                    required
                  />
                </div>

                {/* Marca / Modelo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Marca (Opcional)</label>
                    <input 
                      className="form-input"
                      name="marca"
                      value={form.marca}
                      onChange={handleFormChange}
                      placeholder="Ej. PM Steele"
                    />
                  </div>
                  <div>
                    <label className="form-label">Modelo (Opcional)</label>
                    <input 
                      className="form-input"
                      name="modelo"
                      value={form.modelo}
                      onChange={handleFormChange}
                      placeholder="Ej. Mod-2024"
                    />
                  </div>
                </div>

                {/* Estado / Valor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Estado Físico *</label>
                    <select 
                      className="form-select"
                      name="estado"
                      value={form.estado}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="Nuevo">Nuevo</option>
                      <option value="Bueno">Bueno</option>
                      <option value="Regular">Regular</option>
                      <option value="Malo">Malo</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Valor Estimado ($ MXN)</label>
                    <input 
                      className="form-input"
                      type="number"
                      name="valor_estimado"
                      value={form.valor_estimado}
                      onChange={handleFormChange}
                      placeholder="Ej. 3500"
                    />
                  </div>
                </div>

                {/* Ubicación / Depto */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Ubicación Física *</label>
                    <select 
                      className="form-select"
                      name="ubicacionId"
                      value={form.ubicacionId}
                      onChange={handleFormChange}
                      required
                    >
                      {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Departamento Destino</label>
                    <select 
                      className="form-select"
                      name="departamentoId"
                      value={form.departamentoId}
                      onChange={handleFormChange}
                    >
                      <option value="">Ninguno / General</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                </div>

                {/* Custodio / Docente */}
                <div>
                  <label className="form-label">Resguardante / Custodio Responsable</label>
                  <select 
                    className="form-select"
                    name="personalId"
                    value={form.personalId}
                    onChange={handleFormChange}
                  >
                    <option value="">Sin custodio (Resguardo en Bodega / Aula)</option>
                    {personal.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.puesto || 'Docente'})</option>)}
                  </select>
                </div>

                {/* Adquisición / Programa */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label">Fecha de Adquisición</label>
                    <input 
                      className="form-input"
                      type="date"
                      name="fecha_adquisicion"
                      value={form.fecha_adquisicion}
                      onChange={handleFormChange}
                    />
                  </div>
                  <div>
                    <label className="form-label">Programa / Fondo de Compra</label>
                    <input 
                      className="form-input"
                      name="programa_adquisicion"
                      value={form.programa_adquisicion}
                      onChange={handleFormChange}
                      placeholder="Ej. Fondo U079"
                    />
                  </div>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="form-label">Observaciones especiales</label>
                  <textarea 
                    className="form-input"
                    name="observaciones"
                    value={form.observaciones}
                    onChange={handleFormChange}
                    placeholder="Detalles sobre ralladuras, estado de entrega, llaves..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Guardando...' : '💾 Registrar Mobiliario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONTENEDOR DE IMPRESIÓN DE ETIQUETAS DE MOBILIARIO ─── */}
      {printItems.length > 0 && (
        <div className="print-labels-container">
          {printItems.map((item) => {
            const rawHeader = configuracion.cabecera_etiqueta_impresion 
              ? configuracion.cabecera_etiqueta_impresion.replace('{siglas}', configuracion.siglas_institucion || 'UPEN')
              : `CONTROL INTERNO DE ACTIVO FIJO ${configuracion.siglas_institucion || 'UPEN'}`;
            const headerText = rawHeader.toUpperCase().startsWith("CONTROL INTERNO DE ACTIVO FIJO")
              ? `ACTIVO FIJO ${configuracion.siglas_institucion || 'UPEN'}`
              : rawHeader;

            return (
              <div key={item.id} className="printable-label">
                <div className="label-inner-clean">
                  {configuracion.etiqueta_mostrar_cabecera !== 'false' && configuracion.etiqueta_mostrar_cabecera !== false && (
                    <div className="label-header-clean">
                      {headerText}
                    </div>
                  )}
                  {configuracion.etiqueta_mostrar_marca_modelo !== 'false' && configuracion.etiqueta_mostrar_marca_modelo !== false && (
                    <div className="label-details-clean" style={{ fontWeight: 650 }}>
                      {item.descripcion.substring(0, 32)}
                    </div>
                  )}
                  <div 
                    className="label-barcode-clean" 
                    dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(item.codigo_inventario, false) }} 
                  />
                  <div className="label-footer-clean">
                    <span className="label-code-clean" style={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.codigo_inventario}</span>
                    <span className="label-serial-clean" style={{ maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.marca || 'S/M'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showExportModal && (
        <ModalExportador
          onClose={() => setShowExportModal(false)}
          data={filteredItems}
          selectedIds={selectedItem ? [selectedItem.id] : []}
          configuracion={configuracion}
          type="mobiliario"
        />
      )}
    </>
  );
}
