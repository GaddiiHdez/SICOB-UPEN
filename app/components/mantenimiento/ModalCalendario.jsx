'use client';
import React from 'react';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { parsePeriodo, cleanDescription } from './utils';

/**
 * ModalCalendario — Modal de detalles del evento del calendario
 */
export default function ModalCalendario({ event, onClose, onDelete, onStart, onFinalize, isAdmin = false }) {
  if (!event) return null;
  const periodo = parsePeriodo(event.descripcion);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">🔧 Detalles del Mantenimiento</h3>
            <p className="modal-sub">Información técnica y acciones de control</p>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {/* Info del Bien */}
          <div style={{ background: 'var(--bg-body, #F3F4F6)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Equipo Tecnológico</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>
              {event.bien.marca} {event.bien.modelo}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <span><strong>S/N:</strong> {event.bien.numero_serie}</span>
              <span><strong>No. Inv:</strong> {event.bien.codigo_inventario.startsWith('SIN-NUMERO-') ? 'S/N' : event.bien.codigo_inventario}</span>
            </div>
          </div>

          {/* Detalles del Servicio */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Clasificación</div>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: event.tipo === 'Preventivo' ? 'rgba(13, 148, 136, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                color: event.tipo === 'Preventivo' ? 'var(--primary)' : '#EF4444',
                fontWeight: 700, display: 'inline-block', marginTop: 4
              }}>{event.tipo}</span>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Estatus</div>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: event.estado === 'Programado' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                color: event.estado === 'Programado' ? '#2563EB' : '#D97706',
                fontWeight: 700, display: 'inline-block', marginTop: 4
              }}>{event.estado}</span>
            </div>

            {event.estado === 'Programado' && (
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Fecha o Periodo Agendado</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>
                  {periodo
                    ? `📅 Del ${formatDate(periodo.inicioRaw)} al ${formatDate(periodo.finRaw)}`
                    : `📅 ${formatDate(event.proximo_mantenimiento)}`}
                </div>
              </div>
            )}
            {event.estado === 'En proceso' && (
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Fecha de Ingreso</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>
                  📅 {formatDate(event.fecha_mantenimiento)}
                </div>
              </div>
            )}
            {event.tecnico_encargado && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Técnico</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>👤 {event.tecnico_encargado}</div>
              </div>
            )}
            {event.costo !== null && event.costo !== undefined && (
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Costo Estimado</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: 'var(--primary)' }}>{formatCurrency(event.costo)}</div>
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Descripción / Diagnóstico</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5, background: 'var(--bg-body, #F3F4F6)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>
              {cleanDescription(event.descripcion)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
            {isAdmin ? (
              <>
                <button type="button" onClick={onDelete}
                  className="btn"
                  style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '8px 14px', fontSize: 12 }}>
                  🗑️ Eliminar
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
                  {event.estado === 'Programado' && (
                    <button type="button" onClick={onStart} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>
                      🛠️ Iniciar Reparación
                    </button>
                  )}
                  {event.estado === 'En proceso' && (
                    <button type="button" onClick={onFinalize} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>
                      ✓ Finalizar
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
