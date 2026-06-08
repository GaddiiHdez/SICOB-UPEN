/**
 * utils.js — Funciones auxiliares compartidas del módulo de Mantenimiento
 */

/** Detecta y extrae un rango de fechas codificado en la descripción */
export const parsePeriodo = (desc) => {
  if (!desc) return null;
  const match = desc.match(/Periodo:\s*(\d{4}-\d{2}-\d{2})\s*al\s*(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return {
      inicio: new Date(match[1] + 'T00:00:00'),
      fin: new Date(match[2] + 'T00:00:00'),
      inicioRaw: match[1],
      finRaw: match[2]
    };
  }
  return null;
};

/** Elimina el prefijo de periodo de la descripción para visualización limpia */
export const cleanDescription = (desc) => {
  if (!desc) return '';
  return desc.replace(/Periodo:\s*\d{4}-\d{2}-\d{2}\s*al\s*\d{4}-\d{2}-\d{2}\n?/, '');
};

/** Calcula el texto de días restantes para una tarea programada */
export const getDaysRemainingText = (m) => {
  const periodo = parsePeriodo(m.descripcion);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (periodo) {
    const start = new Date(periodo.inicio); start.setHours(0, 0, 0, 0);
    const end   = new Date(periodo.fin);   end.setHours(0, 0, 0, 0);
    const daysToStart = Math.ceil((start - hoy) / 86400000);
    const daysToEnd   = Math.ceil((end - hoy)   / 86400000);

    if (daysToEnd < 0) {
      const abs = Math.abs(daysToEnd);
      return { text: `🔴 Vencido hace ${abs} día${abs !== 1 ? 's' : ''}`, className: 'text-danger font-bold' };
    } else if (hoy >= start && hoy <= end) {
      return { text: `🔵 En periodo (Termina en ${daysToEnd} día${daysToEnd !== 1 ? 's' : ''})`, className: 'text-primary font-bold' };
    } else {
      return { text: `🟢 Inicia en ${daysToStart} día${daysToStart !== 1 ? 's' : ''}`, className: 'text-success' };
    }
  }

  if (!m.proximo_mantenimiento) return { text: 'Sin fecha', className: 'text-muted' };
  const fProg = new Date(m.proximo_mantenimiento); fProg.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((fProg - hoy) / 86400000);

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return { text: `🔴 Retrasado (${abs} día${abs !== 1 ? 's' : ''})`, className: 'text-danger font-bold' };
  } else if (diffDays === 0) {
    return { text: `🟡 Programado para hoy`, className: 'text-warning font-bold' };
  } else {
    return { text: `🟢 En ${diffDays} día${diffDays !== 1 ? 's' : ''}`, className: 'text-success' };
  }
};
