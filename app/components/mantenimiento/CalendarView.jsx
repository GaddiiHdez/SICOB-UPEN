'use client';
import React from 'react';
import { parsePeriodo } from './utils';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * CalendarView — Calendario mensual interactivo de mantenimientos
 * Props:
 *   calendarDate, mantenimientos, onPrevMonth, onNextMonth,
 *   onDayClick, onEventClick
 */
export default function CalendarView({
  calendarDate,
  mantenimientos,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  onEventClick,
}) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDayIdx = new Date(year, month, 1).getDay();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const getEventsForDate = (date) => {
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return mantenimientos.filter(m => {
      if (m.estado === 'Programado') {
        const periodo = parsePeriodo(m.descripcion);
        if (periodo) {
          const start = new Date(periodo.inicio); start.setHours(0, 0, 0, 0);
          const end = new Date(periodo.fin);       end.setHours(0, 0, 0, 0);
          return compareDate >= start && compareDate <= end;
        } else if (m.proximo_mantenimiento) {
          const d = new Date(m.proximo_mantenimiento); d.setHours(0, 0, 0, 0);
          return d.getTime() === compareDate.getTime();
        }
      }
      if (m.estado === 'En proceso' && m.fecha_mantenimiento) {
        const d = new Date(m.fecha_mantenimiento); d.setHours(0, 0, 0, 0);
        return d.getTime() === compareDate.getTime();
      }
      return false;
    });
  };

  const cells = [];
  for (let i = firstDayIdx - 1; i >= 0; i--) {
    cells.push({ day: prevMonthTotalDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthTotalDays - i) });
  }
  for (let i = 1; i <= totalDays; i++) {
    cells.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
  }

  const today = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Cabecera del Calendario */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-body, #F3F4F6)', padding: '12px 18px', borderRadius: 8, border: '1px solid var(--border)' }}>
        <button type="button" onClick={onPrevMonth} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 14 }}>◀</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{MESES[month]} {year}</div>
        <button type="button" onClick={onNextMonth} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 14 }}>▶</button>
      </div>

      {/* Nombres de los Días */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', paddingBottom: 6 }}>
        {DIAS_SEMANA.map(d => <div key={d} style={{ padding: '4px 0' }}>{d}</div>)}
      </div>

      {/* Cuadrícula de Celdas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((cell, idx) => {
          const isToday = today.getDate() === cell.date.getDate() &&
                          today.getMonth() === cell.date.getMonth() &&
                          today.getFullYear() === cell.date.getFullYear();
          const cellEvents = getEventsForDate(cell.date);
          return (
            <div
              key={idx}
              onClick={() => onDayClick(cell.date.toISOString().split('T')[0])}
              style={{
                minHeight: 100,
                background: cell.isCurrentMonth ? 'var(--bg-card, #FFFFFF)' : 'rgba(0,0,0,0.01)',
                opacity: cell.isCurrentMonth ? 1 : 0.45,
                border: isToday ? '2px solid var(--primary, #0D9488)' : '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                cursor: 'pointer',
                position: 'relative',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: isToday ? '0 0 8px rgba(13, 148, 136, 0.2)' : 'none'
              }}
              className="calendar-day-cell"
            >
              <div style={{
                fontSize: 12,
                fontWeight: isToday ? 800 : 600,
                color: isToday ? 'var(--primary, #0D9488)' : 'var(--text-muted, #9CA3AF)',
                alignSelf: 'flex-end',
                marginBottom: 2
              }}>
                {cell.day}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
                {cellEvents.map(m => {
                  const isPreventivo = m.tipo === 'Preventivo';
                  const isEnProceso = m.estado === 'En proceso';
                  let bgColor = 'rgba(13, 148, 136, 0.08)';
                  let textColor = 'var(--primary, #0D9488)';
                  let borderStyle = '1px solid rgba(13, 148, 136, 0.15)';
                  if (isEnProceso) {
                    bgColor = 'rgba(245, 158, 11, 0.08)';
                    textColor = '#D97706';
                    borderStyle = '1px solid rgba(245, 158, 11, 0.15)';
                  } else if (!isPreventivo) {
                    bgColor = 'rgba(239, 68, 68, 0.08)';
                    textColor = '#EF4444';
                    borderStyle = '1px solid rgba(239, 68, 68, 0.15)';
                  }
                  return (
                    <div
                      key={m.id}
                      onClick={e => { e.stopPropagation(); onEventClick(m); }}
                      style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 6px', borderRadius: 4,
                        background: bgColor, color: textColor, border: borderStyle,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        lineHeight: 1.2, textAlign: 'left'
                      }}
                      title={`${m.tipo} - ${m.bien.marca} ${m.bien.modelo} (${m.estado}): ${m.descripcion}`}
                    >
                      {isEnProceso ? '🛠️' : isPreventivo ? '🟢' : '🔴'} {m.bien.marca} {m.bien.modelo}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
