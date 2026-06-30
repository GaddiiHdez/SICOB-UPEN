'use client';
import React from 'react';
import { formatDate } from '@/lib/formatters';
import { TipoBadge, BienCell, EtiquetaCell } from '@/app/components/shared/BienCell';
import { parsePeriodo, cleanDescription } from './utils';

/**
 * TallerTab — Pestaña de Equipos en Taller (estado "En proceso")
 */
export default function TallerTab({ tallerMantenimientos, onFinalize, onDelete, onEdit, isAdmin = false }) {
  if (tallerMantenimientos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
        <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>El taller está vacío</h3>
        <p style={{ fontSize: 12, marginTop: 4 }}>No hay equipos en reparación o diagnóstico en este momento.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="inventory-table">
        <thead>
          <tr>
            <th>Equipo / Bien</th>
            <th>Etiqueta / Serie</th>
            <th>Ingresado por</th>
            <th>Diagnóstico / Falla Reportada</th>
            <th>Técnico Asignado</th>
             <th>Fecha de Ingreso</th>
             {isAdmin && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {tallerMantenimientos.map(m => (
            <tr key={m.id}>
              <td><BienCell bien={m.bien} icon="🔧" /></td>
              <td><EtiquetaCell bien={m.bien} /></td>
              <td><TipoBadge tipo={m.tipo} /></td>
              <td style={{ maxWidth: 240, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {m.incidente && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: '#EF4444',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    fontWeight: 600,
                    marginBottom: 6
                  }}>
                    ⚠️ Falla: #{m.incidente.id} ({m.incidente.categoria}) - {m.incidente.titulo}
                  </div>
                )}
                {(() => {
                  const periodo = parsePeriodo(m.descripcion);
                  return (
                    <>
                      {periodo && (
                        <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>
                          📅 Rango: {formatDate(periodo.inicioRaw)} al {formatDate(periodo.finRaw)}
                        </div>
                      )}
                      {cleanDescription(m.descripcion)}
                    </>
                  );
                })()}
              </td>
              <td style={{ fontSize: 12, fontWeight: 600 }}>👤 {m.tecnico_encargado || 'No asignado'}</td>
              <td style={{ fontSize: 12 }}>📅 {formatDate(m.fecha_mantenimiento)}</td>
               {isAdmin && (
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => onFinalize(m)}
                      className="btn btn-primary"
                      style={{ padding: '5px 12px', fontSize: 11 }}
                    >
                      ✓ Finalizar
                    </button>
                    <button
                      onClick={() => onEdit && onEdit(m)}
                      className="btn"
                      style={{
                        padding: '5px 10px',
                        fontSize: 11,
                        background: 'rgba(0, 113, 106, 0.05)',
                        color: 'var(--primary)',
                        border: '1px solid rgba(0, 113, 106, 0.1)',
                      }}
                      title="Editar registro de mantenimiento"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(m.id)}
                      className="btn"
                      style={{ padding: '5px 10px', fontSize: 11, background: 'rgba(239, 68, 68, 0.05)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.1)' }}
                      title="Cancelar mantenimiento y retirar"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
