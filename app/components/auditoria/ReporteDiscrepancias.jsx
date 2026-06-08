'use client';
import { useState, useMemo } from 'react';

/**
 * ReporteDiscrepancias — Paso 3 de la Auditoría.
 * Muestra la conciliación final del inventario físico contra el sistema,
 * permitiendo corregir ubicaciones al instante.
 */
export default function ReporteDiscrepancias({ 
  ubicacion, 
  bienes = [], 
  scannedCodes = [], 
  onFixLocation, 
  onFixAll, 
  onReset,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [isFixing, setIsFixing] = useState(false);

  // 1. Obtener bienes esperados en esta ubicación según el sistema (DB)
  const expectedBienes = useMemo(() => {
    return bienes.filter(b => b.ubicacionId === ubicacion.id && !b.eliminado);
  }, [bienes, ubicacion]);

  // 2. Conciliar los datos escaneados
  const reconciliation = useMemo(() => {
    const correctos = [];
    const desubicados = [];
    const noRegistrados = [];
    
    // Conjunto para llevar control de los IDs de bienes que sí encontramos físicamente
    const scannedAssetIds = new Set();
    const processedCodes = new Set();

    scannedCodes.forEach(code => {
      const upperCode = code.toUpperCase().trim();
      if (processedCodes.has(upperCode)) return;
      processedCodes.add(upperCode);

      // Buscar si el código coincide con algún bien del sistema (por etiqueta o serie)
      const match = bienes.find(b => 
        !b.eliminado && 
        ((b.codigo_inventario && b.codigo_inventario.toUpperCase() === upperCode) || 
         (b.numero_serie && b.numero_serie.toUpperCase() === upperCode))
      );

      if (match) {
        scannedAssetIds.add(match.id);
        if (match.ubicacionId === ubicacion.id) {
          correctos.push(match);
        } else {
          desubicados.push(match);
        }
      } else {
        noRegistrados.push(code);
      }
    });

    // 3. Determinar los bienes faltantes (esperados pero no escaneados)
    const faltantes = expectedBienes.filter(b => !scannedAssetIds.has(b.id));

    return {
      correctos,
      desubicados,
      faltantes,
      noRegistrados
    };
  }, [bienes, scannedCodes, expectedBienes, ubicacion]);

  const { correctos, desubicados, faltantes, noRegistrados } = reconciliation;

  // Handler para corregir un solo bien
  const handleFixSingle = async (bien) => {
    setIsFixing(true);
    try {
      const res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bien.id, ubicacionId: ubicacion.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar la ubicación');
      
      showToast(`📍 Se actualizó la ubicación de "${bien.nombre}" a ${ubicacion.nombre} ✓`);
      onFixLocation(bien.codigo_inventario);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al corregir ubicación', 'error');
    } finally {
      setIsFixing(false);
    }
  };

  // Handler para corregir todos los desubicados en lote
  const handleFixAll = async () => {
    if (desubicados.length === 0) return;
    setIsFixing(true);
    const ids = desubicados.map(b => b.id);
    try {
      const res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, ubicacionId: ubicacion.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar bienes en lote');
      
      showToast(`📍 Se actualizaron ${ids.length} bienes a la ubicación ${ubicacion.nombre} ✓`);
      onFixAll(desubicados.map(b => b.codigo_inventario));
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error en corrección masiva', 'error');
    } finally {
      setIsFixing(false);
    }
  };

  // Imprimir reporte de discrepancias
  const handlePrint = () => {
    window.print();
  };

  // Estadísticas clave para el resumen
  const pctCorrectos = expectedBienes.length > 0 
    ? Math.round((correctos.length / expectedBienes.length) * 100) 
    : 0;

  return (
    <div className="fade-in" style={{ padding: '10px 0' }}>
      
      {/* Cabecera del Reporte */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: 20,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
      }} className="report-header-print">
        <div>
          <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conciliación de Inventario</span>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '2px 0 0', color: 'var(--text-primary)' }}>
            Reporte de Discrepancias: {ubicacion.nombre}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
            Fecha de auditoría: <strong>{new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}</strong> | Responsable de área: <strong>{ubicacion.encargado || 'Sin asignar'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }} className="no-print">
          <button className="btn btn-ghost" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            🖨️ Imprimir Reporte
          </button>
          <button className="btn btn-primary" onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            🔄 Nueva Auditoría
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: 16, 
        marginBottom: 24 
      }} className="kpi-grid-print">
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="stat-label">Bienes Esperados</div>
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{expectedBienes.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>Según base de datos</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '4px solid #10B981' }}>
          <div className="stat-label" style={{ color: '#10B981', fontWeight: 700 }}>Bienes Correctos</div>
          <div className="stat-value" style={{ color: '#10B981' }}>{correctos.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>{pctCorrectos}% del esperado</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '4px solid #F59E0B' }}>
          <div className="stat-label" style={{ color: '#F59E0B', fontWeight: 700 }}>Fuera de Área</div>
          <div className="stat-value" style={{ color: '#F59E0B' }}>{desubicados.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>Pertenecen a otro espacio</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '4px solid #EF4444' }}>
          <div className="stat-label" style={{ color: '#EF4444', fontWeight: 700 }}>Faltantes</div>
          <div className="stat-value" style={{ color: '#EF4444' }}>{faltantes.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>No se encontraron físicamente</div>
        </div>
      </div>

      {/* Tabs de Detalle */}
      <div className="tabs no-print" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', marginBottom: 20, paddingBottom: 1 }}>
        <button 
          className={`tab-item${activeTab === 'resumen' ? ' active' : ''}`}
          onClick={() => setActiveTab('resumen')}
          style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeTab === 'resumen' ? '2px solid var(--primary)' : 'none', color: activeTab === 'resumen' ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          📊 Resumen y Análisis
        </button>
        <button 
          className={`tab-item${activeTab === 'correctos' ? ' active' : ''}`}
          onClick={() => setActiveTab('correctos')}
          style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeTab === 'correctos' ? '2px solid var(--primary)' : 'none', color: activeTab === 'correctos' ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          ✅ Correctos ({correctos.length})
        </button>
        <button 
          className={`tab-item${activeTab === 'desubicados' ? ' active' : ''}`}
          onClick={() => setActiveTab('desubicados')}
          style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeTab === 'desubicados' ? '2px solid var(--primary)' : 'none', color: activeTab === 'desubicados' ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          ⚠️ Ubicación Incorrecta ({desubicados.length})
        </button>
        <button 
          className={`tab-item${activeTab === 'faltantes' ? ' active' : ''}`}
          onClick={() => setActiveTab('faltantes')}
          style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeTab === 'faltantes' ? '2px solid var(--primary)' : 'none', color: activeTab === 'faltantes' ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          ❌ Faltantes ({faltantes.length})
        </button>
        {noRegistrados.length > 0 && (
          <button 
            className={`tab-item${activeTab === 'noregistrados' ? ' active' : ''}`}
            onClick={() => setActiveTab('noregistrados')}
            style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, border: 'none', background: 'transparent', cursor: 'pointer', borderBottom: activeTab === 'noregistrados' ? '2px solid var(--primary)' : 'none', color: activeTab === 'noregistrados' ? 'var(--primary)' : 'var(--text-secondary)' }}
          >
            ❓ No Registrados ({noRegistrados.length})
          </button>
        )}
      </div>

      {/* Contenido Impresión o Pestaña Activa */}
      <div className="report-content-print">

        {/* 1. SECCIÓN: RESUMEN (Gráfica de Barra de Conciliación + Conclusión) */}
        {(activeTab === 'resumen' || typeof window === 'undefined') && (
          <div className="print-section" style={{ display: activeTab === 'resumen' ? 'block' : 'none' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)' }}>
                Estado General del Espacio
              </h3>
              
              {/* Barra de Progreso Acumulada */}
              <div style={{ display: 'flex', height: 24, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-body)', border: '1px solid var(--border)', marginBottom: 20 }}>
                {correctos.length > 0 && (
                  <div style={{ 
                    width: `${(correctos.length / (correctos.length + desubicados.length + faltantes.length)) * 100}%`,
                    background: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontSize: 10,
                    fontWeight: 700
                  }}>
                    {correctos.length} Correctos
                  </div>
                )}
                {desubicados.length > 0 && (
                  <div style={{ 
                    width: `${(desubicados.length / (correctos.length + desubicados.length + faltantes.length)) * 100}%`,
                    background: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontSize: 10,
                    fontWeight: 700
                  }}>
                    {desubicados.length} Fuera de Área
                  </div>
                )}
                {faltantes.length > 0 && (
                  <div style={{ 
                    width: `${(faltantes.length / (correctos.length + desubicados.length + faltantes.length)) * 100}%`,
                    background: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFF',
                    fontSize: 10,
                    fontWeight: 700
                  }}>
                    {faltantes.length} Faltantes
                  </div>
                )}
              </div>

              {/* Diagnóstico Escrito */}
              <div style={{ padding: 16, background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Diagnóstico Operativo
                </h4>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {faltantes.length === 0 && desubicados.length === 0 ? (
                    <span>🎉 **¡Excelente! El inventario físico coincide 100% con los registros del sistema.** Todos los bienes esperados están presentes y no hay equipos intrusos de otras áreas en este espacio.</span>
                  ) : (
                    <span>Se detectaron discrepancias en este espacio. Hay **{faltantes.length}** equipos faltantes que figuran en el sistema pero no fueron ubicados físicamente, y **{desubicados.length}** equipos presentes que legalmente pertenecen a otras ubicaciones. {desubicados.length > 0 && 'Se recomienda reubicar o corregir la ubicación de los equipos intrusos en el sistema usando el botón de Conciliación Rápida.'}</span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Si estamos imprimiendo, forzar el desglose de tablas abajo del resumen */}
            <div className="print-tables-container-inside" style={{ display: 'none' }}>
              {/* Se inserta por css en @media print */}
            </div>
          </div>
        )}

        {/* 2. SECCIÓN: CORRECTOS */}
        {(activeTab === 'correctos' || typeof window === 'undefined') && (
          <div className="print-section" style={{ display: activeTab === 'correctos' ? 'block' : 'none', marginBottom: 24 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 14px', color: 'var(--text-primary)' }}>
                Equipos Físicos en Ubicación Correcta ({correctos.length})
              </h3>
              
              {correctos.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                  No hay equipos registrados en esta ubicación confirmados físicamente.
                </div>
              ) : (
                <table className="inventory-table" style={{ width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', width: '22%' }}>Código de Inventario</th>
                      <th style={{ textAlign: 'left' }}>Equipo</th>
                      <th style={{ textAlign: 'left', width: '20%' }}>Marca y Modelo</th>
                      <th style={{ textAlign: 'left', width: '20%' }}>No. de Serie</th>
                      <th style={{ textAlign: 'left', width: '15%' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correctos.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {b.codigo_inventario.startsWith('SIN-NUMERO-') ? 'S/N' : b.codigo_inventario}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.nombre}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Categoría: {b.categoria?.nombre || 'General'}</div>
                        </td>
                        <td>{b.marca} {b.modelo}</td>
                        <td style={{ fontFamily: 'monospace' }}>{b.numero_serie || 'N/S'}</td>
                        <td>
                          <span className={`badge ${b.estado === 'Activo' ? 'badge-active' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                            {b.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* 3. SECCIÓN: DESUBICADOS (Otra Área) */}
        {(activeTab === 'desubicados' || typeof window === 'undefined') && (
          <div className="print-section" style={{ display: activeTab === 'desubicados' ? 'block' : 'none', marginBottom: 24 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }} className="no-print">
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Equipos que Pertenecen a Otra Ubicación ({desubicados.length})
                </h3>
                {desubicados.length > 0 && (
                  <button
                    onClick={handleFixAll}
                    disabled={isFixing}
                    className="btn btn-primary"
                    style={{
                      fontSize: 11,
                      padding: '6px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'var(--warning)',
                      borderColor: 'var(--warning)',
                      color: '#0F172A',
                      fontWeight: 700
                    }}
                  >
                    📍 Conciliar Todos a {ubicacion.nombre}
                  </button>
                )}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 14px', color: 'var(--text-primary)' }} className="print-only">
                Equipos de Otra Ubicación Presentes ({desubicados.length})
              </h3>
              
              {desubicados.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                  No se detectó ningún equipo intruso de otra área.
                </div>
              ) : (
                <table className="inventory-table" style={{ width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', width: '20%' }}>Código de Inventario</th>
                      <th style={{ textAlign: 'left' }}>Equipo</th>
                      <th style={{ textAlign: 'left', width: '18%' }}>Marca/Modelo</th>
                      <th style={{ textAlign: 'left', width: '22%' }}>📍 Ubicación en Sistema</th>
                      <th style={{ textAlign: 'center', width: '15%' }} className="no-print">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desubicados.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {b.codigo_inventario.startsWith('SIN-NUMERO-') ? 'S/N' : b.codigo_inventario}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.nombre}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>S/N: {b.numero_serie}</div>
                        </td>
                        <td>{b.marca} {b.modelo}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#F59E0B' }}>
                            ⚠️ {b.ubicacion?.nombre || 'Bodega'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }} className="no-print">
                          <button
                            onClick={() => handleFixSingle(b)}
                            disabled={isFixing}
                            className="btn btn-ghost"
                            style={{
                              fontSize: 10,
                              padding: '4px 10px',
                              borderColor: 'var(--border)',
                              fontWeight: 600,
                              color: 'var(--primary)'
                            }}
                          >
                            Trasladar aquí
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* 4. SECCIÓN: FALTANTES */}
        {(activeTab === 'faltantes' || typeof window === 'undefined') && (
          <div className="print-section" style={{ display: activeTab === 'faltantes' ? 'block' : 'none', marginBottom: 24 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 14px', color: 'var(--text-primary)' }}>
                Equipos Faltantes (No encontrados físicamente) ({faltantes.length})
              </h3>
              
              {faltantes.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#10B981', fontSize: 12.5, fontWeight: 600 }}>
                  🎉 ¡Genial! No falta ningún bien en la verificación física.
                </div>
              ) : (
                <table className="inventory-table" style={{ width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', width: '22%' }}>Código de Inventario</th>
                      <th style={{ textAlign: 'left' }}>Equipo</th>
                      <th style={{ textAlign: 'left', width: '20%' }}>Marca y Modelo</th>
                      <th style={{ textAlign: 'left', width: '20%' }}>No. de Serie</th>
                      <th style={{ textAlign: 'left', width: '15%' }}>Estado Registrado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faltantes.map(b => (
                      <tr key={b.id} style={{ opacity: 0.85 }}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#EF4444' }}>
                          {b.codigo_inventario.startsWith('SIN-NUMERO-') ? 'S/N' : b.codigo_inventario}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.nombre}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Categoría: {b.categoria?.nombre || 'General'}</div>
                        </td>
                        <td>{b.marca} {b.modelo}</td>
                        <td style={{ fontFamily: 'monospace' }}>{b.numero_serie || 'N/S'}</td>
                        <td>
                          <span className={`badge ${b.estado === 'Activo' ? 'badge-active' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                            {b.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* 5. SECCIÓN: NO REGISTRADOS */}
        {noRegistrados.length > 0 && activeTab === 'noregistrados' && (
          <div className="print-section no-print" style={{ display: 'block', marginBottom: 24 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 14px', color: 'var(--text-primary)' }}>
                Códigos Escaneados No Registrados en el Sistema ({noRegistrados.length})
              </h3>
              
              <div style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginBottom: 16,
                lineHeight: 1.5
              }}>
                ℹ️ Los siguientes códigos de barras o números de serie fueron detectados por el lector pero no coinciden con ningún bien registrado en la base de datos de <strong>GDI UPEN</strong>. Puedes registrar un nuevo bien o verificar si la etiqueta está maltratada.
              </div>

              <table className="inventory-table" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Código / Serie Escaneado</th>
                    <th style={{ textAlign: 'center', width: '25%' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {noRegistrados.map((code, idx) => (
                    <tr key={`${code}-${idx}`}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#8B5CF6' }}>
                        {code}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          Usa la opción "+ Nuevo bien" en la cabecera e ingresa este código.
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Firma de Autorización para Reporte Físico de Auditoría */}
      <div className="print-only signature-area" style={{ display: 'none', marginTop: 40, justifyContent: 'space-between', padding: '0 40px' }}>
        <div style={{ textAlign: 'center', width: '40%' }}>
          <div style={{ height: 60, borderBottom: '1px solid #000' }}></div>
          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6 }}>Firma Técnico Auditor</div>
          <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>Auditor de Bienes Informáticos</div>
        </div>
        <div style={{ textAlign: 'center', width: '40%' }}>
          <div style={{ height: 60, borderBottom: '1px solid #000' }}></div>
          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6 }}>Firma Responsable de Área</div>
          <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{ubicacion.encargado || 'Encargado de Espacio'}</div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .main-content, .main-content * {
            visibility: hidden;
          }
          .report-header-print, .report-header-print * {
            visibility: visible;
          }
          .kpi-grid-print, .kpi-grid-print * {
            visibility: visible;
          }
          .report-content-print, .report-content-print * {
            visibility: visible;
          }
          .signature-area, .signature-area * {
            visibility: visible;
            display: flex !important;
          }
          
          /* Forzar layouts de impresión limpios */
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .report-header-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 0 16px 0 !important;
            border-bottom: 2px solid #333 !important;
          }
          .kpi-grid-print {
            position: absolute;
            left: 0;
            top: 100px;
            width: 100%;
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 12px !important;
          }
          .report-content-print {
            position: absolute;
            left: 0;
            top: 220px;
            width: 100%;
          }
          .print-section {
            display: block !important;
            page-break-inside: avoid;
            margin-bottom: 30px !important;
          }
          .print-section table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 10px;
          }
          .print-section th, .print-section td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
            font-size: 10pt !important;
          }
          .print-section th {
            background-color: #f5f5f5 !important;
            color: #000 !important;
          }
          .stat-card {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            padding: 10px !important;
          }
        }
      `}</style>

    </div>
  );
}
