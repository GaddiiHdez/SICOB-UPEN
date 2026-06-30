'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * useDebounce — Retarda la actualización de un valor hasta que el usuario
 * deja de escribir por `delay` ms. Evita re-renders excesivos en búsquedas.
 */
function useDebounce(value, delay = 250) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
import { createPortal } from 'react-dom';
import { formatCurrency } from '@/lib/formatters';
import TabBar from '@/app/components/shared/TabBar';

// ── Sub-componentes del módulo ────────────────────────────────
import AgendaTab      from '@/app/components/mantenimiento/AgendaTab';
import TallerTab      from '@/app/components/mantenimiento/TallerTab';
import HistorialTab   from '@/app/components/mantenimiento/HistorialTab';
import ModalRegistrar from '@/app/components/mantenimiento/ModalRegistrar';
import ModalFinalizar from '@/app/components/mantenimiento/ModalFinalizar';
import ModalCalendario from '@/app/components/mantenimiento/ModalCalendario';
import ModalConstancia from '@/app/components/mantenimiento/ModalConstancia';
import ModalPlanMes   from '@/app/components/mantenimiento/ModalPlanMes';
import { parsePeriodo, cleanDescription } from '@/app/components/mantenimiento/utils';

const NOMBRES_TAREAS = {
  limpieza: 'Limpieza física externa e interna',
  sistemaOperativo: 'Actualización de Sistema Operativo',
  software: 'Instalación / Actualización de Software',
  componentes: 'Mejora de componentes (RAM, SSD, etc.)',
  hardware: 'Cambio de piezas o hardware dañado',
  diagnostico: 'Diagnóstico de rendimiento general',
};

const INIT_TAREAS = { limpieza: false, sistemaOperativo: false, software: false, componentes: false, hardware: false, diagnostico: false };

/**
 * MantenimientosPanel — Panel Operativo de Mantenimiento y Programación Preventiva
 * Orquesta los estados, la lógica de negocio y los sub-componentes del módulo.
 */
