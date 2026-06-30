'use client';
import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import LaboratorioMapa from './LaboratorioMapa';

/**
 * LaboratoriosPanel — Módulo Premium para Gestión de Laboratorios de Cómputo
 */
export default function LaboratoriosPanel({ ubicaciones = [], bienes = [], showToast, isAdmin = false, onViewFicha, refreshData }) {
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
  const [incidenteCategoria, setIncidenteCategoria] = useState('Hardware');
  const [incidenteReportadoPor, setIncidenteReportadoPor] = useState('');
  const [incidenteBienId, setIncidenteBienId] = useState('');
  const [incidenteSubTab, setIncidenteSubTab] = useState('pendientes'); // 'pendientes' | 'resueltos'
  const [incidenteToDelete, setIncidenteToDelete] = useState(null);

  // Control de Vista de Equipos y Detalle
  const [viewModeLab, setViewModeLab] = useState('grid'); // 'grid' | 'list'
  const [searchPCQuery, setSearchPCQuery] = useState('');
  const [filterPCStatus, setFilterPCStatus] = useState('TODOS');
  const [selectedPCForDrawer, setSelectedPCForDrawer] = useState(null);

  // Edición de Red en Drawer
  const [drawerHost, setDrawerHost] = useState('');
  const [drawerIp, setDrawerIp] = useState('');
  const [savingRedDrawer, setSavingRedDrawer] = useState(false);

  // Gestión de Software y Licencias
  const [catalogSoftware, setCatalogSoftware] = useState([]);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingSoftware, setEditingSoftware] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [softwareToAssign, setSoftwareToAssign] = useState(null);
  const [assignBienId, setAssignBienId] = useState('');
  const [assignObservaciones, setAssignObservaciones] = useState('');
  const [assignLicenciaKey, setAssignLicenciaKey] = useState('');
  const [assignVencimiento, setAssignVencimiento] = useState('');
  const [searchSoftwareQuery, setSearchSoftwareQuery] = useState('');
  const [revealedKeys, setRevealedKeys] = useState({});

  // Formulario Software Catalog
  const [swNombre, setSwNombre] = useState('');
  const [swVersion, setSwVersion] = useState('');
  const [swFabricante, setSwFabricante] = useState('');
  const [swTipoLicencia, setSwTipoLicencia] = useState('Libre');
  const [swLicenciaKey, setSwLicenciaKey] = useState('');
  const [swVencimiento, setSwVencimiento] = useState('');
  const [swSitioWeb, setSwSitioWeb] = useState('');
  const [swDescripcion, setSwDescripcion] = useState('');
  const [savingSoftware, setSavingSoftware] = useState(false);

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

  const fetchCatalogSoftware = useCallback(async () => {
    try {
      const res = await fetch('/api/software');
      if (!res.ok) throw new Error('Error al obtener catálogo de software');
      const data = await res.json();
      setCatalogSoftware(data);
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Error al cargar catálogo de software', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    fetchLabs();
    fetchCatalogSoftware();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const bien = selectedLab?.ubicacion?.bienes?.find(b => b.id === bienId);
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

  const handleLinkDevices = async (pcId, monitorId) => {
    try {
      const pc = selectedLab?.ubicacion?.bienes?.find(b => b.id === Number(pcId));
      const monitor = selectedLab?.ubicacion?.bienes?.find(b => b.id === Number(monitorId));
      
      if (!pc || !monitor) return;

      const pcSpecs = {
        ...(pc.especificaciones || {}),
        monitorId: String(monitor.id)
      };
      
      const monitorSpecs = {
        ...(monitor.especificaciones || {}),
        pcId: String(pc.id)
      };

      let res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pc, especificaciones: pcSpecs })
      });
      if (!res.ok) throw new Error('Error al vincular PC');

      res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...monitor, especificaciones: monitorSpecs })
      });
      if (!res.ok) throw new Error('Error al vincular Monitor');

      if (showToast) showToast('Componentes vinculados con éxito ✓');
      fetchLabs();
      if (refreshData) refreshData();
    } catch (error) {
      console.error(error);
      if (showToast) showToast(error.message, 'error');
    }
  };

  const handleUnlinkDevice = async (bienId) => {
    try {
      const bien = selectedLab?.ubicacion?.bienes?.find(b => b.id === Number(bienId));
      if (!bien) return;

      const specs = bien.especificaciones || {};
      let linkedId = null;
      
      const cat = bien.categoria?.nombre || bien.categoria || '';
      const isPC = cat === 'Computadoras de Escritorio' || cat === 'Laptops' || bien.tipo === 'Desktop' || bien.tipo === 'Laptop' || bien.tipo === 'Computadora';
      
      if (isPC) {
        linkedId = specs.monitorId;
      } else {
        linkedId = specs.pcId;
      }

      const newSpecs = { ...specs };
      if (isPC) {
        delete newSpecs.monitorId;
      } else {
        delete newSpecs.pcId;
      }

      let res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bien, especificaciones: newSpecs })
      });
      if (!res.ok) throw new Error('Error al desvincular equipo');

      if (linkedId) {
        const linked = selectedLab?.ubicacion?.bienes?.find(b => b.id === Number(linkedId));
        if (linked) {
          const linkedSpecs = { ...linked.especificaciones };
          if (isPC) {
            delete linkedSpecs.pcId;
          } else {
            delete linkedSpecs.monitorId;
          }
          res = await fetch('/api/bienes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...linked, especificaciones: linkedSpecs })
          });
          if (!res.ok) throw new Error('Error al limpiar enlace del dispositivo vinculado');
        }
      }

      if (showToast) showToast('Componentes desvinculados ✓');
      fetchLabs();
      if (refreshData) refreshData();
    } catch (error) {
      console.error(error);
      if (showToast) showToast(error.message, 'error');
    }
  };

  const handleSaveSoftware = async (e) => {
    e.preventDefault();
    if (!swNombre.trim() || !swTipoLicencia) return;

    setSavingSoftware(true);
    try {
      const payload = {
        nombre: swNombre.trim(),
        version: swVersion.trim() || null,
        fabricante: swFabricante.trim() || null,
        tipoLicencia: swTipoLicencia,
        licenciaKey: swLicenciaKey.trim() || null,
        vencimientoLicencia: swVencimiento ? new Date(swVencimiento).toISOString() : null,
        sitioWeb: swSitioWeb.trim() || null,
        descripcion: swDescripcion.trim() || null
      };

      let res;
      if (editingSoftware) {
        payload.id = editingSoftware.id;
        res = await fetch('/api/software', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/software', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar software');

      if (showToast) showToast(editingSoftware ? 'Software actualizado ✓' : 'Software registrado en catálogo ✓');
      
      // Reset form
      setSwNombre('');
      setSwVersion('');
      setSwFabricante('');
      setSwTipoLicencia('Libre');
      setSwLicenciaKey('');
      setSwVencimiento('');
      setSwSitioWeb('');
      setSwDescripcion('');
      setEditingSoftware(null);
      
      fetchCatalogSoftware();
      fetchLabs();
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingSoftware(false);
    }
  };

  const handleEditSoftwareClick = (sw) => {
    setEditingSoftware(sw);
    setSwNombre(sw.nombre || '');
    setSwVersion(sw.version || '');
    setSwFabricante(sw.fabricante || '');
    setSwTipoLicencia(sw.tipoLicencia || 'Libre');
    setSwLicenciaKey(sw.licenciaKey || '');
    setSwVencimiento(sw.vencimientoLicencia ? sw.vencimientoLicencia.substring(0, 10) : '');
    setSwSitioWeb(sw.sitioWeb || '');
    setSwDescripcion(sw.descripcion || '');
  };

  const handleDeleteSoftware = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este software del catálogo global? Se eliminarán todas las asignaciones asociadas a este programa.')) return;
    try {
      const res = await fetch(`/api/software?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar');
      }
      if (showToast) showToast('Software eliminado del catálogo');
      fetchCatalogSoftware();
      fetchLabs();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAssignSoftwareToLab = async (swId) => {
    if (!selectedLab) return;
    try {
      const res = await fetch('/api/software/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          softwareId: swId,
          laboratorioId: selectedLab.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al asignar');
      if (showToast) showToast('Software asignado a todo el laboratorio ✓');
      fetchLabs();
      fetchCatalogSoftware();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleAssignSoftwareToPC = async (e) => {
    e.preventDefault();
    if (!softwareToAssign || !assignBienId) return;
    try {
      const res = await fetch('/api/software/asignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          softwareId: softwareToAssign.id,
          bienId: parseInt(assignBienId, 10),
          licenciaKey: assignLicenciaKey.trim() || null,
          vencimientoLicencia: assignVencimiento ? new Date(assignVencimiento).toISOString() : null,
          observaciones: assignObservaciones.trim() || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al asignar');
      if (showToast) showToast('Software asignado al equipo ✓');
      setShowAssignModal(false);
      setSoftwareToAssign(null);
      setAssignBienId('');
      setAssignObservaciones('');
      setAssignLicenciaKey('');
      setAssignVencimiento('');
      fetchLabs();
      fetchCatalogSoftware();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRemoveAssignment = async (swId, isLabLevel, targetId) => {
    if (!confirm('¿Estás seguro de que deseas desinstalar/remover este software?')) return;
    try {
      let url = `/api/software/asignar?softwareId=${swId}`;
      if (isLabLevel) {
        url += `&laboratorioId=${targetId}`;
      } else {
        url += `&bienId=${targetId}`;
      }

      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al remover asignación');
      }
      if (showToast) showToast('Asignación de software removida ✓');
      fetchLabs();
      fetchCatalogSoftware();
    } catch (error) {
      alert(error.message);
    }
  };

  const labInstalledSoftware = useMemo(() => {
    if (!selectedLab) return { sala: [], individual: [] };

    const salaSoftware = selectedLab.softwareInstalaciones || [];
    
    const individualInstalls = [];
    selectedLab.ubicacion?.bienes?.forEach(b => {
      if (b.softwareInstalaciones) {
        b.softwareInstalaciones.forEach(si => {
          individualInstalls.push({
            ...si,
            bien: { id: b.id, host: b.especificaciones?.host || 'Sin Host', codigo_inventario: b.codigo_inventario, marca: b.marca, modelo: b.modelo }
          });
        });
      }
    });

    return { sala: salaSoftware, individual: individualInstalls };
  }, [selectedLab]);

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
    setIncidenteCategoria('Hardware');
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
        categoria: incidenteCategoria,
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
      if (refreshData) refreshData();
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
      if (refreshData) refreshData();
    } catch (error) {
      alert(error.message);
    } finally {
      setSavingResolucion(false);
    }
  };

  useEffect(() => {
    if (selectedPCForDrawer) {
      const specs = selectedPCForDrawer.especificaciones || {};
      setDrawerHost(specs.host || '');
      setDrawerIp(specs.ip || '');
    } else {
      setDrawerHost('');
      setDrawerIp('');
    }
  }, [selectedPCForDrawer]);

  const currentPCInDrawer = useMemo(() => {
    if (!selectedPCForDrawer || !selectedLab?.ubicacion?.bienes) return null;
    return selectedLab.ubicacion.bienes.find(b => b.id === selectedPCForDrawer.id) || selectedPCForDrawer;
  }, [selectedPCForDrawer, selectedLab]);

  const handleSaveRedFromDrawer = async (e) => {
    e.preventDefault();
    if (!currentPCInDrawer) return;
    setSavingRedDrawer(true);
    try {
      await handleSaveSpecs(currentPCInDrawer.id, drawerHost, drawerIp);
      if (showToast) showToast('Configuración de red guardada con éxito ✓');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRedDrawer(false);
    }
  };

  const availableMonitors = useMemo(() => {
    if (!selectedLab?.ubicacion?.bienes) return [];
    return selectedLab.ubicacion.bienes.filter(b => {
      const cat = b.categoria?.nombre || b.categoria || '';
      const isMonitor = cat === 'Monitores' || b.tipo === 'Monitor';
      return isMonitor && !b.especificaciones?.pcId && !b.eliminado;
    });
  }, [selectedLab]);

  const availablePCs = useMemo(() => {
    if (!selectedLab?.ubicacion?.bienes) return [];
    return selectedLab.ubicacion.bienes.filter(b => {
      const cat = b.categoria?.nombre || b.categoria || '';
      const isPC = cat === 'Computadoras de Escritorio' || cat === 'Laptops' || b.tipo === 'Desktop' || b.tipo === 'Laptop' || b.tipo === 'Computadora';
      return isPC && !b.especificaciones?.monitorId && !b.eliminado;
    });
  }, [selectedLab]);

  const filteredBienes = useMemo(() => {
    const bienesList = selectedLab?.ubicacion?.bienes || [];
    const filtered = bienesList.filter(b => {
      const q = searchPCQuery.toLowerCase();
      const matchesSearch = 
        (b.codigo_inventario || '').toLowerCase().includes(q) ||
        (b.marca || '').toLowerCase().includes(q) ||
        (b.modelo || '').toLowerCase().includes(q) ||
        (b.numero_serie || '').toLowerCase().includes(q) ||
        (b.especificaciones?.host || '').toLowerCase().includes(q) ||
        (b.especificaciones?.ip || '').toLowerCase().includes(q);
        
      if (!matchesSearch) return false;
      
      if (filterPCStatus !== 'TODOS') {
        return b.estado === filterPCStatus;
      }
      return true;
    });

    // Ordenar: PCs primero, luego Monitores, luego otros
    return [...filtered].sort((a, b) => {
      const catA = a.categoria?.nombre || a.categoria || '';
      const catB = b.categoria?.nombre || b.categoria || '';
      const isPC_A = catA === 'Computadoras de Escritorio' || catA === 'Laptops' || a.tipo === 'Desktop' || a.tipo === 'Laptop' || a.tipo === 'Computadora';
      const isPC_B = catB === 'Computadoras de Escritorio' || catB === 'Laptops' || b.tipo === 'Desktop' || b.tipo === 'Laptop' || b.tipo === 'Computadora';
      const isMon_A = catA === 'Monitores' || a.tipo === 'Monitor';
      const isMon_B = catB === 'Monitores' || b.tipo === 'Monitor';

      const groupA = isPC_A ? 0 : (isMon_A ? 1 : 2);
      const groupB = isPC_B ? 0 : (isMon_B ? 1 : 2);

      if (groupA !== groupB) return groupA - groupB;
      return (a.codigo_inventario || '').localeCompare(b.codigo_inventario || '');
    });
  }, [selectedLab, searchPCQuery, filterPCStatus]);

  const handleDeleteIncidente = async (id) => {
    try {
      const res = await fetch(`/api/laboratorios/incidentes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar reporte');
      }
      if (showToast) showToast('Reporte de incidente eliminado ✓');
      fetchLabs();
      if (refreshData) refreshData();
    } catch (error) {
      alert(error.message);
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              {/* Barra de herramientas de equipos */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 280, flexWrap: 'wrap' }}>
                  <div className="search-input-wrap" style={{ flex: 1, minWidth: 200 }}>
                    <span className="search-icon">🔍</span>
                    <input
                      className="search-input"
                      placeholder="Buscar por código, serie, marca, host, IP..."
                      value={searchPCQuery}
                      onChange={e => setSearchPCQuery(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <select
                    className="filter-select"
                    value={filterPCStatus}
                    onChange={e => setFilterPCStatus(e.target.value)}
                    style={{ minWidth: 140, fontSize: 12.5 }}
                  >
                    <option value="TODOS">Todos los estados</option>
                    <option value="Activo">🟢 Activo</option>
                    <option value="Mantenimiento">🔧 Mantenimiento</option>
                    <option value="Con Falla">🔴 Con Falla</option>
                  </select>
                </div>

                {/* Selector de modo de vista */}
                <div style={{ display: 'flex', background: 'var(--bg-body, #F3F4F6)', borderRadius: 'var(--radius-md)', padding: 3, border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    className={`btn ${viewModeLab === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, padding: '6px 12px', height: 'auto', border: 'none', transition: 'all 0.2s ease', borderRadius: 'var(--radius-sm)' }}
                    onClick={() => setViewModeLab('grid')}
                  >
                    🖥️ Rejilla
                  </button>
                  <button
                    type="button"
                    className={`btn ${viewModeLab === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, padding: '6px 12px', height: 'auto', border: 'none', transition: 'all 0.2s ease', borderRadius: 'var(--radius-sm)' }}
                    onClick={() => setViewModeLab('list')}
                  >
                    📋 Lista
                  </button>
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)', padding: viewModeLab === 'grid' ? '16px' : '0' }} className="fade-in">
                {(!selectedLab.ubicacion || !selectedLab.ubicacion.bienes || selectedLab.ubicacion.bienes.length === 0) ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: 36 }}>🖥️</span>
                    <p style={{ marginTop: 8, fontSize: 13 }}>No hay equipos de inventario asignados a la ubicación física de este laboratorio.</p>
                    <p style={{ fontSize: 11 }}>Para asignar computadoras a este laboratorio, edita la ficha del bien tecnológico en la pestaña de <strong>Inventario</strong> y asígnale la ubicación: <em>{selectedLab.ubicacion?.nombre || '—'}</em>.</p>
                  </div>
                ) : filteredBienes.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: 36 }}>🔍</span>
                    <p style={{ marginTop: 8, fontSize: 13 }}>No se encontraron equipos que coincidan con la búsqueda.</p>
                  </div>
                ) : viewModeLab === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))', gap: 12 }}>
                    {filteredBienes.map(row => {
                      const specs = row.especificaciones || {};
                      const cat = row.categoria?.nombre || row.categoria || '';
                      const isPC = cat === 'Computadoras de Escritorio' || cat === 'Laptops' || row.tipo === 'Desktop' || row.tipo === 'Laptop' || row.tipo === 'Computadora';
                      const isMonitor = cat === 'Monitores' || row.tipo === 'Monitor';
                      
                      let borderCol = 'var(--border)';
                      let bgCol = 'var(--bg-card)';
                      let dotCol = '#6B7280';
                      let pulseName = '';
                      
                      if (row.estado === 'Activo') {
                        dotCol = '#10B981';
                        pulseName = 'pulse-green';
                      } else if (row.estado === 'Mantenimiento') {
                        borderCol = 'rgba(245, 158, 11, 0.3)';
                        bgCol = 'rgba(245, 158, 11, 0.03)';
                        dotCol = '#F59E0B';
                        pulseName = 'pulse-orange';
                      } else {
                        borderCol = 'rgba(239, 68, 68, 0.3)';
                        bgCol = 'rgba(239, 68, 68, 0.03)';
                        dotCol = '#EF4444';
                        pulseName = 'pulse-red';
                      }

                      const hasLinked = isPC ? !!specs.monitorId : (isMonitor ? !!specs.pcId : false);
                      const hasSoftware = isPC && (
                        labInstalledSoftware.sala.length > 0 || (row.softwareInstalaciones && row.softwareInstalaciones.length > 0)
                      );

                      return (
                        <div
                          key={row.id}
                          className="pc-card-interactive"
                          onClick={() => setSelectedPCForDrawer(row)}
                          style={{
                            background: bgCol,
                            border: `1px solid ${borderCol}`,
                            borderRadius: 'var(--radius-md)',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            position: 'relative',
                            minHeight: '110px',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center' }}>
                            <span className={`status-dot ${pulseName}`} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: dotCol, display: 'inline-block' }}></span>
                          </div>

                          <div style={{ position: 'absolute', top: 6, right: 8, display: 'flex', gap: 3, fontSize: 10 }}>
                            {hasLinked && <span title={isPC ? 'Monitor enlazado' : 'CPU enlazado'}>🖥️</span>}
                            {hasSoftware && <span title="Software instalado">💿</span>}
                          </div>

                          <div style={{ fontSize: 24, marginTop: 8 }}>
                            {isMonitor ? '🖥️' : isPC ? '💻' : '📦'}
                          </div>

                          <div style={{ textAlign: 'center', marginTop: 6, width: '100%' }}>
                            <div style={{ fontWeight: '700', fontSize: 11.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row.codigo_inventario}
                            </div>
                            <div style={{ fontSize: 9.5, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                              {row.marca} {row.modelo}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Cód. Inventario</th>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Marca / Modelo</th>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Host</th>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>IP</th>
                         <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Monitor / CPU Asignado</th>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Estado</th>
                        <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBienes.map((row, idx) => {
                        const specs = row.especificaciones || {};
                        const cat = row.categoria?.nombre || row.categoria || '';
                        const isRowPC = cat === 'Computadoras de Escritorio' || cat === 'Laptops' || row.tipo === 'Desktop' || row.tipo === 'Laptop' || row.tipo === 'Computadora';
                        const isRowMonitor = cat === 'Monitores' || row.tipo === 'Monitor';
                        
                        let linkedDevice = null;
                        if (selectedLab?.ubicacion?.bienes) {
                          if (isRowPC && specs.monitorId) {
                            linkedDevice = selectedLab.ubicacion.bienes.find(b => b.id === Number(specs.monitorId));
                          } else if (isRowMonitor && specs.pcId) {
                            linkedDevice = selectedLab.ubicacion.bienes.find(b => b.id === Number(specs.pcId));
                          }
                        }

                        const currentGroup = isRowPC ? 'PC' : (isRowMonitor ? 'Monitor' : 'Otros');
                        let showSeparator = false;
                        if (idx === 0) {
                          showSeparator = true;
                        } else {
                          const prevRow = filteredBienes[idx - 1];
                          const prevCat = prevRow.categoria?.nombre || prevRow.categoria || '';
                          const prevIsPC = prevCat === 'Computadoras de Escritorio' || prevCat === 'Laptops' || prevRow.tipo === 'Desktop' || prevRow.tipo === 'Laptop' || prevRow.tipo === 'Computadora';
                          const prevIsMonitor = prevCat === 'Monitores' || prevRow.tipo === 'Monitor';
                          const prevGroup = prevIsPC ? 'PC' : (prevIsMonitor ? 'Monitor' : 'Otros');
                          if (currentGroup !== prevGroup) {
                            showSeparator = true;
                          }
                        }

                        const separatorRow = showSeparator ? (
                          <tr key={`sep-${currentGroup}-${row.id}`} style={{ background: 'var(--bg-body, #F3F4F6)', borderBottom: '1px solid var(--border)' }}>
                            <td colSpan={7} style={{ padding: '8px 16px', fontSize: '10.5px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-body, #F9FAFB)' }}>
                              {currentGroup === 'PC' ? '💻 Computadoras y Laptops' : (currentGroup === 'Monitor' ? '🖥️ Monitores' : '📦 Otros Equipos')}
                            </td>
                          </tr>
                        ) : null;

                        return (
                          <Fragment key={row.id}>
                            {separatorRow}
                            <tr 
                              style={{ borderBottom: idx === filteredBienes.length - 1 ? 'none' : '1px solid var(--border)', cursor: 'pointer' }}
                              className="hover-highlight"
                              onClick={() => setSelectedPCForDrawer(row)}
                            >
                              <td style={{ padding: '10px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {row.codigo_inventario}
                              </td>
                              <td style={{ padding: '10px 16px', fontWeight: '600' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: '16px' }}>{isRowMonitor ? '🖥️' : isRowPC ? '💻' : '📦'}</span>
                                  <div>
                                    <span style={{ fontSize: 12.5 }}>{row.marca}</span>
                                    <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: '400', marginLeft: 6 }}>{row.modelo}</span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                {specs.host ? (
                                  <code style={{ fontSize: 11, background: 'var(--bg-body)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                                    {specs.host}
                                  </code>
                                ) : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                {specs.ip ? (
                                  <code style={{ fontSize: 11, background: 'var(--bg-body)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                                    {specs.ip}
                                  </code>
                                ) : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
                              </td>
                              <td style={{ padding: '10px 16px', fontSize: 11.5 }} onClick={e => e.stopPropagation()}>
                                {linkedDevice ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      {isRowPC ? '🖥️' : '💻'} {linkedDevice.codigo_inventario}
                                    </span>
                                    {isAdmin && (
                                      <button
                                        type="button"
                                        onClick={() => handleUnlinkDevice(row.id)}
                                        title="Desvincular componente"
                                        style={{
                                          background: 'rgba(239, 68, 68, 0.06)', border: 'none', color: '#EF4444',
                                          cursor: 'pointer', padding: '2px 6px', fontSize: 10, fontWeight: '700',
                                          borderRadius: 4, display: 'flex', alignItems: 'center'
                                        }}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    {isRowPC ? (
                                      isAdmin && availableMonitors.length > 0 ? (
                                        <select
                                          className="filter-select"
                                          style={{ padding: '4px 8px', fontSize: 11.5, minWidth: 140, borderRadius: 6, border: '1px solid var(--border)', height: 'auto', background: 'var(--bg-card)' }}
                                          value=""
                                          onChange={e => {
                                            if (e.target.value) handleLinkDevices(row.id, e.target.value);
                                          }}
                                        >
                                          <option value="">➕ Vincular Monitor</option>
                                          {availableMonitors.map(m => (
                                            <option key={m.id} value={m.id}>
                                              🖥️ {m.codigo_inventario} ({m.marca})
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 11 }}>Sin monitor</span>
                                      )
                                    ) : isRowMonitor ? (
                                      isAdmin && availablePCs.length > 0 ? (
                                        <select
                                          className="filter-select"
                                          style={{ padding: '4px 8px', fontSize: 11.5, minWidth: 140, borderRadius: 6, border: '1px solid var(--border)', height: 'auto', background: 'var(--bg-card)' }}
                                          value=""
                                          onChange={e => {
                                            if (e.target.value) handleLinkDevices(e.target.value, row.id);
                                          }}
                                        >
                                          <option value="">➕ Vincular CPU</option>
                                          {availablePCs.map(pc => (
                                            <option key={pc.id} value={pc.id}>
                                              💻 {pc.codigo_inventario}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 11 }}>Sin CPU</span>
                                      )
                                    ) : (
                                      <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>—</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 700,
                                  background: row.estado === 'Activo' ? 'rgba(16,185,129,0.08)' : row.estado === 'Mantenimiento' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                                  color: row.estado === 'Activo' ? '#10B981' : row.estado === 'Mantenimiento' ? '#EAB308' : '#EF4444',
                                  padding: '2px 8px', borderRadius: 8
                                }}>
                                  {row.estado}
                                </span>
                              </td>
                              <td style={{ padding: '10px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setSelectedPCForDrawer(row)}
                                  style={{
                                    padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-body)',
                                    color: 'var(--text-primary)', fontSize: '11px', fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Detalles ➔
                                </button>
                              </td>
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* 2. Pestaña Software */}
          {activeSubTab === 'software' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="fade-in">
              
              {/* Barra de acciones superior */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>💿 Sistema Operativo: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedLab.so || 'Ninguno'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>📡 Conectividad: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedLab.red || 'Ninguna'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>👥 Asientos: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedLab.capacidad} alumnos</strong>
                  </div>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => { fetchCatalogSoftware(); setShowCatalogModal(true); }}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, height: 32 }}
                  >
                    ⚙️ Administrar Catálogo Global
                  </button>
                )}
              </div>

              {/* Grid principal */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
                
                {/* Lado izquierdo: Software Instalado */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Bloque 1: Instalado en toda la sala */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 13.5, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 10, color: 'var(--text-primary)' }}>
                      🏢 Software en Toda la Sala ({labInstalledSoftware.sala.length})
                    </h4>

                    {labInstalledSoftware.sala.length === 0 ? (
                      <p style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: 12.5, fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
                        No hay software instalado para toda la sala. Utiliza la sección derecha para asignar uno.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {labInstalledSoftware.sala.map(inst => {
                          const sw = inst.software;
                          if (!sw) return null;
                          const isExpired = sw.vencimientoLicencia && new Date(sw.vencimientoLicencia) < new Date();
                          const isKeyVisible = revealedKeys[sw.id];
                          return (
                            <div key={inst.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-body)' }}>
                              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12 }}>
                                <div>
                                  <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>💿 {sw.nombre}</strong>
                                  {sw.version && <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 6 }}>({sw.version})</span>}
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                    <span style={{ fontSize: 10.5, padding: '2px 6px', background: 'rgba(13,148,136,0.08)', color: 'var(--primary)', borderRadius: '4px', border: '1px solid rgba(13,148,136,0.15)' }}>
                                      {sw.tipoLicencia}
                                    </span>
                                    {sw.fabricante && (
                                      <span style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
                                        Fabricante: {sw.fabricante}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleRemoveAssignment(sw.id, true, selectedLab.id)}
                                    className="btn btn-ghost"
                                    style={{ padding: '4px 8px', fontSize: 11, height: 'auto', minHeight: 'unset', color: '#EF4444' }}
                                    title="Desinstalar del laboratorio"
                                  >
                                    Desinstalar 🗑️
                                  </button>
                                )}
                              </div>

                              {/* Clave de Licencia y Vencimiento */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11, color: 'var(--text-secondary)', borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4 }}>
                                {sw.licenciaKey && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>Llave:</span>
                                    <code style={{ fontFamily: 'monospace', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                                      {isKeyVisible ? sw.licenciaKey : '•••••-•••••-•••••'}
                                    </code>
                                    <button
                                      type="button"
                                      onClick={() => setRevealedKeys(prev => ({ ...prev, [sw.id]: !prev[sw.id] }))}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--primary)', padding: 0 }}
                                    >
                                      {isKeyVisible ? 'Ocultar' : 'Revelar'}
                                    </button>
                                  </div>
                                )}
                                {sw.vencimientoLicencia && (
                                  <div style={{ color: isExpired ? '#EF4444' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span>📅 Vence: {new Date(sw.vencimientoLicencia).toLocaleDateString()}</span>
                                    {isExpired && <span style={{ fontSize: 9.5, padding: '1px 4px', background: '#FEE2E2', color: '#EF4444', borderRadius: 3, fontWeight: 700 }}>EXPIRADO</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bloque 2: Instalado en equipos específicos */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 13.5, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 10, color: 'var(--text-primary)' }}>
                      🖥️ Software por Equipo Individual ({labInstalledSoftware.individual.length})
                    </h4>

                    {labInstalledSoftware.individual.length === 0 ? (
                      <p style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: 12.5, fontStyle: 'italic', textAlign: 'center', margin: 0 }}>
                        No hay software instalado en equipos individuales de este laboratorio.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {labInstalledSoftware.individual.map(inst => {
                          const sw = inst.software;
                          if (!sw) return null;
                          return (
                            <div key={inst.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-body)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>
                                  <strong>{sw.nombre}</strong> <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({sw.version || 'v?'})</span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                  Equipo: <strong style={{ color: 'var(--text-primary)' }}>{inst.bien.host}</strong> ({inst.bien.marca} {inst.bien.modelo} - {inst.bien.codigo_inventario})
                                </div>
                                {inst.observaciones && (
                                  <div style={{ fontSize: 10.5, fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                    Notas: {inst.observaciones}
                                  </div>
                                )}
                                {inst.licenciaKey ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                                    <span>Llave única:</span>
                                    <code style={{ fontFamily: 'monospace', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
                                      {revealedKeys[`inst-${inst.id}`] ? inst.licenciaKey : '•••••-•••••-•••••'}
                                    </code>
                                    <button
                                      type="button"
                                      onClick={() => setRevealedKeys(prev => ({ ...prev, [`inst-${inst.id}`]: !prev[`inst-${inst.id}`] }))}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--primary)', padding: 0 }}
                                    >
                                      {revealedKeys[`inst-${inst.id}`] ? 'Ocultar' : 'Revelar'}
                                    </button>
                                  </div>
                                ) : (
                                  sw.licenciaKey && (
                                    <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 4 }}>
                                      🔑 Usando licencia global del catálogo
                                    </div>
                                  )
                                )}
                                {inst.vencimientoLicencia ? (
                                  <div style={{ fontSize: 10.5, color: new Date(inst.vencimientoLicencia) < new Date() ? '#EF4444' : 'var(--text-secondary)', marginTop: 2 }}>
                                    📅 Vence: {new Date(inst.vencimientoLicencia).toLocaleDateString()} {new Date(inst.vencimientoLicencia) < new Date() && <span style={{ fontSize: 9.5, padding: '1px 4px', background: '#FEE2E2', color: '#EF4444', borderRadius: 3, fontWeight: 700, marginLeft: 4 }}>EXPIRADO</span>}
                                  </div>
                                ) : (
                                  sw.vencimientoLicencia && (
                                    <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                                      📅 Vence (Global): {new Date(sw.vencimientoLicencia).toLocaleDateString()}
                                    </div>
                                  )
                                )}
                              </div>
                              {isAdmin && (
                                <button
                                  onClick={() => handleRemoveAssignment(sw.id, false, inst.bien.id)}
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 8px', fontSize: 11, height: 'auto', minHeight: 'unset', color: '#EF4444' }}
                                  title="Remover de este equipo"
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* Lado derecho: Asignar Software */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-sm)', alignSelf: 'start' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                    💿 Asignar Software desde el Catálogo
                  </h4>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="🔍 Buscar software en el catálogo..."
                    value={searchSoftwareQuery}
                    onChange={e => setSearchSoftwareQuery(e.target.value)}
                    style={{ marginBottom: 16 }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
                    {catalogSoftware
                      .filter(sw => sw.nombre.toLowerCase().includes(searchSoftwareQuery.toLowerCase()))
                      .map(sw => {
                        const yaEnSala = labInstalledSoftware.sala.some(inst => inst.softwareId === sw.id);
                        return (
                          <div key={sw.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <strong style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{sw.nombre} {sw.version && `(${sw.version})`}</strong>
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Licencia: {sw.tipoLicencia} {sw.fabricante && `| ${sw.fabricante}`}</span>
                            </div>

                            {yaEnSala ? (
                              <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                ✓ Instalado en toda la sala
                              </span>
                            ) : (
                              isAdmin && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                                  <button
                                    onClick={() => handleAssignSoftwareToLab(sw.id)}
                                    className="btn btn-ghost"
                                    style={{ fontSize: 11, padding: '4px 8px', height: 'auto', minHeight: 'unset', border: '1px solid var(--primary)', color: 'var(--primary)' }}
                                  >
                                    🏫 Toda la Sala
                                  </button>
                                  <button
                                    onClick={() => { setSoftwareToAssign(sw); setShowAssignModal(true); }}
                                    className="btn btn-ghost"
                                    style={{ fontSize: 11, padding: '4px 8px', height: 'auto', minHeight: 'unset' }}
                                  >
                                    🖥️ Elegir Equipo...
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    {catalogSoftware.filter(sw => sw.nombre.toLowerCase().includes(searchSoftwareQuery.toLowerCase())).length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', margin: '16px 0' }}>
                        No se encontraron coincidencias.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 3. Pestaña Incidentes */}
          {activeSubTab === 'incidentes' && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }} className="fade-in">
              
              {/* Pestañas internas de incidentes */}
              <div style={{ display: 'flex', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-body)' }}>
                <button
                  onClick={() => setIncidenteSubTab('pendientes')}
                  style={{
                    background: incidenteSubTab === 'pendientes' ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                    border: incidenteSubTab === 'pendientes' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid transparent',
                    color: incidenteSubTab === 'pendientes' ? '#EF4444' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: 12,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  ⚠️ Reportes Activos ({selectedLab.incidentes?.filter(i => i.estado === 'PENDIENTE').length || 0})
                </button>
                <button
                  onClick={() => setIncidenteSubTab('resueltos')}
                  style={{
                    background: incidenteSubTab === 'resueltos' ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                    border: incidenteSubTab === 'resueltos' ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid transparent',
                    color: incidenteSubTab === 'resueltos' ? '#10B981' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: 12,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  📁 Historial de Archivo ({selectedLab.incidentes?.filter(i => i.estado === 'RESUELTO').length || 0})
                </button>
              </div>

              {(!selectedLab.incidentes || selectedLab.incidentes.filter(i => incidenteSubTab === 'pendientes' ? i.estado === 'PENDIENTE' : i.estado === 'RESUELTO').length === 0) ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: 36 }}>{incidenteSubTab === 'pendientes' ? '🟢' : '📁'}</span>
                  <p style={{ marginTop: 8, fontSize: 13 }}>
                    {incidenteSubTab === 'pendientes' 
                      ? 'No hay incidentes reportados ni fallos activos en este laboratorio.'
                      : 'El historial de incidentes resueltos está vacío.'}
                  </p>
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
                    {selectedLab.incidentes
                      .filter(inc => incidenteSubTab === 'pendientes' ? inc.estado === 'PENDIENTE' : inc.estado === 'RESUELTO')
                      .map((inc, idx, arr) => {
                        const isAbierto = inc.estado === 'PENDIENTE';
                        
                        return (
                          <tr 
                            key={inc.id}
                            style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border)' }}
                            className="hover-highlight"
                          >
                            <td style={{ padding: '14px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{inc.titulo}</span>
                                {inc.categoria && (
                                  <span style={{
                                    fontSize: '9.5px',
                                    fontWeight: '600',
                                    background: 'var(--bg-body)',
                                    color: 'var(--text-secondary)',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    border: '1px solid var(--border)'
                                  }}>
                                    {inc.categoria === 'Hardware' ? '🖥️ Hardware' :
                                     inc.categoria === 'Software' ? '💿 Software' :
                                     inc.categoria === 'Red' ? '📡 Red' : '🔌 Infraestructura'}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>{inc.descripcion}</div>
                              
                              {/* Mantenimiento vinculado */}
                              {inc.mantenimientos && inc.mantenimientos.length > 0 && (
                                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>🛠️ Mantenimiento Correctivo:</span>
                                  <span style={{
                                    fontWeight: 700,
                                    fontSize: '9.5px',
                                    color: inc.mantenimientos[0].estado === 'Completado' ? '#10B981' : '#F59E0B',
                                    background: inc.mantenimientos[0].estado === 'Completado' ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    border: inc.mantenimientos[0].estado === 'Completado' ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(245,158,11,0.15)'
                                  }}>
                                    {inc.mantenimientos[0].estado.toUpperCase()}
                                  </span>
                                </div>
                              )}

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
                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
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
                                    ✓ Resolver
                                  </button>
                                ) : (
                                  <span style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>
                                    Resuelto {new Date(inc.fechaResolucion).toLocaleDateString()}
                                  </span>
                                )}
                                {isAdmin && (
                                  <button
                                    onClick={() => setIncidenteToDelete(inc)}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.05)',
                                      border: '1px solid rgba(239, 68, 68, 0.1)',
                                      borderRadius: 'var(--radius-sm)',
                                      cursor: 'pointer',
                                      width: 26, height: 26,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      color: '#EF4444',
                                      fontSize: 11
                                    }}
                                    title="Eliminar permanentemente este reporte"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
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

                {/* Categoría y Prioridad */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Categoría de Falla</label>
                    <select
                      className="form-select"
                      value={incidenteCategoria}
                      onChange={e => setIncidenteCategoria(e.target.value)}
                      disabled={savingIncidente}
                    >
                      <option value="Hardware">🖥️ Hardware</option>
                      <option value="Software">💿 Software</option>
                      <option value="Red">📡 Red / Conectividad</option>
                      <option value="Otros">🔌 Otros / Infraestructura</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label className="form-label" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Prioridad del Reporte</label>
                    <select
                      className="form-select"
                      value={incidentePrioridad}
                      onChange={e => setIncidentePrioridad(e.target.value)}
                      disabled={savingIncidente}
                    >
                      <option value="BAJA">🟢 BAJA</option>
                      <option value="MEDIA">🟡 MEDIA</option>
                      <option value="ALTA">🔴 ALTA</option>
                    </select>
                  </div>
                </div>

                {/* Reportado por */}
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

      {/* ── MODAL CONFIRMAR BORRADO DE INCIDENTE ───────────── */}
      {incidenteToDelete && (
        <div className="modal-overlay" onClick={() => setIncidenteToDelete(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1100 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 400, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, transparent 60%)',
              padding: '24px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              textAlign: 'center',
              borderBottom: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 40, marginBottom: 8 }}>⚠️</span>
              <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                ¿Eliminar Reporte?
              </h3>
              <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6, marginHorizontal: 12, lineHeight: 1.4 }}>
                Estás a punto de eliminar permanentemente el reporte de incidente:
                <strong style={{ display: 'block', color: 'var(--text-primary)', marginTop: 4 }}>&quot;{incidenteToDelete.titulo}&quot;</strong>
              </p>
            </div>

            <div className="modal-body" style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Esta acción es irreversible y removerá el registro del historial del laboratorio. 
              {incidenteToDelete.bien && (
                <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-body)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 11 }}>
                  🖥️ Equipo: <strong>{incidenteToDelete.bien.codigo_inventario}</strong> ({incidenteToDelete.bien.marca} {incidenteToDelete.bien.modelo})
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '12px 20px', background: 'var(--bg-body)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setIncidenteToDelete(null)} style={{ padding: '6px 14px', fontSize: 12 }}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const id = incidenteToDelete.id;
                  setIncidenteToDelete(null);
                  handleDeleteIncidente(id);
                }}
                style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                🗑️ Confirmar Borrado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CATÁLOGO GLOBAL DE SOFTWARE ───────────────────── */}
      {showCatalogModal && (
        <div className="modal-overlay" onClick={() => { setShowCatalogModal(false); setEditingSoftware(null); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: '80%', maxWidth: 850, maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div className="modal-header" style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, transparent 60%)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  💿 Catálogo Global de Software y Licencias
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Registra y edita la paquetería de software disponible para toda la institución
                </p>
              </div>
              <button onClick={() => { setShowCatalogModal(false); setEditingSoftware(null); }} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: 'var(--text-secondary)'
              }}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, overflowY: 'auto', flex: 1 }}>
              
              {/* Formulario de registro/edición */}
              <div style={{ borderRight: '1px solid var(--border)', paddingRight: 20 }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {editingSoftware ? '✏️ Editar Software' : '➕ Registrar Software'}
                </h4>
                <form onSubmit={handleSaveSoftware} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre de Software *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. Office 2021 LTSC"
                      value={swNombre}
                      onChange={e => setSwNombre(e.target.value)}
                      required
                      disabled={savingSoftware}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Versión</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej. v16.0"
                        value={swVersion}
                        onChange={e => setSwVersion(e.target.value)}
                        disabled={savingSoftware}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Fabricante</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Ej. Microsoft"
                        value={swFabricante}
                        onChange={e => setSwFabricante(e.target.value)}
                        disabled={savingSoftware}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Tipo de Licencia *</label>
                    <select
                      className="form-input"
                      value={swTipoLicencia}
                      onChange={e => setSwTipoLicencia(e.target.value)}
                      required
                      disabled={savingSoftware}
                    >
                      <option value="Libre">Libre / Open Source</option>
                      <option value="Propietaria">Propietaria Comercial</option>
                      <option value="OEM">OEM preinstalada</option>
                      <option value="Educativa">Educativa / Campus</option>
                      <option value="Suscripción">Suscripción anual/mensual</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Clave / Serial de Licencia</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. XXXXX-XXXXX-XXXXX"
                      value={swLicenciaKey}
                      onChange={e => setSwLicenciaKey(e.target.value)}
                      disabled={savingSoftware}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Fecha de Vencimiento</label>
                    <input
                      type="date"
                      className="form-input"
                      value={swVencimiento}
                      onChange={e => setSwVencimiento(e.target.value)}
                      disabled={savingSoftware}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Sitio Web / Descarga</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://..."
                      value={swSitioWeb}
                      onChange={e => setSwSitioWeb(e.target.value)}
                      disabled={savingSoftware}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Descripción / Notas</label>
                    <textarea
                      className="form-input"
                      placeholder="Detalles sobre la instalación o el licenciamiento..."
                      rows={2}
                      value={swDescripcion}
                      onChange={e => setSwDescripcion(e.target.value)}
                      disabled={savingSoftware}
                      style={{ resize: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button type="submit" className="btn btn-primary" disabled={savingSoftware} style={{ flex: 1, height: 36 }}>
                      {savingSoftware ? 'Guardando...' : (editingSoftware ? 'Actualizar' : 'Registrar')}
                    </button>
                    {editingSoftware && (
                      <button type="button" className="btn btn-ghost" onClick={() => {
                        setEditingSoftware(null);
                        setSwNombre('');
                        setSwVersion('');
                        setSwFabricante('');
                        setSwTipoLicencia('Libre');
                        setSwLicenciaKey('');
                        setSwVencimiento('');
                        setSwSitioWeb('');
                        setSwDescripcion('');
                      }} disabled={savingSoftware}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Listado del catálogo */}
              <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Software Registrado ({catalogSoftware.length})
                </h4>
                {catalogSoftware.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: 24 }}>
                    No hay software registrado en el catálogo global.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {catalogSoftware.map(sw => (
                      <div key={sw.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-body)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <strong style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>
                            {sw.nombre} {sw.version && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({sw.version})</span>}
                          </strong>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            🏷️ {sw.tipoLicencia} {sw.fabricante && `| 🏢 ${sw.fabricante}`}
                          </span>
                          {sw.vencimientoLicencia && (
                            <span style={{ fontSize: 10.5, color: new Date(sw.vencimientoLicencia) < new Date() ? '#EF4444' : 'var(--text-secondary)' }}>
                              📅 Vence: {new Date(sw.vencimientoLicencia).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleEditSoftwareClick(sw)} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, height: 'auto', minHeight: 'unset' }}>✏️</button>
                          <button onClick={() => handleDeleteSoftware(sw.id)} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11, height: 'auto', minHeight: 'unset', color: '#EF4444' }}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ASIGNAR SOFTWARE A EQUIPO ESPECÍFICO ───────────── */}
      {showAssignModal && softwareToAssign && (
        <div className="modal-overlay" onClick={() => { setShowAssignModal(false); setSoftwareToAssign(null); setAssignLicenciaKey(''); setAssignVencimiento(''); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 450, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div className="modal-header" style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, rgba(13,148,136,0.06) 0%, transparent 60%)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  💻 Instalar en Equipo Específico
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Instalar: <strong style={{ color: 'var(--primary)' }}>{softwareToAssign.nombre}</strong>
                </p>
              </div>
              <button onClick={() => { setShowAssignModal(false); setSoftwareToAssign(null); setAssignLicenciaKey(''); setAssignVencimiento(''); }} style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: 'var(--text-secondary)'
              }}>✕</button>
            </div>

            <form onSubmit={handleAssignSoftwareToPC}>
              <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Seleccionar Computadora *</label>
                  <select
                    className="form-input"
                    value={assignBienId}
                    onChange={e => setAssignBienId(e.target.value)}
                    required
                  >
                    <option value="">-- Seleccionar Equipo --</option>
                    {selectedLab.ubicacion?.bienes
                      ?.filter(b => {
                        const yaInstalado = b.softwareInstalaciones?.some(si => si.softwareId === softwareToAssign.id);
                        return !yaInstalado;
                      })
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          🖥️ {b.especificaciones?.host || 'Sin Host'} | {b.marca} {b.modelo} ({b.codigo_inventario})
                        </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Clave de Licencia Única</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej. XXXX-XXXX"
                      value={assignLicenciaKey}
                      onChange={e => setAssignLicenciaKey(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Vencimiento de Licencia</label>
                    <input
                      type="date"
                      className="form-input"
                      value={assignVencimiento}
                      onChange={e => setAssignVencimiento(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Observaciones / Detalles de Instalación</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Licencia educativa activada"
                    value={assignObservaciones}
                    onChange={e => setAssignObservaciones(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-body)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-ghost" onClick={() => { setShowAssignModal(false); setSoftwareToAssign(null); setAssignLicenciaKey(''); setAssignVencimiento(''); }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Asignar a Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DRAWER LATERAL DE DETALLES DE COMPUTADORA ────────── */}
      {currentPCInDrawer && (() => {
        const specs = currentPCInDrawer.especificaciones || {};
        const cat = currentPCInDrawer.categoria?.nombre || currentPCInDrawer.categoria || '';
        const isPC = cat === 'Computadoras de Escritorio' || cat === 'Laptops' || currentPCInDrawer.tipo === 'Desktop' || currentPCInDrawer.tipo === 'Laptop' || currentPCInDrawer.tipo === 'Computadora';
        const isMonitor = cat === 'Monitores' || currentPCInDrawer.tipo === 'Monitor';
        
        let linkedDevice = null;
        if (selectedLab.ubicacion?.bienes) {
          if (isPC && specs.monitorId) {
            linkedDevice = selectedLab.ubicacion.bienes.find(b => b.id === Number(specs.monitorId));
          } else if (isMonitor && specs.pcId) {
            linkedDevice = selectedLab.ubicacion.bienes.find(b => b.id === Number(specs.pcId));
          }
        }

        // Obtener software de este equipo
        const pcSofts = [];
        labInstalledSoftware.sala.forEach(inst => {
          if (inst.software) {
            pcSofts.push({ ...inst.software, level: 'sala' });
          }
        });
        currentPCInDrawer.softwareInstalaciones?.forEach(inst => {
          if (inst.software) {
            pcSofts.push({ ...inst.software, level: 'equipo', key: inst.licenciaKey, vencimiento: inst.vencimientoLicencia });
          }
        });

        return (
          <div className="drawer-overlay" onClick={() => setSelectedPCForDrawer(null)}>
            <div className="drawer-container" onClick={e => e.stopPropagation()}>
              
              {/* Encabezado del Drawer */}
              <div className="drawer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 32 }}>{isMonitor ? '🖥️' : isPC ? '💻' : '📦'}</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {currentPCInDrawer.codigo_inventario}
                    </h3>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {currentPCInDrawer.marca} {currentPCInDrawer.modelo}
                    </div>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => setSelectedPCForDrawer(null)} style={{ fontSize: 16 }}>✕</button>
              </div>

              {/* Contenido del Drawer (Scrollable) */}
              <div className="drawer-body">
                
                {/* Estado de Salud */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: currentPCInDrawer.estado === 'Activo' ? 'rgba(16, 185, 129, 0.05)' : currentPCInDrawer.estado === 'Mantenimiento' ? 'rgba(245, 158, 11, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                  border: currentPCInDrawer.estado === 'Activo' ? '1px solid rgba(16, 185, 129, 0.15)' : currentPCInDrawer.estado === 'Mantenimiento' ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)',
                  padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      backgroundColor: currentPCInDrawer.estado === 'Activo' ? '#10B981' : currentPCInDrawer.estado === 'Mantenimiento' ? '#F59E0B' : '#EF4444',
                      display: 'inline-block'
                    }}></span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {currentPCInDrawer.estado}
                    </span>
                  </div>
                  {onViewFicha && (
                    <button 
                      onClick={() => {
                        setSelectedPCForDrawer(null);
                        onViewFicha(currentPCInDrawer);
                      }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--primary)',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline',
                        padding: 0
                      }}
                    >
                      Ver Ficha Completa
                    </button>
                  )}
                </div>

                {/* Sección Ficha Técnica */}
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Ficha Técnica</h4>
                  <div className="drawer-grid-details">
                    <div className="detail-item">
                      <span className="detail-label">Número de Serie</span>
                      <span className="detail-val" style={{ fontFamily: 'monospace' }}>{currentPCInDrawer.numero_serie || 'N/S'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Categoría</span>
                      <span className="detail-val">{cat || '—'}</span>
                    </div>
                    {linkedDevice ? (
                      <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                        <span className="detail-label">{isPC ? '🖥️ Monitor Enlazado' : '💻 CPU Enlazado'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-body)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11.5, marginTop: 4 }}>
                          <span><strong>{linkedDevice.codigo_inventario}</strong> - {linkedDevice.marca} {linkedDevice.modelo}</span>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {onViewFicha && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPCForDrawer(null);
                                  onViewFicha(linkedDevice);
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Ver ➔
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleUnlinkDevice(currentPCInDrawer.id)}
                                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Desvincular ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      (isPC || isMonitor) && (
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <span className="detail-label">{isPC ? '🖥️ Vincular Monitor' : '💻 Vincular CPU'}</span>
                          <div style={{ marginTop: 4 }}>
                            {isPC ? (
                              isAdmin && availableMonitors.length > 0 ? (
                                <select
                                  className="filter-select"
                                  style={{ padding: '6px 10px', fontSize: 12, width: '100%', borderRadius: 6, border: '1px solid var(--border)', height: 'auto', background: 'var(--bg-card)' }}
                                  value=""
                                  onChange={e => {
                                    if (e.target.value) handleLinkDevices(currentPCInDrawer.id, e.target.value);
                                  }}
                                >
                                  <option value="">-- Seleccionar Monitor --</option>
                                  {availableMonitors.map(m => (
                                    <option key={m.id} value={m.id}>
                                      🖥️ {m.codigo_inventario} ({m.marca} {m.modelo})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: 11.5, fontStyle: 'italic' }}>No hay monitores libres en este laboratorio.</span>
                              )
                            ) : (
                              isAdmin && availablePCs.length > 0 ? (
                                <select
                                  className="filter-select"
                                  style={{ padding: '6px 10px', fontSize: 12, width: '100%', borderRadius: 6, border: '1px solid var(--border)', height: 'auto', background: 'var(--bg-card)' }}
                                  value=""
                                  onChange={e => {
                                    if (e.target.value) handleLinkDevices(e.target.value, currentPCInDrawer.id);
                                  }}
                                >
                                  <option value="">-- Seleccionar CPU --</option>
                                  {availablePCs.map(pc => (
                                    <option key={pc.id} value={pc.id}>
                                      💻 {pc.codigo_inventario} ({pc.especificaciones?.host || 'Sin Host'})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: 11.5, fontStyle: 'italic' }}>No hay CPUs libres en este laboratorio.</span>
                              )
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Sección Configuración de Red */}
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Direccionamiento y Red</h4>
                  <form onSubmit={handleSaveRedFromDrawer} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Hostname / Host</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Ej. PC-01"
                          value={drawerHost}
                          onChange={e => setDrawerHost(e.target.value)}
                          disabled={savingRedDrawer || !isAdmin}
                          style={{ fontFamily: 'monospace', fontSize: 12.5 }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="form-label" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Dirección IP</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Ej. 192.168.1.51"
                          value={drawerIp}
                          onChange={e => setDrawerIp(e.target.value)}
                          disabled={savingRedDrawer || !isAdmin}
                          style={{ fontFamily: 'monospace', fontSize: 12.5 }}
                        />
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingRedDrawer || (drawerHost === (specs.host || '') && drawerIp === (specs.ip || ''))}
                        style={{ alignSelf: 'flex-end', padding: '6px 14px', fontSize: 12, height: 'auto', marginTop: 4 }}
                      >
                        {savingRedDrawer ? 'Guardando...' : '💾 Guardar Datos de Red'}
                      </button>
                    )}
                  </form>
                </div>

                {/* Sección Software */}
                <div className="drawer-section">
                  <h4 className="drawer-section-title">Software Instalado ({pcSofts.length})</h4>
                  {pcSofts.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '10px 0', fontStyle: 'italic' }}>
                      No hay paquetería instalada en este equipo.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                      {pcSofts.map((s, sidx) => {
                        const isExpired = s.vencimiento && new Date(s.vencimiento) < new Date();
                        return (
                          <div key={sidx} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'var(--bg-body)', padding: '8px 12px', borderRadius: 8,
                            border: '1px solid var(--border)'
                          }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                                💿 {s.nombre} {s.version && `(${s.version})`}
                              </div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                                <span style={{
                                  fontSize: '9px', fontWeight: '700',
                                  background: s.level === 'sala' ? 'rgba(13,148,136,0.06)' : 'rgba(79,70,229,0.06)',
                                  color: s.level === 'sala' ? 'var(--primary)' : '#4F46E5',
                                  padding: '1px 5px', borderRadius: 4,
                                  border: s.level === 'sala' ? '1px solid rgba(13,148,136,0.12)' : '1px solid rgba(79,70,229,0.12)',
                                }}>
                                  {s.level === 'sala' ? 'Asignación de Sala' : 'Asignación Individual'}
                                </span>
                                {s.key && (
                                  <span style={{ fontSize: 9.5, color: 'var(--text-secondary)', fontFamily: 'monospace' }} title="Licencia">
                                    🔑 {s.key}
                                  </span>
                                )}
                              </div>
                            </div>
                            {s.vencimiento && (
                              <div style={{ fontSize: 10, textAlign: 'right', color: isExpired ? '#EF4444' : 'var(--text-secondary)' }}>
                                <div>Vence: {new Date(s.vencimiento).toLocaleDateString()}</div>
                                {isExpired && <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' }}>Expirada</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sección Acciones Rápidas */}
                <div className="drawer-section" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                  <h4 className="drawer-section-title">Acciones Rápidas</h4>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button
                      onClick={() => {
                        setSelectedPCForDrawer(null);
                        handleOpenIncidenteModal(currentPCInDrawer);
                      }}
                      className="btn"
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: 'rgba(239, 68, 68, 0.05)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.15)',
                        fontSize: 12, padding: '8px 12px', borderRadius: 8, fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      ⚠️ Reportar Falla / Incidente
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      <style>{`
        .hover-card-effect:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,0,0,0.08) !important; }
        .btn-action-red:hover { background: rgba(239, 68, 68, 0.15) !important; }
        .btn-action-teal:hover { background: rgba(16, 185, 129, 0.15) !important; }

        /* Estilos del Drawer Deslizable */
        .drawer-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(3px);
          z-index: 1200;
          display: flex;
          justify-content: flex-end;
        }
        .drawer-container {
          width: 100%;
          max-width: 440px;
          height: 100%;
          background: var(--bg-card);
          border-left: 1px solid var(--border);
          box-shadow: -10px 0 30px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          animation: slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .drawer-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .drawer-body {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .drawer-section {
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
          margin-bottom: 16px;
        }
        .drawer-section-title {
          margin: 0 0 12px 0;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .drawer-grid-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .detail-label {
          font-size: 9.5px;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-weight: 600;
        }
        .detail-val {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        /* Animación de entrada */
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        /* Animaciones e interactividad en Rejilla */
        @keyframes status-pulse-green {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes status-pulse-orange {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(245, 158, 11, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        @keyframes status-pulse-red {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .pulse-green { animation: status-pulse-green 2s infinite ease-in-out; }
        .pulse-orange { animation: status-pulse-orange 2s infinite ease-in-out; }
        .pulse-red { animation: status-pulse-red 2s infinite ease-in-out; }

        .pc-card-interactive {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }
        .pc-card-interactive:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          border-color: var(--primary) !important;
        }
      `}</style>
    </div>
  );
}
