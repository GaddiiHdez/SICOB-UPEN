'use client';
import React from 'react';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { parsePeriodo, cleanDescription } from './utils';

/**
 * HistorialTab — Pestaña de Historial Clínico (estado "Completado")
 */
export default function HistorialTab({
  historialMantenimientos,
  searchQuery,
  filterTipo,
  onSearchChange,
  onFilterChange,
  onPrintConstancia,
  onDelete,
  isAdmin = false,
}) {
  return (
    <div>
      {/* Filtros locales */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-input-wrap" style={{ minWidth: 260, flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Buscar por bien, serie, etiqueta, técnico..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterTipo}
          onChange={e => onFilterChange(e.target.value)}
          style={{ minWidth: 160 }}
        >
          <option value="">Todos los tipos</option>
          <option value="Preventivo">Preventivo</option>
          <option value="Correctivo">Correctivo</option>
        </select>
        {historialMantenimientos.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {historialMantenimientos.length} registro{historialMantenimientos.length !== 1 ? 's' : ''} completado{historialMantenimientos.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {historialMantenimientos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No se encontraron registros</h3>
          <p style={{ fontSize: 12, marginTop: 4 }}>Intenta ajustar los criterios de búsqueda o filtros.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Fecha de Cierre</th>
                <th>Equipo / Bien</th>
                <th>Etiqueta / Serie</th>
                <th>Clasificación</th>
                <th>Servicio / Informe Realizado</th>
                <th>Técnico</th>
                <th>Costo de Servicio</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {historialMantenimientos.map(m => (
                <tr key={m.id}>
                  <td style={{ fontSize: 12 }}>📅 {formatDate(m.fecha_mantenimiento)}</td>
                  <td>
                    <div className="bien-cell">
                      <div className="bien-icon">💻</div>
                      <div>
                        <div className="bien-name">{m.bien?.marca} {m.bien?.modelo}</div>
                        <div className="bien-serial" style={{ fontSize: 10 }}>{m.bien?.categoria?.nombre || 'General'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.bien?.codigo_inventario?.startsWith('SIN-NUMERO-') ? 'S/N' : (m.bien?.codigo_inventario || '—')}</div>
                    <div className="bien-serial" style={{ fontFamily: 'monospace' }}>{m.bien?.numero_serie || '—'}</div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: m.tipo === 'Preventivo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: m.tipo === 'Preventivo' ? '#10B981' : '#EF4444', fontWeight: 600
                    }}>{m.tipo}</span>
                  </td>
                  <td style={{ maxWidth: 220, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                    {(() => {
                      const periodo = parsePeriodo(m.descripcion);
                      return (
                        <>
                          {periodo && (
                            <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>
                              📅 Periodo planificado: {formatDate(periodo.inicioRaw)} al {formatDate(periodo.finRaw)}
                            </div>
                          )}
                          {cleanDescription(m.descripcion)}
                        </>
                      );
                    })()}
                  </td>
                  <td style={{ fontSize: 12 }}>👤 {m.tecnico_encargado || '—'}</td>
                  <td style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(m.costo)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => onPrintConstancia(m)}
                        className="btn btn-ghost"
                        style={{ padding: '5px 10px', fontSize: 11, color: 'var(--primary)', border: '1px solid rgba(13, 148, 136, 0.15)' }}
                        title="Imprimir Constancia de Servicio (PDF)"
                      >
                        🖨️ Constancia
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => onDelete(m.id)}
                          className="btn btn-ghost"
                          style={{ padding: '5px 10px', fontSize: 11, color: '#EF4444' }}
                          title="Eliminar del historial clínico"
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
      )}
    </div>
  );
}
