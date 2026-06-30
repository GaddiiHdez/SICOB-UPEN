'use client';
import React from 'react';
import { formatDate } from '@/lib/formatters';
import { parsePeriodo, cleanDescription } from './utils';

/**
 * ModalFinalizar — Modal de egreso de taller (finalizar servicio técnico)
 */
export default function ModalFinalizar({
  mantenimiento,
  finalizeDescripcion,
  finalizeTecnico,
  finalizeCosto,
  finalizeProximo,
  finalizeReasignar,
  onClose,
  onSubmit,
  onDescripcionChange,
  onTecnicoChange,
  onCostoChange,
  onProximoChange,
  onReasignarChange,
}) {
  if (!mantenimiento) return null;
  const periodo = parsePeriodo(mantenimiento.descripcion);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">✓ Finalizar Mantenimiento</h3>
            <p className="modal-sub">Registra el diagnóstico, costos e informe final del equipo</p>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Resumen del equipo */}
            <div style={{ background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 12 }}>
              <div><strong>Equipo:</strong> {mantenimiento.bien.marca} {mantenimiento.bien.modelo}</div>
              <div style={{ marginTop: 4 }}><strong>Código de Inventario:</strong> {mantenimiento.bien.codigo_inventario}</div>
              <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>
                {periodo && (
                  <div style={{ marginBottom: 4 }}>
                    <strong>Periodo Planificado:</strong> {formatDate(periodo.inicioRaw)} al {formatDate(periodo.finRaw)}
                  </div>
                )}
                <strong>Falla/Plan Inicial:</strong> &quot;{cleanDescription(mantenimiento.descripcion)}&quot;
              </div>
            </div>

            <div>
              <label className="form-label">Informe Técnico / Trabajo Realizado</label>
              <textarea
                className="form-input"
                style={{ minHeight: 80, resize: 'vertical' }}
                placeholder="Describe la reparación realizada, piezas cambiadas o diagnóstico final..."
                value={finalizeDescripcion}
                onChange={e => onDescripcionChange(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">Técnico Responsable</label>
                <input type="text" className="form-input" placeholder="Nombre del técnico"
                  value={finalizeTecnico} onChange={e => onTecnicoChange(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Costo del Servicio ($MXN)</label>
                <input type="number" step="0.01" className="form-input" placeholder="0.00"
                  value={finalizeCosto} onChange={e => onCostoChange(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="form-label">Programar Próximo Mantenimiento Preventivo (Opcional)</label>
              <input type="date" className="form-input" value={finalizeProximo} onChange={e => onProximoChange(e.target.value)} />
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                Deja en blanco si no deseas calendarizar una revisión periódica de rutina.
              </span>
            </div>

            {mantenimiento.bien.id && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(13, 148, 136, 0.04)', border: '1px dashed rgba(13, 148, 136, 0.2)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                <input type="checkbox" id="reasignar" className="checkbox-custom"
                  checked={finalizeReasignar} onChange={e => onReasignarChange(e.target.checked)} />
                <label htmlFor="reasignar" style={{ fontSize: 11, cursor: 'pointer', lineHeight: 1.3, margin: 0 }}>
                  <strong>Re-asignar custodio previo:</strong> Regresar automáticamente el equipo al docente resguardante anterior y su ubicación original en un solo clic.
                </label>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">✓ Finalizar y Devolver</button>
          </div>
        </form>
      </div>
    </div>
  );
}
