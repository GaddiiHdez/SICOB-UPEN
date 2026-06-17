'use client';
import { useState, useMemo } from 'react';
import { TIPOS_EQUIPO, ESTADO_BADGE } from '@/lib/constants';

// ── Paleta de colores para los gráficos ──────────────────────
const CHART_COLORS = [
  '#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B',
  '#F43F5E', '#06B6D4', '#10B981', '#EC4899',
];

// Helper para limpiar descripciones de mantenimiento
const cleanDesc = (desc) => {
  if (!desc) return '';
  let clean = desc.replace(/Periodo:\s*\d{4}-\d{2}-\d{2}\s*al\s*\d{4}-\d{2}-\d{2}\n?/, '');
  clean = clean.replace(/\n+/g, ' ');
  if (clean.length > 70) {
    return clean.slice(0, 67) + '...';
  }
  return clean;
};

/**
 * Dashboard — Tablero principal del sistema de inventario UPEN.
 * Muestra KPIs, gráficos interactivos (SVG puro), accesos rápidos
 * y un feed de actividad reciente. Todos los datos se calculan
 * dinámicamente a partir de la lista `bienes`.
 *
 * @param {Object[]} bienes       - Lista de bienes del inventario
 * @param {Function} onNavChange  - Cambia la sección activa del sidebar
 * @param {Function} onOpenModal  - Abre el modal de "Nuevo Bien"
 * @param {Function} showToast    - Muestra notificaciones tipo toast
 */
