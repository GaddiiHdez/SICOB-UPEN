'use client';
import { useMemo, useCallback } from 'react';
import { ESTADOS_BIEN, ESTADO_BADGE } from '@/lib/constants';
import DetailPanel from '@/app/components/DetailPanel';

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
  isAdmin
}) {
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
                ) : filtered.map(bien => (
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
                        style={{ padding: '0 0 0 8px', position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                        onClick={e => e.stopPropagation()}
                        title="Cambiar estado rápidamente"
                      >
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
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{bien.area}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{bien.responsable || '—'}</td>
                  </tr>
                ))}
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
    </>
  );
}