export default function MantenimientosPanel({
  bienes = [],
  personal = [],
  showToast,
  refreshBienes,
  categorias = [],
  ubicaciones = [],
  configuracion = {},
  selectedPlanKey = null,
  onClearSelectedPlanKey = null,
  preselectedBien = null,
  onClearPreselectedBien = null,
  mantenimientoToFinalize = null,
  onClearMantenimientoToFinalize = null,
  isAdmin = false,
}) {
  // ── Estados Principales ────────────────────────────────────
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState('agenda');
  const [isMounted, setIsMounted]           = useState(false);

  // Filtros de historial
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTipo, setFilterTipo]   = useState('');

  // Modales
  const [showScheduleModal, setShowScheduleModal]       = useState(false);
  const [showFinalizeModal, setShowFinalizeModal]       = useState(false);
  const [selectedMantenimiento, setSelectedMantenimiento] = useState(null);

  // Vista y calendario
  const [viewMode, setViewMode]                 = useState('list');
  const [calendarDate, setCalendarDate]         = useState(new Date());
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState(null);

  // Formulario de registro / programación
  const [formBienId, setFormBienId]                   = useState('');
  const [formTipo, setFormTipo]                       = useState('Preventivo');
  const [formDescripcion, setFormDescripcion]         = useState('');
  const [formEstado, setFormEstado]                   = useState('Programado');
  const [formFechaMantenimiento, setFormFechaMantenimiento] = useState(new Date().toISOString().split('T')[0]);
  const [formProximoMantenimiento, setFormProximoMantenimiento] = useState('');
  const [formTecnico, setFormTecnico]                 = useState('');
  const [formCosto, setFormCosto]                     = useState('');
  const [formLiberarResguardo, setFormLiberarResguardo] = useState(true);
  const [modoAsignacion, setModoAsignacion]           = useState('individual');
  const [ubicacionMasiva, setUbicacionMasiva]         = useState('');
  const [categoriaMasiva, setCategoriaMasiva]         = useState('');
  const [tareasMasivas, setTareasMasivas]             = useState(INIT_TAREAS);
  const [usarRangoFechas, setUsarRangoFechas]         = useState(false);
  const [formFechaFinMasivo, setFormFechaFinMasivo]   = useState('');

  // Búsqueda de bienes en formulario
  const [bienSearchQuery, setBienSearchQuery]   = useState('');
  const [showBienDropdown, setShowBienDropdown] = useState(false);

  // Formulario de finalizar
  const [finalizeDescripcion, setFinalizeDescripcion] = useState('');
  const [finalizeTecnico, setFinalizeTecnico]         = useState('');
  const [finalizeCosto, setFinalizeCosto]             = useState('');
  const [finalizeProximo, setFinalizeProximo]         = useState('');
  const [finalizeReasignar, setFinalizeReasignar]     = useState(true);

  // Agrupación de planes (acordeón)
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isEditing, setIsEditing]           = useState(false);
  const [editingGroup, setEditingGroup]     = useState(null);
  const [editingMantenimiento, setEditingMantenimiento] = useState(null);

  // PDF
  const [printMantenimiento, setPrintMantenimiento] = useState(null);
  const [printPlanMes, setPrintPlanMes]             = useState(null);

  // Debounce de la búsqueda: espera 250ms antes de filtrar para evitar
  // re-cálculos del useMemo en cada pulsación de tecla en listas grandes.
  const debouncedBienSearch = useDebounce(bienSearchQuery, 250);

  // ── Carga de datos ─────────────────────────────────────────
  const fetchMantenimientos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/mantenimientos?_=${Date.now()}`);
      if (!res.ok) throw new Error('Error al cargar mantenimientos');
      setMantenimientos(await res.json());
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Error al conectar con la base de datos de mantenimientos', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) fetchMantenimientos(); });
    return () => { active = false; };
  }, [fetchMantenimientos]);

  useEffect(() => {
    if (selectedPlanKey) {
      setActiveTab('agenda');
      setExpandedGroups(prev => ({ ...prev, [selectedPlanKey]: true }));
      setTimeout(() => {
        const element = document.getElementById(`plan-row-${selectedPlanKey}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.backgroundColor = 'rgba(0, 113, 106, 0.15)';
          setTimeout(() => {
            element.style.backgroundColor = '';
          }, 2500);
        }
      }, 300);

      if (onClearSelectedPlanKey) {
        onClearSelectedPlanKey();
      }
    }
  }, [selectedPlanKey, onClearSelectedPlanKey]);

  useEffect(() => {
    if (preselectedBien) {
      setIsEditing(false);
      setEditingGroup(null);
      resetForm();
      setFormBienId(preselectedBien.id);
      
      // Fallback robusto para nombre y etiqueta en caso de recibir objeto prisma crudo
      const nombre = preselectedBien.nombre || `${preselectedBien.marca || ''} ${preselectedBien.modelo || ''}`.trim() || 'Equipo';
      const etiqueta = preselectedBien.etiqueta || preselectedBien.codigo_inventario || '';
      const etiquetaText = (etiqueta && etiqueta.startsWith('SIN-NUMERO-')) ? 'S/N' : (etiqueta || 'S/N');
      
      setBienSearchQuery(`${nombre} (${etiquetaText})`);
      setFormLiberarResguardo(!!preselectedBien.responsableId);
      setFormEstado('En proceso');
      setFormTipo('Correctivo');
      setFormFechaMantenimiento(new Date().toISOString().split('T')[0]);
      setActiveTab('taller');
      setShowScheduleModal(true);
      
      // Diferir el limpiado en el padre para no interrumpir el montaje del componente
      const timer = setTimeout(() => {
        if (onClearPreselectedBien) onClearPreselectedBien();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [preselectedBien, onClearPreselectedBien]);

  useEffect(() => {
    if (mantenimientoToFinalize) {
      handleOpenFinalize(mantenimientoToFinalize);
      if (onClearMantenimientoToFinalize) onClearMantenimientoToFinalize();
    }
  }, [mantenimientoToFinalize, onClearMantenimientoToFinalize]);

  // ── KPIs ───────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30); hace30.setHours(0, 0, 0, 0);

    const enTaller   = mantenimientos.filter(m => m.estado === 'En proceso').length;
    const retrasados = mantenimientos.filter(m => {
      if (m.estado !== 'Programado' || !m.proximo_mantenimiento) return false;
      const f = new Date(m.proximo_mantenimiento); f.setHours(0, 0, 0, 0);
      return f < hoy;
    }).length;
    const costo30Dias = mantenimientos
      .filter(m => m.estado === 'Completado' && m.costo && new Date(m.fecha_mantenimiento) >= hace30)
      .reduce((s, m) => s + (m.costo || 0), 0);

    return { enTaller, retrasados, costo30Dias };
  }, [mantenimientos]);

  // ── Helpers ────────────────────────────────────────────────
  const getFullBien = useCallback(id => bienes.find(b => b.id === id) || {}, [bienes]);
  const getUbicacionName = useCallback(id => { const u = ubicaciones.find(x => x.id === id); return u ? u.nombre : 'General / Bodega'; }, [ubicaciones]);
  const getCategoriaName = useCallback(id => { const c = categorias.find(x => x.id === id); return c ? c.nombre : 'Sin Categoría'; }, [categorias]);

  const bienesDisponibles = useMemo(() => bienes.filter(b => b.estado !== 'Mantenimiento' && b.estado !== 'Baja' && !b.eliminado), [bienes]);

  const bienesBuscados = useMemo(() => {
    const q = debouncedBienSearch.trim().toLowerCase();
    if (!q) return bienesDisponibles;
    return bienesDisponibles.filter(b => {
      const etiqueta = b.etiqueta || b.codigo_inventario || '';
      const serial   = b.serial   || b.numero_serie     || '';
      const nombre   = b.nombre   || `${b.marca || ''} ${b.modelo || ''}`.trim() || '';
      const etq = etiqueta.startsWith('SIN-NUMERO-') ? 's/n sin numero' : etiqueta.toLowerCase();
      return nombre.toLowerCase().includes(q) || serial.toLowerCase().includes(q) || etq.includes(q);
    });
  }, [bienesDisponibles, debouncedBienSearch]);

  const bienesAfectados = useMemo(() => {
    if (modoAsignacion !== 'masivo') return [];
    if (!ubicacionMasiva && !categoriaMasiva) return [];
    return bienesDisponibles.filter(b => {
      const matchUbi = ubicacionMasiva ? String(b.ubicacionId) === String(ubicacionMasiva) : true;
      const matchCat = categoriaMasiva ? String(b.categoriaId) === String(categoriaMasiva) : true;
      return matchUbi && matchCat;
    });
  }, [bienesDisponibles, modoAsignacion, ubicacionMasiva, categoriaMasiva]);

  // ── Listados por pestaña ───────────────────────────────────
  const agendaMantenimientos = useMemo(() => mantenimientos.filter(m => m.estado === 'Programado'), [mantenimientos]);

  const groupedAgenda = useMemo(() => {
    const groups = {};
    agendaMantenimientos.forEach(m => {
      const key = `${m.proximo_mantenimiento || ''}_${m.tipo || ''}_${m.descripcion || ''}`;
      if (!groups[key]) {
        groups[key] = { key, proximo_mantenimiento: m.proximo_mantenimiento, tipo: m.tipo, descripcion: m.descripcion, items: [], ubicaciones: new Set() };
      }
      groups[key].items.push(m);
      const nombre = m.bien?.ubicacion?.nombre || getUbicacionName(getFullBien(m.bienId).ubicacionId);
      groups[key].ubicaciones.add(nombre);
    });
    return Object.values(groups).map(g => ({ ...g, ubicacionesList: Array.from(g.ubicaciones) }));
  }, [agendaMantenimientos, getFullBien, getUbicacionName]);

  const tallerMantenimientos   = useMemo(() => mantenimientos.filter(m => m.estado === 'En proceso'),  [mantenimientos]);

  const historialMantenimientos = useMemo(() => {
    let list = mantenimientos.filter(m => m.estado === 'Completado');
    if (filterTipo) list = list.filter(m => m.tipo === filterTipo);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => {
        if (!m.bien) return false;
        const etq = m.bien.codigo_inventario?.startsWith('SIN-NUMERO-') ? 's/n sin numero' : (m.bien.codigo_inventario || '').toLowerCase();
        return (m.descripcion || '').toLowerCase().includes(q) || (m.tecnico_encargado || '').toLowerCase().includes(q) ||
          etq.includes(q) || (m.bien.numero_serie || '').toLowerCase().includes(q) ||
          `${m.bien.marca || ''} ${m.bien.modelo || ''}`.toLowerCase().includes(q);
      });
    }
    return list;
  }, [mantenimientos, searchQuery, filterTipo]);

  // ── Acciones ───────────────────────────────────────────────
  const handleStartMaintenance = async (mant) => {
    try {
      const res = await fetch('/api/mantenimientos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mant.id, estado: 'En proceso', fecha_mantenimiento: new Date().toISOString(), liberarResguardo: true })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al iniciar'); }
      if (showToast) showToast('Mantenimiento iniciado. El equipo ingresó a Taller. ✓');
      await fetchMantenimientos();
      if (refreshBienes) await refreshBienes();
    } catch (error) { console.error(error); alert(error.message); }
  };

  const resetForm = () => {
    setFormBienId(''); setBienSearchQuery(''); setFormDescripcion(''); setFormTecnico('');
    setFormCosto(''); setFormProximoMantenimiento(''); setFormFechaFinMasivo('');
    setUsarRangoFechas(false); setUbicacionMasiva(''); setCategoriaMasiva('');
    setTareasMasivas(INIT_TAREAS); setModoAsignacion('individual');
    setEditingMantenimiento(null);
  };

  const handleOpenSchedule = (initialDate = '') => {
    setIsEditing(false); setEditingGroup(null); setEditingMantenimiento(null);
    resetForm();
    setFormEstado('Programado'); setFormTipo('Preventivo');
    if (initialDate) setFormProximoMantenimiento(initialDate);
    setShowScheduleModal(true);
  };

  const handleSelectBien = (bien) => {
    const etiqueta = bien.etiqueta || bien.codigo_inventario || '';
    const nombre   = bien.nombre   || `${bien.marca || ''} ${bien.modelo || ''}`.trim() || 'Equipo';
    setFormBienId(bien.id);
    setBienSearchQuery(`${nombre} (${etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : etiqueta})`);
    setShowBienDropdown(false);
    setFormLiberarResguardo(!!bien.responsableId);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();

    // Validación de rango de fechas
    if (formEstado === 'Programado' && usarRangoFechas) {
      if (!formProximoMantenimiento) { alert('Por favor selecciona la fecha de inicio.'); return; }
      if (!formFechaFinMasivo)       { alert('Por favor selecciona la fecha de término.'); return; }
      if (new Date(formFechaFinMasivo) < new Date(formProximoMantenimiento)) { alert('La fecha de término debe ser posterior o igual a la de inicio.'); return; }
    }

    const rangePrefix = (formEstado === 'Programado' && usarRangoFechas)
      ? `Periodo: ${formProximoMantenimiento} al ${formFechaFinMasivo}\n` : '';

    // — MODO EDICIÓN INDIVIDUAL —
    if (isEditing && editingMantenimiento) {
      const descripcionConstruida = rangePrefix + formDescripcion;
      try {
        if (showToast) showToast('Actualizando mantenimiento...', 'info');
        const payload = {
          id: editingMantenimiento.id,
          tipo: formTipo,
          descripcion: descripcionConstruida,
          estado: formEstado,
          tecnico_encargado: formTecnico || null,
          costo: formCosto ? parseFloat(formCosto) : null
        };
        if (formEstado === 'Programado') {
          payload.proximo_mantenimiento = formProximoMantenimiento ? new Date(formProximoMantenimiento).toISOString() : new Date().toISOString();
        } else {
          payload.fecha_mantenimiento = formFechaMantenimiento ? new Date(formFechaMantenimiento).toISOString() : new Date().toISOString();
          payload.proximo_mantenimiento = null;
        }

        const res = await fetch('/api/mantenimientos', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error || 'Error al actualizar el mantenimiento');
        }

        if (showToast) showToast('Mantenimiento actualizado con éxito ✓');
        setShowScheduleModal(false);
        setIsEditing(false);
        setEditingMantenimiento(null);
        resetForm();
        await fetchMantenimientos();
        if (refreshBienes) await refreshBienes();
      } catch (error) {
        console.error(error);
        alert(error.message || 'Error al actualizar el mantenimiento');
      }
      return;
    }

    // — MODO EDICIÓN DE PLAN —
    if (isEditing && editingGroup) {
      const descripcionConstruida = rangePrefix + formDescripcion;
      try {
        if (showToast) showToast('Actualizando plan de mantenimiento...', 'info');
        await Promise.all(editingGroup.items.map(async item => {
          const payload = { id: item.id, tipo: formTipo, descripcion: descripcionConstruida, estado: formEstado, tecnico_encargado: formTecnico || null, costo: formCosto ? parseFloat(formCosto) : null };
          if (formEstado === 'Programado') payload.proximo_mantenimiento = formProximoMantenimiento ? new Date(formProximoMantenimiento).toISOString() : new Date().toISOString();
          else { payload.fecha_mantenimiento = formFechaMantenimiento ? new Date(formFechaMantenimiento).toISOString() : new Date().toISOString(); payload.proximo_mantenimiento = null; }
          const res = await fetch('/api/mantenimientos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error(`Error al actualizar el mantenimiento del equipo ID ${item.bienId}`);
        }));
        if (showToast) showToast('Plan de mantenimiento actualizado con éxito ✓');
        setShowScheduleModal(false); setIsEditing(false); setEditingGroup(null); resetForm();
        await fetchMantenimientos(); if (refreshBienes) await refreshBienes();
      } catch (error) { console.error(error); alert(error.message || 'Error al actualizar el plan'); }
      return;
    }

    // — MODO MASIVO —
    if (modoAsignacion === 'masivo') {
      if (bienesAfectados.length === 0) { alert('No hay equipos que coincidan con los filtros.'); return; }
      const tareasChecked = Object.keys(tareasMasivas).filter(k => tareasMasivas[k]).map(k => NOMBRES_TAREAS[k]);
      if (tareasChecked.length === 0) { alert('Por favor selecciona al menos una tarea del checklist.'); return; }
      const descripcionConstruida = rangePrefix + 'Tareas planificadas:\n' + tareasChecked.map(t => `- ${t}`).join('\n') + (formDescripcion.trim() ? `\n\nNotas adicionales:\n${formDescripcion}` : '');
      try {
        const payload = { esLote: true, bienIds: bienesAfectados.map(b => b.id), tipo: formTipo, descripcion: descripcionConstruida, estado: formEstado, liberarResguardo: formLiberarResguardo, tecnico_encargado: formTecnico || null, costo: formCosto ? parseFloat(formCosto) : null };
        if (formEstado === 'Programado') { payload.proximo_mantenimiento = formProximoMantenimiento ? new Date(formProximoMantenimiento).toISOString() : new Date().toISOString(); payload.fecha_mantenimiento = new Date().toISOString(); }
        else { payload.fecha_mantenimiento = formFechaMantenimiento ? new Date(formFechaMantenimiento).toISOString() : new Date().toISOString(); payload.proximo_mantenimiento = null; }
        const res = await fetch('/api/mantenimientos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al registrar mantenimiento masivo'); }
        if (showToast) showToast(`Se programó mantenimiento para ${bienesAfectados.length} equipo(s) ✓`);
        setShowScheduleModal(false); resetForm(); await fetchMantenimientos(); if (refreshBienes) await refreshBienes();
      } catch (error) { console.error(error); alert(error.message || 'Error al guardar el lote'); }
    } else {
      // — MODO INDIVIDUAL —
      if (!formBienId)             { alert('Por favor selecciona un bien del catálogo.'); return; }
      if (!formDescripcion.trim()) { alert('Por favor ingresa una descripción.'); return; }
      const descripcionConstruida = rangePrefix + formDescripcion;
      try {
        const payload = { bienId: parseInt(formBienId, 10), tipo: formTipo, descripcion: descripcionConstruida, estado: formEstado, liberarResguardo: formLiberarResguardo, tecnico_encargado: formTecnico || null, costo: formCosto ? parseFloat(formCosto) : null };
        if (formEstado === 'Programado') { payload.proximo_mantenimiento = formProximoMantenimiento ? new Date(formProximoMantenimiento).toISOString() : new Date().toISOString(); payload.fecha_mantenimiento = new Date().toISOString(); }
        else { payload.fecha_mantenimiento = formFechaMantenimiento ? new Date(formFechaMantenimiento).toISOString() : new Date().toISOString(); payload.proximo_mantenimiento = null; }
        const res = await fetch('/api/mantenimientos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al registrar mantenimiento'); }
        if (showToast) showToast(formEstado === 'Programado' ? 'Revisión preventiva programada ✓' : 'Equipo enviado a taller ✓');
        setShowScheduleModal(false); resetForm(); await fetchMantenimientos(); if (refreshBienes) await refreshBienes();
      } catch (error) { console.error(error); alert(error.message || 'Error al guardar'); }
    }
  };

  const handleOpenFinalize = (mant) => {
    setSelectedMantenimiento(mant);
    setFinalizeDescripcion(mant.descripcion || '');
    setFinalizeTecnico(mant.tecnico_encargado || '');
    setFinalizeCosto(mant.costo || '');
    setFinalizeProximo(''); setFinalizeReasignar(true);
    setShowFinalizeModal(true);
  };

  const handleSaveFinalize = async (e) => {
    e.preventDefault();
    if (!finalizeDescripcion.trim()) { alert('Por favor describe el diagnóstico o trabajo finalizado.'); return; }
    try {
      const payload = { id: selectedMantenimiento.id, estado: 'Completado', descripcion: finalizeDescripcion, tecnico_encargado: finalizeTecnico || null, costo: finalizeCosto ? parseFloat(finalizeCosto) : null, proximo_mantenimiento: finalizeProximo ? new Date(finalizeProximo).toISOString() : null, reasignar: finalizeReasignar, fecha_mantenimiento: new Date().toISOString() };
      const res = await fetch('/api/mantenimientos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al finalizar'); }
      if (showToast) showToast('Mantenimiento completado. Equipo devuelto a operación ✓');
      setShowFinalizeModal(false); setSelectedMantenimiento(null);
      await fetchMantenimientos(); if (refreshBienes) await refreshBienes();
    } catch (error) { console.error(error); alert(error.message || 'Error al finalizar'); }
  };

  const handleDeleteMantenimiento = async (id) => {
    if (!confirm('¿Deseas eliminar este registro? Si está en proceso, el equipo regresará al inventario.')) return;
    try {
      const res = await fetch(`/api/mantenimientos?id=${id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error al eliminar'); }
      if (showToast) showToast('Registro eliminado ✓');
      await fetchMantenimientos(); if (refreshBienes) await refreshBienes();
    } catch (error) { console.error(error); alert(error.message || 'Error al eliminar'); }
  };

  const handleStartPlan = async (group) => {
    if (!confirm(`¿Iniciar la reparación para los ${group.items.length} equipos de este plan?`)) return;
    try {
      if (showToast) showToast('Iniciando plan de mantenimiento...', 'info');
      await Promise.all(group.items.map(item =>
        fetch('/api/mantenimientos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, estado: 'En proceso', fecha_mantenimiento: new Date().toISOString(), liberarResguardo: true }) })
          .then(res => { if (!res.ok) throw new Error(`Error en equipo ID ${item.bienId}`); return res.json(); })
      ));
      if (showToast) showToast(`${group.items.length} equipos iniciados ✓`);
      await fetchMantenimientos(); if (refreshBienes) await refreshBienes();
    } catch (error) { console.error(error); alert(error.message); }
  };

  const handleDeletePlan = async (group) => {
    if (!confirm(`¿Cancelar y eliminar este plan? Se borrarán ${group.items.length} registros.`)) return;
    try {
      if (showToast) showToast('Cancelando plan...', 'info');
      await Promise.all(group.items.map(item =>
        fetch(`/api/mantenimientos?id=${item.id}`, { method: 'DELETE' }).then(res => { if (!res.ok) throw new Error(`Error al eliminar ID ${item.id}`); return res.json(); })
      ));
      if (showToast) showToast('Plan eliminado ✓');
      await fetchMantenimientos(); if (refreshBienes) await refreshBienes();
    } catch (error) { console.error(error); alert(error.message); }
  };

  const handleEditPlan = (group) => {
    setIsEditing(true); setEditingGroup(group);
    setFormTipo(group.tipo); setFormDescripcion(cleanDescription(group.descripcion));
    setFormEstado('Programado'); setFormTecnico(group.items[0]?.tecnico_encargado || ''); setFormCosto(group.items[0]?.costo || '');
    const periodo = parsePeriodo(group.descripcion);
    if (periodo) { setUsarRangoFechas(true); setFormProximoMantenimiento(periodo.inicioRaw); setFormFechaFinMasivo(periodo.finRaw); }
    else { setUsarRangoFechas(false); setFormProximoMantenimiento(group.proximo_mantenimiento ? new Date(group.proximo_mantenimiento).toISOString().split('T')[0] : ''); setFormFechaFinMasivo(''); }
    setModoAsignacion('individual'); setShowScheduleModal(true);
  };

  const handleEditIndividual = (mant) => {
    setIsEditing(true);
    setEditingGroup(null);
    setEditingMantenimiento(mant);
    setFormBienId(mant.bienId);
    setBienSearchQuery(mant.bien ? `${mant.bien.marca || ''} ${mant.bien.modelo || ''} (${mant.bien.codigo_inventario?.startsWith('SIN-NUMERO-') ? 'S/N' : mant.bien.codigo_inventario})` : 'Equipo individual');
    setFormTipo(mant.tipo);
    setFormDescripcion(cleanDescription(mant.descripcion));
    setFormEstado(mant.estado);
    setFormTecnico(mant.tecnico_encargado || '');
    setFormCosto(mant.costo || '');
    setFormFechaMantenimiento(mant.fecha_mantenimiento ? new Date(mant.fecha_mantenimiento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

    const periodo = parsePeriodo(mant.descripcion);
    if (periodo) {
      setUsarRangoFechas(true);
      setFormProximoMantenimiento(periodo.inicioRaw);
      setFormFechaFinMasivo(periodo.finRaw);
    } else {
      setUsarRangoFechas(false);
      setFormProximoMantenimiento(mant.proximo_mantenimiento ? new Date(mant.proximo_mantenimiento).toISOString().split('T')[0] : '');
      setFormFechaFinMasivo('');
    }

    setModoAsignacion('individual');
    setShowScheduleModal(true);
  };

  const toggleExpandGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>

      {/* Cabecera del Módulo */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="content-panel-label">Módulo de Mantenimiento</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 4 }}>Control Técnico e Historial Clínico</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Programa inspecciones preventivas, gestiona reparaciones activas y audita los costos patrimoniales.</p>
        </div>
        {isAdmin && (
          <button onClick={() => handleOpenSchedule()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 13 }}>
            🔧 Registrar / Programar
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        <div className="stat-card fade-in" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('taller')}>
          <div className="stat-icon stat-icon-orange">🛠️</div>
          <div className="stat-info"><div className="stat-label">En Taller (En proceso)</div><div className="stat-value">{kpis.enTaller}</div></div>
        </div>
        <div className="stat-card fade-in" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('agenda')}>
          <div className="stat-icon stat-icon-rose">⏰</div>
          <div className="stat-info">
            <div className="stat-label">Revisiones Vencidas</div>
            <div className="stat-value" style={{ color: kpis.retrasados > 0 ? 'var(--danger)' : 'inherit' }}>{kpis.retrasados}</div>
          </div>
        </div>
        <div className="stat-card fade-in" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('historial')}>
          <div className="stat-icon stat-icon-green">💰</div>
          <div className="stat-info"><div className="stat-label">Inversión (Últimos 30 días)</div><div className="stat-value">{formatCurrency(kpis.costo30Dias)}</div></div>
        </div>
      </div>

      {/* Panel con pestañas */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TabBar
          variant="underline"
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'agenda',    label: '📅 Agenda Preventiva',  count: agendaMantenimientos.length },
            { id: 'taller',    label: '🛠️ Equipos en Taller',  count: tallerMantenimientos.length },
            { id: 'historial', label: '📜 Historial Clínico' },
          ]}
        />

        <div style={{ flex: 1, padding: 24 }}>
          {loading && (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div className="dash-pulse" style={{ margin: '0 auto 12px', width: 12, height: 12 }}></div>
              <div>Sincronizando información técnica...</div>
            </div>
          )}

          {!loading && activeTab === 'agenda' && (
            <AgendaTab
              groupedAgenda={groupedAgenda}
              expandedGroups={expandedGroups}
              viewMode={viewMode}
              calendarDate={calendarDate}
              mantenimientos={mantenimientos}
              onToggleExpand={toggleExpandGroup}
              onStartPlan={handleStartPlan}
              onEditPlan={handleEditPlan}
              onDeletePlan={handleDeletePlan}
              onStartMaintenance={handleStartMaintenance}
              onDeleteMantenimiento={handleDeleteMantenimiento}
              onOpenPrintPlan={() => setPrintPlanMes({ mes: calendarDate.getMonth(), anio: calendarDate.getFullYear() })}
              onSetViewMode={setViewMode}
              onPrevMonth={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
              onNextMonth={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
              onDayClick={handleOpenSchedule}
              onEventClick={setSelectedCalendarEvent}
              getUbicacionName={getUbicacionName}
              getFullBien={getFullBien}
              isAdmin={isAdmin}
            />
          )}

          {!loading && activeTab === 'taller' && (
            <TallerTab
              tallerMantenimientos={tallerMantenimientos}
              onFinalize={handleOpenFinalize}
              onDelete={handleDeleteMantenimiento}
              onEdit={handleEditIndividual}
              isAdmin={isAdmin}
            />
          )}

          {!loading && activeTab === 'historial' && (
            <HistorialTab
              historialMantenimientos={historialMantenimientos}
              searchQuery={searchQuery}
              filterTipo={filterTipo}
              onSearchChange={setSearchQuery}
              onFilterChange={setFilterTipo}
              onPrintConstancia={setPrintMantenimiento}
              onDelete={handleDeleteMantenimiento}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>

      {/* Modales */}
      {/* Modales renderizados mediante React Portal en document.body para evitar problemas de contexto de apilamiento (Stacking Context) con la animación fade-in */}
      {isMounted && showScheduleModal && createPortal(
        <ModalRegistrar
          isEditing={isEditing}
          editingGroup={editingGroup}
          modoAsignacion={modoAsignacion}
          ubicaciones={ubicaciones}
          categorias={categorias}
          ubicacionMasiva={ubicacionMasiva}
          categoriaMasiva={categoriaMasiva}
          bienesAfectados={bienesAfectados}
          tareasMasivas={tareasMasivas}
          bienSearchQuery={bienSearchQuery}
          bienesBuscados={bienesBuscados}
          showBienDropdown={showBienDropdown}
          formTipo={formTipo}
          formEstado={formEstado}
          formDescripcion={formDescripcion}
          formProximoMantenimiento={formProximoMantenimiento}
          formFechaMantenimiento={formFechaMantenimiento}
          formFechaFinMasivo={formFechaFinMasivo}
          formTecnico={formTecnico}
          formCosto={formCosto}
          formLiberarResguardo={formLiberarResguardo}
          usarRangoFechas={usarRangoFechas}
          formBienId={formBienId}
          bienes={bienes}
          onClose={() => setShowScheduleModal(false)}
          onSubmit={handleSaveSchedule}
          onModoChange={setModoAsignacion}
          onUbicacionChange={setUbicacionMasiva}
          onCategoriaChange={setCategoriaMasiva}
          onTareaChange={(k, v) => setTareasMasivas(prev => ({ ...prev, [k]: v }))}
          onBienSearchChange={v => { setBienSearchQuery(v); setShowBienDropdown(true); if (!v) setFormBienId(''); }}
          onBienSearchFocus={() => setShowBienDropdown(true)}
          onSelectBien={handleSelectBien}
          onTipoChange={setFormTipo}
          onEstadoChange={setFormEstado}
          onDescripcionChange={setFormDescripcion}
          onProximoChange={setFormProximoMantenimiento}
          onFechaMantenimientoChange={setFormFechaMantenimiento}
          onFechaFinChange={setFormFechaFinMasivo}
          onTecnicoChange={setFormTecnico}
          onCostoChange={setFormCosto}
          onLiberarResguardoChange={setFormLiberarResguardo}
          onUsarRangoChange={setUsarRangoFechas}
        />,
        document.body
      )}

      {isMounted && showFinalizeModal && selectedMantenimiento && createPortal(
        <ModalFinalizar
          mantenimiento={selectedMantenimiento}
          finalizeDescripcion={finalizeDescripcion}
          finalizeTecnico={finalizeTecnico}
          finalizeCosto={finalizeCosto}
          finalizeProximo={finalizeProximo}
          finalizeReasignar={finalizeReasignar}
          onClose={() => { setShowFinalizeModal(false); setSelectedMantenimiento(null); }}
          onSubmit={handleSaveFinalize}
          onDescripcionChange={setFinalizeDescripcion}
          onTecnicoChange={setFinalizeTecnico}
          onCostoChange={setFinalizeCosto}
          onProximoChange={setFinalizeProximo}
          onReasignarChange={setFinalizeReasignar}
        />,
        document.body
      )}

      {isMounted && selectedCalendarEvent && createPortal(
        <ModalCalendario
          event={selectedCalendarEvent}
          onClose={() => setSelectedCalendarEvent(null)}
          onDelete={() => { const id = selectedCalendarEvent.id; setSelectedCalendarEvent(null); handleDeleteMantenimiento(id); }}
          onStart={() => { const ev = selectedCalendarEvent; setSelectedCalendarEvent(null); handleStartMaintenance(ev); }}
          onFinalize={() => { const ev = selectedCalendarEvent; setSelectedCalendarEvent(null); handleOpenFinalize(ev); }}
          isAdmin={isAdmin}
        />,
        document.body
      )}

      {isMounted && printMantenimiento && createPortal(
        <ModalConstancia
          mantenimiento={printMantenimiento}
          configuracion={configuracion}
          getFullBien={getFullBien}
          getUbicacionName={getUbicacionName}
          getCategoriaName={getCategoriaName}
          showToast={showToast}
          onClose={() => setPrintMantenimiento(null)}
        />,
        document.body
      )}

      {isMounted && printPlanMes && createPortal(
        <ModalPlanMes
          planMes={printPlanMes}
          mantenimientos={mantenimientos}
          configuracion={configuracion}
          getFullBien={getFullBien}
          getUbicacionName={getUbicacionName}
          showToast={showToast}
          onClose={() => setPrintPlanMes(null)}
        />,
        document.body
      )}

      {/* Estilos de impresión */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body:not(.printing-labels) * { visibility: hidden; }
          body:not(.printing-labels) .print-modal-overlay {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; height: auto !important; background: #FFFFFF !important;
            visibility: visible !important; display: block !important; z-index: 99999 !important;
          }
          body:not(.printing-labels) .print-modal-overlay * { visibility: visible !important; }
          .print-no-print { display: none !important; }
          .print-scroll-override { overflow: visible !important; max-height: none !important; height: auto !important; display: block !important; position: relative !important; }
          #print-area-constancia, #print-area-plan {
            display: flex !important; flex-direction: column !important; min-height: 250mm !important;
            justify-content: space-between !important; padding: 10mm 15mm !important;
            box-sizing: border-box !important; background: #FFFFFF !important; margin: 0 !important;
          }
          .print-table-compact { width: 100% !important; border-collapse: collapse !important; margin-top: 15px !important; margin-bottom: 15px !important; }
          .print-table-compact th, .print-table-compact td { border: 1px solid #111827 !important; padding: 6px 8px !important; font-size: 10px !important; color: #111827 !important; }
          .print-signatures-block { margin-top: auto !important; page-break-inside: avoid !important; padding-top: 15px !important; }
          @page { size: letter portrait; margin: 10mm 10mm 10mm 10mm; }
        }
      `}} />
    </div>
  );
}