export default function Dashboard({ bienes, categorias = [], ubicaciones = [], mantenimientos = [], onNavChange, onOpenModal, onOpenScanner, showToast, onKpiClick, isAdmin, usuario }) {

  // ── Hover del donut ────────────────────────────────────────
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // ── Mostrar/Ocultar Auditoría ──────────────────────────────
  const [showAuditCard, setShowAuditCard] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dash_show_audit_card');
      return saved !== 'false';
    }
    return true;
  });

  const handleToggleAudit = () => {
    const newVal = !showAuditCard;
    setShowAuditCard(newVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dash_show_audit_card', String(newVal));
    }
  };

  // ── Datos derivados ────────────────────────────────────────
  const stats = useMemo(() => {
    // Filtrar los que no están eliminados para las estadísticas de bienes activos
    const activeBienes = bienes.filter(b => !b.eliminado);
    const total        = activeBienes.length;
    const activos      = activeBienes.filter(b => b.estado === 'Activo').length;
    const mant         = activeBienes.filter(b => b.estado === 'Mantenimiento').length;
    const reserva      = activeBienes.filter(b => b.estado === 'En reserva').length;
    
    // Contar los dados de baja que están en la base de datos (con eliminado: true o estado: 'Baja')
    const baja         = bienes.filter(b => b.eliminado || b.estado === 'Baja').length;
    const areas        = [...new Set(activeBienes.map(b => b.area))].length;

    // Distribución por tipo de equipo
    const porTipo = {};
    activeBienes.forEach(b => { porTipo[b.tipo] = (porTipo[b.tipo] || 0) + 1; });
    const tipoEntries = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);

    return { total, activos, mant, baja, reserva, areas, tipoEntries };
  }, [bienes]);

  const PRESUPUESTO_ANUAL = 350000; // Presupuesto anual de referencia
  const valorPatrimonial = useMemo(() => {
    // Solo sumar el valor patrimonial de los bienes que están activos (no eliminados)
    return bienes.filter(b => !b.eliminado).reduce((sum, b) => sum + (b.valor_estimado || 0), 0);
  }, [bienes]);

  const pctPresupuesto = useMemo(() => {
    if (PRESUPUESTO_ANUAL === 0) return 0;
    return Math.min(Math.round((valorPatrimonial / PRESUPUESTO_ANUAL) * 100), 100);
  }, [valorPatrimonial]);

  // ── Saludo dinámico según la hora ──────────────────────────
  const saludo = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── Mantenimientos Programados para la semana ──────────────────
  const mantenimientosSemanales = useMemo(() => {
    const hoy = new Date();
    // Normalizar a inicio del día de hoy
    hoy.setHours(0, 0, 0, 0);
    const finSemana = new Date();
    finSemana.setDate(hoy.getDate() + 7);
    finSemana.setHours(23, 59, 59, 999);

    const deLaSemana = mantenimientos.filter(m => {
      if (m.estado !== 'Programado') return false;
      const fecha = new Date(m.proximo_mantenimiento || m.fecha_mantenimiento);
      return fecha >= hoy && fecha <= finSemana;
    });

    const groups = {};
    deLaSemana.forEach(m => {
      const key = `${m.proximo_mantenimiento || ''}_${m.tipo || ''}_${m.descripcion || ''}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          proximo_mantenimiento: m.proximo_mantenimiento,
          fecha_mantenimiento: m.fecha_mantenimiento,
          tipo: m.tipo,
          descripcion: m.descripcion,
          items: []
        };
      }
      groups[key].items.push(m);
    });

    return Object.values(groups).sort((a, b) => new Date(a.proximo_mantenimiento || a.fecha_mantenimiento) - new Date(b.proximo_mantenimiento || b.fecha_mantenimiento));
  }, [mantenimientos]);

  const totalEquiposSemanales = useMemo(() => {
    return mantenimientosSemanales.reduce((sum, g) => sum + g.items.length, 0);
  }, [mantenimientosSemanales]);

  // ── Equipos sin Custodio Asignado (Auditoría de Resguardos) ───
  const huerfanos = useMemo(() => {
    return bienes.filter(b => 
      !b.eliminado && 
      b.estado === 'Activo' && 
      (!b.responsableId || b.responsable === 'Sin asignar' || b.responsable === '—')
    ).slice(0, 5);
  }, [bienes]);

  // ── Inversión y Valor Patrimonial por Categoría ─────────────────
  const inversionPorCategoria = useMemo(() => {
    const activeBienes = bienes.filter(b => !b.eliminado);
    const inversion = {};

    categorias.forEach(c => {
      inversion[c.nombre] = 0;
    });

    activeBienes.forEach(b => {
      const catName = b.categoria || b.tipo || 'Otro';
      inversion[catName] = (inversion[catName] || 0) + (b.valor_estimado || 0);
    });

    return Object.entries(inversion)
      .map(([cat, val]) => ({
        categoria: cat,
        valor: val,
        icono: categorias.find(c => c.nombre === cat)?.icono || '🏷️'
      }))
      .filter(item => item.valor > 0)
      .sort((a, b) => b.valor - a.valor);
  }, [bienes, categorias]);

  // ── Distribución Espacial / Áreas con más Equipos ──────────────────
  const areasMasEquipadas = useMemo(() => {
    const activeBienes = bienes.filter(b => !b.eliminado);
    const conteo = {};

    activeBienes.forEach(b => {
      const areaName = b.area || 'Desconocida';
      conteo[areaName] = (conteo[areaName] || 0) + 1;
    });

    return Object.entries(conteo)
      .map(([areaName, val]) => ({
        area: areaName,
        amount: val, // Changed to val to preserve structure or maps
        cantidad: val,
        icono: ubicaciones.find(u => u.nombre === areaName)?.icono || '🏫'
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [bienes, ubicaciones]);

  // ── Historial de Actividad Dinámico ───────────────────────────────
  const actividadReciente = useMemo(() => {
    const list = [];

    // Helper interno para formatear tiempo relativo en español
    const getRelativeTime = (dateInput) => {
      if (!dateInput) return '';
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diffMs = now - date;
      
      if (diffMs < 5000) return 'Hace unos momentos';
      
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        if (diffDays === 1) return 'Hace 1 día';
        return `Hace ${diffDays} días`;
      }
      if (diffHours > 0) {
        if (diffHours === 1) return 'Hace 1 hora';
        return `Hace ${diffHours} horas`;
      }
      if (diffMins > 0) {
        if (diffMins === 1) return 'Hace 1 minuto';
        return `Hace ${diffMins} minutos`;
      }
      return `Hace ${diffSecs} segundos`;
    };

    // 1. Registros
    bienes.forEach(b => {
      if (b.createdAt) {
        list.push({
          id: `reg-${b.id}`,
          date: new Date(b.createdAt),
          tipo: 'registro',
          icono: '📦',
          texto: `${b.nombre} registrado en ${b.area && b.area !== 'Desconocida' ? b.area : 'inventario'}`,
          color: 'green'
        });
      }
    });

    // 2. Asignaciones
    bienes.forEach(b => {
      if (b.fechaAsignacion && b.responsable && b.responsable !== 'Sin asignar') {
        list.push({
          id: `asig-${b.id}`,
          date: new Date(b.fechaAsignacion),
          tipo: 'asignacion',
          icono: '👤',
          texto: `${b.nombre} asignado a ${b.responsable}`,
          color: 'blue'
        });
      }
    });

    // 3. Mantenimientos
    mantenimientos.forEach(m => {
      const bName = m.bien ? `${m.bien.marca} ${m.bien.modelo}` : 'Equipo';
      const dateVal = m.fecha_mantenimiento || m.createdAt;
      if (dateVal) {
        if (m.estado === 'En proceso') {
          list.push({
            id: `mant-proc-${m.id}`,
            date: new Date(dateVal),
            tipo: 'mantenimiento',
            icono: '🔧',
            texto: `${bName} enviado a mantenimiento`,
            color: 'orange'
          });
        } else if (m.estado === 'Completado') {
          list.push({
            id: `mant-comp-${m.id}`,
            date: new Date(m.updatedAt || dateVal),
            tipo: 'mantenimiento',
            icono: '🔧',
            texto: `${bName} - Mantenimiento completado`,
            color: 'orange'
          });
        } else if (m.estado === 'Programado') {
          list.push({
            id: `mant-prog-${m.id}`,
            date: new Date(m.createdAt || dateVal),
            tipo: 'mantenimiento',
            icono: '🔧',
            texto: `${bName} - Mantenimiento programado`,
            color: 'orange'
          });
        }
      }
    });

    // 4. Bajas
    bienes.forEach(b => {
      if (b.eliminado || b.estado === 'Baja') {
        const dateStr = b.eliminadoEn || b.updatedAt || b.createdAt;
        if (dateStr) {
          const reason = b.descripcion && b.descripcion.length < 50 ? ` por ${b.descripcion}` : '';
          list.push({
            id: `baja-${b.id}`,
            date: new Date(dateStr),
            tipo: 'baja',
            icono: '⚠️',
            texto: `${b.nombre} dado de baja${reason}`,
            color: 'rose'
          });
        }
      }
    });

    // Ordenar por fecha descendente (más recientes primero)
    list.sort((a, b) => b.date - a.date);

    // Tomar los 5 más recientes y asignar el tiempo relativo
    return list.slice(0, 5).map(item => ({
      ...item,
      tiempo: getRelativeTime(item.date)
    }));
  }, [bienes, mantenimientos]);

  // ── KPIs ───────────────────────────────────────────────────
  const kpis = [
    { label: 'Total de Bienes',      value: stats.total,   icon: '🗂',  color: 'blue',   sub: `${stats.areas} ubicaciones`, status: 'total' },
    { label: 'Equipos Activos',      value: stats.activos, icon: '✅',  color: 'green',  sub: `${stats.total > 0 ? Math.round((stats.activos / stats.total) * 100) : 0}% del inventario`, status: 'Activo' },
    { label: 'En Mantenimiento',     value: stats.mant,    icon: '🔧',  color: 'orange', sub: stats.mant > 0 ? 'Requieren atención' : 'Todo operativo', status: 'Mantenimiento' },
    { label: 'Dados de Baja',        value: stats.baja,    icon: '⚠️',  color: 'rose',   sub: stats.baja > 0 ? 'Pendientes de retiro' : 'Sin bajas', status: 'Baja' },
  ];

  // ── Donut Chart SVG ────────────────────────────────────────
  const DONUT_RADIUS = 70;
  const DONUT_CIRCUM = 2 * Math.PI * DONUT_RADIUS;

  const donutSlices = useMemo(() => {
    if (stats.total === 0) return [];
    let offset = 0;
    return stats.tipoEntries.map(([tipo, count], i) => {
      const pct   = count / stats.total;
      const dash  = pct * DONUT_CIRCUM;
      const gap   = DONUT_CIRCUM - dash;
      const slice = { tipo, count, pct, dash, gap, offset, color: CHART_COLORS[i % CHART_COLORS.length] };
      offset += dash;
      return slice;
    });
  }, [stats, DONUT_CIRCUM]);

  // ── Barras de estado ───────────────────────────────────────
  const barras = [
    { label: 'Activo',         count: stats.activos, color: '#10B981' },
    { label: 'Mantenimiento',  count: stats.mant,    color: '#F59E0B' },
    { label: 'En reserva',     count: stats.reserva, color: '#3B82F6' },
    { label: 'Baja',           count: stats.baja,    color: '#F43F5E' },
  ];
  const maxBarra = Math.max(...barras.map(b => b.count), 1);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="dash">

      {/* ── Bienvenida ──────────────────────────────────────── */}
      <div className="dash-welcome fade-in">
        <div>
          <div className="dash-welcome-saludo">{saludo}, {usuario?.nombre ?? 'Usuario'} 👋</div>
          <div className="dash-welcome-fecha">{fechaHoy}</div>
        </div>
        <div className="dash-welcome-badge">
          <span className="dash-pulse"></span>
          Sistema operativo
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────── */}
      <div className="dash-kpi-grid">
        {kpis.map((k, i) => (
          <div 
            key={k.label} 
            className="dash-kpi fade-in" 
            style={{ animationDelay: `${i * 0.07}s`, cursor: 'pointer' }}
            onClick={() => onKpiClick && onKpiClick(k.status)}
            title={`Filtrar inventario por ${k.label}`}
          >
            <div className={`dash-kpi-icon dash-kpi-icon-${k.color}`}>{k.icon}</div>
            <div className="dash-kpi-body">
              <div className="dash-kpi-label">{k.label}</div>
              <div className="dash-kpi-value">{k.value}</div>
              <div className="dash-kpi-sub">{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Accesos Rápidos ──────────────────────────────────── */}
      <div className="dash-actions fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="dash-section-label">Accesos rápidos</div>
        <div className="dash-actions-grid">
          {isAdmin && (
            <button id="dash-action-nuevo" className="dash-action-btn dash-action-primary" onClick={onOpenModal}>
              <span className="dash-action-icon">＋</span>
              <span>Registrar bien</span>
            </button>
          )}
          <button id="dash-action-escanear" className="dash-action-btn" onClick={onOpenScanner}>
            <span className="dash-action-icon">🔍</span>
            <span>Escanear Código</span>
          </button>
          <button id="dash-action-mantenimiento" className="dash-action-btn" onClick={() => onNavChange('mantenimientos')}>
            <span className="dash-action-icon">🔧</span>
            <span>Mantenimiento</span>
          </button>
          {isAdmin && (
            <button id="dash-action-resguardos" className="dash-action-btn" onClick={() => onNavChange('resguardos')}>
              <span className="dash-action-icon">📝</span>
              <span>Emitir Resguardo</span>
            </button>
          )}
          <button id="dash-action-reportes" className="dash-action-btn" onClick={() => onNavChange('reportes')}>
            <span className="dash-action-icon">📊</span>
            <span>Reportes e Historial</span>
          </button>
        </div>
      </div>

      {/* ── Gráficos + Actividad (2 columnas) ───────────────── */}
      <div className="dash-grid-2col">

        {/* ── COLUMNA IZQUIERDA: Gráficos ───────────────────── */}
        <div className="dash-col-left">

          {/* Donut Chart — Distribución por Tipo */}
          <div className="dash-card fade-in" style={{ animationDelay: '0.35s' }}>
            <div className="dash-card-header">
              <div>
                <div className="dash-section-label">Distribución</div>
                <div className="dash-card-title">Tipos de Equipo</div>
              </div>
              <div className="dash-card-badge">{stats.tipoEntries.length} categorías</div>
            </div>

            <div className="dash-donut-wrap">
              {/* SVG Donut */}
              <svg viewBox="0 0 200 200" className="dash-donut-svg">
                {/* Fondo gris adaptativo */}
                <circle cx="100" cy="100" r={DONUT_RADIUS} fill="none" stroke="var(--border-light)" strokeWidth="22" />
                {/* Slices */}
                {donutSlices.map((s, i) => (
                  <circle
                    key={s.tipo}
                    cx="100" cy="100" r={DONUT_RADIUS}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={hoveredSlice === i ? 28 : 22}
                    strokeDasharray={`${s.dash} ${s.gap}`}
                    strokeDashoffset={-s.offset}
                    strokeLinecap="round"
                    className="dash-donut-slice"
                    style={{ transformOrigin: '100px 100px', transform: 'rotate(-90deg)' }}
                    onMouseEnter={() => setHoveredSlice(i)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                ))}
                {/* Texto central */}
                <text x="100" y="94" textAnchor="middle" className="dash-donut-center-value">
                  {hoveredSlice !== null ? donutSlices[hoveredSlice].count : stats.total}
                </text>
                <text x="100" y="114" textAnchor="middle" className="dash-donut-center-label">
                  {hoveredSlice !== null ? donutSlices[hoveredSlice].tipo : 'Total'}
                </text>
              </svg>

              {/* Leyenda */}
              <div className="dash-donut-legend">
                {donutSlices.map((s, i) => (
                  <div
                    key={s.tipo}
                    className={`dash-legend-item${hoveredSlice === i ? ' active' : ''}`}
                    onMouseEnter={() => setHoveredSlice(i)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    <span className="dash-legend-dot" style={{ background: s.color }}></span>
                    <span className="dash-legend-label">{TIPOS_EQUIPO[s.tipo] || '🔧'} {s.tipo}</span>
                    <span className="dash-legend-value">{s.count}</span>
                    <span className="dash-legend-pct">{Math.round(s.pct * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart — Estado del inventario */}
          <div className="dash-card fade-in" style={{ animationDelay: '0.45s' }}>
            <div className="dash-card-header">
              <div>
                <div className="dash-section-label">Salud del inventario</div>
                <div className="dash-card-title">Estado de Equipos</div>
              </div>
            </div>

            <div className="dash-bars-wrap">
              {barras.map((b) => (
                <div key={b.label} className="dash-bar-row">
                  <div className="dash-bar-label">
                    <span className="dash-bar-dot" style={{ background: b.color }}></span>
                    {b.label}
                  </div>
                  <div className="dash-bar-track">
                    <div
                      className="dash-bar-fill"
                      style={{
                        width: `${Math.max((b.count / maxBarra) * 100, 4)}%`,
                        background: b.color,
                      }}
                    ></div>
                  </div>
                  <div className="dash-bar-count">{b.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Inversión por Categoría */}
          <div className="dash-card fade-in" style={{ animationDelay: '0.48s' }}>
            <div className="dash-card-header">
              <div>
                <div className="dash-section-label">Valor y Activos</div>
                <div className="dash-card-title">Inversión por Categoría</div>
              </div>
              <div className="dash-card-badge" style={{ background: 'rgba(13, 148, 136, 0.1)', color: 'var(--primary)' }}>
                💰 Presupuesto
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 22px' }}>
              {inversionPorCategoria.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0' }}>
                  Sin valores de compra registrados.
                </div>
              ) : (
                inversionPorCategoria.map((item, idx) => {
                  const totalInversion = inversionPorCategoria.reduce((sum, i) => sum + i.valor, 0);
                  const pct = totalInversion > 0 ? (item.valor / totalInversion) * 100 : 0;
                  return (
                    <div key={item.categoria} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text-primary)' }}>
                          <span>{item.icono}</span>
                          <span>{item.categoria}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(item.valor)}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: CHART_COLORS[idx % CHART_COLORS.length], borderRadius: 3 }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Distribución Espacial — Áreas con más Equipos */}
          <div className="dash-card fade-in" style={{ animationDelay: '0.51s' }}>
            <div className="dash-card-header">
              <div>
                <div className="dash-section-label">Densidad de Dispositivos</div>
                <div className="dash-card-title">Áreas más Equipadas</div>
              </div>
              <div className="dash-card-badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
                🏫 Ubicaciones
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 22px' }}>
              {areasMasEquipadas.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0' }}>
                  Sin ubicaciones con equipos asignados.
                </div>
              ) : (
                areasMasEquipadas.map((item) => (
                  <div
                    key={item.area}
                    onClick={() => onNavChange('inventario')}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-body)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    className="hover-highlight"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15 }}>{item.icono}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{item.area}</span>
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--primary)',
                      background: 'rgba(13, 148, 136, 0.08)',
                      padding: '2px 10px',
                      borderRadius: 10
                    }}>
                      {item.cantidad} equipo{item.cantidad !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA: Actividad Reciente ────────────── */}
        <div className="dash-col-right">

          {/* Resumen rápido */}
          <div className="dash-card dash-card-highlight fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="dash-card-header">
              <div>
                <div className="dash-section-label">Valor patrimonial</div>
                <div className="dash-card-title" style={{ fontSize: 28, letterSpacing: '-0.04em' }}>
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valorPatrimonial)}
                </div>
              </div>
              <div className="dash-card-badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>💰 MXN</div>
            </div>
            <div className="dash-patrimonio-bar">
              <div className="dash-patrimonio-fill" style={{ width: `${pctPresupuesto}%` }}></div>
            </div>
            <div className="dash-patrimonio-sub">{pctPresupuesto}% del presupuesto anual utilizado</div>
          </div>

          {/* Feed de actividad */}
          <div className="dash-card fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="dash-card-header">
              <div>
                <div className="dash-section-label">Historial</div>
                <div className="dash-card-title">Actividad Reciente</div>
              </div>
            </div>

            <div className="dash-timeline">
              {actividadReciente.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
                  📋 Sin actividad reciente registrada en el sistema.
                </div>
              ) : (
                actividadReciente.map((a, i) => (
                  <div key={a.id} className="dash-timeline-item fade-in" style={{ animationDelay: `${0.55 + i * 0.06}s` }}>
                    <div className="dash-timeline-line">
                      <div className={`dash-timeline-dot dash-timeline-dot-${a.color}`}></div>
                      {i < actividadReciente.length - 1 && <div className="dash-timeline-connector"></div>}
                    </div>
                    <div className="dash-timeline-content">
                      <div className="dash-timeline-icon">{a.icono}</div>
                      <div className="dash-timeline-body">
                        <div className="dash-timeline-text">{a.texto}</div>
                        <div className="dash-timeline-time">{a.tiempo}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Mantenimientos programados de la semana */}
          <div className="dash-card fade-in" style={{ animationDelay: '0.53s' }}>
            <div className="dash-card-header">
              <div>
                <div className="dash-section-label">Agenda Preventiva</div>
                <div className="dash-card-title">Mantenimientos de la Semana</div>
              </div>
              <div className="dash-card-badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563EB' }}>
                {totalEquiposSemanales} equipo{totalEquiposSemanales !== 1 ? 's' : ''}
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 10, 
              padding: '16px 22px 18px 22px', 
              maxHeight: '320px', 
              overflowY: 'auto' 
            }}>
              {mantenimientosSemanales.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '14px 0' }}>
                  📅 Sin revisiones programadas para esta semana.
                </div>
              ) : (
                mantenimientosSemanales.map(g => {
                  const fecha = new Date(g.proximo_mantenimiento || g.fecha_mantenimiento);
                  const isGroup = g.items.length > 1;
                  const icon = isGroup ? '📂' : '🔧';
                  const title = isGroup 
                    ? `Plan: ${g.tipo} (${g.items.length} equipos)` 
                    : (g.items[0]?.bien ? `${g.items[0].bien.marca} ${g.items[0].bien.modelo}` : 'Mantenimiento Individual');

                  return (
                    <div
                      key={g.key}
                      onClick={() => onNavChange('mantenimientos', g.key)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-body)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      className="hover-highlight"
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {title}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cleanDesc(g.descripcion)}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 10.5, fontWeight: 600, color: 'var(--primary)', marginLeft: 8, flexShrink: 0 }}>
                        {fecha.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Equipos sin Custodio Asignado (Auditoría) */}
          <div className="dash-card fade-in" style={{ 
            animationDelay: '0.56s', 
            borderLeft: huerfanos.length > 0 ? '3px solid #F59E0B' : '3px solid #10B981' 
          }}>
            <div className="dash-card-header">
              <div>
                <div className="dash-section-label" style={{ color: huerfanos.length > 0 ? '#D97706' : '#059669' }}>
                  Auditoría de Resguardos
                </div>
                <div className="dash-card-title">Equipos sin Responsable</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="dash-card-badge" style={{ 
                  background: huerfanos.length > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                  color: huerfanos.length > 0 ? '#D97706' : '#059669',
                  fontSize: '10.5px',
                  padding: '3px 8px'
                }}>
                  {huerfanos.length > 0 ? `⚠️ ${huerfanos.length} pendientes` : '✅ Completo'}
                </div>
                <button 
                  type="button"
                  onClick={handleToggleAudit} 
                  style={{
                    background: 'var(--bg-body)',
                    border: '1px solid var(--border)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontWeight: '600',
                    outline: 'none',
                    transition: 'all 0.15s'
                  }}
                  className="hover-highlight"
                >
                  {showAuditCard ? '👁️ Ocultar' : '👁️ Mostrar'}
                </button>
              </div>
            </div>

            {showAuditCard && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, paddingBottom: 16 }}>
                {huerfanos.length > 0 ? (
                  <>
                    <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', padding: '0 22px', margin: '0 0 6px', lineHeight: 1.4 }}>
                      Los siguientes equipos están marcados como <strong>Activos</strong> pero no cuentan con una firma de resguardo asignada:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 22px' }}>
                      {huerfanos.map(b => (
                        <div
                          key={b.id}
                          onClick={() => onNavChange('inventario')}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-body)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          className="hover-highlight"
                        >
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 14 }}>{b.icono}</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {b.nombre}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: 2 }}>
                               {b.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : b.etiqueta}
                              </div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#D97706',
                            background: 'rgba(245, 158, 11, 0.08)',
                            padding: '2px 8px',
                            borderRadius: 4
                          }}>
                            Sin Firma
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px 22px', 
                    color: 'var(--text-secondary)',
                    fontSize: 12.5
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                    <strong>Todo al día</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 11, opacity: 0.85 }}>
                      Todos los equipos en uso activo cuentan con una firma de resguardo asignada en el sistema.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Alertas rápidas */}
          {(stats.mant > 0 || stats.baja > 0) && (
            <div className="dash-card dash-alert-card fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="dash-alert-header">
                <span>⚡</span> Atención requerida
              </div>
              {stats.mant > 0 && (
                <div className="dash-alert-item dash-alert-warning">
                  🔧 <strong>{stats.mant}</strong> equipo{stats.mant > 1 ? 's' : ''} en reparación/taller
                </div>
              )}
              {stats.baja > 0 && (
                <div className="dash-alert-item dash-alert-danger">
                  ⚠️ <strong>{stats.baja}</strong> equipo{stats.baja > 1 ? 's' : ''} dado{stats.baja > 1 ? 's' : ''} de baja
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
