'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import LaboratorioMapa from './LaboratorioMapa';

/**
 * LaboratoriosPanel — Módulo Premium para Gestión de Laboratorios de Cómputo
 */
export default function LaboratoriosPanel({ ubicaciones = [], bienes = [], showToast, isAdmin = false, onViewFicha }) {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLab, setSelectedLab] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('equipos'); // 'equipos' | 'software' | 'incidentes'

  // Filtrar sugerencias de áreas existentes que parecen laboratorios o tienen PCs
  const unlinkedLocations = useMemo(() => {
    const linkedIds = new Set(labs.map(l => l.ubicacionId).filter(Boolean));
    return ubicaciones.filter(u => !linkedIds.has(u.id));
  }, [ubicaciones, labs]);

  const labSuggestions = useMemo(() => {
    return unlinkedLocations.filter(u => {
      const pcsInLocation = bienes.filter(b => b.ubicacionId === u.id && !b.eliminado);
      const hasPcs = pcsInLocation.length > 0;
      // Solo sugerir por nombre si contiene palabras de laboratorio/cómputo y NO es bodega, aula, oficina o site
      const isStrictLabName = /lab|comput|redes/i.test(u.nombre) && !/bodega|oficina|site|aula/i.test(u.nombre);
      return hasPcs || isStrictLabName;
    }).map(u => {
      const pcsInLocation = bienes.filter(b => b.ubicacionId === u.id && !b.eliminado);
      return {
        ...u,
        pcsCount: pcsInLocation.length
      };
    });
  }, [unlinkedLocations, bienes]);

  const handleAutoCreateLab = async (ubi) => {
    setLoading(true);
    try {
      const payload = {
        nombre: ubi.nombre,
        codigo: ubi.nombre.toUpperCase().replace(/\s+/g, '-'),
        capacidad: ubi.pcsCount > 0 ? ubi.pcsCount : 30,
        so: 'Windows 11 Pro',
        software: 'Paquetería de Ofimática / Herramientas de Desarrollo',
        red: 'Cableada Ethernet 1Gbps',
        observaciones: `Laboratorio importado automáticamente de la ubicación del inventario: ${ubi.nombre}`,
        ubicacionId: ubi.id
      };

      const res = await fetch('/api/laboratorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar');

      if (showToast) showToast(`Laboratorio "${ubi.nombre}" dado de alta ✓ (${ubi.pcsCount} equipos jalados automáticamente)`);
      fetchLabs();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Modales
  const [showLabModal, setShowLabModal] = useState(false);
  const [isEditLab, setIsEditLab] = useState(false);
  const [savingLab, setSavingLab] = useState(false);

  const [showIncidenteModal, setShowIncidenteModal] = useState(false);
  const [savingIncidente, setSavingIncidente] = useState(false);
  const [preselectedBien, setPreselectedBien] = useState(null);

  const [showResolverModal, setShowResolverModal] = useState(false);
  const [resolvingIncidente, setResolvingIncidente] = useState(null);
  const [comentarioResolucion, setComentarioResolucion] = useState('');
  const [savingResolucion, setSavingResolucion] = useState(false);

  // Formulario Laboratorio
  const [labFormId, setLabFormId] = useState(null);
  const [labNombre, setLabNombre] = useState('');
  const [labCodigo, setLabCodigo] = useState('');
  const [labCapacidad, setLabCapacidad] = useState(30);
  const [labSo, setLabSo] = useState('Windows 11 Pro');
  const [labSoftware, setLabSoftware] = useState('');
  const [labRed, setLabRed] = useState('Cableada Ethernet 1Gbps');
  const [labObservaciones, setLabObservaciones] = useState('');
  const [labUbicacionId, setLabUbicacionId] = useState('');

  // Formulario Incidente
  const [incidenteTitulo, setIncidenteTitulo] = useState('');
  const [incidenteDesc, setIncidenteDesc] = useState('');
  const [incidentePrioridad, setIncidentePrioridad] = useState('MEDIA');
  const [incidenteReportadoPor, setIncidenteReportadoPor] = useState('');
  const [incidenteBienId, setIncidenteBienId] = useState('');

  // Cargar Laboratorios
  const fetchLabs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/laboratorios');
      if (!res.ok) throw new Error('Error al obtener laboratorios');
      const data = await res.json();
      setLabs(data);
      
      // Actualizar el seleccionado si existe
      if (selectedLab) {
        const updated = data.find(l => l.id === selectedLab.id);
        if (updated) setSelectedLab(updated);
      }
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Error al cargar laboratorios', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedLab, showToast]);

  useEffect(() => {
    fetchLabs();
  }, []);

  const handleHostChange = (bienId, value) => {
    setSelectedLab(prev => {
      if (!prev) return prev;
      const updatedBienes = prev.ubicacion.bienes.map(b => {
        if (b.id === bienId) {
          return {
            ...b,
            especificaciones: {
              ...(b.especificaciones || {}),
              host: value
            }
          };
        }
        return b;
      });
      return {
        ...prev,
        ubicacion: {
          ...prev.ubicacion,
          bienes: updatedBienes
        }
      };
    });
  };

  const handleIpChange = (bienId, value) => {
    setSelectedLab(prev => {
      if (!prev) return prev;
      const updatedBienes = prev.ubicacion.bienes.map(b => {
        if (b.id === bienId) {
          return {
            ...b,
            especificaciones: {
              ...(b.especificaciones || {}),
              ip: value
            }
          };
        }
        return b;
      });
      return {
        ...prev,
        ubicacion: {
          ...prev.ubicacion,
          bienes: updatedBienes
        }
      };
    });
  };

  const handleSaveSpecs = async (bienId, hostValue, ipValue) => {
    try {
      const bien = selectedLab.ubicacion.bienes.find(b => b.id === bienId);
      if (!bien) return;

      const newSpecs = {
        ...(bien.especificaciones || {}),
        host: hostValue.trim(),
        ip: ipValue.trim()
      };

      if (!newSpecs.host) delete newSpecs.host;
      if (!newSpecs.ip) delete newSpecs.ip;

      const res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bien,
          especificaciones: newSpecs
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar especificaciones');
      }
      fetchLabs();
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Error al guardar Host/IP del equipo', 'error');
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const totalLabs = labs.length;
    let totalCapacidad = 0;
    let incidentesAbiertos = 0;
    let totalEquiposValidados = 0;
    let equiposSanos = 0;

    labs.forEach(l => {
      totalCapacidad += l.capacidad || 0;
      const pendientes = l.incidentes?.filter(i => i.estado === 'PENDIENTE') || [];
      incidentesAbiertos += pendientes.length;

      const pcs = l.ubicacion?.bienes || [];
      totalEquiposValidados += pcs.length;
      pcs.forEach(pc => {
        if (pc.estado !== 'Mantenimiento' && pc.estado !== 'Baja') {
          equiposSanos++;
        }
      });
    });

    const porcentajeOperatividad = totalEquiposValidados > 0 
      ? Math.round((equiposSanos / totalEquiposValidados) * 100)
      : 100;

    return { totalLabs, totalCapacidad, incidentesAbiertos, porcentajeOperatividad, totalEquiposValidados };
  }, [labs]);

  // Manejo Formulario Laboratorio
  const handleOpenLabModal = (lab = null) => {
    if (lab) {
      setIsEditLab(true);
      setLabFormId(lab.id);
      setLabNombre(lab.nombre);
      setLabCodigo(lab.codigo || '');
      setLabCapacidad(lab.capacidad || 30);
      setLabSo(lab.so || 'Windows 11 Pro');
      setLabSoftware(lab.software || '');
      setLabRed(lab.red || 'Cableada Ethernet 1Gbps');
      setLabObservaciones(lab.observaciones || '');
      setLabUbicacionId(lab.ubicacionId ? String(lab.ubicacionId) : '');
    } else {
      setIsEditLab(false);
      setLabFormId(null);
      setLabNombre('');
      setLabCodigo('');
      setLabCapacidad(30);
      setLabSo('Windows 11 Pro');
      setLabSoftware('');
      setLabRed('Cableada Ethernet 1Gbps');
      setLabObservaciones('');
      setLabUbicacionId('');
    }
    setShowLabModal(true);
  };

  const handleSaveLab = async (e) => {
    e.preventDefault();
    if (!labNombre.trim()) return;

    setSavingLab(true);
    try {
      const method = isEditLab ? 'PUT' : 'POST';
      const payload = {
        nombre: labNombre.trim(),
        codigo: labCodigo.trim() || null,
        capacidad: parseInt(labCapacidad, 10),
        so: labSo.trim() || null,
        software: labSoftware.trim() || null,
        red: labRed.trim() || null,
        observaciones: labObservaciones.trim() || null,
        ubicacionId: labUbicacionId ? parseInt(labUbicacionId, 10) : null
      };

      if (isEditLab) payload.id = labFormId;

      const res = await fetch('/api/laboratorios', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al guardar laboratorio');

      if (showToast) showToast(`Laboratorio ${isEditLab ? 'actualizado' : 'registrado'} con éxito ✓`);
      setShowLabModal(false);
      fetchLabs();
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingLab(false);
    }
  };

  const handleDeleteLab = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar el laboratorio "${nombre}"? Esta acción no afectará los bienes/computadoras asignados a su ubicación física.`)) return;

    try {
      const res = await fetch(`/api/laboratorios?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');

      if (showToast) showToast('Laboratorio eliminado con éxito ✓');
      if (selectedLab && selectedLab.id === id) setSelectedLab(null);
      fetchLabs();
    } catch (error) {
      alert(error.message);
    }
  };

  // Manejo Incidentes
  const handleOpenIncidenteModal = (bien = null) => {
    setPreselectedBien(bien);
    setIncidenteTitulo('');
    setIncidenteDesc('');
    setIncidentePrioridad('MEDIA');
    setIncidenteReportadoPor('');
    setIncidenteBienId(bien ? String(bien.id) : '');
    setShowIncidenteModal(true);
  };

  const handleSaveIncidente = async (e) => {
    e.preventDefault();
    if (!incidenteTitulo.trim() || !incidenteDesc.trim()) return;

    setSavingIncidente(true);
    try {
      const payload = {
        laboratorioId: selectedLab.id,
        titulo: incidenteTitulo.trim(),
        descripcion: incidenteDesc.trim(),
        prioridad: incidentePrioridad,
        reportadoPor: incidenteReportadoPor.trim() || null,
        bienId: incidenteBienId ? parseInt(incidenteBienId, 10) : null
      };

      const res = await fetch('/api/laboratorios/incidentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al guardar reporte');

      if (showToast) showToast('Incidente reportado con éxito ✓');
      setShowIncidenteModal(false);
      fetchLabs();
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingIncidente(false);
    }
  };

  // Resolver Incidente
  const handleOpenResolverModal = (incidente) => {
    setResolvingIncidente(incidente);
    setComentarioResolucion('');
    setShowResolverModal(true);
  };

  const handleResolveIncidente = async (e) => {
    e.preventDefault();
    setSavingResolucion(true);
    try {
      const payload = {
        id: resolvingIncidente.id,
        estado: 'RESUELTO',
        comentarios: comentarioResolucion.trim() || null
      };

      const res = await fetch('/api/laboratorios/incidentes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al resolver');

      if (showToast) showToast('Incidente marcado como resuelto ✓');
      setShowResolverModal(false);
      fetchLabs();
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingResolucion(false);
    }
  };

  return (
    <div style={{ padding: '0 24px 24px', width: '100%' }} className="fade-in">
      
      {/* ── SECCIÓN A: DIRECTORIO GENERAL DE LABORATORIOS ────────── */}
      {!selectedLab ? (
        <>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, transparent 60%)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            padding: '20px 28px', marginBottom: 24, gap: 16, flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{
                width: 46, height: 46, borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, boxShadow: '0 4px 12px rgba(13,148,136,0.3)', flexShrink: 0
              }}>💻</div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Laboratorios de Cómputo
                </h2>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
                  Supervisión de software, hardware y reportes de incidencias en salas de cómputo
                </div>
              </div>
            </div>

            {isAdmin && (
              <button
                onClick={() => handleOpenLabModal()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(13,148,136,0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                ＋ Nuevo Laboratorio
              </button>
            )}
          </div>

          {/* Tarjetas de Métricas (KPIs) */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20, marginBottom: 28
          }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24, background: 'rgba(13, 148, 136, 0.08)', color: 'var(--primary)', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏫</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Salas Registradas</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{stats.totalLabs}</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24, background: 'rgba(59, 130, 246, 0.08)', color: '#3B82F6', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖥️</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Capacidad de Asientos</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{stats.totalCapacidad} PCs</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24, background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚠️</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reportes Abiertos</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#EF4444', marginTop: 2 }}>{stats.incidentesAbiertos}</div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24, background: 'rgba(16, 185, 129, 0.08)', color: '#10B981', width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚡</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Operatividad Equipos</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: stats.porcentajeOperatividad < 90 ? '#EAB308' : '#10B981', marginTop: 2 }}>{stats.porcentajeOperatividad}%</div>
              </div>
            </div>
          </div>

          {/* Sugerencias de vinculación automática de laboratorios existentes */}
          {isAdmin && labSuggestions.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(13,148,136,0.08) 0%, rgba(59,130,246,0.03) 100%)',
              border: '1px solid rgba(13,148,136,0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: 'var(--shadow-sm)'
            }} className="fade-in">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Sugerencia: Vincular áreas de cómputo existentes en el inventario
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Hemos detectado ubicaciones en tu inventario que coinciden con salas de cómputo y tienen equipos ya registrados. 
                Dalas de alta en un clic para no duplicar datos:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                {labSuggestions.map(ubi => (
                  <div key={ubi.id} style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 12
                  }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{ubi.nombre}</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginLeft: 6 }}>
                        ({ubi.pcsCount} PC{ubi.pcsCount !== 1 ? 's' : ''} registradas)
                      </span>
                    </div>
                    <button
                      onClick={() => handleAutoCreateLab(ubi)}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(13,148,136,0.1)',
                        border: '1px solid rgba(13,148,136,0.25)',
                        color: 'var(--primary)',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: 11,
                        transition: 'all 0.15s'
                      }}
                      className="btn-action-teal"
                    >
                      ⚡ Dar de Alta
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cuadrícula de Labs */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 24
          }}>
            {labs.map(lab => {
              const pendingIncidentes = lab.incidentes?.filter(i => i.estado === 'PENDIENTE') || [];
              const hasIssues = pendingIncidentes.length > 0;
              const totalBienes = lab.ubicacion?.bienes?.length || 0;

              return (
                <div
                  key={lab.id}
                  onClick={() => {
                    setSelectedLab(lab);
                    setActiveSubTab('equipos');
                  }}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-card)',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  className="hover-card-effect"
                >
                  {/* Status glow border */}
                  <div style={{
                    height: 4,
                    background: hasIssues 
                      ? 'linear-gradient(90deg, #EF4444 0%, #F59E0B 100%)'
                      : 'linear-gradient(90deg, var(--primary) 0%, #10B981 100%)'
                  }} />

                  <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 20 }}>🖥️</span>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{lab.nombre}</h3>
                          {lab.codigo && <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 600 }}>{lab.codigo}</span>}
                        </div>
                      </div>
                      
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        background: hasIssues ? 'rgba(239,68,68,0.08)' : 'rgba(13,148,136,0.08)',
                        color: hasIssues ? '#EF4444' : 'var(--primary)',
                        padding: '3px 8px', borderRadius: 12,
                        border: `1px solid ${hasIssues ? 'rgba(239,68,68,0.2)' : 'rgba(13,148,136,0.2)'}`
                      }}>
                        {hasIssues ? `⚠️ ${pendingIncidentes.length} Incidente(s)` : '🟢 Operativo'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg-body)', padding: 10, borderRadius: 'var(--radius-md)', fontSize: 11.5 }}>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Ubicación:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{lab.ubicacion?.nombre || 'Sin Vincular'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Asientos:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{lab.capacidad} PCs</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>S.O:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={lab.so || '—'}>
                          {lab.so || '—'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>PCs Instaladas:</span>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{totalBienes} de {lab.capacidad}</div>
                      </div>
                    </div>

                    {lab.software && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: 32 }}>
                        <strong>Software:</strong> {lab.software}
                      </div>
                    )}
                  </div>

                  <div style={{
                    padding: '12px 20px', borderTop: '1px solid var(--border)',
                    background: 'var(--bg-body)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 11.5
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Bloque: {lab.ubicacion?.edificio || '—'}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Ver Detalles ➔
                    </span>
                  </div>

                  {/* Acciones admin directas en tarjeta */}
                  {isAdmin && (
                    <div 
                      onClick={(e) => e.stopPropagation()} 
                      style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}
                    >
                      <button 
                        onClick={() => handleOpenLabModal(lab)}
                        style={{ border: 'none', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', borderRadius: 4, padding: '4px 6px', fontSize: 11 }}
                        title="Editar Lab"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteLab(lab.id, lab.nombre)}
                        style={{ border: 'none', background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)', cursor: 'pointer', borderRadius: 4, padding: '4px 6px', fontSize: 11, color: '#EF4444' }}
                        title="Eliminar Lab"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ── SECCIÓN B: VISTA DETALLADA DEL LABORATORIO SELECCIONADO ── */
        <div className="fade-in">
          {/* Cabecera Detail */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '16px 24px', marginBottom: 24,
            gap: 16, flexWrap: 'wrap', boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <button
                onClick={() => setSelectedLab(null)}
                style={{
                  background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.15)',
                  color: 'var(--primary)', padding: '6px 14px', borderRadius: 'var(--radius-md)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer', outline: 'none'
                }}
              >
                ← Volver
              </button>
              
              <div style={{
                width: 1, height: 28, background: 'var(--border)'
              }} />

              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedLab.nombre}
                </h3>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  Código: {selectedLab.codigo || '—'} | Ubicado en: {selectedLab.ubicacion?.nombre || '—'} ({selectedLab.ubicacion?.edificio || 'Otros'})
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleOpenIncidenteModal()}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#EF4444', fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                }}
              >
                ⚠️ Reportar Falla / Incidente
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleOpenLabModal(selectedLab)}
                  style={{
                    padding: '8px 16px', borderRadius: 'var(--radius-md)',
                    background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.2)',
                    color: 'var(--primary)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  ✏️ Editar Lab
                </button>
              )}
            </div>
          </div>

          {/* Sub Navegación Pestañas */}
          <div style={{
            display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20, gap: 16
          }}>
            <button
              onClick={() => setActiveSubTab('equipos')}
              style={{
                background: 'transparent', border: 'none', borderBottom: activeSubTab === 'equipos' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                color: activeSubTab === 'equipos' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeSubTab === 'equipos' ? '700' : '500',
                padding: '8px 12px', fontSize: 13, cursor: 'pointer', outline: 'none', transition: 'all 0.15s'
              }}
            >
              💻 Equipos y Computadoras ({selectedLab.ubicacion?.bienes?.length || 0})
            </button>
            <button
              onClick={() => setActiveSubTab('software')}
              style={{
                background: 'transparent', border: 'none', borderBottom: activeSubTab === 'software' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                color: activeSubTab === 'software' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeSubTab === 'software' ? '700' : '500',
                padding: '8px 12px', fontSize: 13, cursor: 'pointer', outline: 'none', transition: 'all 0.15s'
              }}
            >
              💿 Software y Configuración
            </button>
            <button
              onClick={() => setActiveSubTab('incidentes')}
              style={{
                background: 'transparent', border: 'none', borderBottom: activeSubTab === 'incidentes' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                color: activeSubTab === 'incidentes' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeSubTab === 'incidentes' ? '700' : '500',
                padding: '8px 12px', fontSize: 13, cursor: 'pointer', outline: 'none', transition: 'all 0.15s'
              }}
            >
              ⚠️ Reportes e Incidentes ({selectedLab.incidentes?.filter(i => i.estado === 'PENDIENTE').length || 0})
            </button>
            <button
              onClick={() => setActiveSubTab('mapa')}
              style={{
                background: 'transparent', border: 'none', borderBottom: activeSubTab === 'mapa' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                color: activeSubTab === 'mapa' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeSubTab === 'mapa' ? '700' : '500',
                padding: '8px 12px', fontSize: 13, cursor: 'pointer', outline: 'none', transition: 'all 0.15s'
              }}
            >
              🗺️ Vista Aérea
            </button>
          </div>

          {/* CONTENIDO PESTAÑAS */}

          {/* 1. Pestaña Equipos */}
          {activeSubTab === 'equipos' && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }} className="fade-in">
              {(!selectedLab.ubicacion || !selectedLab.ubicacion.bienes || selectedLab.ubicacion.bienes.length === 0) ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: 36 }}>🖥️</span>
                  <p style={{ marginTop: 8, fontSize: 13 }}>No hay equipos de inventario asignados a la ubicación física de este laboratorio.</p>
                  <p style={{ fontSize: 11 }}>Para asignar computadoras a este laboratorio, edita la ficha del bien tecnológico en la pestaña de <strong>Inventario</strong> y asígnale la ubicación: <em>{selectedLab.ubicacion?.nombre || '—'}</em>.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cód. Inventario</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Marca / Modelo</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Host</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>IP</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Especificaciones</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estado</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLab.ubicacion.bienes.map((row, idx) => {
                      const specs = row.especificaciones || {};
                      const hostVal = specs.host || '';
                      const ipVal = specs.ip || '';
                      
                      const cat = row.categoria?.nombre || row.categoria || '';
                      const isRowPC = cat === 'Computadoras de Escritorio' || cat === 'Laptops' || row.tipo === 'Desktop' || row.tipo === 'Laptop' || row.tipo === 'Computadora';
                      const isRowMonitor = cat === 'Monitores' || row.tipo === 'Monitor';
                      
                      let linkedDevice = null;
                      if (isRowPC && specs.monitorId) {
                        linkedDevice = selectedLab.ubicacion.bienes.find(b => b.id === Number(specs.monitorId));
                      } else if (isRowMonitor && specs.pcId) {
                        linkedDevice = selectedLab.ubicacion.bienes.find(b => b.id === Number(specs.pcId));
                      }
                      
                      return (
                        <tr 
                          key={row.id} 
                          style={{ borderBottom: idx === selectedLab.ubicacion.bienes.length - 1 ? 'none' : '1px solid var(--border)' }}
                          className="hover-highlight"
                        >
                          <td style={{ padding: '14px 20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {row.codigo_inventario}
                          </td>
                          <td style={{ padding: '14px 20px', fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '18px' }}>
                                {isRowMonitor ? '🖥️' : isRowPC ? '💻' : '📦'}
                              </span>
                              <div>
                                <span>{row.marca}</span>
                                <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: '400' }}>{row.modelo}</div>
                                <div className="bien-serial" style={{ marginTop: '2px' }}>
                                  S/N: {row.numero_serie || 'N/S'}
                                </div>
                                {isRowPC && (
                                  linkedDevice ? (
                                    <div style={{
                                      marginTop: 4,
                                      fontSize: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: 'rgba(0, 113, 106, 0.08)',
                                      color: 'var(--primary)',
                                      border: '1px solid rgba(0, 113, 106, 0.15)'
                                    }}>
                                      🖥️ Monitor: {linkedDevice.marca} {linkedDevice.modelo} <span style={{ fontSize: 9, opacity: 0.8 }}>(S/N: {linkedDevice.numero_serie || '—'})</span>
                                    </div>
                                  ) : (
                                    <div style={{
                                      marginTop: 4,
                                      fontSize: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: 'rgba(239, 68, 68, 0.06)',
                                      color: 'var(--danger)',
                                      border: '1px solid rgba(239, 68, 68, 0.15)'
                                    }}>
                                      ⚠️ Sin monitor asignado
                                    </div>
                                  )
                                )}
                                {isRowMonitor && (
                                  linkedDevice ? (
                                    <div style={{
                                      marginTop: 4,
                                      fontSize: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: 'rgba(14, 116, 144, 0.08)',
                                      color: '#0e7490',
                                      border: '1px solid rgba(14, 116, 144, 0.15)'
                                    }}>
                                      💻 PC: {linkedDevice.marca} {linkedDevice.modelo} <span style={{ fontSize: 9, opacity: 0.8 }}>(S/N: {linkedDevice.numero_serie || '—'})</span>
                                    </div>
                                  ) : (
                                    <div style={{
                                      marginTop: 4,
                                      fontSize: 10,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                      background: 'rgba(234, 179, 8, 0.06)',
                                      color: '#ca8a04',
                                      border: '1px solid rgba(234, 179, 8, 0.15)'
                                    }}>
                                      ⚠️ Sin PC asignada
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            {isAdmin ? (
                              <input
                                type="text"
                                value={hostVal}
                                onChange={(e) => handleHostChange(row.id, e.target.value)}
                                onBlur={() => handleSaveSpecs(row.id, hostVal, ipVal)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                                placeholder="Host..."
                                style={{
                                  fontSize: '11.5px',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-body)',
                                  color: 'var(--text-primary)',
                                  width: '120px',
                                  fontFamily: 'monospace'
                                }}
                              />
                            ) : (
                              <span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                {hostVal || '—'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            {isAdmin ? (
                              <input
                                type="text"
                                value={ipVal}
                                onChange={(e) => handleIpChange(row.id, e.target.value)}
                                onBlur={() => handleSaveSpecs(row.id, hostVal, ipVal)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                                placeholder="IP..."
                                style={{
                                  fontSize: '11.5px',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border)',
                                  background: 'var(--bg-body)',
                                  color: 'var(--text-primary)',
                                  width: '130px',
                                  fontFamily: 'monospace'
                                }}
                              />
                            ) : (
                              <span style={{ fontFamily: 'monospace', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                {ipVal || '—'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: 11.5 }}>
                            {specs.procesador || specs.ram || specs.almacenamiento ? (
                              <span>
                                {specs.procesador && `${specs.procesador} `}
                                {specs.ram && `| RAM: ${specs.ram} `}
                                {specs.almacenamiento && `| DD: ${specs.almacenamiento}`}
                              </span>
                            ) : (
                              <span style={{ fontStyle: 'italic' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              background: row.estado === 'Activo' ? 'rgba(16,185,129,0.08)' : row.estado === 'Mantenimiento' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)',
                              color: row.estado === 'Activo' ? '#10B981' : row.estado === 'Mantenimiento' ? '#EF4444' : '#EAB308',
                              padding: '2px 8px', borderRadius: 8
                            }}>
                              {row.estado}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleOpenIncidenteModal(row)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#EF4444', fontSize: '11px', fontWeight: '700',
                                cursor: 'pointer', transition: 'all 0.15s'
                              }}
                              className="btn-action-red"
                            >
                              ⚠️ Reportar Falla
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* 2. Pestaña Software */}
          {activeSubTab === 'software' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }} className="fade-in">
              
              {/* Bloque Sistema Operativo y Red */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 13.5, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 10, color: 'var(--text-primary)' }}>
                  💿 Configuración Base de la Sala
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 12.5 }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Sistema Operativo Instalado:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>⚙️ {selectedLab.so || 'Ninguno registrado'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Red / Conectividad:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>📡 {selectedLab.red || 'Ninguna registrada'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Capacidad Estimada:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>👥 {selectedLab.capacidad} Asientos para alumnos</strong>
                  </div>
                </div>
              </div>

              {/* Bloque Software */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 13.5, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 10, color: 'var(--text-primary)' }}>
                  💻 Software y Licencias Disponibles
                </h4>
                
                {selectedLab.software ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedLab.software.split(/[\n,;]+/).map((s, idx) => {
                      const clean = s.trim();
                      if (!clean) return null;
                      return (
                        <span key={idx} style={{
                          fontSize: 11.5, fontWeight: '600',
                          background: 'rgba(13, 148, 136, 0.08)',
                          color: 'var(--primary)', padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)', border: '1px solid rgba(13,148,136,0.15)'
                        }}>
                          💿 {clean}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '20px 0', color: 'var(--text-secondary)', fontSize: 12.5, fontStyle: 'italic', textAlign: 'center' }}>
                    No hay software registrado. Edita las propiedades del laboratorio para añadir la paquetería de software disponible.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Pestaña Incidentes */}
          {activeSubTab === 'incidentes' && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }} className="fade-in">
              {(!selectedLab.incidentes || selectedLab.incidentes.length === 0) ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: 36 }}>🟢</span>
                  <p style={{ marginTop: 8, fontSize: 13 }}>No hay incidentes reportados ni fallos activos en este laboratorio.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Falla / Título</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Equipo Afectado</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Prioridad</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reportado Por / Fecha</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estado</th>
                      <th style={{ padding: '14px 20px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLab.incidentes.map((inc, idx) => {
                      const isAbierto = inc.estado === 'PENDIENTE';
                      
                      return (
                        <tr 
                          key={inc.id}
                          style={{ borderBottom: idx === selectedLab.incidentes.length - 1 ? 'none' : '1px solid var(--border)' }}
                          className="hover-highlight"
                        >
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{inc.titulo}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{inc.descripcion}</div>
                            {inc.comentarios && (
                              <div style={{ fontSize: 11, background: 'var(--bg-body)', padding: '4px 8px', borderRadius: 4, marginTop: 6, border: '1px solid var(--border)' }}>
                                <strong>Resolución:</strong> {inc.comentarios}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                            {inc.bien ? (
                              <div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>🖥️ {inc.bien.codigo_inventario}</span>
                                <div style={{ fontSize: 10.5 }}>{inc.bien.marca} {inc.bien.modelo}</div>
                              </div>
                            ) : (
                              <span style={{ fontStyle: 'italic', fontSize: 11.5 }}>Falla general de la sala</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              background: inc.prioridad === 'ALTA' ? 'rgba(239,68,68,0.08)' : inc.prioridad === 'MEDIA' ? 'rgba(234,179,8,0.08)' : 'rgba(59,130,246,0.08)',
                              color: inc.prioridad === 'ALTA' ? '#EF4444' : inc.prioridad === 'MEDIA' ? '#EAB308' : '#3B82F6',
                              padding: '2px 8px', borderRadius: 8
                            }}>
                              {inc.prioridad}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: 12 }}>
                            <div>{inc.reportadoPor || 'Docente'}</div>
                            <div style={{ fontSize: 10.5, marginTop: 2 }}>{new Date(inc.fechaReporte).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</div>
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              background: isAbierto ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                              color: isAbierto ? '#EF4444' : '#10B981',
                              padding: '2px 8px', borderRadius: 8
                            }}>
                              {inc.estado}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            {isAbierto ? (
                              <button
                                onClick={() => handleOpenResolverModal(inc)}
                                style={{
                                  padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                                  border: '1px solid rgba(16, 185, 129, 0.2)',
                                  background: 'rgba(16, 185, 129, 0.08)',
                                  color: '#10B981', fontSize: '11px', fontWeight: '700',
                                  cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                className="btn-action-teal"
                              >
                                ✓ Resolver Reporte
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                                Resuelto el {new Date(inc.fechaResolucion).toLocaleDateString()}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeSubTab === 'mapa' && (
            <LaboratorioMapa
              selectedLab={selectedLab}
              isAdmin={isAdmin}
              onSaveSuccess={fetchLabs}
              onViewFicha={(bienRaw) => {
                const fullBien = bienes.find(b => b.id === bienRaw.id);
                onViewFicha(fullBien || bienRaw);
              }}
              showToast={showToast}
            />
          )}
        </div>
      )}

      {/* ── MODAL NUEVO / EDITAR LABORATORIO ───────────────────── */}
      {showLabModal && (
        <div className="modal-overlay" onClick={() => setShowLabModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div className="modal-header" style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, transparent 60%)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {isEditLab ? '✏️ Editar Laboratorio' : '💻 Registrar Nuevo Laboratorio'}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Configura las propiedades lógicas y físicas de la sala de cómputo
                </p>
              </div>
              <button onClick={() => setShowLabModal(false)} disabled={savingLab} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: 'var(--text-secondary)'
              }}>✕</button>
            </div>

            <form onSubmit={handleSaveLab}>
              <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
                
                {/* Nombre y Código */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre del Laboratorio</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Laboratorio de Redes"
                      value={labNombre}
                      onChange={e => setLabNombre(e.target.value)}
                      required
                      disabled={savingLab}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Código / Siglas</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. LAB-RED-01"
                      value={labCodigo}
                      onChange={e => setLabCodigo(e.target.value)}
                      disabled={savingLab}
                    />
                  </div>
                </div>

                {/* Capacidad y Ubicación Física */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Capacidad (PCs/Asientos)</label>
                    <input
                      type="number"
                      className="form-input"
                      min={1}
                      max={100}
                      value={labCapacidad}
                      onChange={e => setLabCapacidad(e.target.value)}
                      required
                      disabled={savingLab}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Vincular Ubicación Física</label>
                    <select
                      className="form-select"
                      value={labUbicacionId}
                      onChange={e => {
                        const val = e.target.value;
                        setLabUbicacionId(val);
                        if (val) {
                          const u = ubicaciones.find(x => String(x.id) === val);
                          if (u) {
                            if (!labNombre) setLabNombre(u.nombre);
                            const pcsCount = bienes.filter(b => b.ubicacionId === u.id && !b.eliminado).length;
                            if (pcsCount > 0) setLabCapacidad(pcsCount);
                          }
                        }
                      }}
                      disabled={savingLab}
                    >
                      <option value="">No Vincular</option>
                      {ubicaciones.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.edificio || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sistema Operativo y Conexión de Red */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Sistema Operativo Base</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Windows 11 / Ubuntu"
                      value={labSo}
                      onChange={e => setLabSo(e.target.value)}
                      disabled={savingLab}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Tipo de Conectividad / Red</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Cableada 1Gbps / WiFi"
                      value={labRed}
                      onChange={e => setLabRed(e.target.value)}
                      disabled={savingLab}
                    />
                  </div>
                </div>

                {/* Software Instalado */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Software y Licencias Instaladas</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Escribe el software instalado separado por comas o saltos de línea (ej. VS Code, AutoCAD, Matlab, NetBeans)"
                    value={labSoftware}
                    onChange={e => setLabSoftware(e.target.value)}
                    disabled={savingLab}
                    style={{ minHeight: 70, resize: 'vertical' }}
                  />
                </div>

                {/* Observaciones */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Observaciones</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Notas o detalles del laboratorio..."
                    value={labObservaciones}
                    onChange={e => setLabObservaciones(e.target.value)}
                    disabled={savingLab}
                    style={{ minHeight: 50, resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--bg-body)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowLabModal(false)} disabled={savingLab}>
                  Cancelar
                </button>
                <button type="submit" style={{
                  padding: '10px 22px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--primary) 0%, #0f766e 100%)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer'
                }} disabled={savingLab}>
                  {savingLab ? '⏳ Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL REPORTAR INCIDENTE / FALLA ────────────────────── */}
      {showIncidenteModal && (
        <div className="modal-overlay" onClick={() => setShowIncidenteModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div className="modal-header" style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, transparent 60%)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#EF4444', margin: 0 }}>
                  ⚠️ Reportar Incidente de Cómputo
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Registra un fallo o daño físico en el laboratorio o en una PC
                </p>
              </div>
              <button onClick={() => setShowIncidenteModal(false)} disabled={savingIncidente} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: 'var(--text-secondary)'
              }}>✕</button>
            </div>

            <form onSubmit={handleSaveIncidente}>
              <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* PC Asociada */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Equipo Afectado / PC</label>
                  {preselectedBien ? (
                    <input
                      type="text"
                      className="form-input"
                      value={`${preselectedBien.codigo_inventario} — ${preselectedBien.marca} ${preselectedBien.modelo}`}
                      disabled
                      style={{ opacity: 0.7, background: 'var(--bg-body)' }}
                    />
                  ) : (
                    <select
                      className="form-select"
                      value={incidenteBienId}
                      onChange={e => setIncidenteBienId(e.target.value)}
                      disabled={savingIncidente}
                    >
                      <option value="">Falla General del Laboratorio (Ninguna PC en específico)</option>
                      {selectedLab?.ubicacion?.bienes?.map(b => (
                        <option key={b.id} value={b.id}>
                          PC: {b.codigo_inventario} ({b.marca} {b.modelo})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Título de la Falla */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Título Corto de la Falla</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Pantalla rota, Mouse inoperante, No prende"
                    value={incidenteTitulo}
                    onChange={e => setIncidenteTitulo(e.target.value)}
                    required
                    disabled={savingIncidente}
                  />
                </div>

                {/* Descripción Detallada */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Descripción del Problema</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Describe a detalle el comportamiento o el fallo..."
                    value={incidenteDesc}
                    onChange={e => setIncidenteDesc(e.target.value)}
                    required
                    disabled={savingIncidente}
                    style={{ minHeight: 80, resize: 'vertical' }}
                  />
                </div>

                {/* Prioridad y Reportante */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Prioridad del Reporte</label>
                    <select
                      className="form-select"
                      value={incidentePrioridad}
                      onChange={e => setIncidentePrioridad(e.target.value)}
                      disabled={savingIncidente}
                    >
                      <option value="BAJA">BAJA</option>
                      <option value="MEDIA">MEDIA</option>
                      <option value="ALTA">ALTA</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Reportado Por (Nombre)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Ing. Lya Estrada / Alumno"
                      value={incidenteReportadoPor}
                      onChange={e => setIncidenteReportadoPor(e.target.value)}
                      disabled={savingIncidente}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--bg-body)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowIncidenteModal(false)} disabled={savingIncidente}>
                  Cancelar
                </button>
                <button type="submit" style={{
                  padding: '10px 22px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer'
                }} disabled={savingIncidente}>
                  {savingIncidente ? '⏳ Guardando...' : '💾 Registrar Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL RESOLVER INCIDENTE ───────────────────────────── */}
      {showResolverModal && (
        <div className="modal-overlay" onClick={() => setShowResolverModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div className="modal-header" style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, transparent 60%)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10B981', margin: 0 }}>
                  ✓ Resolver Reporte de Incidente
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Registra los comentarios de resolución técnica del fallo
                </p>
              </div>
              <button onClick={() => setShowResolverModal(false)} disabled={savingResolucion} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: 'var(--text-secondary)'
              }}>✕</button>
            </div>

            <form onSubmit={handleResolveIncidente}>
              <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Estás marcando el incidente: <strong>"{resolvingIncidente?.titulo}"</strong> como resuelto.
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Comentarios / Notas de Resolución</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Ej. Se reemplazó el mouse averiado por uno nuevo de stock."
                    value={comentarioResolucion}
                    onChange={e => setComentarioResolucion(e.target.value)}
                    required
                    disabled={savingResolucion}
                    style={{ minHeight: 80, resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--bg-body)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowResolverModal(false)} disabled={savingResolucion}>
                  Cancelar
                </button>
                <button type="submit" style={{
                  padding: '10px 22px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer'
                }} disabled={savingResolucion}>
                  {savingResolucion ? '⏳ Guardando...' : '💾 Marcar como Resuelto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .hover-card-effect:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important; }
        .btn-action-red:hover { background: rgba(239, 68, 68, 0.15) !important; }
        .btn-action-teal:hover { background: rgba(16, 185, 129, 0.15) !important; }
      `}</style>
    </div>
  );
}
