'use client';
import React, { Fragment } from 'react';
import { formatDate } from '@/lib/formatters';
import { TipoBadge, BienCell, EtiquetaCell } from '@/app/components/shared/BienCell';
import { parsePeriodo, cleanDescription, getDaysRemainingText } from './utils';
import CalendarView from './CalendarView';

/**
 * AgendaTab — Pestaña de Agenda Preventiva
 * Muestra los mantenimientos programados agrupados por plan (acordeón).
 */
export default function AgendaTab({
  groupedAgenda,
  expandedGroups,
  viewMode,
  calendarDate,
  mantenimientos,
  onToggleExpand,
  onStartPlan,
  onEditPlan,
  onDeletePlan,
  onStartMaintenance,
  onDeleteMantenimiento,
  onOpenPrintPlan,
  onSetViewMode,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  onEventClick,
  getUbicacionName,
  getFullBien,
  isAdmin = false,
}) {
  return (
    <div>
      {/* Barra de acciones y selector de vista */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button
            type="button"
            onClick={onOpenPrintPlan}
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '6px 12px', height: 'auto', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', color: 'var(--primary)' }}
          >
            📅 Exportar Plan PDF
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => onSetViewMode('list')}
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12, padding: '6px 12px', height: 'auto', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)' }}
          >
            📋 Vista de Lista
          </button>
          <button
            type="button"
            onClick={() => onSetViewMode('calendar')}
            className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12, padding: '6px 12px', height: 'auto', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)' }}
          >
            📅 Vista de Calendario
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        groupedAgenda.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No hay revisiones programadas</h3>
            <p style={{ fontSize: 12, marginTop: 4 }}>Tu inventario tecnológico se encuentra completamente al corriente.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="inventory-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Plan / Tipo</th>
                  <th>Ubicación / Área(s)</th>
                  <th>Equipos Programados</th>
                  <th>Fecha / Periodo Programado</th>
                  <th>Estado de Vencimiento</th>
                  {isAdmin && <th>Acciones del Plan</th>}
                </tr>
              </thead>
              <tbody>
                {groupedAgenda.map(group => {
                  const isExpanded = expandedGroups[group.key];
                  const remaining = getDaysRemainingText(group.items[0]);
                  return (
                    <Fragment key={group.key}>
                      <tr id={`plan-row-${group.key}`} style={{ transition: 'background-color 0.5s ease' }}>
                        <td
                          onClick={() => onToggleExpand(group.key)}
                          style={{ cursor: 'pointer', textAlign: 'center', fontSize: 14, color: 'var(--primary)', userSelect: 'none' }}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <TipoBadge tipo={group.tipo} />
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {group.items.length === 1 ? 'Mantenimiento individual' : 'Plan grupal'}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', maxWidth: 220 }}>
                          {group.ubicacionesList.join(', ') || 'Sin ubicación'}
                        </td>
                        <td>
                          <span style={{
                            background: 'var(--bg-body, #F3F4F6)', padding: '4px 8px', borderRadius: 12,
                            fontSize: 11, fontWeight: 700, border: '1px solid var(--border)',
                            color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 4
                          }}>
                            💻 {group.items.length} {group.items.length === 1 ? 'equipo' : 'equipos'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12 }}>
                          {(() => {
                            const periodo = parsePeriodo(group.descripcion);
                            if (periodo) {
                              return (
                                <div>
                                  <div style={{ fontWeight: 600 }}>Periodo:</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                    {formatDate(periodo.inicioRaw)} al {formatDate(periodo.finRaw)}
                                  </div>
                                </div>
                              );
                            }
                            return formatDate(group.proximo_mantenimiento);
                          })()}
                        </td>
                        <td style={{ fontSize: 12 }}>
                          <span className={remaining.className}>{remaining.text}</span>
                        </td>
                        {isAdmin && (
                           <td>
                             <div style={{ display: 'flex', gap: 6 }}>
                               <button
                                 onClick={() => onStartPlan(group)}
                                 className="btn"
                                 style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(13, 148, 136, 0.1)', color: 'var(--primary)', border: '1px solid rgba(13, 148, 136, 0.2)' }}
                                 title="Iniciar todos los mantenimientos del plan"
                                >
                                 🛠️ Iniciar
                               </button>
                               <button
                                 onClick={() => onEditPlan(group)}
                                 className="btn"
                                 style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(59, 130, 246, 0.08)', color: '#2563EB', border: '1px solid rgba(59, 130, 246, 0.15)' }}
                                 title="Editar plan de mantenimiento"
                               >
                                 ✏️ Editar
                               </button>
                               <button
                                 onClick={() => onDeletePlan(group)}
                                 className="btn"
                                 style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(239, 68, 68, 0.05)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.1)' }}
                                 title="Eliminar plan completo"
                               >
                                 ✕ Borrar
                               </button>
                             </div>
                           </td>
                         )}
                      </tr>

                      {isExpanded && (
                        <tr>
                         <td colSpan={isAdmin ? "7" : "6"} style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.015)', borderTop: 'none' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {/* Descripción del Plan */}
                              <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 6, border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.05em' }}>Descripción / Tareas del Plan</div>
                                <div style={{ fontSize: 12, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                                  {cleanDescription(group.descripcion)}
                                </div>
                              </div>

                              {/* Listado de equipos */}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.05em' }}>Equipos Incluidos</div>
                                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
                                  <table className="inventory-table" style={{ margin: 0, width: '100%' }}>
                                    <thead>
                                      <tr style={{ background: 'var(--bg-body, #F3F4F6)' }}>
                                         <th style={{ fontSize: 11, padding: '8px 12px' }}>Equipo / Bien</th>
                                         <th style={{ fontSize: 11, padding: '8px 12px' }}>Etiqueta / Serie</th>
                                         <th style={{ fontSize: 11, padding: '8px 12px' }}>Ubicación</th>
                                         {isAdmin && <th style={{ fontSize: 11, padding: '8px 12px' }}>Acciones Individuales</th>}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.items.map(m => (
                                        <tr key={m.id} style={{ background: 'var(--bg-card)' }}>
                                          <td style={{ padding: '8px 12px' }}><BienCell bien={m.bien} icon="💻" /></td>
                                          <td style={{ padding: '8px 12px' }}><EtiquetaCell bien={m.bien} /></td>
                                          <td style={{ padding: '8px 12px', fontSize: 11 }}>
                                            {m.bien?.ubicacion?.nombre || getUbicacionName(getFullBien(m.bienId)?.ubicacionId)}
                                          </td>
                                           {isAdmin && (
                                            <td style={{ padding: '8px 12px' }}>
                                              <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                  onClick={() => onStartMaintenance(m)}
                                                  className="btn btn-ghost"
                                                  style={{ padding: '4px 8px', fontSize: 10, border: '1px solid rgba(13, 148, 136, 0.15)', color: 'var(--primary)' }}
                                                >
                                                  🛠️ Iniciar
                                                </button>
                                                <button
                                                  onClick={() => onDeleteMantenimiento(m.id)}
                                                  className="btn btn-ghost"
                                                  style={{ padding: '4px 8px', fontSize: 10, color: '#EF4444' }}
                                                >
                                                  ✕ Quitar del Plan
                                                </button>
                                              </div>
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <CalendarView
          calendarDate={calendarDate}
          mantenimientos={mantenimientos}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          onDayClick={isAdmin ? onDayClick : null}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}
