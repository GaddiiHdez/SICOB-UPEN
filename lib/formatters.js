/**
 * formatters.js — Utilidades de Formateo Compartidas
 *
 * Centraliza las funciones de formato de moneda, fecha y otras utilidades
 * de presentación usadas en múltiples componentes del sistema GDI UPEN.
 * Antes de este archivo, formatCurrency y formatDate estaban duplicadas
 * en MantenimientosPanel.jsx y ModalFichaBien.jsx.
 */

/**
 * Formatea un valor numérico como moneda en pesos mexicanos (MXN).
 * @param {number|null|undefined} val - El valor a formatear.
 * @returns {string} El valor formateado o '—' si es nulo/indefinido.
 */
export const formatCurrency = (val) => {
  if (val === null || val === undefined) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
};

/**
 * Formatea una cadena de fecha en formato corto (ej: "4 jun. 2026").
 * Usado en MantenimientosPanel para mostrar fechas en tablas.
 * @param {string|null} dateStr - La fecha en formato ISO string.
 * @returns {string} La fecha formateada o '—' si es nula.
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Formatea una cadena de fecha en formato largo (ej: "4 de junio de 2026").
 * Usado en ModalFichaBien para mostrar fechas en la ficha técnica detallada.
 * @param {string|null} dateStr - La fecha en formato ISO string.
 * @returns {string} La fecha formateada o 'No conocida' si es nula.
 */
export const formatDateLong = (dateStr) => {
  if (!dateStr) return 'No conocida';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
};
