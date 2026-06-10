'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';

/**
 * ResguardosPanel — Gestor Profesional de Resguardos Colectivos e Individuales
 * Agrupa los bienes asignados por custodio (empleado) y presenta un listado completo.
 * Permite visualizar el Acta de Resguardo Colectivo Oficial en una modal interactiva
 * optimizada para impresión multipágina (PDF), simular la firma de conformidad
 * y desasignar (devolver a bodega) bienes de forma individual en tiempo real.
 */
export default function ResguardosPanel({ bienes, showToast, refreshBienes, configuracion = {}, activeCustodioId, onClearActiveCustodio }) {
  const [search, setSearch] = useState('');
  const [selectedCustodio, setSelectedCustodio] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [signatureFont, setSignatureFont] = useState('cursive');
  const [processingUnassignId, setProcessingUnassignId] = useState(null);

  // Estados Mobiliario
  const [resguardoTipo, setResguardoTipo] = useState('tecnologico'); // 'tecnologico' | 'mobiliario'
  const [inmobiliarios, setInmobiliarios] = useState([]);
  const [loadingInmob, setLoadingInmob] = useState(false);

  const fetchInmobiliarios = useCallback(async () => {
    setLoadingInmob(true);
    try {
      const res = await fetch(`/api/inmobiliario?_=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setInmobiliarios(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInmob(false);
    }
  }, []);

  useEffect(() => {
    if (resguardoTipo === 'mobiliario') {
      fetchInmobiliarios();
    }
  }, [resguardoTipo, fetchInmobiliarios]);

  // Agrupar los bienes que tienen un responsable activo por cada empleado/custodio
  const custodiosConResguardos = useMemo(() => {
    const map = {};
    const list = resguardoTipo === 'tecnologico' 
      ? bienes 
      : inmobiliarios.map(i => ({
          id: i.id,
          codigo_inventario: i.codigo_inventario,
          etiqueta: i.codigo_inventario || '',
          marca: i.marca || 'S/M',
          modelo: i.modelo || 'S/M',
          serial: (i.marca && i.modelo) ? `${i.marca} / ${i.modelo}` : (i.marca || i.modelo || 'S/M'),
          descripcion: i.descripcion,
          nombre: i.descripcion,
          tipo: i.categoriaInmobiliario?.nombre || 'Mobiliario',
          estado: i.estado,
          area: i.ubicacion?.nombre || 'Desconocida',
          valor_estimado: i.valor_estimado || 0,
          responsable: i.personal?.nombre,
          responsableId: i.personal?.id,
          departamento: i.departamento?.nombre || 'Sin departamento',
          icono: i.categoriaInmobiliario?.icono || '🪑',
          fecha_adquisicion: i.fecha_adquisicion
        }));

    list.forEach(b => {
      if (b.responsableId && b.responsable && b.responsable !== 'Sin asignar') {
        const cId = String(b.responsableId);
        if (!map[cId]) {
          map[cId] = {
            id: b.responsableId,
            nombre: b.responsable,
            departamento: b.departamento || 'Sin departamento',
            bienes: [],
            totalValor: 0,
            fechaReciente: null
          };
        }
        map[cId].bienes.push(b);
        map[cId].totalValor += (b.valor_estimado || 0);

        const fechaAdq = b.fecha_adquisicion ? new Date(b.fecha_adquisicion) : null;
        if (fechaAdq) {
          if (!map[cId].fechaReciente || fechaAdq > map[cId].fechaReciente) {
            map[cId].fechaReciente = fechaAdq;
          }
        }
      }
    });

    // Convertir a listado filtrado por el buscador
    return Object.values(map).filter(c => {
      const q = search.toLowerCase();
      return (
        c.nombre.toLowerCase().includes(q) ||
        c.departamento.toLowerCase().includes(q)
      );
    });
  }, [bienes, inmobiliarios, resguardoTipo, search]);

  // Si hay un custodio seleccionado, mantener sus bienes actualizados al recargar bienes
  const activeCustodioDetails = useMemo(() => {
    if (!selectedCustodio) return null;
    return custodiosConResguardos.find(c => String(c.id) === String(selectedCustodio.id)) || null;
  }, [custodiosConResguardos, selectedCustodio]);

  // Sincronizar custodio activo externo (desde Ficha Técnica)
  useEffect(() => {
    let active = true;
    if (activeCustodioId) {
      const match = custodiosConResguardos.find(c => String(c.id) === String(activeCustodioId));
      if (match) {
        Promise.resolve().then(() => {
          if (active) {
            setSelectedCustodio(match);
          }
        });
      }
    }
    return () => {
      active = false;
    };
  }, [activeCustodioId, custodiosConResguardos]);

  const handleOpenFicha = (custodio) => {
    setSelectedCustodio(custodio);
    setIsSigned(false);
    setTypedName('');
  };

  // Simular la firma del acta colectiva
  const handleSaveSignature = (e) => {
    e.preventDefault();
    if (!typedName.trim()) return;
    setIsSigned(true);
    setShowSignModal(false);
    if (showToast) showToast('¡Acta de resguardo colectivo firmada digitalmente!', 'success');
  };

  // Desasignar (retornar a bodega) un bien en tiempo real
  const handleUnassignBien = async (bienId, bienNombre) => {
    if (!confirm(`¿Estás seguro de desasignar el equipo "${bienNombre}" y devolverlo a bodega?`)) return;
    setProcessingUnassignId(bienId);
    try {
      const res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bienId, responsableId: null, estado: 'En reserva' }) // responsableId en null desasigna y cambia estado a En reserva
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al desasignar el bien');

      if (showToast) showToast(`"${bienNombre}" devuelto a bodega con éxito ✓`);
      
      // Refrescar datos en el componente principal
      if (refreshBienes) await refreshBienes();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al desasignar');
    } finally {
      setProcessingUnassignId(null);
    }
  };

  // Desasignar un mobiliario en tiempo real
  const handleUnassignInmobiliario = async (id, desc) => {
    if (!confirm(`¿Estás seguro de desasignar el mobiliario "${desc}" y devolverlo a bodega?`)) return;
    setProcessingUnassignId(id);
    try {
      const res = await fetch('/api/inmobiliario', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, personalId: null, estado: 'Bodega' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al desasignar el mobiliario');

      if (showToast) showToast(`"${desc}" devuelto a bodega con éxito ✓`);
      await fetchInmobiliarios();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al desasignar el mobiliario');
    } finally {
      setProcessingUnassignId(null);
    }
  };

  const handlePrintPDF = () => {
    if (showToast) showToast('Preparando documento oficial para impresión PDF...', 'info');
    setTimeout(() => {
      window.print();
    }, 800);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val);
  };

  const generateResguardoCode = (custodio) => {
    if (!custodio) return '';
    const initials = custodio.nombre
      .split(' ')
      .filter(w => w.length > 2)
      .map(w => w.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 3);
    const year = new Date().getFullYear();
    return `RESG-${initials}-${year}-${custodio.id.toString().padStart(3, '0')}`;
  };

  return (
    <div className="fade-in resguardos-panel-container" style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      
      {/* ══ CABECERA DE CONTROL DE RESGUARDOS ════════════════ */}
      <div className="no-print" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="content-panel-label">Control Operativo Patrimonial</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 4 }}>
              Fichas de Resguardo Colectivo
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              Administra y visualiza el resguardo unificado y actas del personal universitario con equipos a su cargo.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>{custodiosConResguardos.length}</strong> custodio{custodiosConResguardos.length !== 1 ? 's' : ''} activo{custodiosConResguardos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Selector de Tipo de Resguardo */}
        <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginTop: 4 }}>
          <button 
            type="button"
            className={`btn ${resguardoTipo === 'tecnologico' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: resguardoTipo === 'tecnologico' ? 'none' : '1px solid var(--border)' }}
            onClick={() => {
              setResguardoTipo('tecnologico');
              setSelectedCustodio(null);
            }}
          >
            <span>💻</span> Resguardos Tecnológicos
          </button>
          <button 
            type="button"
            className={`btn ${resguardoTipo === 'mobiliario' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: resguardoTipo === 'mobiliario' ? 'none' : '1px solid var(--border)' }}
            onClick={() => {
              setResguardoTipo('mobiliario');
              setSelectedCustodio(null);
            }}
          >
            <span>🪑</span> Resguardos de Mobiliario
          </button>
        </div>

        {/* Buscador */}
        <div className="search-input-wrap" style={{ position: 'relative', width: '100%' }}>
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Buscar custodio por nombre o departamento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 42, paddingLeft: 38 }}
          />
        </div>
      </div>

      {/* ══ LISTADO DE CUSTODIOS A PANTALLA COMPLETA ═══════════ */}
      <div className="no-print" style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: '24px'
      }}>
        {custodiosConResguardos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>No se encontraron custodios activos</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>
              Asegúrate de que el personal tenga equipos asignados bajo su resguardo activo.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {custodiosConResguardos.map(c => {
              const totalEquipos = c.bienes.length;
              return (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--bg-body)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    transition: 'all 0.2s',
                  }}
                  className="stat-card"
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'rgba(13, 148, 136, 0.1)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {c.nombre.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{c.nombre}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>🏢 {c.departamento}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-card)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Bienes asignados</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, color: 'var(--primary)' }}>{totalEquipos} equipo{totalEquipos !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Valor en custodia</div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{formatCurrency(c.totalValor)}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenFicha(c)}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: 12 }}
                  >
                    👁️ Ver Acta de Resguardo Colectivo
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ VENTANA MODAL: ACTA DE RESGUARDO COLECTIVO ═══════ */}
      {activeCustodioDetails && (
        <div className="modal-overlay" onClick={() => { setSelectedCustodio(null); onClearActiveCustodio && onClearActiveCustodio(); }} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 120 }}>
          <div
            className="modal-box fade-in"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: 900,
              width: '95%',
              maxHeight: 'calc(100vh - 80px)',
              marginTop: '40px',
              marginBottom: '40px',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              background: '#FFFFFF',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden'
            }}
          >
            {/* Header del modal (No imprimible) */}
            <div className="no-print" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-card)'
            }}>
              <div>
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📋</span> Acta de Resguardo Colectivo
                </div>
                <div className="modal-sub">Visualización y control patrimonial del custodio</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handlePrintPDF} className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
                  🖨️ Exportar Acta (PDF)
                </button>
                {!isSigned ? (
                  <button onClick={() => setShowSignModal(true)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                    ✍️ Firmar Conformidad
                  </button>
                ) : (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: '#10B981',
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    ✓ Resguardo Firmado
                  </span>
                )}
                <button className="btn-icon" onClick={() => { setSelectedCustodio(null); onClearActiveCustodio && onClearActiveCustodio(); }} style={{ border: 'none', background: 'transparent' }}>✕</button>
              </div>
            </div>

            {/* Contenedor con scroll para el Cuerpo del Acta */}
            <div className="print-scroll-override" style={{ flex: 1, overflowY: 'auto' }}>
              {/* CUERPO DEL ACTA OFICIAL (Optimizado para impresión multipágina) */}
              <div id="print-area" style={{
              padding: '48px',
              background: '#FFFFFF',
              color: '#111827',
              fontFamily: '"Outfit", "Inter", sans-serif',
              minHeight: '650px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              {/* Encabezado Membretado */}
              <div style={{ borderBottom: '3px double #111827', paddingBottom: 16, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {configuracion.logo_institucion ? (
                      <div style={{
                        width: 50,
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        background: '#FFFFFF',
                        borderRadius: '6px',
                        flexShrink: 0
                      }}>
                        <img src={configuracion.logo_institucion} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div style={{ fontSize: 44 }}>🎓</div>
                    )}
                    <div>
                      <h1 style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#111827' }}>
                        {configuracion.nombre_institucion || 'Universidad Politécnica del Estado'} ({configuracion.siglas_institucion || 'UPEN'})
                      </h1>
                      <p style={{ fontSize: 10, color: '#4B5563', fontWeight: 600, marginTop: 2 }}>
                        Dirección de Administración Patrimonial y Control de Bienes Universitarios
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#6B7280' }}>Código de Resguardo Colectivo</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginTop: 2, fontFamily: 'monospace' }}>
                      {generateResguardoCode(activeCustodioDetails)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Título Oficial */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'underline' }}>
                  {resguardoTipo === 'tecnologico' 
                    ? 'ACTA DE RESGUARDO COLECTIVO DE BIENES TECNOLÓGICOS' 
                    : 'ACTA DE RESGUARDO COLECTIVO DE MOBILIARIO E INMOBILIARIO'}
                </h2>
              </div>

              {/* Declaración Legal de Custodia */}
              <div style={{ fontSize: 11.5, lineHeight: 1.6, color: '#1F2937', marginBottom: 20 }}>
                <p style={{ textIndent: '24px' }}>
                  {resguardoTipo === 'tecnologico'
                    ? 'Por medio de la presente acta oficial de inventario, se hace constar la entrega física, resguardo administrativo e incorporación bajo responsabilidad patrimonial del personal universitario cuyos datos generales se detallan a continuación. El firmante declara haber recibido de conformidad los bienes informáticos, electrónicos y tecnológicos que se enlistan en este documento, comprometiéndose a velar por su adecuado uso técnico, conservación e integridad dentro de la institución académica.'
                    : 'Por medio de la presente acta oficial de inventario, se hace constar la entrega física, resguardo administrativo e incorporación bajo responsabilidad patrimonial del personal universitario cuyos datos generales se detallan a continuación. El firmante declara haber recibido de conformidad los bienes de mobiliario e inmobiliario que se enlistan en este documento, comprometiéndose a velar por su adecuado uso, conservación e integridad dentro de la institución académica.'}
                </p>
              </div>

              {/* Datos del Custodio */}
              <div style={{
                background: '#F9FAFB',
                border: '1px solid #D1D5DB',
                borderRadius: 6,
                padding: '16px 20px',
                marginBottom: 24,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px 24px',
                fontSize: 12
              }}>
                <div>
                  <span style={{ color: '#4B5563', fontWeight: 500 }}>Nombre del Custodio:</span>
                  <div style={{ fontWeight: 700, marginTop: 2, fontSize: 13 }}>{activeCustodioDetails.nombre}</div>
                </div>
                <div>
                  <span style={{ color: '#4B5563', fontWeight: 500 }}>Departamento Administrativo:</span>
                  <div style={{ fontWeight: 700, marginTop: 2, fontSize: 13 }}>{activeCustodioDetails.departamento}</div>
                </div>
                <div>
                  <span style={{ color: '#4B5563', fontWeight: 500 }}>Identificador en Sistema:</span>
                  <div style={{ fontWeight: 700, marginTop: 2, fontFamily: 'monospace' }}>CUST-{activeCustodioDetails.id.toString().padStart(4, '0')}</div>
                </div>
                <div>
                  <span style={{ color: '#4B5563', fontWeight: 500 }}>Estatus de Resguardo:</span>
                  <div style={{ fontWeight: 700, marginTop: 2, color: '#10B981' }}>✓ Activo (Vigente)</div>
                </div>
              </div>

              {/* TABLA COMPACTA OPTIMIZADA PARA IMPRESIÓN MULTIPÁGINA */}
              <div style={{ flex: 1, marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: '#111827' }}>
                  {resguardoTipo === 'tecnologico'
                    ? `Listado de Bienes Tecnológicos Asignados (${activeCustodioDetails.bienes.length} equipos):`
                    : `Listado de Bienes de Mobiliario e Inmobiliario Asignados (${activeCustodioDetails.bienes.length} piezas):`}
                </div>
                <div style={{ border: '1px solid #D1D5DB', borderRadius: 4, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }} className="print-table-compact">
                    <thead>
                      <tr style={{ background: '#F3F4F6', borderBottom: '1px solid #D1D5DB' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, width: 35, borderRight: '1px solid #D1D5DB' }}>N°</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: 140, borderRight: '1px solid #D1D5DB' }}>Inv. Código</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: 80, borderRight: '1px solid #D1D5DB' }}>Categoría</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, borderRight: '1px solid #D1D5DB' }}>
                          {resguardoTipo === 'tecnologico' ? 'Descripción del Equipo' : 'Descripción del Mobiliario'}
                        </th>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, width: 100, borderRight: '1px solid #D1D5DB' }}>
                          {resguardoTipo === 'tecnologico' ? 'N/S' : 'Marca / Modelo'}
                        </th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, width: 70, borderRight: '1px solid #D1D5DB' }}>Estatus</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, width: 90, borderRight: '1px solid #D1D5DB' }}>Valor Est.</th>
                        <th className="no-print" style={{ padding: '8px 10px', textAlign: 'center', width: 90 }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCustodioDetails.bienes.map((bien, idx) => (
                        <tr
                          key={bien.id}
                          style={{
                            borderBottom: '1px solid #E5E7EB',
                            background: idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                            pageBreakInside: 'avoid' // Evita saltos de página a mitad de una fila
                          }}
                        >
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid #E5E7EB' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600, borderRight: '1px solid #E5E7EB' }}>{bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}</td>
                          <td style={{ padding: '8px 10px', color: '#4B5563', borderRight: '1px solid #E5E7EB' }}>{bien.tipo}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, borderRight: '1px solid #E5E7EB' }}>{bien.nombre}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', borderRight: '1px solid #E5E7EB' }}>{bien.serial}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, borderRight: '1px solid #E5E7EB' }}>{bien.estado}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, borderRight: '1px solid #E5E7EB' }}>{formatCurrency(bien.valor_estimado)}</td>
                          <td className="no-print" style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                if (resguardoTipo === 'tecnologico') {
                                  handleUnassignBien(bien.id, bien.nombre);
                                } else {
                                  handleUnassignInmobiliario(bien.id, bien.nombre);
                                }
                              }}
                              disabled={processingUnassignId === bien.id}
                              className="btn"
                              style={{
                                padding: '4px 8px',
                                fontSize: 9.5,
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#EF4444',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                display: 'inline-flex',
                                gap: 3
                              }}
                            >
                              {processingUnassignId === bien.id ? '⏳' : '❌ Devolver'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: '#F3F4F6', fontWeight: 700, borderTop: '2px solid #D1D5DB' }}>
                        <td colSpan={6} style={{ padding: '10px', textAlign: 'right', borderRight: '1px solid #D1D5DB' }}>VALOR TOTAL ACUMULADO BAJO RESGUARDO:</td>
                        <td style={{ padding: '10px', textAlign: 'right', borderRight: '1px solid #D1D5DB' }}>{formatCurrency(activeCustodioDetails.totalValor)}</td>
                        <td className="no-print" style={{ background: '#F3F4F6' }}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cláusula Legal */}
              <div style={{ fontSize: 9.5, fontStyle: 'italic', color: '#6B7280', marginBottom: 32, pageBreakInside: 'avoid' }}>
                <strong>Compromiso Institucional:</strong> El custodio adquiere el compromiso ineludible de resguardar este inventario y notificar a la Dirección de Administración Patrimonial y Control de Bienes en caso de cambio de adscripción, baja, reubicación física de los equipos o siniestro. Ningún equipo amparado en esta acta podrá ser transferido o retirado de las instalaciones universitarias sin el oficio autorizatorio correspondiente de las autoridades administrativas competentes.
              </div>

              {/* Bloque de Firmas Autorizadas */}
              <div className="print-signatures-block" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, borderTop: '1px solid #D1D5DB', paddingTop: 20, pageBreakInside: 'avoid' }}>
                <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ height: 48, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, borderBottom: '1px solid #111827', paddingBottom: 4, width: 180 }}>
                      {configuracion.firma_patrimonio_nombre || "Arq. Ricardo A."}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#111827', marginTop: 8 }}>Entrega y Autoriza</div>
                  <div style={{ fontSize: 9, color: '#6B7280' }}>{configuracion.firma_patrimonio_puesto || "Jefe de Control Patrimonial UPEN"}</div>
                </div>

                <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ height: 48, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '80%' }}>
                    {isSigned ? (
                      <span style={{
                        fontFamily: signatureFont === 'cursive' ? '"Caveat", "Brush Script MT", cursive' : 'sans-serif',
                        fontSize: 22,
                        color: '#1D4ED8',
                        lineHeight: 1,
                        transform: 'rotate(-3deg)'
                      }}>
                        {typedName}
                      </span>
                    ) : (
                      <span style={{ fontSize: 9.5, color: '#9CA3AF', fontStyle: 'italic' }}>
                        Firma pendiente del Custodio
                      </span>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid #D1D5DB', width: '80%', marginTop: 8 }}></div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#111827', marginTop: 8 }}>Custodio Responsable</div>
                  <div style={{ fontSize: 9, color: '#6B7280' }}>{activeCustodioDetails.nombre}</div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Modal de Firma Digital (No imprimible) */}
      {showSignModal && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)} style={{ zIndex: 130 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Firma Digital del Resguardo Colectivo</div>
                <div className="modal-sub">Escribe el nombre completo del custodio para conformar firma</div>
              </div>
              <button className="btn-icon" onClick={() => setShowSignModal(false)} style={{ border: 'none' }}>✕</button>
            </div>
            <form onSubmit={handleSaveSignature}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Escribe el nombre para la firma:</label>
                  <input
                    className="form-input"
                    type="text"
                    required
                    placeholder={activeCustodioDetails?.nombre}
                    value={typedName}
                    onChange={e => setTypedName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Estilo de Firma Manuscrita:</label>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="font"
                        checked={signatureFont === 'cursive'}
                        onChange={() => setSignatureFont('cursive')}
                      />
                      Manuscrita (Script)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="font"
                        checked={signatureFont === 'sans'}
                        onChange={() => setSignatureFont('sans')}
                      />
                      Formal (Sencilla)
                    </label>
                  </div>
                </div>

                {/* Vista previa */}
                {typedName && (
                  <div style={{
                    background: '#F9FAFB',
                    border: '1px dashed #D1D5DB',
                    borderRadius: 6,
                    padding: '20px 10px',
                    textAlign: 'center',
                    marginTop: 10
                  }}>
                    <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>Vista Previa de la Firma</div>
                    <span style={{
                      fontFamily: signatureFont === 'cursive' ? '"Caveat", "Brush Script MT", cursive' : 'sans-serif',
                      fontSize: 24,
                      color: '#1D4ED8',
                      transform: 'rotate(-2deg)',
                      display: 'inline-block'
                    }}>
                      {typedName}
                    </span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSignModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ minWidth: 120 }}>
                  💾 Estampar Firma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reglas de impresión exclusivas en CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Ocultar elementos innecesarios */
          .sidebar,
          .main-header,
          .no-print,
          .modal-header,
          .modal-footer,
          .toast {
            display: none !important;
          }

          /* Forzar fondo blanco y texto negro en todo el documento */
          html, body {
            background-color: #FFFFFF !important;
            color: #111827 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Adaptar contenedores padres para que no desplacen el contenido */
          body > div {
            display: block !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          .main-layout {
            margin-left: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            display: block !important;
            position: relative !important;
            overflow: visible !important;
            background: #FFFFFF !important;
            padding: 0 !important;
          }

          .main-content {
            padding: 0 !important;
            margin: 0 !important;
            position: relative !important;
            overflow: visible !important;
          }

          .resguardos-panel-container {
            display: block !important;
            position: relative !important;
            overflow: visible !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Convertir el modal en un bloque normal alineado al inicio */
          .modal-overlay {
            position: relative !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: #FFFFFF !important;
            backdrop-filter: none !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: auto !important;
            overflow: visible !important;
          }

          .modal-box {
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            display: block !important;
            overflow: visible !important;
          }

          .print-scroll-override {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            display: block !important;
            position: relative !important;
          }

          /* Configurar el área del acta para impresión */
          #print-area {
            display: flex !important;
            flex-direction: column !important;
            min-height: 250mm !important; /* Altura imprimible de una página Carta/A4 con márgenes */
            justify-content: space-between !important;
            padding: 10mm 15mm !important; /* Margen limpio dentro de la hoja */
            box-sizing: border-box !important;
            background: #FFFFFF !important;
            margin: 0 !important;
          }

          /* Asegurar que el listado de bienes y las firmas tengan page-break correcto */
          .print-table-compact {
            width: 100% !important;
            border-collapse: collapse !important;
          }

          .print-table-compact th,
          .print-table-compact td {
            border: 1px solid #111827 !important;
            padding: 6px 8px !important;
            font-size: 10px !important;
            color: #111827 !important;
          }

          /* Evitar que las firmas se corten a la mitad y empujarlas al final del contenedor */
          .print-signatures-block {
            margin-top: auto !important;
            page-break-inside: avoid !important;
            padding-top: 15px !important;
          }

          /* Definir tamaño de página estándar */
          @page {
            size: letter portrait;
            margin: 10mm 10mm 10mm 10mm;
          }
        }
      `}} />
    </div>
  );
}
