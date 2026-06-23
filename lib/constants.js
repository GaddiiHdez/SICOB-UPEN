/**
 * lib/constants.js
 * Constantes compartidas entre el frontend y el backend.
 * Una sola fuente de verdad para estados, tipos y navegación.
 * Al agregar un estado o tipo nuevo, solo se cambia AQUÍ.
 */

// ── Estados de un bien ────────────────────────────────────────
// Usado en: filtros, modal, badges, API
export const ESTADOS_BIEN = ['Activo', 'Mantenimiento', 'En reserva', 'Baja'];

// Clases CSS para cada estado (usadas en tabla y panel de detalle)
export const ESTADO_BADGE = {
  'Activo':      'badge badge-active',
  'Mantenimiento':'badge badge-warning',
  'Baja':        'badge badge-danger',
  'En reserva':  'badge badge-info',
};

// ── Tipos de equipo y su icono representativo ─────────────────
// Usado en: modal, filtros, tabla
export const TIPOS_EQUIPO = {
  'Laptop':        '💻',
  'Desktop':       '🖥️',
  'Monitor':       '🖵',
  'Proyector':     '📽️',
  'Impresora':     '🖨️',
  'Scanner':       '🖨️',
  'Tablet':        '📱',
  'Dron':          '🚁',
  'Cámara':        '📷',
  'Equipo de Red': '📡',
  'Otro':          '🔧',
};

// ── Navegación lateral ────────────────────────────────────────
export const NAV_ITEMS = [
  { id: 'panel',         label: 'Panel',         icon: '⊞' },
  { id: 'inventario',    label: 'Inventario',    icon: '🗂' },
  { id: 'laboratorios',  label: 'Laboratorios (Beta)',  icon: '💻' },
  { id: 'inmobiliario',  label: 'Mobiliario',    icon: '🪑' },
  { id: 'consumibles',   label: 'Consumibles',   icon: '📦' },
  { id: 'auditoria',     label: 'Auditoría Rápida', icon: '🔍' },
  { id: 'personal',      label: 'Personal',      icon: '👤' },
  { id: 'catalogos',     label: 'Catálogos',     icon: '📂' },
  { id: 'resguardos',    label: 'Resguardos',    icon: '📝' },
  { id: 'vales',         label: 'Vales de Salida', icon: '⏱️' },
  { id: 'mantenimientos', label: 'Mantenimientos', icon: '🔧' },
  { id: 'reportes',      label: 'Reportes e Historial', icon: '📊' },
];

// ── Datos de demostración (temporales hasta conectar la API real) ─
export const DEMO_AREAS = [
  'Rectoría', 'Sistemas', 'Aula 101',
  'Administración', 'Dirección', 'Lab. Topografía',
];

export const DEMO_BIENES = [
  { id: 1, nombre: 'Dell Latitude 5420',    tipo: 'Laptop',    serial: 'SN-DL54-001', etiqueta: 'UPEN-2024-001', estado: 'Activo',        area: 'Rectoría',       responsable: 'José García',  icono: '💻',  categoria: 'Cómputo'     },
  { id: 2, nombre: 'HP ProDesk 400 G7',     tipo: 'Desktop',   serial: 'SN-HP40-002', etiqueta: 'UPEN-2024-002', estado: 'Activo',        area: 'Sistemas',       responsable: 'Ana Martínez', icono: '🖥️', categoria: 'Cómputo'     },
  { id: 3, nombre: 'Epson PowerLite X49',   tipo: 'Proyector', serial: 'SN-EP49-003', etiqueta: 'UPEN-2024-003', estado: 'Mantenimiento', area: 'Aula 101',       responsable: 'Luis Soto',    icono: '📽️', categoria: 'A/V'         },
  { id: 4, nombre: 'Canon ImageRunner 2630',tipo: 'Impresora', serial: 'SN-CN26-004', etiqueta: 'UPEN-2024-004', estado: 'Activo',        area: 'Administración', responsable: 'María López',  icono: '🖨️', categoria: 'Periférico'  },
  { id: 5, nombre: 'iPad Pro 12.9 (2022)',  tipo: 'Tablet',    serial: 'SN-IP12-005', etiqueta: 'UPEN-2024-005', estado: 'Activo',        area: 'Dirección',      responsable: 'Carlos Ruiz',  icono: '📱',  categoria: 'Cómputo'     },
  { id: 6, nombre: 'DJI Mini 3 Pro',        tipo: 'Dron',      serial: 'SN-DJ3P-006', etiqueta: 'UPEN-2024-006', estado: 'Baja',          area: 'Lab. Topografía',responsable: 'Sin asignar',  icono: '🚁',  categoria: 'Especializado'},
];

export const STATS_PANEL = [
  { label: 'Bienes registrados',    value: 6,          icon: '🗂',  color: 'blue'   },
  { label: 'Activos asignados',     value: 4,          icon: '✅',  color: 'green'  },
  { label: 'Áreas registradas',     value: 6,          icon: '🏫',  color: 'purple' },
  { label: 'Resguardos activos',    value: 2,          icon: '📋',  color: 'orange' },
];

export const STATS_SECUNDARIAS = [
  { label: 'Mantenimientos (30 días)', value: 1,          icon: '🔧', color: 'rose'  },
  { label: 'Valor patrimonial',        value: '$227,100', icon: '💰', color: 'green', isCurrency: true },
];
