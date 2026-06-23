'use client';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

import Sidebar        from '@/app/components/Sidebar';
import ModalNuevoBien from '@/app/components/ModalNuevoBien';
import Dashboard      from '@/app/components/Dashboard';
import Login          from '@/app/components/Login';
import CatalogsPanel from '@/app/components/CatalogsPanel';
import ResguardosPanel from '@/app/components/ResguardosPanel';
import ConfiguracionPanel from '@/app/components/ConfiguracionPanel';
import ModalFichaBien from '@/app/components/ModalFichaBien';
import PersonalExplorer from '@/app/components/PersonalExplorer';
import ModalLectorCodigos from '@/app/components/ModalLectorCodigos';
import MantenimientosPanel from '@/app/components/MantenimientosPanel';
import ReportesPanel from '@/app/components/ReportesPanel';
import InventarioView from '@/app/components/InventarioView';
import ModalImportador from '@/app/components/ModalImportador';
import ModalAutogenerarLote from '@/app/components/ModalAutogenerarLote';
import ModalConfirmarBorrado from '@/app/components/ModalConfirmarBorrado';
import AuditoriaPanel from '@/app/components/auditoria/AuditoriaPanel';
import ValesPanel from '@/app/components/ValesPanel';
import InmobiliarioPanel from '@/app/components/InmobiliarioPanel';
import ConsumiblesPanel from '@/app/components/ConsumiblesPanel';
import LaboratoriosPanel from '@/app/components/LaboratoriosPanel';
import { generateBarcodeSVG } from '@/lib/barcode';
import { useInventarioData } from '@/hooks/useInventarioData';
import { useNotifications }  from '@/hooks/useNotifications';
import { useDarkMode }       from '@/hooks/useDarkMode';
import { Sun, Moon, QrCode, Bell, Download, Plus, RefreshCw, Settings2, LogOut, PartyPopper } from 'lucide-react';

