'use client';
import React from 'react';
import { formatDate } from '@/lib/formatters';
import { parsePeriodo, cleanDescription } from './utils';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * ModalPlanMes — Modal de impresión PDF del Plan Mensual de Mantenimiento Preventivo
 */
export default function ModalPlanMes({ planMes, mantenimientos, configuracion, getFullBien, getUbicacionName, showToast, onClose }) {
  if (!planMes) return null;

  const { mes, anio } = planMes;
  const nombreMes = MESES[mes];

  const preventivosDelMes = mantenimientos.filter(m => {
    if (m.estado !== 'Programado' || !m.proximo_mantenimiento) return false;
    const d = new Date(m.proximo_mantenimiento);
    return d.getMonth() === mes && d.getFullYear() === anio;
  });

  return (
    <div className="modal-overlay print-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-box print-scroll-override" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 850, background: '#FFFFFF', color: '#111827', display: 'flex', flexDirection: 'column' }}>

        {/* Acciones de control (ocultas al imprimir) */}
        <div className="print-no-print" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
          <div>
            <h3 className="modal-title">📅 Vista Previa de Plan Mensual</h3>
            <p className="modal-sub">Listado de preventivos programados para {nombreMes} {anio}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { if (showToast) showToast('Preparando plan mensual...', 'info'); setTimeout(() => window.print(), 500); }}
              className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              🖨️ Imprimir Plan
            </button>
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: '8px 16px', fontSize: 12 }}>Cerrar</button>
          </div>
        </div>

        {/* Contenedor imprimible */}
        <div id="print-area-plan" style={{ padding: '40px 48px', background: '#FFFFFF', color: '#111827', fontFamily: '"Outfit", "Inter", sans-serif', minHeight: '260mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
          <div>
            {/* Cabecera institucional */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 12, borderBottom: '3px double #111827', marginBottom: 20 }}>
              {configuracion?.logo_institucion
                ? <img src={configuracion.logo_institucion} alt="Logo" style={{ width: 60, height: 60, objectFit: 'contain' }} />
                : <span style={{ fontSize: 40 }}>🎓</span>}
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#111827' }}>
                  {configuracion?.nombre_institucion || 'Universidad Politécnica del Estado'}
                </h1>
                <h2 style={{ fontSize: 12, fontWeight: 600, margin: '2px 0 0', color: '#4B5563' }}>Departamento de Informática</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#4B5563', fontWeight: 700 }}>PLAN PREVENTIVO</div>
                <div style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>{nombreMes} {anio}</div>
              </div>
            </div>

            {/* Título */}
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', margin: 0 }}>
                Plan Mensual de Mantenimiento Preventivo
              </h3>
              <p style={{ fontSize: 10, color: '#4B5563', margin: '4px 0 0' }}>
                Programa oficial de servicios calendarizados del Departamento
              </p>
            </div>

            {/* Texto introductorio */}
            <p style={{ fontSize: 10.5, lineHeight: 1.5, color: '#111827', marginBottom: 16 }}>
              El siguiente documento contiene la planificación operativa de inspecciones preventivas, mantenimiento e intervenciones programadas para el periodo correspondiente a <strong>{nombreMes} de {anio}</strong>. Las tareas listadas tienen como fin optimizar la vida útil del equipo informático patrimonial y prevenir fallas operativas en laboratorios y áreas de servicio técnico.
            </p>

            {/* Tabla de preventivos */}
            {preventivosDelMes.length === 0 ? (
              <div style={{ border: '1px dashed #D1D5DB', padding: '30px', textAlign: 'center', color: '#4B5563', fontSize: 12, borderRadius: 8 }}>
                No se encuentran mantenimientos preventivos agendados para este periodo mensual.
              </div>
            ) : (
              <table className="print-table-compact" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F3F4F6' }}>
                    <th style={{ border: '1px solid #111827', padding: '6px 8px', fontSize: 9, fontWeight: 700, textAlign: 'left' }}>Fecha</th>
                    <th style={{ border: '1px solid #111827', padding: '6px 8px', fontSize: 9, fontWeight: 700, textAlign: 'left' }}>No. Inv.</th>
                    <th style={{ border: '1px solid #111827', padding: '6px 8px', fontSize: 9, fontWeight: 700, textAlign: 'left' }}>Bien / Equipo</th>
                    <th style={{ border: '1px solid #111827', padding: '6px 8px', fontSize: 9, fontWeight: 700, textAlign: 'left' }}>Ubicación</th>
                    <th style={{ border: '1px solid #111827', padding: '6px 8px', fontSize: 9, fontWeight: 700, textAlign: 'left' }}>Tareas / Descripción del Plan</th>
                    <th style={{ border: '1px solid #111827', padding: '6px 8px', fontSize: 9, fontWeight: 700, textAlign: 'left' }}>Técnico</th>
                  </tr>
                </thead>
                <tbody>
                  {preventivosDelMes.map(m => {
                    const fullBien = getFullBien(m.bienId);
                    const ubiName  = getUbicacionName(fullBien.ubicacionId);
                    const periodo  = parsePeriodo(m.descripcion);
                    return (
                      <tr key={m.id}>
                        <td style={{ border: '1px solid #111827', padding: '6px', fontSize: 9, whiteSpace: 'nowrap' }}>
                          {periodo
                            ? `${formatDate(periodo.inicioRaw)} al ${formatDate(periodo.finRaw)}`
                            : formatDate(m.proximo_mantenimiento)}
                        </td>
                        <td style={{ border: '1px solid #111827', padding: '6px', fontSize: 9, fontFamily: 'monospace' }}>
                          {fullBien.etiqueta && fullBien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : fullBien.etiqueta}
                        </td>
                        <td style={{ border: '1px solid #111827', padding: '6px', fontSize: 9, fontWeight: 600 }}>{fullBien.marca} {fullBien.modelo}</td>
                        <td style={{ border: '1px solid #111827', padding: '6px', fontSize: 9 }}>{ubiName}</td>
                        <td style={{ border: '1px solid #111827', padding: '6px', fontSize: 9, whiteSpace: 'pre-wrap', maxWidth: 220 }}>
                          {cleanDescription(m.descripcion)}
                        </td>
                        <td style={{ border: '1px solid #111827', padding: '6px', fontSize: 9 }}>{m.tecnico_encargado || 'Asignación pendiente'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Firmas */}
          <div className="print-signatures-block" style={{ display: 'flex', justifyContent: 'space-between', gap: 40, marginTop: 40 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #111827', width: '200px', margin: '0 auto', paddingTop: 6 }}></div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#111827' }}>Elaboró</div>
              <div style={{ fontSize: 9, color: '#4B5563', marginTop: 2 }}>{configuracion.firma_tecnico_nombre || "Encargado de Soporte Técnico"}</div>
              <div style={{ fontSize: 8, color: '#6B7280' }}>{configuracion.firma_tecnico_puesto || "Departamento de Informática"}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #111827', width: '200px', margin: '0 auto', paddingTop: 6 }}></div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#111827' }}>Autorizó</div>
              <div style={{ fontSize: 9, color: '#4B5563', marginTop: 2 }}>{configuracion.firma_jefe_nombre || "Jefe del Departamento de Informática"}</div>
              <div style={{ fontSize: 8, color: '#6B7280' }}>{configuracion.firma_jefe_puesto || "Departamento de Informática"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
