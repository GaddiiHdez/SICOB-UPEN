'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ESTADOS_BIEN, ESTADO_BADGE } from '@/lib/constants';
import ModalExportador from '@/app/components/ModalExportador';
import { DynamicIcon } from '@/lib/icons';

export default function ReportesPanel({ bienes = [], categorias = [], ubicaciones = [], departamentos = [], mantenimientos = [], showToast, configuracion = {} }) {
  const [activeTab, setActiveTab] = useState('hoja-vida');
  const [showExportModal, setShowExportModal] = useState(false);

  // ── ESTADOS PESTAÑA: HOJA DE VIDA ───────────────────────────
  const [selectedBienId, setSelectedBienId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [bienDetalle, setBienDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Lista filtrada de bienes para el autocomplete
  const bienesSugeridos = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return bienes.filter(b => 
      b.etiqueta.toLowerCase().includes(q) ||
      b.nombre.toLowerCase().includes(q) ||
      b.serial.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [bienes, searchTerm]);

  // Cargar historial detallado de un bien
  const cargarHistorialBien = useCallback(async (id) => {
    if (!id) return;
    setLoadingDetalle(true);
    try {
      const res = await fetch(`/api/bienes?id=${id}&_=${Date.now()}`);
      if (!res.ok) throw new Error('Error al cargar historial del bien');
      const data = await res.json();
      setBienDetalle(data);
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Error al cargar la hoja de vida', 'error');
    } finally {
      setLoadingDetalle(false);
    }
  }, [showToast]);

  const handleSelectBien = (bien) => {
    setSelectedBienId(bien.id);
    setSearchTerm(`${bien.nombre} (${bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta})`);
    cargarHistorialBien(bien.id);
  };

  // Crear la línea de tiempo cronológica mezclando Asignaciones y Mantenimientos
  const timelineEventos = useMemo(() => {
    if (!bienDetalle) return [];
    const eventos = [];

    // 1. Evento de Adquisición
    if (bienDetalle.fecha_adquisicion || bienDetalle.createdAt) {
      eventos.push({
        tipo: 'registro',
        titulo: 'Registro de Activo en Sistema 📥',
        fecha: bienDetalle.fecha_adquisicion || bienDetalle.createdAt,
        descripcion: `Equipo adquirido bajo el programa "${bienDetalle.programa_adquisicion || 'General'}" con un valor estimado de ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(bienDetalle.valor_estimado || 0)}.`,
        icono: '📥',
        color: '#3B82F6'
      });
    }

    // 2. Eventos de Asignación / Custodia
    if (bienDetalle.asignaciones && bienDetalle.asignaciones.length > 0) {
      bienDetalle.asignaciones.forEach(asig => {
        // Evento de Entrega a Custodio
        eventos.push({
          tipo: 'asignacion',
          titulo: `Asignación de Resguardo 👤`,
          fecha: asig.fecha_asignacion,
          descripcion: `Custodia entregada a ${asig.personal?.nombre || 'Docente'} (${asig.personal?.puesto || 'Custodio'}). Estado físico del equipo: "${asig.estado_entrega || 'Activo'}".`,
          detalles: asig.observaciones ? `Observaciones: ${asig.observaciones}` : null,
          icono: '👤',
          color: '#10B981'
        });

        // Evento de Retorno / Devolución a Bodega
        if (asig.fecha_retorno) {
          eventos.push({
            tipo: 'retorno',
            titulo: 'Devolución de Resguardo 🚪',
            fecha: asig.fecha_retorno,
            descripcion: `Resguardo finalizado. El custodio ${asig.personal?.nombre || 'Docente'} regresó el equipo a bodega de control físico.`,
            icono: '🚪',
            color: '#6B7280'
          });
        }
      });
    }

    // 3. Eventos de Mantenimiento
    if (bienDetalle.mantenimientos && bienDetalle.mantenimientos.length > 0) {
      bienDetalle.mantenimientos.forEach(mant => {
        eventos.push({
          tipo: 'mantenimiento',
          titulo: `Revisión Técnica - ${mant.tipo} 🔧`,
          fecha: mant.fecha_mantenimiento,
          descripcion: `Mantenimiento ${mant.tipo.toLowerCase()} ${mant.estado === 'Completado' ? 'completado' : 'iniciado'}. Diagnóstico/Trabajo: "${mant.descripcion}"`,
          detalles: `Técnico: ${mant.tecnico_encargado || 'No registrado'} | Costo: ${mant.costo ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(mant.costo) : '$0.00 MXN'}`,
          icono: '🔧',
          color: '#F59E0B'
        });
      });
    }

    // 4. Evento de Baja
    if (bienDetalle.eliminado) {
      eventos.push({
        tipo: 'baja',
        titulo: 'Baja Operativa / Lógica 🛑',
        fecha: bienDetalle.eliminadoEn || bienDetalle.updatedAt,
        descripcion: `El bien fue dado de baja del inventario activo de la institución.`,
        icono: '🛑',
        color: '#EF4444'
      });
    }

    // Ordenar cronológicamente (más antiguo primero para ver la historia en orden de vida)
    return eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [bienDetalle]);

  // ── ESTADOS E INDICADORES (NUEVO) ──────────────────────────
  const statsDashboard = useMemo(() => {
    // 1. Bienes activos (no eliminados)
    const activos = bienes.filter(b => !b.eliminado);
    const totalActivosVal = activos.reduce((sum, b) => sum + (b.valor_estimado || 0), 0);
    
    // 2. Bienes de baja (eliminados)
    const deBaja = bienes.filter(b => b.eliminado);

    // 3. Mantenimientos completados
    const completados = mantenimientos.filter(m => m.estado === 'Completado');
    const gastoMantenimiento = completados.reduce((sum, m) => sum + (m.costo || 0), 0);
    const promMantenimiento = completados.length > 0 ? (gastoMantenimiento / completados.length) : 0;

    // 4. Distribución por Categorías (unidades y valor)
    const distCategorias = categorias.map(c => {
      const deCat = activos.filter(b => b.categoriaId === c.id);
      const valCat = deCat.reduce((sum, b) => sum + (b.valor_estimado || 0), 0);
      return {
        id: c.id,
        nombre: c.nombre,
        icono: c.icono || '🏷️',
        count: deCat.length,
        valor: valCat
      };
    }).sort((a, b) => b.count - a.count); // Ordenar por cantidad

    // 5. Distribución por Estado Operativo
    const estadosCount = {
      'Activo': activos.filter(b => b.estado === 'Activo').length,
      'En proceso (Taller)': activos.filter(b => b.estado === 'Mantenimiento').length,
      'En reserva': activos.filter(b => b.estado === 'En reserva').length,
      'Baja': deBaja.length
    };

    // 6. Top 5 Bienes con mayor costo acumulado en mantenimiento
    const bienesConCostos = bienes.map(b => {
      const deBien = completados.filter(m => m.bienId === b.id);
      const costoAcum = deBien.reduce((sum, m) => sum + (m.costo || 0), 0);
      return {
        ...b,
        countIntervenciones: deBien.length,
        costoAcumulado: costoAcum
      };
    }).filter(b => b.costoAcumulado > 0)
      .sort((a, b) => b.costoAcumulado - a.costoAcumulado)
      .slice(0, 5);

    // 7. Tipo de servicio: Preventivo vs Correctivo
    const preventivos = completados.filter(m => m.tipo === 'Preventivo').length;
    const correctivos = completados.filter(m => m.tipo === 'Correctivo').length;

    return {
      activosCount: activos.length,
      deBajaCount: deBaja.length,
      totalActivosVal,
      gastoMantenimiento,
      promMantenimiento,
      intervencionesCount: completados.length,
      distCategorias,
      estadosCount,
      bienesConCostos,
      preventivos,
      correctivos
    };
  }, [bienes, categorias, mantenimientos]);

  // ── ESTADOS PESTAÑA: GENERADOR DE REPORTES ──────────────────
  const [filterCatId, setFilterCatId] = useState('');
  const [filterUbiId, setFilterUbiId] = useState('');
  const [filterDepId, setFilterDepId] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPrograma, setFilterPrograma] = useState('');

  // Listado de programas existentes para filtro
  const listaProgramas = useMemo(() => {
    const list = bienes.map(b => b.programa_adquisicion?.trim()).filter(Boolean);
    return [...new Set(list)].sort();
  }, [bienes]);

  // Filtrado dinámico de bienes en memoria
  const bienesReportados = useMemo(() => {
    return bienes.filter(b => {
      if (filterCatId && String(b.categoriaId) !== String(filterCatId)) return false;
      if (filterUbiId && String(b.ubicacionId) !== String(filterUbiId)) return false;
      if (filterDepId && String(b.departamentoId) !== String(filterDepId)) return false;
      if (filterEstado && b.estado !== filterEstado) return false;
      if (filterPrograma && b.programa_adquisicion !== filterPrograma) return false;
      return true;
    });
  }, [bienes, filterCatId, filterUbiId, filterDepId, filterEstado, filterPrograma]);

  // Totales financieros y numéricos del reporte
  const sumaReporte = useMemo(() => {
    const totalItems = bienesReportados.length;
    const valorTotal = bienesReportados.reduce((sum, b) => sum + (b.valor_estimado || 0), 0);
    return { totalItems, valorTotal };
  }, [bienesReportados]);

  const filterCatName = useMemo(() => {
    if (!filterCatId) return 'Todas';
    const found = categorias.find(c => String(c.id) === String(filterCatId));
    return found ? found.nombre : 'Todas';
  }, [categorias, filterCatId]);

  const filterUbiName = useMemo(() => {
    if (!filterUbiId) return 'Todas';
    const found = ubicaciones.find(u => String(u.id) === String(filterUbiId));
    return found ? found.nombre : 'Todas';
  }, [ubicaciones, filterUbiId]);

  const filterDepName = useMemo(() => {
    if (!filterDepId) return 'Todos';
    const found = departamentos.find(d => String(d.id) === String(filterDepId));
    return found ? found.nombre : 'Todos';
  }, [departamentos, filterDepId]);

  // Exportación a Excel/PDF
  const handleExportCSV = () => {
    if (bienesReportados.length === 0) {
      alert('No hay registros en el reporte actual para exportar.');
      return;
    }
    setShowExportModal(true);
  };

  const handlePrint = () => {
    const logoSrc = configuracion?.logo_institucion || null;
    const nombre = configuracion?.nombre_institucion || 'Universidad Politécnica del Estado';
    const siglas = configuracion?.siglas_institucion || 'UPEN';
    const fecha = new Date().toLocaleDateString('es-MX', { dateStyle: 'long' });
    const hora  = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    const filtersText = [
      `<strong>Categoría:</strong> ${filterCatName}`,
      `<strong>Ubicación:</strong> ${filterUbiName}`,
      `<strong>Depto./Coord.:</strong> ${filterDepName}`,
      `<strong>Estado:</strong> ${filterEstado || 'Todos'}`,
      `<strong>Fondo/Programa:</strong> ${filterPrograma || 'Todos'}`,
    ].join(' &nbsp;|&nbsp; ');

    const valorFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

    const rows = bienesReportados.map((row, idx) => `
      <tr style="border-bottom: ${idx === bienesReportados.length - 1 ? 'none' : '1px solid #E5E7EB'}">
        <td style="padding:4px 6px; font-size:8px; border:1px solid #E5E7EB;">
          <span style="font-family:monospace; font-size:7px; border:1px solid #D1D5DB; padding:0 2px; border-radius:2px;">${row.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : row.etiqueta}</span>
          <div style="color:#6B7280; font-size:7px; margin-top:2px; font-family:monospace;">S/N: ${row.serial || '—'}</div>
        </td>
        <td style="padding:4px 6px; font-size:8px; border:1px solid #E5E7EB; font-weight:600;">${row.nombre || '—'}</td>
        <td style="padding:4px 6px; font-size:8px; border:1px solid #E5E7EB; color:#374151;">${row.area || 'Bodega'}</td>
        <td style="padding:4px 6px; font-size:8px; border:1px solid #E5E7EB; color:#374151;">${row.departamento || 'Sin asignar'}</td>
        <td style="padding:4px 6px; font-size:8px; border:1px solid #E5E7EB;">
          <span style="font-size:7px; border:1px solid #9CA3AF; padding:0 3px; border-radius:2px;">${row.estado || '—'}</span>
        </td>
        <td style="padding:4px 6px; font-size:8px; border:1px solid #E5E7EB; text-align:right; font-weight:600;">${valorFmt.format(row.valor_estimado || 0)}</td>
      </tr>
    `).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Reporte Físico de Inventario — ${siglas}</title>
  <style>
    @page { size: letter; margin: 12mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; font-size: 9px; color: #111; background: #fff; }
    h1 { font-size: 13px; font-weight: 800; text-transform: uppercase; margin: 0; }
    h2 { font-size: 10px; font-weight: 600; color: #4B5563; margin: 2px 0 0 0; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00716A; padding-bottom: 10px; margin-bottom: 10px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo-box { width: 50px; height: 50px; object-fit: contain; }
    .logo-placeholder { width: 50px; height: 50px; background: #00716A; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; border-radius: 4px; }
    .header-right { text-align: right; font-size: 8px; color: #4B5563; }
    .meta-table { width: 100%; border-collapse: collapse; border: 1px solid #D1D5DB; margin-bottom: 10px; }
    .meta-table td { padding: 3px 6px; font-size: 8px; border: 1px solid #D1D5DB; }
    .meta-table td:first-child { background: #F9FAFB; font-weight: 700; width: 18%; }
    .report-table { width: 100%; border-collapse: collapse; }
    .report-table thead tr { background: #F3F4F6; }
    .report-table th { padding: 4px 6px; font-size: 8px; font-weight: 700; text-transform: uppercase; border: 1px solid #D1D5DB; color: #374151; }
    .report-table tbody tr { page-break-inside: avoid; }
    .report-table thead { display: table-header-group; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      ${logoSrc
        // eslint-disable-next-line @next/next/no-img-element
        ? `<img src="${logoSrc}" alt="Logo" class="logo-box"/>`
        : `<div class="logo-placeholder">${siglas}</div>`}
      <div>
        <h1>${nombre}</h1>
        <h2>Departamento de Informática</h2>
      </div>
    </div>
    <div class="header-right">
      <div><strong>Documento:</strong> Reporte Físico de Inventario</div>
      <div><strong>Fecha de Emisión:</strong> ${fecha}</div>
      <div><strong>Hora:</strong> ${hora}</div>
    </div>
  </div>

  <table class="meta-table">
    <tbody>
      <tr>
        <td>Filtros Aplicados:</td>
        <td>${filtersText}</td>
      </tr>
      <tr>
        <td>Total de Bienes:</td>
        <td>${sumaReporte.totalItems} unidades</td>
      </tr>
      <tr>
        <td>Valor Patrimonial:</td>
        <td><strong>${valorFmt.format(sumaReporte.valorTotal)}</strong></td>
      </tr>
    </tbody>
  </table>

  <table class="report-table">
    <thead>
      <tr>
        <th>Código / Serie</th>
        <th>Nombre del Bien</th>
        <th>Ubicación / Área</th>
        <th>Depto. / Coordinación</th>
        <th>Estado</th>
        <th style="text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=700');
    if (!printWin) {
      alert('El navegador bloqueó la ventana emergente. Por favor, permite ventanas emergentes para este sitio.');
      return;
    }
    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.focus();
    // Esperar a que carguen imágenes antes de imprimir
    printWin.onload = () => {
      printWin.print();
      printWin.close();
    };
    // Fallback por si onload no dispara
    setTimeout(() => {
      try { printWin.print(); printWin.close(); } catch(e) { /* ya cerrada */ }
    }, 800);
  };

  return (
    <div className="reportes-panel-container" style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      {/* ── CABECERA DEL PANEL ─────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }} className="no-print">
        <div>
          <div className="content-panel-label">Auditoría y Fiscalización</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 4 }}>
            Reportes e Historial Clínico
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Visualiza el expediente y ciclo de vida de un activo o exporta listados del inventario.
          </p>
        </div>

        {/* Sub-Pestañas */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <button
            onClick={() => setActiveTab('hoja-vida')}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid ' + (activeTab === 'hoja-vida' ? 'var(--primary)' : 'transparent'),
              background: activeTab === 'hoja-vida' ? 'rgba(13, 148, 136, 0.1)' : 'transparent',
              color: activeTab === 'hoja-vida' ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: activeTab === 'hoja-vida' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            📋 Hoja de Vida de un Bien
          </button>
          <button
            onClick={() => setActiveTab('generador')}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid ' + (activeTab === 'generador' ? 'var(--primary)' : 'transparent'),
              background: activeTab === 'generador' ? 'rgba(13, 148, 136, 0.1)' : 'transparent',
              color: activeTab === 'generador' ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: activeTab === 'generador' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            📊 Generador de Reportes
          </button>
          <button
            onClick={() => setActiveTab('estadisticas')}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid ' + (activeTab === 'estadisticas' ? 'var(--primary)' : 'transparent'),
              background: activeTab === 'estadisticas' ? 'rgba(13, 148, 136, 0.1)' : 'transparent',
              color: activeTab === 'estadisticas' ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: activeTab === 'estadisticas' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            📊 Estadísticas e Indicadores
          </button>
        </div>
      </div>

      {/* ── PESTAÑA: HOJA DE VIDA DE BIEN ─────────────────────── */}
      {activeTab === 'hoja-vida' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
          {/* Selector de Bien */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
          }} className="no-print">
            <label className="form-label" style={{ marginBottom: 10 }}>Buscar Bien Tecnológico (Código, Serie o Modelo)</label>
            <div style={{ position: 'relative', maxWidth: 500 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Escribe para buscar... Ej. 3194000 o Latitude"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {bienesSugeridos.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  marginTop: 4,
                  boxShadow: 'var(--shadow-dropdown)',
                  zIndex: 10,
                  overflow: 'hidden'
                }}>
                  {bienesSugeridos.map(bien => (
                    <div
                      key={bien.id}
                      onClick={() => handleSelectBien(bien)}
                      style={{
                        padding: '10px 14px',
                        fontSize: 12,
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-light)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      className="hover-highlight"
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bien.nombre}</span>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: 8, fontSize: 11 }}>Serie: {bien.serial}</span>
                      </div>
                      <span className="tag-code">{bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Historial Timeline */}
          {loadingDetalle ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              <div className="dash-pulse" style={{ margin: '0 auto 12px', width: 12, height: 12 }}></div>
              <div>Cargando expediente completo...</div>
            </div>
          ) : bienDetalle ? (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: 28,
              width: '100%'
            }} className="printable-report-area">
              
              {/* Encabezado del Reporte de Ficha */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Expediente Técnico e Historial Clínico
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                    {bienDetalle.marca} {bienDetalle.modelo}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Categoría: {bienDetalle.categoria?.nombre || 'General'} | No. de Inventario: <strong>{bienDetalle.codigo_inventario.startsWith('SIN-NUMERO-') ? 'S/N' : bienDetalle.codigo_inventario}</strong>
                  </div>
                </div>
                <button className="btn btn-ghost no-print" onClick={handlePrint}>
                  🖨️ Imprimir Hoja de Vida
                </button>
              </div>

              {/* Grid de Resumen Técnico */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                background: 'var(--bg-body)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Número de Serie</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, fontFamily: 'monospace' }}>{bienDetalle.numero_serie}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Estado Operativo</div>
                  <div style={{ marginTop: 2 }}><span className={ESTADO_BADGE[bienDetalle.estado] || 'badge'}>{bienDetalle.estado}</span></div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Ubicación Actual</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>🏫 {bienDetalle.ubicacion?.nombre || 'Bodega General'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Valor de Compra</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(bienDetalle.valor_estimado || 0)}</div>
                </div>
              </div>

              {/* Timeline Cronológica */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
                  Línea de Tiempo del Activo
                </h4>
                {timelineEventos.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No se registran eventos en el historial de este bien.</div>
                ) : (
                  <div style={{ position: 'relative', paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {/* Eje de la línea de tiempo */}
                    <div style={{
                      position: 'absolute',
                      left: 11,
                      top: 10,
                      bottom: 10,
                      width: 2,
                      background: 'var(--border)'
                    }}></div>

                    {timelineEventos.map((evento, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        {/* Nodo de la línea de tiempo */}
                        <div style={{
                          position: 'absolute',
                          left: -32,
                          top: 2,
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: evento.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          color: '#FFF',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          zIndex: 1
                        }}>
                          <DynamicIcon name={evento.icono} size={12} />
                        </div>

                        {/* Contenido del evento */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {evento.titulo}
                            </span>
                            <span style={{
                              fontSize: 10.5,
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-body)',
                              padding: '2px 8px',
                              borderRadius: 10,
                              border: '1px solid var(--border)'
                            }}>
                              {new Date(evento.fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: '1.4' }}>
                            {evento.descripcion}
                          </p>
                          {evento.detalles && (
                            <div style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--primary)',
                              marginTop: 4,
                              background: 'rgba(13, 148, 136, 0.05)',
                              padding: '4px 8px',
                              borderRadius: 4,
                              display: 'inline-block'
                            }}>
                              {evento.detalles}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }} className="no-print">
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Ningún bien seleccionado</h3>
              <p style={{ fontSize: 12, marginTop: 4 }}>Busca y selecciona un equipo tecnológico para auditar su historial completo.</p>
            </div>
          )}
        </div>
      )}

      {/* ── PESTAÑA: GENERADOR DE REPORTES ────────────────────── */}
      {activeTab === 'generador' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
          {/* Bloque de Filtros */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }} className="no-print">
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Generar Reporte de Inventario</h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16
            }}>
              {/* Categoría */}
              <div>
                <label className="form-label">Categoría</label>
                <select className="form-select" value={filterCatId} onChange={e => setFilterCatId(e.target.value)}>
                  <option value="">Todas las categorías</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              {/* Ubicación */}
              <div>
                <label className="form-label">Ubicación Física</label>
                <select className="form-select" value={filterUbiId} onChange={e => setFilterUbiId(e.target.value)}>
                  <option value="">Todas las ubicaciones</option>
                  {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>

              {/* Departamento */}
              <div>
                <label className="form-label">Departamento / Coordinación</label>
                <select className="form-select" value={filterDepId} onChange={e => setFilterDepId(e.target.value)}>
                  <option value="">Todos los departamentos y coordinaciones</option>
                  {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>

              {/* Estado */}
              <div>
                <label className="form-label">Estado Operativo</label>
                <select className="form-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
                  <option value="">Todos los estados</option>
                  {ESTADOS_BIEN.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              {/* Programa de Adquisición */}
              <div>
                <label className="form-label">Fondo / Programa</label>
                <select className="form-select" value={filterPrograma} onChange={e => setFilterPrograma(e.target.value)}>
                  <option value="">Todos los programas</option>
                  {listaProgramas.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Acciones de Exportación */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 16, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Se encontraron <strong>{bienesReportados.length}</strong> bienes que coinciden con los filtros aplicados.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={handlePrint}>
                  🖨️ Imprimir Reporte
                </button>
                <button className="btn btn-primary" onClick={handleExportCSV}>
                  📥 Exportar a Excel (CSV)
                </button>
              </div>
            </div>
          </div>

          {/* Reporte de resultados */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            padding: '24px',
            overflow: 'hidden',
            width: '100%'
          }} className="printable-report-area">
            
            {/* Cabecera Oficial Institucional (Visible solo al imprimir) */}
            <div className="print-only" style={{ borderBottom: '2px solid #00716A', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {configuracion?.logo_institucion ? (
                    <img
                      src={configuracion.logo_institucion}
                      alt="Logo Oficial"
                      style={{ width: 60, height: 60, objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{
                      width: 60,
                      height: 60,
                      borderRadius: 4,
                      background: '#00716A',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 800
                    }}>
                      {configuracion?.siglas_institucion || 'UPEN'}
                    </div>
                  )}
                  <div>
                    <h1 style={{ fontSize: 16, fontWeight: 800, color: '#000', margin: 0, textTransform: 'uppercase' }}>
                      {configuracion?.nombre_institucion || 'Universidad Politécnica del Estado'}
                    </h1>
                    <h2 style={{ fontSize: 12, fontWeight: 700, color: '#4B5563', margin: '2px 0 0 0' }}>
                      Departamento de Informática
                    </h2>
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 10, color: '#4B5563' }}>
                  <div><strong>Documento:</strong> Reporte Físico de Inventario</div>
                  <div><strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}</div>
                  <div><strong>Hora:</strong> {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            </div>

            {/* Título de Reporte e Info de Filtros en Pantalla (Ocultos en impresión) */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }} className="no-print">
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Reporte Físico de Control Patrimonial e Inventario</h2>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                Generado el {new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}. Filtros activos: 
                {filterCatId && ' [Categoría]'}
                {filterUbiId && ' [Ubicación]'}
                {filterDepId && ' [Departamento]'}
                {filterEstado && ' [Estado]'}
                {filterPrograma && ' [Programa]'}
                {!filterCatId && !filterUbiId && !filterDepId && !filterEstado && !filterPrograma && ' Ninguno (Inventario Completo)'}
              </div>
            </div>

            {/* Tabla de Metadatos Compacta (Solo visible al imprimir) */}
            <div className="print-only" style={{ marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #D1D5DB', fontSize: '10px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px', border: '1px solid #D1D5DB', background: '#F9FAFB', fontWeight: 'bold', width: '20%' }}>Filtros Aplicados:</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #D1D5DB', width: '80%' }}>
                      <strong>Categoría:</strong> {filterCatName} | &nbsp;
                      <strong>Ubicación:</strong> {filterUbiName} | &nbsp;
                      <strong>Depto./Coord.:</strong> {filterDepName} | &nbsp;
                      <strong>Estado:</strong> {filterEstado || 'Todos'} | &nbsp;
                      <strong>Fondo/Programa:</strong> {filterPrograma || 'Todos'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', border: '1px solid #D1D5DB', background: '#F9FAFB', fontWeight: 'bold' }}>Total de Bienes:</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #D1D5DB' }}>{sumaReporte.totalItems} unidades</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px', border: '1px solid #D1D5DB', background: '#F9FAFB', fontWeight: 'bold' }}>Valor Patrimonial:</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #D1D5DB', fontWeight: 'bold' }}>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(sumaReporte.valorTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* KPI Cards Superiores del Reporte (Ocultos en impresión) */}
            <div className="no-print" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              marginBottom: 24
            }}>
              <div style={{ background: 'var(--bg-body)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total de Bienes</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{sumaReporte.totalItems} unidades</div>
              </div>
              <div style={{ background: 'var(--bg-body)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Valor Patrimonial Acumulado</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(sumaReporte.valorTotal)}</div>
              </div>
            </div>

            {/* Tabla de Resultados */}
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                    <th className="report-th" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Código / Serie</th>
                    <th className="report-th" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Nombre del Bien</th>
                    <th className="report-th" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Ubicación / Área</th>
                    <th className="report-th" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Depto. / Coordinación</th>
                    <th className="report-th" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estado</th>
                    <th className="report-th" style={{ padding: '12px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {bienesReportados.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>
                        No hay bienes que coincidan con los filtros del reporte.
                      </td>
                    </tr>
                  ) : (
                    bienesReportados.map((row, idx) => (
                      <tr
                        key={row.id}
                        style={{ borderBottom: idx === bienesReportados.length - 1 ? 'none' : '1px solid var(--border-light)' }}
                      >
                        <td className="report-td" style={{ padding: '14px 16px', fontSize: 12 }}>
                          <span className="tag-code" style={{ display: 'inline-block' }}>{row.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : row.etiqueta}</span>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 10, marginTop: 2, fontFamily: 'monospace' }}>S/N: {row.serial}</div>
                        </td>
                        <td className="report-td" style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="no-print" style={{ display: 'inline-flex', alignItems: 'center' }}>
                              <DynamicIcon name={row.icono || '💻'} size={14} style={{ color: 'var(--primary)' }} />
                            </span>
                            <span>{row.nombre}</span>
                          </div>
                        </td>
                        <td className="report-td" style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}><span className="no-print">🏫 </span>{row.area || 'Bodega'}</td>
                        <td className="report-td" style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{row.departamento || 'Sin asignar'}</td>
                        <td className="report-td" style={{ padding: '14px 16px', fontSize: 11 }}>
                          <span className={ESTADO_BADGE[row.estado] || 'badge'}>{row.estado}</span>
                        </td>
                        <td className="report-td" style={{ padding: '14px 16px', fontSize: 12, fontWeight: 600, textAlign: 'right', color: 'var(--text-primary)' }}>
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(row.valor_estimado || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PESTAÑA: ESTADÍSTICAS E INDICADORES ───────────────── */}
      {activeTab === 'estadisticas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }} className="printable-report-area">
          {/* Cabecera del Reporte */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Resumen Ejecutivo y Métricas de Control
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                Estadísticas del Patrimonio Tecnológico
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                SICOB — Reporte consolidado de distribución y mantenimiento.
              </p>
            </div>
            <button className="btn btn-ghost no-print" onClick={handlePrint}>
              🖨️ Imprimir Resumen Ejecutivo
            </button>
          </div>

          {/* Grid de KPIs principales */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20
          }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Activos en Operación</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', marginTop: 8 }}>{statsDashboard.activosCount} uds.</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Equipos tecnológicos en circulación</div>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Inversión Patrimonial</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(statsDashboard.totalActivosVal)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Valor total estimado de bienes activos</div>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Inversión en Mantenimiento</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B', marginTop: 8 }}>
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(statsDashboard.gastoMantenimiento)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{statsDashboard.intervencionesCount} intervenciones técnicas concluidas</div>
            </div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Bajas Registradas</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#EF4444', marginTop: 8 }}>{statsDashboard.deBajaCount} uds.</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Equipos dados de baja del inventario</div>
            </div>
          </div>

          {/* Segunda sección: Distribución y Tipo de Servicio */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            {/* Distribución por Categoría */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Distribución por Categoría</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {statsDashboard.distCategorias.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sin bienes asignados por categoría.</div>
                ) : (
                  statsDashboard.distCategorias.map(c => {
                    const maxCount = Math.max(...statsDashboard.distCategorias.map(x => x.count), 1);
                    const pct = (c.count / maxCount) * 100;
                    return (
                      <div key={c.id}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <DynamicIcon name={c.icono} size={13} style={{ color: 'var(--primary)' }} />
                            {c.nombre}
                          </span>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {c.count} uds. | {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(c.valor)}
                          </span>
                        </div>
                        <div style={{ background: 'var(--bg-body, #F3F4F6)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ background: 'var(--primary)', width: `${pct}%`, height: '100%', borderRadius: 4 }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Estado Operativo y Tipo de Mantenimiento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Estado Operativo */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Estado Operativo de Bienes</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {Object.entries(statsDashboard.estadosCount).map(([est, count]) => {
                    let color = 'var(--text-primary)';
                    if (est === 'Activo') color = 'var(--primary)';
                    else if (est === 'En proceso (Taller)') color = '#F59E0B';
                    else if (est === 'Baja') color = '#EF4444';
                    
                    return (
                      <div key={est} style={{ borderLeft: `3px solid ${color}`, paddingLeft: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{est}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: color, marginTop: 2 }}>{count} uds.</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de Mantenimientos */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '20px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Servicios de Mantenimiento Concluidos</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>🛠️ Preventivos (Revisiones):</span>
                    <span style={{ fontWeight: 700, color: '#10B981' }}>{statsDashboard.preventivos} servicios</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>🛠️ Correctivos (Fallas):</span>
                    <span style={{ fontWeight: 700, color: '#EF4444' }}>{statsDashboard.correctivos} servicios</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <span style={{ fontWeight: 600 }}>💰 Costo promedio de intervención:</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(statsDashboard.promMantenimiento)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tercera sección: Top 5 Equipos con Mayor Gasto en Mantenimiento */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              🔍 Equipos con Mayor Gasto Acumulado en Mantenimiento (Top 5)
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table className="inventory-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>No. Inventario / Serie</th>
                    <th>Equipo / Bien</th>
                    <th>Intervenciones</th>
                    <th style={{ textAlign: 'right' }}>Total Invertido</th>
                  </tr>
                </thead>
                <tbody>
                  {statsDashboard.bienesConCostos.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0', fontSize: 12 }}>
                        No se registran intervenciones con costos asignados en el historial.
                      </td>
                    </tr>
                  ) : (
                    statsDashboard.bienesConCostos.map(b => (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{b.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : b.etiqueta}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: 2 }}>S/N: {b.serial}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{b.nombre}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{b.tipo}</div>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 700 }}>🔧 {b.countIntervenciones}</td>
                        <td style={{ fontSize: 13, fontWeight: 700, textAlign: 'right', color: '#EF4444' }}>
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(b.costoAcumulado)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <ModalExportador
          onClose={() => setShowExportModal(false)}
          data={bienesReportados}
          selectedIds={[]}
          configuracion={configuracion}
          type="bienes"
        />
      )}
    </div>
  );
}
