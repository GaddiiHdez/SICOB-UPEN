'use client';
import { useState } from 'react';
import { ESTADO_BADGE, ESTADOS_BIEN } from '@/lib/constants';

/**
 * DetailPanel — Panel lateral derecho de la tabla de inventario.
 * Muestra la ficha del bien seleccionado y las acciones masivas en lote.
 */
export default function DetailPanel({ bien, selected, personal = [], ubicaciones = [], onClearSelection, onEdit, onClone, onBulkUpdate, onViewFicha, onRestore, onDeletePermanent, onPrintBulkLabels, onStatusChange, isAdmin }) {
  const [bulkEstado, setBulkEstado] = useState('');
  const [bulkCustodio, setBulkCustodio] = useState('');
  const [bulkUbicacion, setBulkUbicacion] = useState('');

  // Si no hay selección masiva y no hay bien seleccionado, mostramos estado vacío
  if (!bien && selected.length === 0) {
    return (
      <div
        className="detail-sidebar detail-sidebar-empty"
        style={{ justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--text-muted)', padding: 24 }}
      >
        <div style={{ fontSize: 32, opacity: 0.3 }}>🔍</div>
        <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
          Selecciona un bien para ver sus detalles o marca las casillas para acciones masivas.
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 16, borderTop: '1px dashed var(--border)', paddingTop: 16, width: '100%', lineHeight: 1.4 }}>
          💡 <strong>Tip:</strong> Haz doble clic en cualquier equipo de la lista o haz clic en <em>&quot;🔍 Ver Historial&quot;</em> en su detalle para consultar el historial completo de resguardos y movimientos.
        </div>
      </div>
    );
  }

  return (
    <div className="detail-sidebar">
      {/* ── Acciones masivas ─────────────────────────── */}
      {selected.length > 0 && (
        <div className="detail-section" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
          <div className="detail-section-label">Acciones masivas en lote</div>
          <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>⚡ {selected.length} seleccionado{selected.length > 1 ? 's' : ''}</span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '4px 8px', height: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}
              onClick={onClearSelection}
            >
              ✕ Desmarcar
            </button>
          </div>

          {/* Selector de Estado Masivo */}
          {isAdmin && (
            <div style={{ marginTop: 14 }}>
              <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4, display: 'block' }}>Cambiar Estado:</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select 
                  className="form-select" 
                  value={bulkEstado} 
                  onChange={e => setBulkEstado(e.target.value)}
                  style={{ height: 36, fontSize: 12, padding: '0 8px', flex: 1 }}
                >
                  <option value="">Selecciona...</option>
                  {ESTADOS_BIEN.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (bulkEstado) {
                      onBulkUpdate({ estado: bulkEstado });
                      setBulkEstado('');
                    }
                  }}
                  disabled={!bulkEstado}
                  style={{ height: 36, padding: '0 14px' }}
                  title="Aplicar estado"
                >
                  ✓
                </button>
              </div>
            </div>
          )}

          {/* Selector de Custodio Masivo */}
          {isAdmin && (
            <div style={{ marginTop: 12 }}>
              <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4, display: 'block' }}>Reasignar Custodio:</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select 
                  className="form-select" 
                  value={bulkCustodio} 
                  onChange={e => setBulkCustodio(e.target.value)}
                  style={{ height: 36, fontSize: 12, padding: '0 8px', flex: 1 }}
                >
                  <option value="">Selecciona...</option>
                  <option value="none">📦 Desasignar (Mandar a Bodega)</option>
                  {personal.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.noRegistrado ? '(⚠️ Temporal)' : ''}
                    </option>
                  ))}
                </select>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (bulkCustodio) {
                      onBulkUpdate({ 
                        responsableId: bulkCustodio === 'none' ? null : bulkCustodio 
                      });
                      setBulkCustodio('');
                    }
                  }}
                  disabled={!bulkCustodio}
                  style={{ height: 36, padding: '0 14px' }}
                  title="Asignar custodio"
                >
                  ✓
                </button>
              </div>
            </div>
          )}

          {/* Selector de Ubicación Masiva */}
          {isAdmin && (
            <div style={{ marginTop: 12 }}>
              <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4, display: 'block' }}>Cambiar Ubicación:</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select 
                  className="form-select" 
                  value={bulkUbicacion} 
                  onChange={e => setBulkUbicacion(e.target.value)}
                  style={{ height: 36, fontSize: 12, padding: '0 8px', flex: 1 }}
                >
                  <option value="">Selecciona...</option>
                  {ubicaciones.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (bulkUbicacion) {
                      onBulkUpdate({ ubicacionId: bulkUbicacion });
                      setBulkUbicacion('');
                    }
                  }}
                  disabled={!bulkUbicacion}
                  style={{ height: 36, padding: '0 14px' }}
                  title="Cambiar ubicación"
                >
                  ✓
                </button>
              </div>
            </div>
          )}

          {/* Generación de etiquetas masiva */}
          <div style={{ marginTop: 12, borderTop: '1px dashed var(--border)', paddingTop: 14 }}>
            <button 
              className="btn" 
              onClick={() => onPrintBulkLabels && onPrintBulkLabels()}
              style={{ 
                width: '100%', 
                background: 'rgba(13, 148, 136, 0.1)', 
                color: '#0D9488', 
                border: '1px solid rgba(13, 148, 136, 0.2)',
                fontSize: 12,
                padding: '8px 12px',
                fontWeight: 600,
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              🏷️ Generar Etiquetas en Lote
            </button>
          </div>

          {/* Eliminar No. de Inventario en Lote */}
          {isAdmin && (
            <div style={{ marginTop: 12 }}>
              <button 
                className="btn" 
                onClick={() => {
                  if (confirm(`¿Estás seguro de borrar el No. de Inventario de los ${selected.length} equipos seleccionados? Esto no borrará los equipos, solo dejará vacío su número de inventario.`)) {
                    onBulkUpdate({ eliminarNoInventario: true });
                  }
                }}
                style={{ 
                  width: '100%', 
                  background: 'rgba(245, 158, 11, 0.1)', 
                  color: '#D97706', 
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  fontSize: 12,
                  padding: '8px 12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🚫 Quitar No. de Inventario en Lote
              </button>
            </div>
          )}

          {/* Autogenerar No. de Inventario en Lote */}
          {isAdmin && (
            <div style={{ marginTop: 12 }}>
              <button 
                className="btn" 
                onClick={() => onBulkUpdate({ abrirAutogenerarModal: true })}
                style={{ 
                  width: '100%', 
                  background: 'rgba(13, 148, 136, 0.1)', 
                  color: '#0D9488', 
                  border: '1px solid rgba(13, 148, 136, 0.2)',
                  fontSize: 12,
                  padding: '8px 12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🔄 Autogenerar No. de Inventario en Lote
              </button>
            </div>
          )}

          {/* Dar de Baja Lógica Masiva */}
          {isAdmin && (
            <div style={{ marginTop: 12 }}>
              <button 
                className="btn" 
                onClick={() => {
                  if (confirm(`¿Estás seguro de dar de baja los ${selected.length} equipos seleccionados? Esta acción conservará el registro histórico pero cambiará su estatus a Baja.`)) {
                    onBulkUpdate({ darDeBaja: true });
                  }
                }}
                style={{ 
                  width: '100%', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: '#EF4444', 
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: 12,
                  padding: '8px 12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                🗑️ Dar de Baja en Lote
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Ficha del bien (si está seleccionado) ───────────────────── */}
      {bien ? (
        <div style={{ marginTop: selected.length > 0 ? 20 : 0 }}>
          <div className="detail-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div className="detail-section-label">Ficha de resguardo</div>
                <div className="detail-section-title">Detalle</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {onViewFicha && (
                  <button 
                    className="btn btn-ghost" 
                    title="Ver Ficha Completa e Historial" 
                    style={{ fontSize: 11, padding: '4px 8px', height: 'auto', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => onViewFicha(bien)}
                  >
                    🔍 Ver Historial
                  </button>
                )}
                {isAdmin && (
                  <>
                    <button className="btn-icon" title="Clonar / Duplicar" style={{ width: 28, height: 28, fontSize: 13, background: 'rgba(13, 148, 136, 0.1)', color: 'var(--primary)' }} onClick={() => onClone && onClone(bien)}>
                      👥
                    </button>
                    <button className="btn-icon" title="Editar" style={{ width: 28, height: 28, fontSize: 13 }} onClick={() => onEdit && onEdit(bien)}>
                      ✏
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 28 }}>{bien.icono}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {bien.nombre}
                </div>
                <span 
                  className={ESTADO_BADGE[bien.estado] ?? 'badge badge-gray'} 
                  style={isAdmin ? { padding: '0 0 0 8px', position: 'relative', display: 'inline-flex', alignItems: 'center', marginTop: 4 } : { padding: '4px 8px', display: 'inline-flex', alignItems: 'center', marginTop: 4 }}
                  title={isAdmin ? "Cambiar estado" : undefined}
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
              </div>
            </div>
          </div>

          {/* ── Campos de detalle ────────────────────────── */}
          <div className="detail-row">
            <div>
              <div className="detail-field-label">No. de Inventario</div>
              <div className="detail-field-value" style={{ color: 'var(--accent-text)', fontSize: 13 }}>
                {bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}
              </div>
            </div>
            <div>
              <div className="detail-field-label">Categoría</div>
              <div className="detail-field-value" style={{ fontFamily: 'inherit', fontWeight: 600 }}>
                {bien.categoria}
              </div>
            </div>
          </div>

          <div className="detail-row">
            <div style={{ gridColumn: 'span 2' }}>
              <div className="detail-field-label">Número de Serie</div>
              <div className="detail-field-value" style={{ fontSize: 11 }}>{bien.serial}</div>
            </div>
          </div>

          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <div className="detail-field-label">Departamento / Coordinación</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{bien.departamentoIcono || '🏢'}</span>
              <span>{bien.departamento}</span>
            </div>
            
            {bien.departamentoUbicacion && (
              <div style={{
                marginTop: 6,
                fontSize: 11,
                color: 'var(--text-secondary)',
                background: 'var(--bg-body)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '6px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span>📍 Oficina Principal:</span>
                <span>{bien.departamentoUbicacion.icono || '🏫'}</span>
                <strong>{bien.departamentoUbicacion.nombre}</strong>
                {bien.departamentoUbicacion.edificio && (
                  <span style={{ opacity: 0.8, fontSize: 10 }}>({bien.departamentoUbicacion.edificio})</span>
                )}
              </div>
            )}

            <div className="detail-field-label" style={{ marginTop: 12 }}>Área / Ubicación física actual</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🏫</span>
              <span>{bien.area}</span>
            </div>

            {/* Alerta si hay discrepancia de ubicación */}
            {bien.departamentoUbicacion && String(bien.ubicacionId) !== String(bien.departamentoUbicacion.id) && (
              <div style={{
                marginTop: 10,
                fontSize: 11,
                color: '#B45309',
                background: 'rgba(245, 158, 11, 0.06)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                borderRadius: '6px',
                padding: '8px 12px',
                lineHeight: 1.4,
                display: 'flex',
                gap: 6,
                alignItems: 'flex-start'
              }}>
                <span>⚠️</span>
                <span>
                  <strong>Ubicación Diferente:</strong> Este equipo está asignado a <strong>{bien.area}</strong>, pero el departamento principal opera en <strong>{bien.departamentoUbicacion.nombre}</strong>.
                </span>
              </div>
            )}
          </div>

          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <div className="detail-field-label">Responsable del Equipo</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>
              {bien.responsable || '—'}
            </div>
          </div>

          {(bien.programa_adquisicion || bien.fecha_adquisicion || bien.valor_estimado !== undefined) && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)' }}>
              <div className="detail-field-label">Información de Adquisición</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Valor Patrimonial:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0D9488' }}>
                  {bien.valor_estimado ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(bien.valor_estimado) : '—'}
                </span>
              </div>
              {bien.programa_adquisicion && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Programa / Origen:</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{bien.programa_adquisicion}</span>
                </div>
              )}
              {bien.fecha_adquisicion && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Fecha de Compra:</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(bien.fecha_adquisicion).toLocaleDateString('es-MX')}</span>
                </div>
              )}
            </div>
          )}

          {bien.especificaciones && Object.keys(bien.especificaciones).length > 0 && (
            <div style={{ padding: '14px 20px' }}>
              <div className="detail-field-label" style={{ marginBottom: 8 }}>Especificaciones Técnicas</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {Object.entries(bien.especificaciones).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px dashed var(--border-light)', paddingBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{key}</span>
                    <span style={{ fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bien.eliminado && isAdmin && (
            <div style={{ padding: '20px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => onRestore && onRestore(bien.id)}
                style={{ width: '100%', justifyContent: 'center', background: '#10B981', borderColor: '#10B981', padding: '10px' }}
              >
                🟢 Re-activar / Restaurar Equipo
              </button>
              <button
                className="btn"
                onClick={() => onDeletePermanent && onDeletePermanent(bien.id)}
                style={{ width: '100%', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px' }}
              >
                🗑️ Borrar Permanentemente
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 40 }}>
          <div style={{ fontSize: 24, opacity: 0.3 }}>🔍</div>
          <span>Selecciona un equipo de la tabla para ver su ficha técnica individual.</span>
        </div>
      )}
    </div>
  );
}
