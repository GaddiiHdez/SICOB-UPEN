import React, { useState, useMemo, useCallback } from 'react';
import { ESTADOS_BIEN, ESTADO_BADGE } from '@/lib/constants';
import DetailPanel from '@/app/components/DetailPanel';
import ModalExportador from '@/app/components/ModalExportador';

/**
 * InventarioView — Vista completa del módulo de Inventario
 *
 * Extrae ~270 líneas de JSX + 2 useMemo (stats) de page.js.
 * Recibe datos y callbacks del padre; no hace fetch propio.
 *
 * Props:
 * @param {Array}    bienes
 * @param {Array}    categorias
 * @param {Array}    ubicaciones
 * @param {Array}    personal
 * @param {boolean}  isLoading
 * @param {string}   search            - Texto del buscador
 * @param {Function} setSearch
 * @param {string}   filterEstado
 * @param {Function} setFilterEstado
 * @param {string}   filterArea
 * @param {Function} setFilterArea
 * @param {string}   filterTipo
 * @param {Function} setFilterTipo
 * @param {Array}    selected          - IDs seleccionados con checkbox
 * @param {object}   selectedBien      - Bien abierto en el panel lateral
 * @param {Function} onRowClick
 * @param {Function} onCheck
 * @param {Function} onCheckAll
 * @param {Function} onClearFilters
 * @param {Function} onEdit
 * @param {Function} onClone
 * @param {Function} onBulkUpdate
 * @param {Function} onViewFicha
 * @param {Function} onRestore
 * @param {Function} onPrintBulkLabels
 */