// ── Página principal del sistema de inventario ──────────────────
// Este archivo contiene:
//   1. El estado local de la vista (selección, filtros, modales, UI)
//   2. Los handlers que conectan los componentes entre sí
//   3. El layout de la página
// Los datos, notificaciones y el tema oscuro viven en sus propios hooks (ver /hooks/).
export default function HomePage() {
  // ── Estado de Autenticación ──────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario]                 = useState(null);
  const [loadingSession, setLoadingSession]   = useState(true);

  // ── Estado de navegación ─────────────────────────────────
  const [activeNav, setActiveNav] = useState('panel');
  const [selectedMantenimientoPlanKey, setSelectedMantenimientoPlanKey] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Estado de búsqueda global ─────────────────────────────
  const [globalSearch, setGlobalSearch] = useState('');
  const [showGlobalResults, setShowGlobalResults] = useState(false);
  const globalSearchInputRef = useRef(null);

  // ── Estado de UI/Dropdowns ────────────────────────────────
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toast,     setToast]     = useState(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAutogenerarModal, setShowAutogenerarModal] = useState(false);
  const [bienesEtiquetasPrint, setBienesEtiquetasPrint] = useState([]);

  // ── Estado de selección de inventario ──────────────────────
  const [selected,     setSelected]     = useState([]);      // IDs con checkbox marcado
  const [selectedBien, setSelectedBien] = useState(null);    // Bien abierto en el panel
  const [bienToEdit,   setBienToEdit]   = useState(null);    // Bien a editar en el modal
  const [selectedFichaBien, setSelectedFichaBien] = useState(null); // Bien abierto en la Ficha Técnica
  const [activeResguardoCustodioId, setActiveResguardoCustodioId] = useState(null); // Custodio activo para mostrar su acta
  const [savingImage,  setSavingImage]  = useState(false);   // Subiendo foto
  const [preselectedBienForMantenimiento, setPreselectedBienForMantenimiento] = useState(null);
  const [mantenimientoToFinalize, setMantenimientoToFinalize] = useState(null);
  const [bienToDeletePermanent, setBienToDeletePermanent] = useState(null);
  const [isDeletingPermanent, setIsDeletingPermanent] = useState(false);

  // ── Estado de filtros ────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterArea,   setFilterArea]   = useState('');
  const [filterTipo,   setFilterTipo]   = useState('');

  // ── Callbacks y Efectos Iniciales ────────────────────────
  const handleNavChange = useCallback((nav, extra = null) => {
    if (nav === 'configuracion' && usuario?.rol !== 'ADMINISTRADOR') {
      return;
    }
    setActiveNav(nav);
    setSidebarOpen(false);
    if (nav === 'mantenimientos') {
      setSelectedMantenimientoPlanKey(extra);
    }
  }, [usuario]);

  // Verificar si hay una sesión activa al cargar la página
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.usuario) {
            setUsuario(data.usuario);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Error al verificar la sesión:', error);
      } finally {
        setLoadingSession(false);
      }
    };
    checkSession();
  }, []);

  // Helper para notificaciones tipo Toast
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Datos del inventario (8 APIs + transformación) ──────────
  const {
    bienes, categorias, ubicaciones, departamentos,
    usuarios, personal, configuracion, mantenimientos,
    isLoading, fetchData
  } = useInventarioData(isAuthenticated, showToast);

  // ── Tema oscuro ───────────────────────────────────────
  const { darkMode, toggleDarkMode } = useDarkMode(showToast);

  // Clic fuera de los menús para colapsarlos y atajos de teclado
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.notifications-bell') && !e.target.closest('.notifications-dropdown')) {
        setShowNotifDropdown(false);
      }
      if (!e.target.closest('.user-profile-menu') && !e.target.closest('.user-profile-dropdown')) {
        setShowUserDropdown(false);
      }
      if (!e.target.closest('.nav-search-container') && !e.target.closest('.nav-search-results')) {
        setShowGlobalResults(false);
      }
    };

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        globalSearchInputRef.current?.focus();
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ── Notificaciones del sistema ─────────────────────────
  const {
    activeNotifications,
    dismissedNotifs,
    handleDismissNotif,
    handleClearAllNotifs
  } = useNotifications({ bienes, personal, mantenimientos, categorias }, showToast);

  const handleNotificationClick = (n) => {
    setShowNotifDropdown(false);
    if (n.id.startsWith('mant-') || n.id.startsWith('sched-')) {
      setActiveNav('mantenimientos');
    } else if (n.id.startsWith('temp-')) {
      setActiveNav('personal');
    } else if (n.id.startsWith('reserva-') || n.id.startsWith('baja-') || n.id.startsWith('stock-empty-')) {
      setActiveNav('inventario');
      if (n.id.startsWith('baja-')) {
        setFilterEstado('Baja');
      } else if (n.id.startsWith('reserva-')) {
        setFilterEstado('En reserva');
      } else if (n.id.startsWith('stock-empty-')) {
        const cat = n.id.replace('stock-empty-', '');
        setFilterTipo(cat);
        setFilterEstado('En reserva');
      }
    }
  };

  // Buscador Global
  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return { bienes: [], personal: [] };
    const q = globalSearch.toLowerCase();
    
    const matchedBienes = bienes.filter(b => 
      b.nombre.toLowerCase().includes(q) ||
      b.serial.toLowerCase().includes(q) ||
      b.etiqueta.toLowerCase().includes(q)
    ).slice(0, 5);

    const matchedPersonal = personal.filter(p => 
      p.nombre.toLowerCase().includes(q) ||
      (p.departamento?.nombre || 'General').toLowerCase().includes(q) ||
      (p.puesto || '').toLowerCase().includes(q)
    ).slice(0, 5);

    return { bienes: matchedBienes, personal: matchedPersonal };
  }, [globalSearch, bienes, personal]);

  // ── Handlers ─────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      setIsAuthenticated(false);
      setUsuario(null);
      showToast('Sesión cerrada exitosamente', 'info');
    } catch (error) {
      console.error(error);
      showToast('Error al cerrar sesión', 'error');
    }
  }, [showToast]);

  const handleSaveBien = useCallback(async (form) => {
    const isEdit = !!bienToEdit && !!bienToEdit.id;
    const method = isEdit ? 'PUT' : 'POST';
    let payload;
    if (!isEdit && form.esLote) {
      payload = {
        esLote: true, items: form.items, marca: form.marca, modelo: form.modelo,
        estado: form.estado, descripcion: form.descripcion || '',
        categoriaId: parseInt(form.categoriaId, 10),
        ubicacionId: parseInt(form.ubicacionId, 10),
        departamentoId: form.departamentoId ? parseInt(form.departamentoId, 10) : null,
        responsableId: form.responsableId ? parseInt(form.responsableId, 10) : null,
        responsableNombre: form.responsableNombre || null,
        fecha_adquisicion: form.fecha_adquisicion || null,
        programa_adquisicion: form.programa_adquisicion || null,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
        especificaciones: form.especificaciones || {}
      };
    } else {
      payload = {
        numero_serie: form.serial, marca: form.marca, modelo: form.modelo, estado: form.estado,
        descripcion: form.descripcion || '',
        categoriaId: parseInt(form.categoriaId, 10),
        ubicacionId: parseInt(form.ubicacionId, 10),
        departamentoId: form.departamentoId ? parseInt(form.departamentoId, 10) : null,
        responsableId: form.responsableId ? parseInt(form.responsableId, 10) : null,
        responsableNombre: form.responsableNombre || null,
        fecha_adquisicion: form.fecha_adquisicion || null,
        programa_adquisicion: form.programa_adquisicion || null,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
        especificaciones: form.especificaciones || {},
        codigo_manual: form.etiqueta
      };
      if (isEdit) {
        payload.id = bienToEdit.id;
        payload.codigo_inventario = form.etiqueta;
      }
    }
    const res = await fetch('/api/bienes', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar el bien');
    setShowModal(false);
    setBienToEdit(null);
    showToast(`Bien ${isEdit ? 'actualizado' : 'registrado'} exitosamente ✓`);
    fetchData();
  }, [bienToEdit, showToast, fetchData]);

  const handleRowClick = useCallback((bien) =>
    setSelectedBien(prev => prev?.id === bien.id ? null : bien), []);

  const handleCheck = useCallback((id, e) => {
    e.stopPropagation();
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleCheckAll = useCallback((ids) =>
    setSelected(prev => ids.length > 0 && ids.every(id => prev.includes(id)) ? [] : ids), []);

  const handleClearFilters = useCallback(() => {
    setSearch(''); setFilterEstado(''); setFilterArea(''); setFilterTipo('');
  }, []);

  const handleUpdateImage = useCallback(async (id, base64String) => {
    setSavingImage(true);
    try {
      const res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, imagen_url: base64String })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la foto');
      showToast('Fotografía de equipo guardada con éxito ✓');
      await fetchData();
      setSelectedFichaBien(prev => prev && prev.id === id ? { ...prev, imagen_url: base64String } : prev);
    } catch (err) {
      console.error(err);
      showToast('Error al subir la imagen', 'error');
    } finally {
      setSavingImage(false);
    }
  }, [showToast, fetchData]);

  const handleDeleteBien = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/bienes?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al dar de baja el bien');
      showToast('Bien dado de baja correctamente ✓');
      if (selectedBien?.id === id) setSelectedBien(null);
      if (selectedFichaBien?.id === id) setSelectedFichaBien(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al eliminar', 'error');
    }
  }, [showToast, fetchData, selectedBien, selectedFichaBien]);

  const handleLinkMonitor = useCallback(async (pcId, monitorId) => {
    const pc = bienes.find(b => b.id === pcId);
    const monitor = bienes.find(b => b.id === monitorId);
    if (!pc || !monitor) return;

    try {
      const currentMonitorIds = Array.isArray(pc.especificaciones?.monitorIds)
        ? pc.especificaciones.monitorIds
        : pc.especificaciones?.monitorId
          ? [pc.especificaciones.monitorId]
          : [];
      const newMonitorIds = Array.from(new Set([...currentMonitorIds, monitor.id].map(Number)));

      const payloadPc = {
        id: pc.id,
        codigo_inventario: pc.etiqueta,
        numero_serie: pc.serial,
        marca: pc.marca,
        modelo: pc.modelo,
        estado: pc.estado,
        descripcion: pc.descripcion,
        categoriaId: pc.categoriaId,
        ubicacionId: pc.ubicacionId,
        departamentoId: pc.departamentoId,
        especificaciones: {
          ...pc.especificaciones,
          monitorId: monitor.id,
          monitorIds: newMonitorIds
        }
      };

      const payloadMonitor = {
        id: monitor.id,
        codigo_inventario: monitor.etiqueta,
        numero_serie: monitor.serial,
        marca: monitor.marca,
        modelo: monitor.modelo,
        estado: monitor.estado,
        descripcion: monitor.descripcion,
        categoriaId: monitor.categoriaId,
        ubicacionId: monitor.ubicacionId,
        departamentoId: monitor.departamentoId,
        especificaciones: {
          ...monitor.especificaciones,
          pcId: pc.id
        }
      };

      const [resPc, resMon] = await Promise.all([
        fetch('/api/bienes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadPc)
        }),
        fetch('/api/bienes', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadMonitor)
        })
      ]);

      const dataPc = await resPc.json();
      const dataMon = await resMon.json();

      if (!resPc.ok) throw new Error(dataPc.error || 'Error al actualizar la PC');
      if (!resMon.ok) throw new Error(dataMon.error || 'Error al actualizar el monitor');

      showToast('Equipos vinculados correctamente ✓');
      
      await fetchData();

      setTimeout(() => {
        setSelectedFichaBien(prev => {
          if (!prev) return null;
          if (prev.id === pcId) {
            return {
              ...prev,
              especificaciones: {
                ...prev.especificaciones,
                monitorId: monitor.id,
                monitorIds: newMonitorIds
              },
              updatedAt: new Date().toISOString()
            };
          }
          if (prev.id === monitorId) {
            return {
              ...prev,
              especificaciones: { ...prev.especificaciones, pcId },
              updatedAt: new Date().toISOString()
            };
          }
          return prev;
        });
      }, 100);

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al vincular los equipos', 'error');
    }
  }, [bienes, showToast, fetchData]);

  const handleUnlinkMonitor = useCallback(async (pcId, monitorId) => {
    const pc = bienes.find(b => b.id === pcId);
    const monitor = bienes.find(b => b.id === monitorId);

    try {
      const promises = [];

      if (pc) {
        const currentMonitorIds = Array.isArray(pc.especificaciones?.monitorIds)
          ? pc.especificaciones.monitorIds
          : pc.especificaciones?.monitorId
            ? [pc.especificaciones.monitorId]
            : [];
        const newMonitorIds = currentMonitorIds.map(Number).filter(id => id !== Number(monitorId));
        
        const cleanPcSpecs = { ...(pc.especificaciones || {}) };
        if (newMonitorIds.length === 0) {
          delete cleanPcSpecs.monitorId;
          delete cleanPcSpecs.monitorIds;
        } else {
          cleanPcSpecs.monitorIds = newMonitorIds;
          cleanPcSpecs.monitorId = newMonitorIds[newMonitorIds.length - 1];
        }

        const payloadPc = {
          id: pc.id,
          codigo_inventario: pc.etiqueta,
          numero_serie: pc.serial,
          marca: pc.marca,
          modelo: pc.modelo,
          estado: pc.estado,
          descripcion: pc.descripcion,
          categoriaId: pc.categoriaId,
          ubicacionId: pc.ubicacionId,
          departamentoId: pc.departamentoId,
          especificaciones: cleanPcSpecs
        };
        promises.push(
          fetch('/api/bienes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadPc)
          }).then(async r => {
            if (!r.ok) {
              const d = await r.json();
              throw new Error(d.error || 'Error al desvincular la PC');
            }
          })
        );
      }

      if (monitor) {
        const { pcId: _, ...cleanMonSpecs } = monitor.especificaciones || {};
        const payloadMonitor = {
          id: monitor.id,
          codigo_inventario: monitor.etiqueta,
          numero_serie: monitor.serial,
          marca: monitor.marca,
          modelo: monitor.modelo,
          estado: monitor.estado,
          descripcion: monitor.descripcion,
          categoriaId: monitor.categoriaId,
          ubicacionId: monitor.ubicacionId,
          departamentoId: monitor.departamentoId,
          especificaciones: cleanMonSpecs
        };
        promises.push(
          fetch('/api/bienes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadMonitor)
          }).then(async r => {
            if (!r.ok) {
              const d = await r.json();
              throw new Error(d.error || 'Error al desvincular el monitor');
            }
          })
        );
      }

      await Promise.all(promises);
      showToast('Equipos desvinculados correctamente ✓');
      
      await fetchData();

      setTimeout(() => {
        setSelectedFichaBien(prev => {
          if (!prev) return null;
          if (prev.id === pcId) {
            const currentMonitorIds = Array.isArray(prev.especificaciones?.monitorIds)
              ? prev.especificaciones.monitorIds
              : prev.especificaciones?.monitorId
                ? [prev.especificaciones.monitorId]
                : [];
            const newMonitorIds = currentMonitorIds.map(Number).filter(id => id !== Number(monitorId));
            const cleanSpecs = { ...(prev.especificaciones || {}) };
            if (newMonitorIds.length === 0) {
              delete cleanSpecs.monitorId;
              delete cleanSpecs.monitorIds;
            } else {
              cleanSpecs.monitorIds = newMonitorIds;
              cleanSpecs.monitorId = newMonitorIds[newMonitorIds.length - 1];
            }
            return {
              ...prev,
              especificaciones: cleanSpecs,
              updatedAt: new Date().toISOString()
            };
          }
          if (prev.id === monitorId) {
            const { pcId: _, ...cleanSpecs } = prev.especificaciones || {};
            return {
              ...prev,
              especificaciones: cleanSpecs,
              updatedAt: new Date().toISOString()
            };
          }
          return prev;
        });
      }, 100);

    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al desvincular los equipos', 'error');
    }
  }, [bienes, showToast, fetchData]);

  const handleDeletePermanent = useCallback((id) => {
    if (usuario?.rol !== 'ADMINISTRADOR') {
      showToast('Acceso denegado. Solo los administradores pueden realizar un borrado permanente.', 'error');
      return;
    }
    const bienEncontrado = bienes.find(b => b.id === id);
    if (!bienEncontrado) return;
    setBienToDeletePermanent(bienEncontrado);
  }, [usuario, bienes, showToast]);

  const handleConfirmDeletePermanent = useCallback(async (password) => {
    if (!bienToDeletePermanent) return;
    setIsDeletingPermanent(true);
    try {
      const res = await fetch(`/api/bienes?id=${bienToDeletePermanent.id}&permanent=true`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar permanentemente el bien');
      showToast('Bien y todo su historial de resguardos eliminados permanentemente ✓', 'success');
      
      const id = bienToDeletePermanent.id;
      if (selectedBien?.id === id) setSelectedBien(null);
      if (selectedFichaBien?.id === id) setSelectedFichaBien(null);
      
      setBienToDeletePermanent(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al eliminar', 'error');
    } finally {
      setIsDeletingPermanent(false);
    }
  }, [bienToDeletePermanent, showToast, fetchData, selectedBien, selectedFichaBien]);

  const handleRestoreBien = useCallback(async (id) => {
    try {
      const res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, restaurar: true, estado: 'En reserva' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al re-activar el bien');
      showToast('Equipo re-activado y retornado a bodega (En reserva) ✓');
      if (selectedBien?.id === id) setSelectedBien(null);
      if (selectedFichaBien?.id === id) setSelectedFichaBien(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al re-activar', 'error');
    }
  }, [showToast, fetchData, selectedBien, selectedFichaBien]);

  const handleBulkUpdate = useCallback(async (bulkPayload) => {
    if (bulkPayload.abrirAutogenerarModal) {
      setShowAutogenerarModal(true);
      return;
    }
    try {
      const res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected, ...bulkPayload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar bienes en lote');
      showToast(data.message || 'Bienes actualizados en lote con éxito ✓');
      setSelected([]);
      setSelectedBien(null);
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error en acción masiva', 'error');
    }
  }, [selected, showToast, fetchData]);

  const handleUpdateStatus = useCallback(async (id, newStatus) => {
    try {
      const res = await fetch('/api/bienes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar el estado del bien');
      showToast('Estado del equipo actualizado con éxito ✓');
      
      setSelectedBien(prev => prev && prev.id === id ? { ...prev, estado: newStatus } : prev);
      setSelectedFichaBien(prev => prev && prev.id === id ? { ...prev, estado: newStatus } : prev);
      
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al actualizar el estado', 'error');
    }
  }, [showToast, fetchData]);

  // ── Handlers del Escáner y de Impresión de Etiquetas ──────
  const handleScan = useCallback((scannedCode, matchedBien) => {
    if (matchedBien) {
      setSelectedFichaBien(matchedBien);
      setShowScannerModal(false);
      showToast('Ficha técnica cargada ✓', 'success');
    } else {
      setShowScannerModal(false);
      setBienToEdit({ serial: scannedCode });
      setShowModal(true);
      showToast('Código no registrado. Ingrese los detalles del bien.', 'info');
    }
  }, [showToast]);

  const handlePrintSingleLabel = useCallback((bien) => {
    if (!bien.etiqueta || bien.etiqueta.startsWith('SIN-NUMERO-')) {
      showToast('Este bien no cuenta con un número de inventario válido para generar un código de barras.', 'warning');
      return;
    }
    setBienesEtiquetasPrint([bien]);
  }, [showToast]);

  const handlePrintBulkLabels = useCallback(() => {
    const selectedBienes = bienes.filter(b => selected.includes(b.id));
    if (selectedBienes.length === 0) {
      showToast('Por favor selecciona al menos un bien para imprimir', 'warning');
      return;
    }
    const validBienes = selectedBienes.filter(b => b.etiqueta && !b.etiqueta.startsWith('SIN-NUMERO-'));
    if (validBienes.length === 0) {
      showToast('Ninguno de los bienes seleccionados tiene un número de inventario válido para generar un código de barras.', 'error');
      return;
    }
    const skippedCount = selectedBienes.length - validBienes.length;
    if (skippedCount > 0) {
      showToast(`Imprimiendo lote. Se omitieron ${skippedCount} bienes por no contar con número de inventario.`, 'info');
    }
    setBienesEtiquetasPrint(validBienes);
  }, [bienes, selected, showToast]);

  useEffect(() => {
    if (bienesEtiquetasPrint.length > 0) {
      document.body.classList.add('printing-labels');
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      document.body.classList.remove('printing-labels');
    }
  }, [bienesEtiquetasPrint]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setBienesEtiquetasPrint([]);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);


  // ── Render Condicional ────────────────────────────────────
  if (loadingSession) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-main)',
        gap: 20
      }}>
        <div className="dash-pulse" style={{ width: 16, height: 16 }}></div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Cargando SICOB...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Login 
        onLoginSuccess={(userData) => {
          setUsuario(userData);
          setIsAuthenticated(true);
        }} 
      />
    );
  }

  // ── Render Principal ──────────────────────────────────────
  const isAvery = configuracion.etiqueta_formato_papel === 'avery_5167';
  const anchoMm = parseFloat(configuracion.etiqueta_ancho_mm || '30');
  const scalePad = anchoMm / 30;

  // Calibración dinámica Avery 5167
  const margenSuperior = parseFloat(configuracion.etiqueta_margen_superior || '1.0');
  const margenInferior = parseFloat(configuracion.etiqueta_margen_inferior || '1.0');
  const margenIzquierdo = parseFloat(configuracion.etiqueta_margen_izquierdo || '1.0');
  const margenDerecho = parseFloat(configuracion.etiqueta_margen_derecho || '1.0');
  const gapColumnas = parseFloat(configuracion.etiqueta_gap_columnas || '0.5');
  const gapFilas = parseFloat(configuracion.etiqueta_gap_filas || '0.0');

  const dynamicPrintStyles = isAvery ? `
    @media print {
      @page {
        size: letter !important;
        margin: 0 !important;
      }
      body.printing-labels {
        background: #FFFFFF !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body.printing-labels .print-labels-container {
        display: grid !important;
        grid-template-columns: repeat(4, ${configuracion.etiqueta_ancho_mm || '44'}mm) !important;
        grid-auto-rows: ${configuracion.etiqueta_alto_mm || '13'}mm !important;
        align-content: start !important;
        padding-top: ${margenSuperior}cm !important;
        padding-bottom: ${margenInferior}cm !important;
        padding-left: ${margenIzquierdo}cm !important;
        padding-right: ${margenDerecho}cm !important;
        box-sizing: border-box !important;
        width: 21.59cm !important;
        height: 27.94cm !important;
        background: #FFFFFF !important;
        gap: ${gapFilas}cm ${gapColumnas}cm !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      body.printing-labels .print-labels-container:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      body.printing-labels .printable-label {
        width: ${configuracion.etiqueta_ancho_mm || '44'}mm !important;
        height: ${configuracion.etiqueta_alto_mm || '13'}mm !important;
        box-sizing: border-box !important;
        padding: 0.5mm 1mm !important;
        margin: 0 !important;
        border: 0.1mm solid #D1D5DB !important;
        display: block !important;
        background: #FFFFFF !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
      }
      body.printing-labels .label-inner-clean {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        align-items: center !important;
        box-sizing: border-box !important;
      }
      body.printing-labels .label-header-clean {
        font-size: ${configuracion.etiqueta_letra_cabecera_pt || '3.8'}pt !important;
        line-height: 1.0 !important;
        margin: 0 !important;
        text-align: center !important;
        font-weight: ${configuracion.etiqueta_cabecera_bold !== 'false' ? '900' : 'normal'} !important;
        font-style: ${configuracion.etiqueta_cabecera_italic === 'true' ? 'italic' : 'normal'} !important;
      }
      body.printing-labels .label-details-clean {
        font-size: ${configuracion.etiqueta_letra_marca_modelo_pt || '3.5'}pt !important;
        line-height: 1.0 !important;
        margin: 0 !important;
        text-align: center !important;
        font-weight: ${configuracion.etiqueta_marca_bold === 'true' ? '700' : 'normal'} !important;
        font-style: ${configuracion.etiqueta_marca_italic === 'true' ? 'italic' : 'normal'} !important;
      }
      body.printing-labels .label-barcode-clean {
        height: ${configuracion.etiqueta_altura_codigo_barras_mm || '4.8'}mm !important;
        width: 90% !important;
        margin: 0 auto !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      body.printing-labels .label-barcode-clean svg {
        max-height: 100% !important;
        width: 100% !important;
      }
      body.printing-labels .label-code-clean {
        font-size: ${configuracion.etiqueta_letra_codigo_pt || '4.5'}pt !important;
        font-weight: ${configuracion.etiqueta_codigo_bold !== 'false' ? '900' : 'normal'} !important;
        font-style: ${configuracion.etiqueta_codigo_italic === 'true' ? 'italic' : 'normal'} !important;
      }
      body.printing-labels .label-serial-clean {
        font-size: ${configuracion.etiqueta_letra_serial_pt || '4.0'}pt !important;
        font-weight: ${configuracion.etiqueta_serial_bold === 'true' ? '900' : 'normal'} !important;
        font-style: ${configuracion.etiqueta_serial_italic === 'true' ? 'italic' : 'normal'} !important;
      }
    }
  ` : `
    @media print {
      body.printing-labels .printable-label {
        width: ${configuracion.etiqueta_ancho_mm || '30'}mm !important;
        height: ${configuracion.etiqueta_alto_mm || '15'}mm !important;
        padding: ${0.8 * scalePad}mm ${1.5 * scalePad}mm ${1.0 * scalePad}mm !important;
      }
      body.printing-labels .label-header-clean {
        font-size: ${configuracion.etiqueta_letra_cabecera_pt || '4.5'}pt !important;
        font-weight: ${configuracion.etiqueta_cabecera_bold !== 'false' ? '900' : 'normal'} !important;
        font-style: ${configuracion.etiqueta_cabecera_italic === 'true' ? 'italic' : 'normal'} !important;
      }
      body.printing-labels .label-details-clean {
        font-size: ${configuracion.etiqueta_letra_marca_modelo_pt || '4.2'}pt !important;
        font-weight: ${configuracion.etiqueta_marca_bold === 'true' ? '700' : 'normal'} !important;
        font-style: ${configuracion.etiqueta_marca_italic === 'true' ? 'italic' : 'normal'} !important;
      }
      body.printing-labels .label-barcode-clean {
        height: ${configuracion.etiqueta_altura_codigo_barras_mm || '5.6'}mm !important;
      }
      body.printing-labels .label-code-clean {
        font-size: ${configuracion.etiqueta_letra_codigo_pt || '5.5'}pt !important;
        font-weight: ${configuracion.etiqueta_codigo_bold !== 'false' ? '900' : 'normal'} !important;
        font-style: ${configuracion.etiqueta_codigo_italic === 'true' ? 'italic' : 'normal'} !important;
      }
      body.printing-labels .label-serial-clean {
        font-size: ${configuracion.etiqueta_letra_serial_pt || '5.0'}pt !important;
        font-weight: ${configuracion.etiqueta_serial_bold === 'true' ? '900' : 'normal'} !important;
        font-style: ${configuracion.etiqueta_serial_italic === 'true' ? 'italic' : 'normal'} !important;
      }
    }
  `;

  return (
    <div className="root-layout-wrapper" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: dynamicPrintStyles }} />

      {/* ══ SIDEBAR ══════════════════════════════════════════ */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar
        activeNav={activeNav}
        onNavChange={handleNavChange}
        usuario={usuario}
        configuracion={configuracion}
        isOpen={sidebarOpen}
        onLogout={handleLogout}
      />

      {/* ══ CONTENIDO PRINCIPAL ══════════════════════════════ */}
      <div className="main-layout">

        <header className="main-header">
          <div className="main-header-title-wrap">
            <button className="menu-toggle-btn" onClick={() => setSidebarOpen(true)} title="Abrir menú">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/sicob-logo.png" alt="SICOB Logo" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
              <div>
                <div className="main-header-label">Control y Operación de Bienes</div>
                <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
                  SICOB — {configuracion.siglas_institucion || 'UPEN'}
                </h1>
              </div>
            </div>
          </div>

          {/* Buscador Global Centralizado */}
          <div className="nav-search-container">
            <span className="search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </span>
            <input
              ref={globalSearchInputRef}
              className="search-input nav-global-search-input"
              placeholder="Buscar bienes, series, custodios..."
              value={globalSearch}
              onChange={e => {
                setGlobalSearch(e.target.value);
                setShowGlobalResults(true);
              }}
              onFocus={() => setShowGlobalResults(true)}
            />
            {globalSearch ? (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setGlobalSearch('');
                  globalSearchInputRef.current?.focus();
                }}
                title="Limpiar búsqueda"
              >
                &times;
              </button>
            ) : (
              <kbd className="search-shortcut-badge">Ctrl K</kbd>
            )}
            {showGlobalResults && globalSearch.trim() && (
              <div className="nav-search-results">
                {/* Categoría Bienes */}
                {globalSearchResults.bienes.length > 0 && (
                  <div className="nav-search-group">
                    <div className="nav-search-group-title">Equipos Tecnológicos</div>
                    {globalSearchResults.bienes.map(b => (
                      <div
                        key={b.id}
                        className="nav-search-item"
                        onClick={() => {
                          setSelectedFichaBien(b);
                          setGlobalSearch('');
                          setShowGlobalResults(false);
                        }}
                      >
                        <div className="nav-search-item-icon">{b.icono || '💻'}</div>
                        <div className="nav-search-item-info">
                          <div className="nav-search-item-title">{b.nombre}</div>
                          <div className="nav-search-item-sub">No. de Inventario: {b.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : b.etiqueta} | Serie: {b.serial}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Categoría Personal */}
                {globalSearchResults.personal.length > 0 && (
                  <div className="nav-search-group" style={{ borderTop: globalSearchResults.bienes.length > 0 ? '1px solid var(--border)' : 'none', marginTop: globalSearchResults.bienes.length > 0 ? 6 : 0 }}>
                    <div className="nav-search-group-title">Directorio de Personal</div>
                    {globalSearchResults.personal.map(p => (
                      <div
                        key={p.id}
                        className="nav-search-item"
                        onClick={() => {
                          setActiveResguardoCustodioId(p.id);
                          setActiveNav('resguardos');
                          setGlobalSearch('');
                          setShowGlobalResults(false);
                        }}
                      >
                        <div className="nav-search-item-icon">👤</div>
                        <div className="nav-search-item-info">
                          <div className="nav-search-item-title">{p.nombre}</div>
                          <div className="nav-search-item-sub">{p.puesto || 'Custodio'} | {p.departamento?.nombre || 'General'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Resultados Vacíos */}
                {globalSearchResults.bienes.length === 0 && globalSearchResults.personal.length === 0 && (
                  <div className="nav-search-empty">
                    No se encontraron coincidencias
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Acciones y Menús del Lado Derecho */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            
            <div 
              className="sync-status" 
              onClick={() => {
                fetchData();
                showToast('Actualizando datos en tiempo real...', 'info');
              }}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'opacity 0.15s ease' }}
              title="Sincronizar datos (Soft Refresh)"
            >
              <span className="sync-pulse"></span>
              <span className="sync-status-text">{isLoading ? 'Sync…' : 'En línea'}</span>
            </div>

            {/* Alternador de Modo Oscuro */}
            <button
              onClick={toggleDarkMode}
              className="theme-toggle"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Lector por Escáner */}
            <button
              onClick={() => setShowScannerModal(true)}
              className="theme-toggle"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Abrir Lector de Códigos"
            >
              <QrCode size={18} />
            </button>

            {/* Centro de Notificaciones */}
            <div className="notifications-bell">
              <button
                className="btn-icon"
                style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                title="Notificaciones del sistema"
              >
                <Bell size={18} />
                {activeNotifications.length > 0 && <span className="bell-badge"></span>}
              </button>

              {showNotifDropdown && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <span>Notificaciones</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {activeNotifications.length > 0 && (
                        <button
                          type="button"
                          className="notifications-clear"
                          onClick={handleClearAllNotifs}
                          title="Vaciar bandeja"
                        >
                          Vaciar
                        </button>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {activeNotifications.length} alertas
                      </span>
                    </div>
                  </div>
                  <div className="notifications-list">
                    {activeNotifications.length === 0 ? (
                      <div className="notifications-empty">
                        <div className="notifications-empty-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 8px' }}>
                          <PartyPopper size={32} />
                        </div>
                        <div>Todo en orden. No hay alertas pendientes.</div>
                      </div>
                    ) : (
                      activeNotifications.map(n => (
                        <div
                          key={n.id}
                          className="notification-item"
                          onClick={() => handleNotificationClick(n)}
                          title="Haz clic para ver detalles"
                        >
                          <div className={`notification-icon notification-icon-${n.type === 'danger' ? 'danger' : n.type === 'warning' ? 'warning' : 'info'}`}>
                            {n.icon}
                          </div>
                          <div className="notification-body">
                            <div className="notification-text">{n.text}</div>
                            <div className="notification-time">{n.time}</div>
                          </div>
                          <button
                            type="button"
                            className="notification-dismiss"
                            onClick={(e) => handleDismissNotif(e, n.id)}
                            title="Descartar"
                          >
                            &times;
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botón Importar Bienes */}
            {activeNav === 'inventario' && usuario?.rol === 'ADMINISTRADOR' && (
              <button
                id="btn-importar-bienes"
                className="btn btn-secondary"
                style={{ marginRight: 8, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setShowImportModal(true)}
              >
                <Download size={16} /> Importar Excel
              </button>
            )}

            {/* Botón Nuevo Bien */}
            {usuario?.rol === 'ADMINISTRADOR' && (
              <button id="btn-nuevo-bien" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => { setBienToEdit(null); setShowModal(true); }}>
                <Plus size={16} /> Nuevo bien
              </button>
            )}

            {/* Menú de Perfil de Usuario Dropdown */}
            <div className="user-profile-menu">
              <button
                className="user-profile-button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                title="Menú de usuario"
              >
                <div className="user-avatar">
                  {(usuario?.nombre || 'Ad').charAt(0).toUpperCase()}
                </div>
                <div className="user-profile-info-compact">
                  <div className="user-name-compact">{usuario?.nombre ?? 'Administrador'}</div>
                  <div className="user-role-compact">Control Operativo</div>
                </div>
                <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>▼</span>
              </button>

              {showUserDropdown && (
                <div className="user-profile-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-avatar">
                      {(usuario?.nombre || 'Ad').charAt(0).toUpperCase()}
                    </div>
                    <div className="user-dropdown-name">{usuario?.nombre ?? 'Administrador'}</div>
                    <div className="user-dropdown-email">{usuario?.correo ?? 'admin@upen.edu.mx'}</div>
                    <div className="user-dropdown-role">Administrador General</div>
                  </div>
                  <div className="user-dropdown-menu">
                    <button
                      className="user-dropdown-item"
                      onClick={() => {
                        fetchData();
                        setShowUserDropdown(false);
                        showToast('Datos del sistema actualizados con éxito ✓', 'info');
                      }}
                      style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <RefreshCw size={15} /> Sincronizar Datos (Soft Refresh)
                    </button>
                    <button
                      className="user-dropdown-item"
                      onClick={() => {
                        setActiveNav('configuracion');
                        setShowUserDropdown(false);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <Settings2 size={15} /> Configurar Sistema
                    </button>
                    <button
                      className="user-dropdown-item user-dropdown-item-danger"
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogout();
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      <LogOut size={15} /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Contenido principal ─────────────────────────────── */}
        <div className="main-content">

          {activeNav === 'inventario' && (
            <InventarioView
              bienes={bienes}
              categorias={categorias}
              ubicaciones={ubicaciones}
              personal={personal}
              isLoading={isLoading}
              search={search}             setSearch={setSearch}
              filterEstado={filterEstado} setFilterEstado={setFilterEstado}
              filterArea={filterArea}     setFilterArea={setFilterArea}
              filterTipo={filterTipo}     setFilterTipo={setFilterTipo}
              selected={selected}
              selectedBien={selectedBien}
              onRowClick={handleRowClick}
              onCheck={handleCheck}
              onCheckAll={handleCheckAll}
              onClearFilters={handleClearFilters}
              onEdit={(bien) => { setBienToEdit(bien); setShowModal(true); }}
              onClone={(bien) => {
                const cloned = {
                  marca: bien.marca,
                  modelo: bien.modelo,
                  categoriaId: bien.categoriaId,
                  ubicacionId: bien.ubicacionId,
                  departamentoId: bien.departamentoId,
                  valor_estimado: bien.valor_estimado,
                  programa_adquisicion: bien.programa_adquisicion,
                  descripcion: bien.descripcion,
                  especificaciones: { ...bien.especificaciones },
                  estado: bien.estado,
                  serial: '',
                  etiqueta: ''
                };
                setBienToEdit(cloned);
                setShowModal(true);
              }}
              onBulkUpdate={handleBulkUpdate}
              onViewFicha={(bien) => setSelectedFichaBien(bien)}
              onRestore={handleRestoreBien}
              onDeletePermanent={handleDeletePermanent}
              onPrintBulkLabels={handlePrintBulkLabels}
              onStatusChange={handleUpdateStatus}
              isAdmin={usuario?.rol === 'ADMINISTRADOR'}
              configuracion={configuracion}
            />
          )}

          {/* ── SECCIONES EN CONSTRUCCIÓN ────────────────────────── */}
          {activeNav === 'panel' && (
            <Dashboard
              bienes={bienes}
              categorias={categorias}
              ubicaciones={ubicaciones}
              mantenimientos={mantenimientos}
              onNavChange={handleNavChange}
              onOpenModal={() => { setBienToEdit(null); setShowModal(true); }}
              onOpenScanner={() => setShowScannerModal(true)}
              showToast={showToast}
              onKpiClick={(status) => {
                setActiveNav('inventario');
                if (status === 'total') {
                  setFilterEstado('');
                } else {
                  setFilterEstado(status);
                }
              }}
              isAdmin={usuario?.rol === 'ADMINISTRADOR'}
              usuario={usuario}
            />
          )}
          {/* ── CATÁLOGOS UNIFICADOS ─────────────────────────────── */}
          {activeNav === 'catalogos' && (
            <CatalogsPanel showToast={showToast} isAdmin={usuario?.rol === 'ADMINISTRADOR'} />
          )}

          {/* ── EXPEDIENTE DE PERSONAL CUSTODIO ─────────────────── */}
          {activeNav === 'personal' && (
            <PersonalExplorer
              departamentos={departamentos}
              showToast={showToast}
              refreshBienes={fetchData}
              isAdmin={usuario?.rol === 'ADMINISTRADOR'}
            />
          )}

          {/* ── CONTROL DE RESGUARDOS ────────────────────────────── */}
          {activeNav === 'resguardos' && (
            <ResguardosPanel
              bienes={bienes}
              showToast={showToast}
              refreshBienes={fetchData}
              configuracion={configuracion}
              activeCustodioId={activeResguardoCustodioId}
              onClearActiveCustodio={() => setActiveResguardoCustodioId(null)}
              isAdmin={usuario?.rol === 'ADMINISTRADOR'}
            />
          )}

          {/* ── CONTROL DE MANTENIMIENTO TÉCNICO ────────────────── */}
          {activeNav === 'mantenimientos' && (
            <MantenimientosPanel
              bienes={bienes}
              personal={personal}
              showToast={showToast}
              refreshBienes={fetchData}
              categorias={categorias}
              ubicaciones={ubicaciones}
              configuracion={configuracion}
              selectedPlanKey={selectedMantenimientoPlanKey}
              onClearSelectedPlanKey={() => setSelectedMantenimientoPlanKey(null)}
              preselectedBien={preselectedBienForMantenimiento}
              onClearPreselectedBien={() => setPreselectedBienForMantenimiento(null)}
              mantenimientoToFinalize={mantenimientoToFinalize}
              onClearMantenimientoToFinalize={() => setMantenimientoToFinalize(null)}
              isAdmin={usuario?.rol === 'ADMINISTRADOR'}
            />
          )}

          {/* ── CONFIGURACIÓN GLOBAL ─────────────────────────────── */}
          {activeNav === 'configuracion' && usuario?.rol === 'ADMINISTRADOR' && (
            <ConfiguracionPanel
              bienes={bienes}
              showToast={showToast}
              configuracion={configuracion}
              refreshConfig={fetchData}
            />
          )}

          {/* ── REPORTE E HISTORIAL DE BIENES ────────────────────── */}
          {activeNav === 'reportes' && (
            <ReportesPanel
              bienes={bienes}
              categorias={categorias}
              ubicaciones={ubicaciones}
              departamentos={departamentos}
              mantenimientos={mantenimientos}
              showToast={showToast}
              configuracion={configuracion}
            />
          )}

          {/* ── AUDITORÍA RÁPIDA POR UBICACIÓN ───────────────────── */}
          {activeNav === 'auditoria' && (
            <AuditoriaPanel
              bienes={bienes}
              ubicaciones={ubicaciones}
              showToast={showToast}
              refreshBienes={fetchData}
              configuracion={configuracion}
              isAdmin={usuario?.rol === 'ADMINISTRADOR'}
            />
          )}

          {/* ── VALES DE SALIDA Y PRÉSTAMOS TEMPORALES ───────────── */}
          {activeNav === 'vales' && (
            <ValesPanel
              bienes={bienes}
              personal={personal}
              configuracion={configuracion}
              showToast={showToast}
              refreshBienes={fetchData}
              isAdmin={usuario?.rol === 'ADMINISTRADOR'}
            />
          )}

          {/* ── MOBILIARIO E INMOBILIARIO ─────────────────────────── */}
          {activeNav === 'inmobiliario' && (
            <InmobiliarioPanel
              personal={personal}
              ubicaciones={ubicaciones}
              departamentos={departamentos}
              configuracion={configuracion}
              showToast={showToast}
              isAdmin={usuario?.rol === 'ADMINISTRADOR'}
            />
          )}

          {/* ── CONSUMIBLES Y SUMINISTROS ─────────────────────────── */}
          {activeNav === 'consumibles' && (
            <ConsumiblesPanel
              personal={personal}
              ubicaciones={ubicaciones}
              departamentos={departamentos}
              configuracion={configuracion}
              showToast={showToast}
              bienes={bienes}
              isAdmin={usuario?.rol === 'ADMINISTRADOR'}
            />
          )}

          {activeNav === 'laboratorios' && (
            <LaboratoriosPanel
              ubicaciones={ubicaciones}
              bienes={bienes}
              showToast={showToast}
              isAdmin={usuario?.rol === 'ADMINISTRADOR'}
              onViewFicha={setSelectedFichaBien}
            />
          )}

        </div>
      </div>

      {/* ══ MODAL ════════════════════════════════════════════ */}
      {showModal && (
        <ModalNuevoBien
          initialData={bienToEdit}
          categorias={categorias}
          ubicaciones={ubicaciones}
          departamentos={departamentos}
          personal={personal}
          onClose={() => { setShowModal(false); setBienToEdit(null); }}
          onSave={handleSaveBien}
        />
      )}

      {selectedFichaBien && (
        <ModalFichaBien
          key={`ficha-${selectedFichaBien.id}-${selectedFichaBien.updatedAt || ''}`}
          bien={selectedFichaBien}
          bienes={bienes}
          onLinkMonitor={handleLinkMonitor}
          onUnlinkMonitor={handleUnlinkMonitor}
          onOpenFicha={setSelectedFichaBien}
          configuracion={configuracion}
          onEdit={(bien) => { 
            try {
              console.log('Parent onEdit triggered with:', bien);
              setBienToEdit(bien); 
              setSelectedFichaBien(null);
              setShowModal(true); 
            } catch (err) {
              alert('Error en onEdit (parent): ' + err.message);
              console.error(err);
            }
          }}
          onDelete={handleDeleteBien}
          onRestore={handleRestoreBien}
          onDeletePermanent={handleDeletePermanent}
          onUpdateImage={handleUpdateImage}
          isAdmin={usuario?.rol === 'ADMINISTRADOR'}
          savingImage={savingImage}
          onViewActaColectiva={(responsableId) => {
            setSelectedFichaBien(null);
            setActiveResguardoCustodioId(responsableId);
            setActiveNav('resguardos');
          }}
          onPrintLabel={handlePrintSingleLabel}
          onMaintenanceChange={(action, bien, extra) => {
            setSelectedFichaBien(null);
            if (action === 'send') {
              setPreselectedBienForMantenimiento(bien);
              setMantenimientoToFinalize(null);
              setActiveNav('mantenimientos');
            } else if (action === 'complete') {
              setPreselectedBienForMantenimiento(null);
              setMantenimientoToFinalize(extra);
              setActiveNav('mantenimientos');
            }
          }}
          onStatusChange={handleUpdateStatus}
        />
      )}

      {/* ══ MODAL LECTOR DE CÓDIGOS ══════════════════════════ */}
      {showScannerModal && (
        <ModalLectorCodigos
          bienes={bienes}
          onClose={() => setShowScannerModal(false)}
          onScan={handleScan}
        />
      )}

      {/* ══ MODAL IMPORTADOR MASIVO DE BIENES ════════════════ */}
      {showImportModal && (
        <ModalImportador
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            fetchData();
            setShowImportModal(false);
          }}
          bienes={bienes}
          categorias={categorias}
          ubicaciones={ubicaciones}
          departamentos={departamentos}
        />
      )}

      {/* ══ MODAL DE AUTOGENERACIÓN DE NÚMEROS EN LOTE ════════ */}
      {showAutogenerarModal && (
        <ModalAutogenerarLote
          configuracion={configuracion}
          selectedCount={selected.length}
          onClose={() => setShowAutogenerarModal(false)}
          onConfirm={(data) => {
            setShowAutogenerarModal(false);
            handleBulkUpdate({
              autogenerarNoInventario: true,
              plantilla: data.plantilla,
              correlativoInicial: data.correlativoInicial
            });
          }}
        />
      )}

      {/* ══ MODAL DE CONFIRMACIÓN DE BORRADO PERMANENTE ═══════ */}
      {bienToDeletePermanent && (
        <ModalConfirmarBorrado
          bien={bienToDeletePermanent}
          onClose={() => setBienToDeletePermanent(null)}
          onConfirm={handleConfirmDeletePermanent}
          isLoading={isDeletingPermanent}
        />
      )}

      {/* ══ CONTENEDOR DE IMPRESIÓN DE ETIQUETAS (OCULTO EN PANTALLA) ══ */}
      {bienesEtiquetasPrint.length > 0 && (() => {
        const rawHeader = configuracion.cabecera_etiqueta_impresion 
          ? configuracion.cabecera_etiqueta_impresion.replace('{siglas}', configuracion.siglas_institucion || 'UPEN')
          : `CONTROL INTERNO DE ACTIVO FIJO ${configuracion.siglas_institucion || 'UPEN'}`;
        const headerText = rawHeader.toUpperCase().startsWith("CONTROL INTERNO DE ACTIVO FIJO")
          ? `ACTIVO FIJO ${configuracion.siglas_institucion || 'UPEN'}`
          : rawHeader;

        if (isAvery) {
          // Chunk Avery labels into pages of 80
          const pages = [];
          for (let i = 0; i < bienesEtiquetasPrint.length; i += 80) {
            pages.push(bienesEtiquetasPrint.slice(i, i + 80));
          }

          return (
            <div className="print-pages-wrapper">
              {pages.map((pageLabels, pageIdx) => (
                <div key={pageIdx} className="print-labels-container">
                  {pageLabels.map((bien) => (
                    <div key={bien.id} className="printable-label">
                      <div className="label-inner-clean">
                        {configuracion.etiqueta_mostrar_cabecera !== 'false' && (
                          <div className="label-header-clean">
                            {headerText}
                          </div>
                        )}
                        {configuracion.etiqueta_mostrar_marca_modelo !== 'false' && (
                          <div className="label-details-clean">
                            {bien.marca} {bien.modelo}
                          </div>
                        )}
                        {!bien.etiqueta.startsWith('SIN-NUMERO-') ? (
                          <div 
                            className="label-barcode-clean" 
                            dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(bien.etiqueta, false) }} 
                          />
                        ) : (
                          <div className="label-barcode-clean" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', color: '#999', border: '1px dashed #ccc', borderRadius: '3px' }}>
                            [SIN NÚMERO]
                          </div>
                        )}
                        <div className="label-footer-clean">
                          <span className="label-code-clean" style={{ maxWidth: configuracion.etiqueta_mostrar_serial !== 'false' ? '55%' : '100%' }}>
                            {bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}
                          </span>
                          {configuracion.etiqueta_mostrar_serial !== 'false' && (
                            <span className="label-serial-clean">
                              S/N: {bien.serial || 'N/S'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        }

        // Standard custom label roll (non-Avery)
        return (
          <div className="print-labels-container">
            {bienesEtiquetasPrint.map((bien) => (
              <div key={bien.id} className="printable-label">
                <div className="label-inner-clean">
                  {configuracion.etiqueta_mostrar_cabecera !== 'false' && (
                    <div className="label-header-clean">
                      {headerText}
                    </div>
                  )}
                  {configuracion.etiqueta_mostrar_marca_modelo !== 'false' && (
                    <div className="label-details-clean">
                      {bien.marca} {bien.modelo}
                    </div>
                  )}
                  {!bien.etiqueta.startsWith('SIN-NUMERO-') ? (
                    <div 
                      className="label-barcode-clean" 
                      dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(bien.etiqueta, false) }} 
                    />
                  ) : (
                    <div className="label-barcode-clean" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', color: '#999', border: '1px dashed #ccc', borderRadius: '3px' }}>
                      [SIN NÚMERO]
                    </div>
                  )}
                  <div className="label-footer-clean">
                    <span className="label-code-clean" style={{ maxWidth: configuracion.etiqueta_mostrar_serial !== 'false' ? '55%' : '100%' }}>
                      {bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}
                    </span>
                    {configuracion.etiqueta_mostrar_serial !== 'false' && (
                      <span className="label-serial-clean">
                        S/N: {bien.serial || 'N/S'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ══ NOTIFICACIÓN TOAST ═══════════════════════════════ */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
