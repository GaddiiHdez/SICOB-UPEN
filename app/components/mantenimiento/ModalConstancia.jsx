'use client';
import React from 'react';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { parsePeriodo, cleanDescription } from './utils';

/**
 * ModalConstancia — Modal de impresión PDF de Constancia de Servicio Técnico
 */
export default function ModalConstancia({ mantenimiento, configuracion, getFullBien, getUbicacionName, getCategoriaName, showToast, onClose }) {
  if (!mantenimiento) return null;

  const fullBien  = getFullBien(mantenimiento.bienId);
  const ubiName   = getUbicacionName(fullBien.ubicacionId);
  const catName   = getCategoriaName(fullBien.categoriaId);
  const folioStr  = `MST-${String(mantenimiento.id).padStart(6, '0')}`;
  const periodo   = parsePeriodo(mantenimiento.descripcion);

  return (
    <div className="modal-overlay print-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal-box print-scroll-override" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 800, background: '#FFFFFF', color: '#111827', display: 'flex', flexDirection: 'column' }}>

        {/* Acciones de control (ocultas al imprimir) */}
        <div className="print-no-print" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
          <div>
            <h3 className="modal-title">🖨️ Vista Previa de Constancia</h3>
            <p className="modal-sub">Documento oficial de conformidad de servicio técnico</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { if (showToast) showToast('Preparando documento...', 'info'); setTimeout(() => window.print(), 500); }}
              className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
              🖨️ Imprimir Constancia
            </button>
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: '8px 16px', fontSize: 12 }}>Cerrar</button>
          </div>
        </div>

        {/* Contenedor imprimible */}
        <div id="print-area-constancia" style={{ padding: '40px 48px', background: '#FFFFFF', color: '#111827', fontFamily: '"Outfit", "Inter", sans-serif', minHeight: '260mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
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
                <div style={{ fontSize: 10, color: '#4B5563', fontWeight: 700 }}>{folioStr}</div>
                <div style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>{formatDate(mantenimiento.fecha_mantenimiento)}</div>
              </div>
            </div>

            {/* Título */}
            <div style={{ textAlign: 'center', margin: '24px 0' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#111827', margin: 0 }}>
                Constancia de Servicio Técnico
              </h3>
              <p style={{ fontSize: 10, color: '#4B5563', margin: '4px 0 0' }}>Comprobante oficial de diagnóstico y mantenimiento patrimonial</p>
            </div>

            {/* Párrafo oficial */}
            <p style={{ fontSize: 11, lineHeight: 1.6, textAlign: 'justify', color: '#111827', marginBottom: 20 }}>
              Por medio de la presente, el <strong>Departamento de Informática</strong> hace constar que se ha llevado a cabo el servicio de mantenimiento técnico en el equipo tecnológico descrito a continuación, registrado en el inventario patrimonial de la institución. El servicio fue concluido a conformidad con los siguientes detalles:
            </p>

            {/* I. Especificaciones del Bien */}
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#111827', margin: '0 0 8px' }}>I. Especificaciones del Bien</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
              <tbody>
                <tr>
                  <td style={{ width: '25%', padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Equipo / Tipo</td>
                  <td style={{ width: '25%', padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10 }}>{fullBien.tipo || '—'}</td>
                  <td style={{ width: '25%', padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Código Inventario</td>
                  <td style={{ width: '25%', padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700 }}>{fullBien.etiqueta && fullBien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : fullBien.etiqueta}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Marca / Modelo</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10 }}>{fullBien.marca || '—'} {fullBien.modelo || '—'}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Número de Serie</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontFamily: 'monospace' }}>{fullBien.serial || '—'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Resguardante / Custodio</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10 }}>{fullBien.responsable || 'Sin asignar'}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Ubicación Asignada</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10 }}>{ubiName}</td>
                </tr>
              </tbody>
            </table>

            {/* II. Reporte del Servicio */}
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#111827', margin: '0 0 8px' }}>II. Reporte del Servicio Técnico</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
              <tbody>
                <tr>
                  <td style={{ width: '25%', padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Tipo de Mantenimiento</td>
                  <td style={{ width: '25%', padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10 }}>{mantenimiento.tipo}</td>
                  <td style={{ width: '25%', padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Técnico Responsable</td>
                  <td style={{ width: '25%', padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10 }}>{mantenimiento.tecnico_encargado || 'No especificado'}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Fecha de Ejecución</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10 }}>{formatDate(mantenimiento.fecha_mantenimiento)}</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Costo total del servicio</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, color: '#00716A' }}>
                    {mantenimiento.costo ? formatCurrency(mantenimiento.costo) : 'Sin costo registrado'}
                  </td>
                </tr>
                {mantenimiento.proximo_mantenimiento && (
                  <tr>
                    <td style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10, fontWeight: 700, background: '#F9FAFB' }}>Siguiente preventivo</td>
                    <td colSpan="3" style={{ padding: '6px 8px', border: '1px solid #D1D5DB', fontSize: 10 }}>📅 {formatDate(mantenimiento.proximo_mantenimiento)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* III. Diagnóstico */}
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#111827', margin: '0 0 8px' }}>III. Diagnóstico Técnico y Trabajo Realizado</h4>
            <div style={{ border: '1px solid #D1D5DB', borderRadius: 6, padding: '12px 16px', fontSize: 10, lineHeight: 1.5, color: '#111827', background: '#F9FAFB', minHeight: 100, whiteSpace: 'pre-wrap' }}>
              {periodo && (
                <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: 6, marginBottom: 6, fontWeight: 700 }}>
                  Periodo de Planificación Ejecutado: Del {formatDate(periodo.inicioRaw)} al {formatDate(periodo.finRaw)}
                </div>
              )}
              {cleanDescription(mantenimiento.descripcion)}
            </div>

            <p style={{ fontSize: 9.5, fontStyle: 'italic', color: '#4B5563', marginTop: 12, textAlign: 'justify', lineHeight: 1.4 }}>
              * Al calzar la firma de conformidad en este documento, el resguardante declara recibir de conformidad el bien tecnológico descrito en este reporte, manifestando que se encuentra en condiciones funcionales y operativas para el desempeño de sus labores.
            </p>
          </div>

          {/* Firmas */}
          <div className="print-signatures-block" style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 40 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #111827', width: '160px', margin: '0 auto', paddingTop: 6 }}></div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#111827' }}>Técnico Responsable</div>
              <div style={{ fontSize: 9, color: '#4B5563', marginTop: 2 }}>{mantenimiento.tecnico_encargado || 'Personal del Departamento'}</div>
              <div style={{ fontSize: 8, color: '#6B7280' }}>Departamento de Informática</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #111827', width: '160px', margin: '0 auto', paddingTop: 6 }}></div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#111827' }}>Conformidad Resguardante</div>
              <div style={{ fontSize: 9, color: '#4B5563', marginTop: 2 }}>{fullBien.responsable || 'Sin asignar'}</div>
              <div style={{ fontSize: 8, color: '#6B7280' }}>Usuario Custodio</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #111827', width: '160px', margin: '0 auto', paddingTop: 6 }}></div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#111827' }}>Vo. Bo. Jefe del Departamento</div>
              <div style={{ fontSize: 8, color: '#4B5563', marginTop: 2 }}>Departamento de Informática</div>
              <div style={{ fontSize: 8, color: '#6B7280' }}>{configuracion?.nombre_institucion || 'Universidad Politécnica del Estado'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