export default function InventarioView({
  bienes, categorias, ubicaciones, personal, isLoading,
  search, setSearch, filterEstado, setFilterEstado,
  filterArea, setFilterArea, filterTipo, setFilterTipo,
  selected, selectedBien,
  onRowClick, onCheck, onCheckAll, onClearFilters,
  onEdit, onClone, onBulkUpdate, onViewFicha,
  onRestore, onDeletePermanent, onPrintBulkLabels, onStatusChange,
  isAdmin, configuracion
}) {
  const [agruparPorModelo, setAgruparPorModelo] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showExportModal, setShowExportModal] = useState(false);
  // ── Filtrado ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bienes.filter(b => {
      if (b.eliminado && filterEstado !== 'Baja') return false;
      const displayedEtiqueta = b.etiqueta.startsWith('SIN-NUMERO-') ? 's/n sin numero' : b.etiqueta.toLowerCase();
      const matchQ = !q
        || b.nombre.toLowerCase().includes(q)
        || b.serial.toLowerCase().includes(q)
        || displayedEtiqueta.includes(q);
      const matchEstado = !filterEstado
        || (filterEstado === 'Baja' ? (b.eliminado || b.estado === 'Baja') : b.estado === filterEstado);
      return (
        matchQ && matchEstado
        && (!filterArea || b.area === filterArea)
        && (!filterTipo || b.tipo === filterTipo)
      );
    });
  }, [bienes, search, filterEstado, filterArea, filterTipo]);

  // Agrupar items idénticos en base a categoría, marca y modelo
  const groupedItems = useMemo(() => {
    if (!agruparPorModelo) return [];
    const groups = {};
    filtered.forEach(bien => {
      const key = `${bien.categoriaId}-${bien.marca.trim().toLowerCase()}-${bien.modelo.trim().toLowerCase()}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          nombre: bien.nombre,
          marca: bien.marca,
          modelo: bien.modelo,
          tipo: bien.tipo,
          icono: bien.icono,
          categoriaId: bien.categoriaId,
          items: []
        };
      }
      groups[key].items.push(bien);
    });
    return Object.values(groups);
  }, [filtered, agruparPorModelo]);

  const toggleGroup = useCallback((groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  }, []);

  const toggleGroupSelection = useCallback((e, groupItems) => {
    e.stopPropagation();
    const allGroupChecked = groupItems.every(item => selected.includes(item.id));
    groupItems.forEach(item => {
      const isChecked = selected.includes(item.id);
      if (allGroupChecked && isChecked) {
        onCheck(item.id, e);
      } else if (!allGroupChecked && !isChecked) {
        onCheck(item.id, e);
      }
    });
  }, [selected, onCheck]);

  // ── Stats de inventario compactas ─────────────────────────
  const { statsInventario, valorPatrimonial } = useMemo(() => {
    const active = bienes.filter(b => !b.eliminado);
    const valor = active.reduce((s, b) => s + (b.valor_estimado || 0), 0);
    const valorFormateado = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(valor);

    return {
      statsInventario: [
        { label: 'Total Bienes',     value: active.length,                                     icon: '🗂', color: 'blue',   status: '' },
        { label: 'Activos',          value: active.filter(b => b.estado === 'Activo').length,  icon: '🟢', color: 'green',  status: 'Activo' },
        { label: 'En Mantenimiento', value: active.filter(b => b.estado === 'Mantenimiento').length, icon: '🔧', color: 'rose',   status: 'Mantenimiento' },
        { label: 'De Baja',          value: bienes.filter(b => b.eliminado || b.estado === 'Baja').length, icon: '🔴', color: 'orange', status: 'Baja' }
      ],
      valorPatrimonial: valorFormateado
    };
  }, [bienes]);

  const allChecked = filtered.length > 0 && filtered.every(b => selected.includes(b.id));
  const hayFiltros = !!(search || filterEstado || filterArea || filterTipo);

  return (
    <>
      {/* Panel de estadísticas unificado y compacto */}
      <div className="stats-row-compact">
        {statsInventario.map(s => {
          const isFilterActive = filterEstado === s.status;
          return (
            <div key={s.label} className={`stat-card-compact interactive fade-in ${isFilterActive ? 'active' : ''}`}
              onClick={() => setFilterEstado(s.status)}
              title={`Filtrar por ${s.label}`}>
              <div className={`stat-icon-compact stat-icon-compact-${s.color}`}>{s.icon}</div>
              <div className="stat-info-compact">
                <div className="stat-label-compact">{s.label}</div>
                <div className="stat-value-compact">{s.value}</div>
              </div>
            </div>
          );
        })}

        <div className="stat-card-compact readonly fade-in" title="Valor estimado total del patrimonio activo">
          <div className="stat-icon-compact stat-icon-compact-green">💰</div>
          <div className="stat-info-compact">
            <div className="stat-label-compact">Valor patrimonial</div>
            <div className="stat-value-compact currency">{valorPatrimonial}</div>
          </div>
        </div>
      </div>

      {/* Panel de inventario */}
      <div className="inventory-board-wrapper" style={{ display: 'flex', position: 'relative', alignItems: 'flex-start', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>

        {/* Tabla + filtros */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderTopLeftRadius: 'var(--radius-lg)', borderBottomLeftRadius: 'var(--radius-lg)' }}>

          {/* Cabecera */}
          <div className="content-panel-header">
            <div>
              <div className="content-panel-label">Control operativo</div>
              <div className="content-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Inventario
                <span className="result-count" style={{ fontWeight: 400, fontSize: 13 }}>
                  {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de filtros */}
          <div className="filter-bar">
            <div className="search-input-wrap" style={{ minWidth: 220 }}>
              <span className="search-icon">🔍</span>
              <input id="search-inventario" className="search-input"
                placeholder="Buscar bien, serie, no. de inventario..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <select id="filter-estado" className="filter-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_BIEN.map(e => <option key={e}>{e}</option>)}
            </select>

            <select id="filter-tipo" className="filter-select" value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {categorias.map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>

            <select id="filter-area" className="filter-select" value={filterArea} onChange={e => setFilterArea(e.target.value)}>
              <option value="">Todas las áreas</option>
              {ubicaciones.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', paddingLeft: 8 }}>
              <input 
                type="checkbox" 
                id="agrupar-bienes" 
                className="checkbox-custom"
                checked={agruparPorModelo}
                onChange={e => setAgruparPorModelo(e.target.checked)}
                style={{ width: 14, height: 14 }}
              />
              <label htmlFor="agrupar-bienes" style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', userSelect: 'none' }}>
                📦 Agrupar por modelo
              </label>
            </div>

            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontWeight: 600 }} onClick={() => setShowExportModal(true)} title="Exportar inventario personalizado a Excel o PDF">
              📥 Exportar
            </button>

            {hayFiltros && (
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={onClearFilters}>
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* Tabla */}
          <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
            <table className="inventory-table">
              <thead>
                <tr>
                  <th><input type="checkbox" className="checkbox-custom" checked={allChecked}
                    onChange={() => onCheckAll(filtered.map(b => b.id))} /></th>
                  <th>Bien</th>
                  <th>No. de Inventario</th>
                  <th>Estado</th>
                  <th>Área</th>
                  <th>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="dash-pulse" style={{ margin: '0 auto 12px', width: 12, height: 12 }}></div>
                        <div className="empty-state-text">Cargando datos en vivo...</div>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <div className="empty-state-text">No se encontraron resultados</div>
                        <div className="empty-state-sub">Intenta ajustar los filtros de búsqueda</div>
                      </div>
                    </td>
                  </tr>
                ) : !agruparPorModelo ? (
                  filtered.map(bien => (
                    <tr key={bien.id}
                      className={selectedBien?.id === bien.id ? 'selected' : ''}
                      onClick={() => onRowClick(bien)}
                      onDoubleClick={() => onViewFicha(bien)}
                      style={{ cursor: 'pointer' }}
                      title="Doble clic para ver la Ficha Técnica del bien">
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="checkbox-custom"
                          checked={selected.includes(bien.id)}
                          onChange={e => onCheck(bien.id, e)} />
                      </td>
                      <td>
                        <div className="bien-cell">
                          <div className="bien-icon">{bien.icono}</div>
                          <div>
                            <div className="bien-name">{bien.nombre}</div>
                            <div className="bien-serial">{bien.serial}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="tag-code">
                          {bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}
                        </span>
                      </td>
                      <td>
                        <span 
                          className={ESTADO_BADGE[bien.estado] ?? 'badge badge-gray'} 
                          style={isAdmin ? { padding: '0 0 0 8px', position: 'relative', display: 'inline-flex', alignItems: 'center' } : { padding: '4px 8px', display: 'inline-flex', alignItems: 'center' }}
                          onClick={e => e.stopPropagation()}
                          title={isAdmin ? "Cambiar estado rápidamente" : undefined}
                        >
                          {isAdmin ? (
                            <>
                              <select
                                value={bien.estado}
                                onChange={(e) => onStatusChange(bien.id, e.target.value)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  color: 'inherit',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  outline: 'none',
                                  WebkitAppearance: 'none',
                                  MozAppearance: 'none',
                                  appearance: 'none',
                                  padding: '3px 16px 3px 4px',
                                  margin: 0,
                                  fontFamily: 'inherit'
                                }}
                              >
                                {ESTADOS_BIEN.map(e => (
                                  <option key={e} value={e} style={{ color: 'var(--text-primary)', background: 'var(--bg-card)' }}>
                                    {e}
                                  </option>
                                ))}
                              </select>
                              <span style={{ position: 'absolute', right: '6px', pointerEvents: 'none', fontSize: '7px', opacity: 0.6 }}>▼</span>
                            </>
                          ) : (
                            <span style={{ fontSize: '11px', fontWeight: 600 }}>{bien.estado}</span>
                          )}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{bien.area}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{bien.responsable || '—'}</td>
                    </tr>
                  ))
                ) : (
                  groupedItems.map(group => {
                    const hasMultiple = group.items.length > 1;
                    const isExpanded = !!expandedGroups[group.key];
                    
                    if (!hasMultiple) {
                      // Caso A: Un solo equipo
                      const bien = group.items[0];
                      return (
                        <tr key={bien.id}
                          className={selectedBien?.id === bien.id ? 'selected' : ''}
                          onClick={() => onRowClick(bien)}
                          onDoubleClick={() => onViewFicha(bien)}
                          style={{ cursor: 'pointer' }}
                          title="Doble clic para ver la Ficha Técnica del bien">
                          <td onClick={e => e.stopPropagation()}>
                            <input type="checkbox" className="checkbox-custom"
                              checked={selected.includes(bien.id)}
                              onChange={e => onCheck(bien.id, e)} />
                          </td>
                          <td>
                            <div className="bien-cell" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 16, display: 'inline-block' }} />
                              <div className="bien-icon">{bien.icono}</div>
                              <div>
                                <div className="bien-name">{bien.nombre}</div>
                                <div className="bien-serial">{bien.serial}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="tag-code">
                              {bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}
                            </span>
                          </td>
                          <td>
                            <span 
                              className={ESTADO_BADGE[bien.estado] ?? 'badge badge-gray'} 
                              style={isAdmin ? { padding: '0 0 0 8px', position: 'relative', display: 'inline-flex', alignItems: 'center' } : { padding: '4px 8px', display: 'inline-flex', alignItems: 'center' }}
                              onClick={e => e.stopPropagation()}
                              title={isAdmin ? "Cambiar estado rápidamente" : undefined}
                            >
                              {isAdmin ? (
                                <>
                                  <select
                                    value={bien.estado}
                                    onChange={(e) => onStatusChange(bien.id, e.target.value)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: 'inherit',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      outline: 'none',
                                      WebkitAppearance: 'none',
                                      MozAppearance: 'none',
                                      appearance: 'none',
                                      padding: '3px 16px 3px 4px',
                                      margin: 0,
                                      fontFamily: 'inherit'
                                    }}
                                  >
                                    {ESTADOS_BIEN.map(e => (
                                      <option key={e} value={e} style={{ color: 'var(--text-primary)', background: 'var(--bg-card)' }}>
                                        {e}
                                      </option>
                                    ))}
                                  </select>
                                  <span style={{ position: 'absolute', right: '6px', pointerEvents: 'none', fontSize: '7px', opacity: 0.6 }}>▼</span>
                                </>
                              ) : (
                                <span style={{ fontSize: '11px', fontWeight: 600 }}>{bien.estado}</span>
                              )}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{bien.area}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{bien.responsable || '—'}</td>
                        </tr>
                      );
                    }

                    // Caso B: Lote de múltiples equipos idénticos
                    const firstBien = group.items[0];
                    const isGroupAllChecked = group.items.every(item => selected.includes(item.id));
                    
                    const allLocations = [...new Set(group.items.map(i => i.area).filter(Boolean))];
                    const allStates = [...new Set(group.items.map(i => i.estado).filter(Boolean))];
                    const allCustodians = [...new Set(group.items.map(i => i.responsable).filter(Boolean))];

                    return (
                      <React.Fragment key={group.key}>
                        <tr 
                          className={`group-row ${isExpanded ? 'group-expanded' : ''}`}
                          onClick={() => toggleGroup(group.key)}
                          style={{ cursor: 'pointer', background: 'var(--bg-body-dark, rgba(0,0,0,0.015))', fontWeight: 600 }}
                        >
                          <td onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="checkbox-custom"
                              checked={isGroupAllChecked}
                              onChange={e => toggleGroupSelection(e, group.items)} 
                            />
                          </td>
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
                              <div className="bien-icon">{firstBien.icono}</div>
                              <div>
                                <div className="bien-name" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                                  {firstBien.nombre}
                                  <span className="badge badge-info" style={{ background: 'rgba(0, 113, 106, 0.1)', color: 'var(--primary)', border: '1px solid rgba(0, 113, 106, 0.2)', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                                    {group.items.length} pzas
                                  </span>
                                </div>
                                <div className="bien-serial" style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>
                                  [Múltiples series]
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              [Lote]
                            </span>
                          </td>
                          <td>
                            {allStates.length === 1 ? (
                              <span className={ESTADO_BADGE[allStates[0]] ?? 'badge badge-gray'}>
                                {allStates[0]}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>Varios</span>
                            )}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 400 }}>
                            {allLocations.length === 1 ? allLocations[0] : `Múltiples (${allLocations.length})`}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 400 }}>
                            {allCustodians.length === 1 ? allCustodians[0] : allCustodians.length === 0 ? 'Sin asignar' : 'Múltiples'}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="nested-table-row" style={{ background: 'rgba(0,0,0,0.02)' }}>
                            <td colSpan={6} style={{ padding: '6px 12px 12px 48px' }}>
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
                                  Desglose de unidades en este lote:
                                </div>
                                <table className="inventory-table inventory-table-compact" style={{ margin: 0, background: 'transparent', width: '100%' }}>
                                  <thead>
                                    <tr style={{ background: 'transparent', borderBottom: '1px solid var(--border-light)' }}>
                                      <th style={{ width: 40 }}></th>
                                      <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left' }}>No. de Inventario</th>
                                      <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left' }}>No. de Serie</th>
                                      <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left' }}>Área</th>
                                      <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left' }}>Estado</th>
                                      <th style={{ padding: '6px 8px', fontSize: 11, textAlign: 'left' }}>Resguardante</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.items.map(subItem => (
                                      <tr 
                                        key={subItem.id} 
                                        className={selectedBien?.id === subItem.id ? 'selected' : ''}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onRowClick(subItem);
                                        }}
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          onViewFicha(subItem);
                                        }}
                                        style={{ cursor: 'pointer', background: 'transparent' }}
                                        title="Doble clic para ver Ficha Técnica"
                                      >
                                        <td onClick={e => e.stopPropagation()} style={{ width: 40, textAlign: 'center' }}>
                                          <input type="checkbox" className="checkbox-custom"
                                            checked={selected.includes(subItem.id)}
                                            onChange={e => onCheck(subItem.id, e)} />
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                          <span className="tag-code" style={{ fontSize: 11 }}>
                                            {subItem.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : subItem.etiqueta}
                                          </span>
                                        </td>
                                        <td style={{ padding: '6px 8px', fontSize: 11, fontFamily: 'monospace' }}>
                                          {subItem.serial}
                                        </td>
                                        <td style={{ padding: '6px 8px', fontSize: 11 }}>
                                          {subItem.area}
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                          <span className={`badge ${
                                            subItem.estado === 'Activo' ? 'badge-active' :
                                            subItem.estado === 'Mantenimiento' ? 'badge-danger' :
                                            subItem.estado === 'Baja' ? 'badge-warning' : 'badge-info'
                                          }`} style={{ fontSize: 10, padding: '2px 6px' }}>
                                            {subItem.estado}
                                          </span>
                                        </td>
                                        <td style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-secondary)' }}>
                                          {subItem.responsable || '—'}
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

        {/* Panel de detalle lateral */}
        <DetailPanel
          bien={selectedBien}
          selected={selected}
          personal={personal}
          ubicaciones={ubicaciones}
          onClearSelection={() => {}}
          onEdit={onEdit}
          onClone={onClone}
          onBulkUpdate={onBulkUpdate}
          onViewFicha={onViewFicha}
          onRestore={onRestore}
          onDeletePermanent={onDeletePermanent}
          onPrintBulkLabels={onPrintBulkLabels}
          onStatusChange={onStatusChange}
          isAdmin={isAdmin}
        />
      </div>

      {showExportModal && (
        <ModalExportador
          onClose={() => setShowExportModal(false)}
          data={filtered}
          selectedIds={selected}
          configuracion={configuracion}
          type="bienes"
        />
      )}
    </>
  );
}
