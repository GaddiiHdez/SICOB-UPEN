'use client';
import React from 'react';
import { ESTADO_BADGE } from '@/lib/constants';

const NOMBRES_TAREAS = {
  limpieza: 'Limpieza física externa e interna',
  sistemaOperativo: 'Actualización de Sistema Operativo',
  software: 'Instalación / Actualización de Software',
  componentes: 'Mejora de componentes (RAM, SSD, etc.)',
  hardware: 'Cambio de piezas o hardware dañado',
  diagnostico: 'Diagnóstico de rendimiento general',
};

/**
 * ModalRegistrar — Modal para programar / registrar un mantenimiento.
 * Soporta modo individual, masivo y edición de plan existente.
 */
export default function ModalRegistrar({
  isEditing,
  editingGroup,
  modoAsignacion,
  ubicaciones,
  categorias,
  ubicacionMasiva,
  categoriaMasiva,
  bienesAfectados,
  tareasMasivas,
  bienSearchQuery,
  bienesBuscados,
  showBienDropdown,
  formTipo,
  formEstado,
  formDescripcion,
  formProximoMantenimiento,
  formFechaMantenimiento,
  formFechaFinMasivo,
  formTecnico,
  formCosto,
  formLiberarResguardo,
  usarRangoFechas,
  formBienId,
  bienes,
  onClose,
  onSubmit,
  onModoChange,
  onUbicacionChange,
  onCategoriaChange,
  onTareaChange,
  onBienSearchChange,
  onBienSearchFocus,
  onSelectBien,
  onTipoChange,
  onEstadoChange,
  onDescripcionChange,
  onProximoChange,
  onFechaMantenimientoChange,
  onFechaFinChange,
  onTecnicoChange,
  onCostoChange,
  onLiberarResguardoChange,
  onUsarRangoChange,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              {isEditing ? (editingGroup ? '✏️ Editar Plan de Mantenimiento' : '✏️ Editar Mantenimiento') : '🔧 Registrar Ingreso / Programar'}
            </h3>
            <p className="modal-sub">
              {isEditing
                ? (editingGroup
                  ? `Modificando detalles para un grupo de ${editingGroup?.items.length || 0} equipos`
                  : 'Modificando detalles del mantenimiento individual')
                : 'Envía un equipo a taller o agenda una revisión preventiva futura'}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Selector de modo o resumen de equipos en edición */}
            {isEditing ? (
              editingGroup ? (
                <div style={{ background: 'var(--bg-body, #F3F4F6)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: 12, border: '1px solid var(--border)' }}>
                  <strong>Equipos en este plan:</strong> {editingGroup?.items.length || 0} equipos programados.
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {editingGroup?.items.map(m => (
                      <span key={m.id} style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 4, fontSize: 10, border: '1px solid var(--border)', fontWeight: 600 }}>
                        {m.bien.marca} {m.bien.modelo} ({m.bien.codigo_inventario.startsWith('SIN-NUMERO-') ? 'S/N' : m.bien.codigo_inventario})
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-body, #F3F4F6)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: 12, border: '1px solid var(--border)' }}>
                  <strong>Equipo en mantenimiento:</strong> {bienSearchQuery}
                </div>
              )
            ) : (
              <div style={{ display: 'flex', background: 'var(--bg-body, #F3F4F6)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                <button type="button" className={`btn ${modoAsignacion === 'individual' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: 11, padding: '6px 12px', height: 'auto', border: 'none', transition: 'all 0.2s ease' }}
                  onClick={() => onModoChange('individual')}>
                  👤 Un Solo Equipo
                </button>
                <button type="button" className={`btn ${modoAsignacion === 'masivo' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: 11, padding: '6px 12px', height: 'auto', border: 'none', transition: 'all 0.2s ease' }}
                  onClick={() => onModoChange('masivo')}>
                  🏢 Por Laboratorio / Área (Masivo)
                </button>
              </div>
            )}

            {/* Campo de búsqueda de bien individual */}
            {!isEditing && modoAsignacion === 'individual' && (
              <div style={{ position: 'relative' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>1. Buscar y Seleccionar Equipo</label>
                <div className="search-input-wrap">
                  <span className="search-icon">🔍</span>
                  <input
                    className="search-input"
                    style={{ width: '100%' }}
                    placeholder="Escribe marca, modelo, serie o código..."
                    value={bienSearchQuery}
                    onChange={e => onBienSearchChange(e.target.value)}
                    onFocus={onBienSearchFocus}
                  />
                </div>
                {showBienDropdown && bienesBuscados.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', maxHeight: 180, overflowY: 'auto', zIndex: 10, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                    {bienesBuscados.map(b => (
                      <div key={b.id} onClick={() => onSelectBien(b)}
                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}
                        className="hover-highlight">
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.nombre}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 10 }}>S/N: {b.serial} | No. de Inv.: {b.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : b.etiqueta}</div>
                        </div>
                        <span className={ESTADO_BADGE[b.estado] || 'badge'}>{b.estado}</span>
                      </div>
                    ))}
                  </div>
                )}
                {showBienDropdown && bienSearchQuery.trim() && bienesBuscados.length === 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', zIndex: 10, marginTop: 4, fontSize: 11 }}>
                    Ningún equipo libre coincide con la búsqueda
                  </div>
                )}
              </div>
            )}

            {/* Filtros y checklist para modo masivo */}
            {!isEditing && modoAsignacion === 'masivo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="form-label">Ubicación / Área</label>
                    <select className="form-input" value={ubicacionMasiva} onChange={e => onUbicacionChange(e.target.value)}>
                      <option value="">Selecciona Ubicación (Todas)</option>
                      {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Categoría de Bienes</label>
                    <select className="form-input" value={categoriaMasiva} onChange={e => onCategoriaChange(e.target.value)}>
                      <option value="">Selecciona Categoría (Todas)</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{
                  background: bienesAfectados.length > 0 ? 'rgba(13, 148, 136, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: bienesAfectados.length > 0 ? '1px solid rgba(13, 148, 136, 0.2)' : '1px dashed rgba(239, 68, 68, 0.2)',
                  padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 11, fontWeight: 600,
                  color: bienesAfectados.length > 0 ? 'var(--primary)' : '#EF4444', textAlign: 'center'
                }}>
                  {bienesAfectados.length > 0
                    ? `✓ Se programará mantenimiento para ${bienesAfectados.length} equipo(s) coincidente(s).`
                    : '⚠️ Selecciona ubicación y/o categoría para filtrar los equipos.'}
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Tareas a Programar (Checklist)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', maxHeight: 200, overflowY: 'auto' }}>
                    {Object.keys(tareasMasivas).map(k => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="checkbox" id={`task-${k}`} style={{ width: 'auto', margin: 0 }}
                          checked={tareasMasivas[k]} onChange={e => onTareaChange(k, e.target.checked)} />
                        <label htmlFor={`task-${k}`} style={{ fontSize: 12, cursor: 'pointer', userSelect: 'none', margin: 0, fontWeight: 500 }}>
                          {NOMBRES_TAREAS[k]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tipo y Estado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="form-label">Tipo de Servicio</label>
                <select className="form-input" value={formTipo} onChange={e => onTipoChange(e.target.value)}>
                  <option value="Preventivo">🔧 Preventivo</option>
                  <option value="Correctivo">🛠️ Correctivo</option>
                </select>
              </div>
              <div>
                <label className="form-label">{isEditing ? 'Estatus' : 'Estatus Inicial'}</label>
                <select className="form-input" value={formEstado} onChange={e => onEstadoChange(e.target.value)}>
                  <option value="Programado">📅 Programado (Agenda)</option>
                  <option value="En proceso">🔧 En Taller (En proceso)</option>
                </select>
              </div>
            </div>

            {/* Campos de fecha según estatus */}
            {formEstado === 'Programado' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="usarRangoFechas" style={{ width: 'auto', margin: 0 }}
                    checked={usarRangoFechas} onChange={e => onUsarRangoChange(e.target.checked)} />
                  <label htmlFor="usarRangoFechas" style={{ fontSize: 12, cursor: 'pointer', margin: 0, fontWeight: 500 }}>
                    📅 Registrar un periodo específico (Rango de Fechas)
                  </label>
                </div>
                {usarRangoFechas ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="form-label">Fecha de Inicio</label>
                      <input type="date" className="form-input" value={formProximoMantenimiento} onChange={e => onProximoChange(e.target.value)} required />
                    </div>
                    <div>
                      <label className="form-label">Fecha de Término</label>
                      <input type="date" className="form-input" value={formFechaFinMasivo} onChange={e => onFechaFinChange(e.target.value)} required />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="form-label">Fecha Programada para Revisión</label>
                    <input type="date" className="form-input" value={formProximoMantenimiento} onChange={e => onProximoChange(e.target.value)} required />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="form-label">Fecha de Ingreso</label>
                  <input type="date" className="form-input" value={formFechaMantenimiento} onChange={e => onFechaMantenimientoChange(e.target.value)} required />
                </div>
                <div>
                  <label className="form-label">Técnico Asignado (Opcional)</label>
                  <input type="text" className="form-input" placeholder="Nombre del técnico" value={formTecnico} onChange={e => onTecnicoChange(e.target.value)} />
                </div>
              </div>
            )}

            {/* Liberación de resguardo (condicional) */}
            {formEstado === 'En proceso' && (
              (modoAsignacion === 'individual' && formBienId && bienes.find(b => b.id === formBienId)?.responsableId) ||
              (modoAsignacion === 'masivo' && bienesAfectados.some(b => b.responsableId))
            ) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239, 68, 68, 0.04)', border: '1px dashed rgba(239, 68, 68, 0.2)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                <input type="checkbox" id="liberarResguardo" style={{ width: 'auto', margin: 0 }}
                  checked={formLiberarResguardo} onChange={e => onLiberarResguardoChange(e.target.checked)} />
                <label htmlFor="liberarResguardo" style={{ fontSize: 11, cursor: 'pointer', lineHeight: 1.3, margin: 0 }}>
                  <strong style={{ color: 'var(--danger)' }}>Liberar resguardo(s) activo(s):</strong> Cerrar la asignación del docente custodio y retornar administrativamente el bien a Bodega.
                </label>
              </div>
            )}

            {/* Descripción / Notas */}
            <div>
              <label className="form-label">{modoAsignacion === 'masivo' ? 'Comentarios o Notas Adicionales (Opcional)' : 'Motivo o Descripción de Trabajo'}</label>
              <textarea
                className="form-input"
                style={{ minHeight: 80, resize: 'vertical' }}
                placeholder={modoAsignacion === 'masivo' ? 'Notas extras para el personal técnico...' : 'Redacta la falla reportada o las tareas preventivas a realizar...'}
                value={formDescripcion}
                onChange={e => onDescripcionChange(e.target.value)}
                required={modoAsignacion !== 'masivo'}
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{isEditing ? 'Guardar Cambios' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
