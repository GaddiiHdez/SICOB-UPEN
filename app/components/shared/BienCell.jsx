'use client';

/**
 * BienCell — Celda de tabla con icono, nombre y categoría del bien
 *
 * Reemplaza el bloque de JSX que se repetía idéntico en las 3 tablas
 * de MantenimientosPanel.jsx (Agenda, Taller, Historial).
 *
 * @param {{ marca: string, modelo: string, categoria: { nombre: string } }} bien
 * @param {string} icon - Emoji para el icono de la celda
 */
export function BienCell({ bien, icon = '💻' }) {
  if (!bien) return <div className="bien-cell"><div className="bien-icon">{icon}</div><div><div className="bien-name" style={{ color: 'var(--text-secondary)' }}>Equipo eliminado</div></div></div>;
  return (
    <div className="bien-cell">
      <div className="bien-icon">{icon}</div>
      <div>
        <div className="bien-name">{bien.marca} {bien.modelo}</div>
        <div className="bien-serial" style={{ fontSize: 10 }}>
          {bien.categoria?.nombre || 'General'}
        </div>
      </div>
    </div>
  );
}

/**
 * EtiquetaCell — Celda con código de inventario y número de serie
 *
 * Reemplaza el bloque de JSX idéntico en las 3 tablas de MantenimientosPanel.
 *
 * @param {{ codigo_inventario: string, numero_serie: string }} bien
 */
export function EtiquetaCell({ bien }) {
  if (!bien) return <><div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>—</div><div className="bien-serial" style={{ fontFamily: 'monospace' }}>—</div></>;
  return (
    <>
      <div style={{ fontWeight: 600 }}>{bien.codigo_inventario?.startsWith('SIN-NUMERO-') ? 'S/N' : (bien.codigo_inventario || '—')}</div>
      <div className="bien-serial" style={{ fontFamily: 'monospace' }}>
        {bien.numero_serie || '—'}
      </div>
    </>
  );
}

/**
 * TipoBadge — Badge de tipo de mantenimiento (Preventivo / Correctivo)
 *
 * Reemplaza el span con estilos inline condicionales repetido 3 veces
 * en MantenimientosPanel.jsx.
 *
 * @param {'Preventivo'|'Correctivo'} tipo
 */
export function TipoBadge({ tipo }) {
  const isPreventivo = tipo === 'Preventivo';
  return (
    <span style={{
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 4,
      background: isPreventivo ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      color: isPreventivo ? '#10B981' : '#EF4444',
      fontWeight: 600
    }}>
      {tipo}
    </span>
  );
}
