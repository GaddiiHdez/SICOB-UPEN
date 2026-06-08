'use client';
import { useState, useCallback, useMemo } from 'react';

/**
 * useNotifications — Hook de notificaciones dinámicas del sistema
 *
 * Genera y gestiona las notificaciones del panel de alertas basándose
 * en el estado actual del inventario. Antes vivía como un bloque de
 * 108 líneas (useMemo `notifications`) inline en page.js (líneas 232–340).
 *
 * @param {{ bienes: Array, personal: Array, mantenimientos: Array, categorias: Array }} data
 * @returns {{ activeNotifications, dismissedNotifs, handleDismissNotif, handleClearAllNotifs }}
 */
export function useNotifications({ bienes, personal, mantenimientos, categorias }, showToast) {
  const [dismissedNotifs, setDismissedNotifs] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dismissed_notifications');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Genera la lista completa de notificaciones del sistema
  const notifications = useMemo(() => {
    const list = [];

    // 1. Bienes en mantenimiento
    bienes.filter(b => b.estado === 'Mantenimiento').forEach(b => {
      list.push({
        id: `mant-${b.id}`,
        type: 'warning',
        text: `Mantenimiento: El equipo ${b.nombre} requiere revisión técnica.`,
        time: 'Alerta de estado',
        icon: '🔧'
      });
    });

    // 2. Personal temporal (expediente incompleto)
    personal.filter(p => p.noRegistrado).forEach(p => {
      list.push({
        id: `temp-${p.id}`,
        type: 'info',
        text: `Expediente incompleto: ${p.nombre} requiere complementar información.`,
        time: 'Acción requerida',
        icon: '👤'
      });
    });

    // 3. Bienes dados de baja (resumen)
    const dadosDeBaja = bienes.filter(b => b.eliminado);
    if (dadosDeBaja.length > 0) {
      list.push({
        id: 'baja-summary',
        type: 'danger',
        text: `Inventario: Se registran ${dadosDeBaja.length} equipos dados de baja.`,
        time: 'Registro de auditoría',
        icon: '🗑️'
      });
    }

    // 4. Equipos en reserva (disponibles para asignar)
    const enReserva = bienes.filter(b => b.estado === 'En reserva');
    if (enReserva.length > 0) {
      list.push({
        id: 'reserva-summary',
        type: 'info',
        text: `Bodega: Hay ${enReserva.length} equipos en reserva esperando asignación.`,
        time: 'Disponibles',
        icon: '📦'
      });
    }

    // 5. Mantenimientos programados próximos o vencidos (ventana de 3 días)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date();
    limite.setDate(limite.getDate() + 3);
    limite.setHours(23, 59, 59, 999);

    mantenimientos
      .filter(m => m.estado === 'Programado' && m.proximo_mantenimiento && new Date(m.proximo_mantenimiento) <= limite)
      .forEach(m => {
        const fProg = new Date(m.proximo_mantenimiento);
        fProg.setHours(0, 0, 0, 0);
        const isOverdue = fProg < hoy;
        list.push({
          id: `sched-${m.id}`,
          type: isOverdue ? 'danger' : 'warning',
          text: isOverdue
            ? `Revisión VENCIDA: ${m.bien?.marca || 'Equipo'} ${m.bien?.modelo || ''} (${m.bien?.codigo_inventario || 'S/C'}) programada para el ${fProg.toLocaleDateString('es-MX')}.`
            : `Revisión programada: ${m.bien?.marca || 'Equipo'} ${m.bien?.modelo || ''} (${m.bien?.codigo_inventario || 'S/C'}) agendada para el ${fProg.toLocaleDateString('es-MX')}.`,
          time: isOverdue ? 'Aviso urgente' : 'Próxima revisión',
          icon: '⏰'
        });
      });

    // 6. Categorías sin stock en reserva
    const stockReserva = {};
    categorias.forEach(c => { stockReserva[c.nombre] = 0; });
    const activeBienes = bienes.filter(b => !b.eliminado);
    activeBienes.forEach(b => {
      if (b.estado === 'En reserva') {
        const catName = b.categoria || b.tipo || 'Otro';
        stockReserva[catName] = (stockReserva[catName] || 0) + 1;
      }
    });
    const categoriasConBienes = new Set(activeBienes.map(b => b.categoria || b.tipo));
    Object.entries(stockReserva).forEach(([cat, count]) => {
      if (count === 0 && categoriasConBienes.has(cat)) {
        list.push({
          id: `stock-empty-${cat}`,
          type: 'warning',
          text: `Bodega: La categoría "${cat}" no tiene equipos disponibles en reserva.`,
          time: 'Agotado',
          icon: '⚠️'
        });
      }
    });

    return list;
  }, [bienes, personal, mantenimientos, categorias]);

  // Solo las notificaciones no descartadas por el usuario
  const activeNotifications = useMemo(
    () => notifications.filter(n => !dismissedNotifs.includes(n.id)),
    [notifications, dismissedNotifs]
  );

  const persistDismissed = useCallback((updated) => {
    setDismissedNotifs(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dismissed_notifications', JSON.stringify(updated));
    }
  }, []);

  const handleDismissNotif = useCallback((e, id) => {
    e.stopPropagation();
    persistDismissed([...dismissedNotifs, id]);
  }, [dismissedNotifs, persistDismissed]);

  const handleClearAllNotifs = useCallback(() => {
    const updated = [...new Set([...dismissedNotifs, ...notifications.map(n => n.id)])];
    persistDismissed(updated);
    if (showToast) showToast('Bandeja de notificaciones vaciada', 'info');
  }, [dismissedNotifs, notifications, persistDismissed, showToast]);

  return {
    activeNotifications,
    dismissedNotifs,
    handleDismissNotif,
    handleClearAllNotifs
  };
}
