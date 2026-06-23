'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function LaboratorioMapa({ selectedLab, isAdmin, onSaveSuccess, onViewFicha, showToast }) {
  const [cols, setCols] = useState(16);
  const [rows, setRows] = useState(12);
  const [furniture, setFurniture] = useState([]);
  const [pcs, setPcs] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Herramienta seleccionada: 'select' | 'table_h' | 'table_v' | 'chair' | 'door' | 'whiteboard' | { bienId }
  const [selectedTool, setSelectedTool] = useState('select');
  // Elemento seleccionado en el mapa: { type: 'furniture'|'pc', id: string|number }
  const [selectedElement, setSelectedElement] = useState(null);
  const [labelType, setLabelType] = useState('host'); // 'host' | 'ip' | 'codigo' | 'serie' | 'none'
  const [isSaving, setIsSaving] = useState(false);
  const [pcSearchQuery, setPcSearchQuery] = useState('');

  // Referencia al contenedor de la cuadrícula para el cálculo de arrastre
  const gridRef = useRef(null);
  const justDraggedRef = useRef(false);
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'furniture'|'pc', id, startX, startY, originalGridX, originalGridY }

  const CELL_SIZE = 44; // Tamaño de celda en píxeles ligeramente mayor para comodidad y legibilidad

  // Obtener bienes asignados al laboratorio actualmente
  const activeBienes = selectedLab?.ubicacion?.bienes || [];
  
  // Limpiar PCs huérfanas (casteando IDs a Number para evitar problemas de tipos)
  const currentPcs = pcs.filter(p => activeBienes.some(b => Number(b.id) === Number(p.bienId)));
  
  // Obtener bienes que no están colocados en el mapa (filtrando solo computadoras reales con coincidencia flexible de categoría)
  const unassignedBienes = activeBienes.filter(b => {
    const cat = (b.categoria?.nombre || b.categoria || '').toLowerCase();
    const isPC = cat.includes('comput') || cat.includes('laptop') || cat.includes('pc') || b.tipo === 'Desktop' || b.tipo === 'Laptop' || b.tipo === 'Computadora';
    const isPlaced = currentPcs.some(p => Number(p.bienId) === Number(b.id));
    return isPC && !isPlaced && !b.eliminado;
  });

  const filteredUnassignedBienes = unassignedBienes.filter(b => {
    const query = pcSearchQuery.trim().toLowerCase();
    if (!query) return true;
    
    const host = (b.especificaciones?.host || '').toLowerCase();
    const serial = (b.numero_serie || b.serial || '').toLowerCase();
    const code = (b.codigo_inventario || '').toLowerCase();
    const brand = (b.marca || '').toLowerCase();
    const model = (b.modelo || '').toLowerCase();
    
    return host.includes(query) || 
           serial.includes(query) || 
           code.includes(query) || 
           brand.includes(query) || 
           model.includes(query);
  });

  // Cargar layout desde la base de datos
  useEffect(() => {
    if (selectedLab) {
      let layout = { cols: 16, rows: 12, furniture: [], pcs: [] };
      if (selectedLab.layout) {
        try {
          const parsed = typeof selectedLab.layout === 'string'
            ? JSON.parse(selectedLab.layout)
            : selectedLab.layout;
          layout = { ...layout, ...parsed };
        } catch (e) {
          console.error('Error al parsear el layout del laboratorio:', e);
        }
      }
      setCols(layout.cols || 16);
      setRows(layout.rows || 12);
      setFurniture(layout.furniture || []);
      setPcs(layout.pcs || []);
      setSelectedElement(null);
      setSelectedTool('select');
    }
  }, [selectedLab]);

  // Guardar plano
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanPcs = pcs.filter(p => activeBienes.some(b => b.id === p.bienId));
      
      const payload = {
        id: selectedLab.id,
        nombre: selectedLab.nombre,
        codigo: selectedLab.codigo,
        capacidad: selectedLab.capacidad,
        so: selectedLab.so,
        software: selectedLab.software,
        red: selectedLab.red,
        observaciones: selectedLab.observaciones,
        ubicacionId: selectedLab.ubicacionId,
        layout: {
          cols,
          rows,
          furniture,
          pcs: cleanPcs
        }
      };

      const res = await fetch('/api/laboratorios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el plano');

      if (showToast) showToast('Distribución del laboratorio guardada exitosamente ✓');
      setIsEditing(false);
      if (onSaveSuccess) onSaveSuccess();
    } catch (error) {
      console.error(error);
      if (showToast) showToast(error.message || 'Error al guardar el plano', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancelar edición
  const handleCancel = () => {
    setIsEditing(false);
    if (selectedLab) {
      let layout = { cols: 16, rows: 12, furniture: [], pcs: [] };
      if (selectedLab.layout) {
        try {
          const parsed = typeof selectedLab.layout === 'string'
            ? JSON.parse(selectedLab.layout)
            : selectedLab.layout;
          layout = { ...layout, ...parsed };
        } catch (e) {}
      }
      setCols(layout.cols || 16);
      setRows(layout.rows || 12);
      setFurniture(layout.furniture || []);
      setPcs(layout.pcs || []);
    }
    setSelectedElement(null);
    setSelectedTool('select');
  };

  // Añadir mobiliario
  const addFurniture = (type) => {
    let newItem = {
      id: `${type}-${Date.now()}`,
      type,
      x: 2,
      y: 2,
      w: 1,
      h: 1,
      rot: 0
    };

    if (type === 'table_h') {
      newItem.w = 2;
      newItem.h = 1;
      newItem.type = 'table';
    } else if (type === 'table_v') {
      newItem.w = 1;
      newItem.h = 2;
      newItem.type = 'table';
    } else if (type === 'whiteboard') {
      newItem.w = 4;
      newItem.h = 1;
    } else if (type === 'screen') {
      newItem.w = 2;
      newItem.h = 1;
    }

    setFurniture(prev => [...prev, newItem]);
    setSelectedElement({ type: 'furniture', id: newItem.id });
    setSelectedTool('select');
  };

  // Seleccionar PC para ubicar
  const selectPcToPlace = (bienId) => {
    setSelectedTool({ bienId });
    setSelectedElement(null);
  };

  // Manejar clic en celda de la cuadrícula
  const handleGridCellClick = (x, y) => {
    if (!isEditing) return;

    if (selectedTool && selectedTool.bienId) {
      const bienId = selectedTool.bienId;
      if (pcs.some(p => p.bienId === bienId)) return;

      const occupied = pcs.some(p => p.x === x && p.y === y);
      if (occupied) {
        if (showToast) showToast('Ya hay un equipo colocado en esta posición', 'info');
        return;
      }

      const newPc = {
        bienId,
        x,
        y,
        rot: 0
      };

      setPcs(prev => [...prev, newPc]);
      setSelectedElement({ type: 'pc', id: bienId });
      setSelectedTool('select');
      return;
    }

    if (selectedTool === 'select') {
      setSelectedElement(null);
    }
  };

  // Rotar elemento seleccionado
  const handleRotateSelected = useCallback(() => {
    if (!selectedElement) return;

    if (selectedElement.type === 'furniture') {
      setFurniture(prev => prev.map(f => {
        if (f.id === selectedElement.id) {
          const newRot = (f.rot + 90) % 360;
          // Intercambiar dimensiones w/h para mesas en rotación
          let w = f.w;
          let h = f.h;
          if (f.type === 'table') {
            w = f.h;
            h = f.w;
          }
          return { ...f, rot: newRot, w, h };
        }
        return f;
      }));
    } else if (selectedElement.type === 'pc') {
      setPcs(prev => prev.map(p => {
        if (Number(p.bienId) === Number(selectedElement.id)) {
          return { ...p, rot: (p.rot + 90) % 360 };
        }
        return p;
      }));
    }
  }, [selectedElement]);

  // Eliminar elemento seleccionado
  const handleDeleteSelected = useCallback(() => {
    if (!selectedElement) return;

    if (selectedElement.type === 'furniture') {
      setFurniture(prev => prev.filter(f => f.id !== selectedElement.id));
      setSelectedElement(null);
    } else if (selectedElement.type === 'pc') {
      setPcs(prev => prev.filter(p => Number(p.bienId) !== Number(selectedElement.id)));
      setSelectedElement(null);
    }
  }, [selectedElement]);

  // Desplazar/Nudgear elemento por celdas individuales (D-pad y atajos de teclado)
  const handleNudgeSelected = useCallback((dx, dy) => {
    if (!selectedElement) return;
    const { type, id } = selectedElement;

    if (type === 'pc') {
      setPcs(prev => prev.map(p => {
        if (Number(p.bienId) === Number(id)) {
          const nx = Math.max(0, Math.min(cols - 1, p.x + dx));
          const ny = Math.max(0, Math.min(rows - 1, p.y + dy));
          return { ...p, x: nx, y: ny };
        }
        return p;
      }));
    } else if (type === 'furniture') {
      setFurniture(prev => prev.map(f => {
        if (f.id === id) {
          const nx = Math.max(0, Math.min(cols - f.w, f.x + dx));
          const ny = Math.max(0, Math.min(rows - f.h, f.y + dy));
          return { ...f, x: nx, y: ny };
        }
        return f;
      }));
    }
  }, [selectedElement, cols, rows]);

  // Iniciar arrastre de elemento
  const handleItemMouseDown = (e, itemType, itemId) => {
    if (!isEditing) return;
    e.stopPropagation();

    setSelectedElement({ type: itemType, id: itemId });
    setSelectedTool('select');

    let itemX, itemY;
    if (itemType === 'furniture') {
      const f = furniture.find(x => x.id === itemId);
      itemX = f.x;
      itemY = f.y;
    } else {
      const p = pcs.find(x => Number(x.bienId) === Number(itemId));
      itemX = p.x;
      itemY = p.y;
    }

    setDraggedItem({
      type: itemType,
      id: itemId,
      startX: e.clientX,
      startY: e.clientY,
      originalGridX: itemX,
      originalGridY: itemY
    });
  };

  // Manejar movimiento de arrastre
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggedItem || !gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const deltaX = e.clientX - draggedItem.startX;
      const deltaY = e.clientY - draggedItem.startY;

      const gridDeltaX = Math.round(deltaX / CELL_SIZE);
      const gridDeltaY = Math.round(deltaY / CELL_SIZE);

      let newX = draggedItem.originalGridX + gridDeltaX;
      let newY = draggedItem.originalGridY + gridDeltaY;

      let maxW = 1, maxH = 1;
      if (draggedItem.type === 'furniture') {
        const f = furniture.find(x => x.id === draggedItem.id);
        maxW = f.w;
        maxH = f.h;
      }

      newX = Math.max(0, Math.min(cols - maxW, newX));
      newY = Math.max(0, Math.min(rows - maxH, newY));

      if (draggedItem.type === 'furniture') {
        setFurniture(prev => prev.map(f => {
          if (f.id === draggedItem.id) {
            return { ...f, x: newX, y: newY };
          }
          return f;
        }));
      } else {
        setPcs(prev => prev.map(p => {
          if (Number(p.bienId) === Number(draggedItem.id)) {
            return { ...p, x: newX, y: newY };
          }
          return p;
        }));
      }
    };

    const handleMouseUp = () => {
      if (draggedItem) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 100);
      }
      setDraggedItem(null);
    };

    if (draggedItem) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedItem, cols, rows, furniture]);

  // Escuchar teclado para atajos rápidos
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Solo si hay un elemento seleccionado y estamos en modo edición
      if (!isEditing || !selectedElement) return;

      // Si el foco está en un input, select o textarea, no hacer nada
      if (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'SELECT' ||
        document.activeElement.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRotateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -1;
        if (e.key === 'ArrowDown') dy = 1;
        if (e.key === 'ArrowLeft') dx = -1;
        if (e.key === 'ArrowRight') dx = 1;
        handleNudgeSelected(dx, dy);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, selectedElement, handleRotateSelected, handleDeleteSelected, handleNudgeSelected]);

  const getBienDetails = (bienId) => {
    return activeBienes.find(b => b.id === bienId) || {};
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'Activo':
        return 'var(--primary)'; // Turquesa premium
      case 'Mantenimiento':
        return '#f59e0b'; // Ámbar/Naranja
      case 'Baja':
      case 'Malo':
        return '#ef4444'; // Rojo peligro
      default:
        return '#94a3b8'; // Slate
    }
  };

  const renderPcLabel = (bien) => {
    const specs = bien.especificaciones || {};
    switch (labelType) {
      case 'host':
        return specs.host || 'S/H';
      case 'ip':
        return specs.ip || 'S/IP';
      case 'codigo':
        return bien.codigo_inventario?.startsWith('SIN-NUMERO-') ? 'S/N' : bien.codigo_inventario;
      case 'serie':
        return bien.numero_serie || 'S/S';
      case 'none':
      default:
        return '';
    }
  };

  const renderQuickActions = (item, left, top) => {
    return (
      <div
        className="context-floating-toolbar"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: left,
          top: top,
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '30px',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          transition: draggedItem ? 'none' : 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Botón Rotar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRotateSelected();
          }}
          title="Rotar 90°"
          style={toolbarButtonStyle}
          className="toolbar-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
        </button>

        {/* Separador */}
        <div style={toolbarDividerStyle} />

        {/* D-Pad / Botones de Mover (Nudging) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNudgeSelected(-1, 0);
            }}
            title="Mover Izquierda (←)"
            style={toolbarNudgeButtonStyle}
            className="toolbar-nudge-btn"
          >
            ←
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNudgeSelected(0, -1);
              }}
              title="Mover Arriba (↑)"
              style={toolbarNudgeButtonStyle}
              className="toolbar-nudge-btn"
            >
              ↑
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNudgeSelected(0, 1);
              }}
              title="Mover Abajo (↓)"
              style={toolbarNudgeButtonStyle}
              className="toolbar-nudge-btn"
            >
              ↓
            </button>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNudgeSelected(1, 0);
            }}
            title="Mover Derecha (→)"
            style={toolbarNudgeButtonStyle}
            className="toolbar-nudge-btn"
          >
            →
          </button>
        </div>

        {/* Separador */}
        <div style={toolbarDividerStyle} />

        {/* Botón Borrar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteSelected();
          }}
          title="Eliminar (Supr)"
          style={{ ...toolbarButtonStyle, color: '#ef4444' }}
          className="toolbar-btn delete-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="fade-in">
      
      {/* Controles de Barra Superior Premium */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(0, 113, 106, 0.03) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        gap: 16,
        flexWrap: 'wrap',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Etiqueta PC:</span>
            <div style={{ display: 'inline-flex', padding: 3, background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              {['host', 'ip', 'codigo', 'serie', 'none'].map((type) => (
                <button
                  key={type}
                  onClick={() => setLabelType(type)}
                  style={{
                    background: labelType === type ? 'var(--primary)' : 'transparent',
                    color: labelType === type ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: '700',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s ease',
                    boxShadow: labelType === type ? '0 2px 4px rgba(0, 113, 106, 0.2)' : 'none'
                  }}
                >
                  {type === 'none' ? 'Ocultar' : type}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: '600', color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} /> Activo
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: '600', color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} /> Mantenimiento
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: '600', color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} /> Falla/Baja
            </span>
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-edit-plano"
                style={{
                  background: 'var(--bg-body)',
                  border: '1.5px solid var(--primary)',
                  color: 'var(--primary)',
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12.5,
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s'
                }}
              >
                ✏️ Editar Plano
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{
                    background: 'var(--primary)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12.5,
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(0, 113, 106, 0.2)',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1.5px solid var(--danger)',
                    color: 'var(--danger)',
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12.5,
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Grid del Editor y Panel Lateral de Ajustes */}
      <div style={{
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}>
        
        {/* Contenedor del Plano Plano CAD / Blueprint */}
        <div style={{
          flex: '1 1 600px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          padding: '24px 16px 20px',
          overflowX: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '460px',
          position: 'relative'
        }}>
          {/* Fila superior de coordenadas (Letras A, B, C...) */}
          <div style={{ display: 'flex', paddingLeft: 28, height: 22, width: cols * CELL_SIZE + 28 }}>
            {Array.from({ length: cols }).map((_, idx) => (
              <div
                key={`col-coord-${idx}`}
                style={{
                  width: CELL_SIZE,
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: 'var(--primary)',
                  fontFamily: 'monospace',
                  opacity: 0.85,
                  letterSpacing: '0.5px'
                }}
              >
                {String.fromCharCode(65 + idx)}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', width: cols * CELL_SIZE + 28 }}>
            {/* Columna izquierda de coordenadas (Números 1, 2, 3...) */}
            <div style={{ display: 'flex', flexDirection: 'column', width: 28, marginRight: 2 }}>
              {Array.from({ length: rows }).map((_, idx) => (
                <div
                  key={`row-coord-${idx}`}
                  style={{
                    height: CELL_SIZE,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: 'var(--primary)',
                    fontFamily: 'monospace',
                    opacity: 0.85
                  }}
                >
                  {idx + 1}
                </div>
              ))}
            </div>

            <div
              ref={gridRef}
              onClick={() => {
                if (!justDraggedRef.current) {
                  handleGridCellClick(-1, -1);
                }
              }}
              style={{
                position: 'relative',
                width: cols * CELL_SIZE,
                height: rows * CELL_SIZE,
                background: 'radial-gradient(circle at center, var(--bg-card) 0%, var(--bg-body) 100%)',
                borderRadius: '8px',
                border: '2.5px solid var(--border)',
                boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.06), var(--shadow-sm)',
                // Rejilla de CAD moderna con líneas principales y secundarias
                backgroundImage: `
                  linear-gradient(rgba(13, 148, 136, 0.15) 1.2px, transparent 1.2px),
                  linear-gradient(90deg, rgba(13, 148, 136, 0.15) 1.2px, transparent 1.2px),
                  linear-gradient(rgba(13, 148, 136, 0.05) 0.6px, transparent 0.6px),
                  linear-gradient(90deg, rgba(13, 148, 136, 0.05) 0.6px, transparent 0.6px)
                `,
                backgroundSize: `
                  ${CELL_SIZE}px ${CELL_SIZE}px,
                  ${CELL_SIZE}px ${CELL_SIZE}px,
                  ${CELL_SIZE / 4}px ${CELL_SIZE / 4}px,
                  ${CELL_SIZE / 4}px ${CELL_SIZE / 4}px
                `,
                backgroundPosition: '-0.6px -0.6px',
                userSelect: 'none',
                transition: 'all 0.3s ease'
              }}
            >
              {/* Celdas invisibles para clics interactivos */}
              {isEditing && Array.from({ length: cols }).map((_, cx) =>
                Array.from({ length: rows }).map((_, cy) => (
                  <div
                    key={`interactive-cell-${cx}-${cy}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!justDraggedRef.current) {
                        handleGridCellClick(cx, cy);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: cx * CELL_SIZE,
                      top: cy * CELL_SIZE,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      cursor: selectedTool && selectedTool.bienId ? 'cell' : 'default',
                      border: selectedTool && selectedTool.bienId ? '1px dashed rgba(0, 113, 106, 0.12)' : 'none',
                      zIndex: 1
                    }}
                  />
                ))
              )}

              {/* Mobiliario Técnico (Desks, Chairs, Doors, Whiteboards) */}
              {furniture.map((item) => {
                const isSelected = selectedElement && selectedElement.type === 'furniture' && selectedElement.id === item.id;
                
                // Renderizado con base en símbolos arquitectónicos
                if (item.type === 'table') {
                  const isH = item.w >= item.h;
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, 'furniture', item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={isSelected ? 'selected-item-glow' : ''}
                      style={{
                        position: 'absolute',
                        left: item.x * CELL_SIZE + 2,
                        top: item.y * CELL_SIZE + 2,
                        width: item.w * CELL_SIZE - 4,
                        height: item.h * CELL_SIZE - 4,
                        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(217, 119, 6, 0.05) 100%)',
                        border: isSelected ? '2px solid var(--primary)' : '1.5px solid #d97706',
                        borderRadius: 4,
                        cursor: isEditing ? 'move' : 'default',
                        transform: `rotate(${item.rot}deg)`,
                        transformOrigin: 'center center',
                        boxShadow: isSelected ? '0 0 10px rgba(0, 113, 106, 0.3)' : '0 2px 4px rgba(0,0,0,0.03)',
                        zIndex: isSelected ? 50 : 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: isEditing && isSelected ? 'visible' : 'hidden'
                      }}
                    >
                      {/* Ojal de cable izquierdo */}
                      <div style={{ position: 'absolute', left: isH ? 8 : '50%', top: isH ? '50%' : 8, transform: 'translate(-50%, -50%)', width: 6, height: 6, borderRadius: '50%', background: '#d97706', opacity: 0.4 }} />
                      {/* Ojal de cable derecho (solo si la mesa es de 2 celdas o más) */}
                      {(item.w > 1 || item.h > 1) && (
                        <div style={{ position: 'absolute', right: isH ? 8 : '50%', bottom: isH ? '50%' : 8, transform: 'translate(50%, 50%)', width: 6, height: 6, borderRadius: '50%', background: '#d97706', opacity: 0.4 }} />
                      )}
                      {/* Etiqueta de mesa en marca de agua */}
                      <span style={{ fontSize: '8.5px', fontWeight: '800', color: '#d97706', opacity: 0.6, letterSpacing: 0.5 }}>
                        MESA
                      </span>
                    </div>
                  );
                }

                if (item.type === 'chair') {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, 'furniture', item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={isSelected ? 'selected-item-glow' : ''}
                      style={{
                        position: 'absolute',
                        left: item.x * CELL_SIZE + 3,
                        top: item.y * CELL_SIZE + 3,
                        width: CELL_SIZE - 6,
                        height: CELL_SIZE - 6,
                        cursor: isEditing ? 'move' : 'default',
                        transform: `rotate(${item.rot}deg)`,
                        transformOrigin: 'center center',
                        zIndex: isSelected ? 50 : 2,
                        overflow: 'visible'
                      }}
                    >
                      {/* Símbolo CAD premium de una silla de oficina */}
                      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* Reposabrazos lateral izquierdo */}
                        <div style={{ position: 'absolute', left: 2, top: 12, width: 3, height: 16, borderRadius: 1.5, background: isSelected ? 'var(--primary)' : 'var(--text-secondary)', opacity: 0.6 }} />
                        {/* Reposabrazos lateral derecho */}
                        <div style={{ position: 'absolute', right: 2, top: 12, width: 3, height: 16, borderRadius: 1.5, background: isSelected ? 'var(--primary)' : 'var(--text-secondary)', opacity: 0.6 }} />
                        {/* Respaldo curvado */}
                        <div style={{
                          width: 24,
                          height: 7,
                          borderRadius: '4px 4px 2px 2px',
                          background: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                          border: isSelected ? '1.5px solid var(--primary)' : '1.5px solid var(--text-secondary)',
                          position: 'absolute',
                          top: 4,
                          zIndex: 3
                        }} />
                        {/* Cojín del asiento */}
                        <div style={{
                          width: 26,
                          height: 22,
                          borderRadius: '6px 6px 10px 10px',
                          background: isSelected ? 'rgba(0, 113, 106, 0.15)' : 'var(--bg-card)',
                          border: isSelected ? '1.8px solid var(--primary)' : '1.5px solid var(--text-secondary)',
                          boxShadow: isSelected ? '0 0 8px rgba(0, 113, 106, 0.2)' : 'none',
                          position: 'absolute',
                          top: 9,
                          zIndex: 2
                        }} />
                      </div>
                    </div>
                  );
                }

                if (item.type === 'door') {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, 'furniture', item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={isSelected ? 'selected-item-glow' : ''}
                      style={{
                        position: 'absolute',
                        left: item.x * CELL_SIZE,
                        top: item.y * CELL_SIZE,
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        cursor: isEditing ? 'move' : 'default',
                        transform: `rotate(${item.rot}deg)`,
                        transformOrigin: 'center center',
                        zIndex: isSelected ? 50 : 2,
                        padding: 2,
                        overflow: 'visible'
                      }}
                    >
                      {/* Símbolo CAD de Puerta Abierta con radio de giro */}
                      <svg width="100%" height="100%" viewBox="0 0 40 40" fill="none">
                        {/* Bisagra/Eje */}
                        <rect x="0" y="0" width="4" height="40" fill="var(--danger)" opacity="0.3" />
                        {/* Puerta batiente */}
                        <rect x="0" y="36" width="40" height="4" fill="var(--danger)" opacity={isSelected ? 1 : 0.75} rx="1" stroke={isSelected ? 'var(--primary)' : 'none'} strokeWidth="1" />
                        {/* Arco de swing */}
                        <path d="M 0 0 A 36 36 0 0 1 36 36" stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
                      </svg>
                    </div>
                  );
                }

                if (item.type === 'whiteboard') {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, 'furniture', item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={isSelected ? 'selected-item-glow' : ''}
                      style={{
                        position: 'absolute',
                        left: item.x * CELL_SIZE + 2,
                        top: item.y * CELL_SIZE + 2,
                        width: item.w * CELL_SIZE - 4,
                        height: item.h * CELL_SIZE - 4,
                        cursor: isEditing ? 'move' : 'default',
                        transform: `rotate(${item.rot}deg)`,
                        transformOrigin: 'center center',
                        zIndex: isSelected ? 50 : 2,
                        overflow: 'visible'
                      }}
                    >
                      {/* Pizarra premium */}
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#ffffff',
                        border: isSelected ? '2px solid var(--primary)' : '1.8px solid #64748b',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
                        borderRadius: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                      }}>
                        <span style={{ fontSize: '8px', fontWeight: '800', color: '#475569', letterSpacing: '1px' }}>PIZARRA</span>
                        {/* Repisa para marcadores */}
                        <div style={{ position: 'absolute', bottom: -1, left: '25%', right: '25%', height: 2, background: '#475569', borderRadius: 1 }} />
                      </div>
                    </div>
                  );
                }

                if (item.type === 'screen') {
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => handleItemMouseDown(e, 'furniture', item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className={isSelected ? 'selected-item-glow' : ''}
                      style={{
                        position: 'absolute',
                        left: item.x * CELL_SIZE + 2,
                        top: item.y * CELL_SIZE + 2,
                        width: item.w * CELL_SIZE - 4,
                        height: item.h * CELL_SIZE - 4,
                        cursor: isEditing ? 'move' : 'default',
                        transform: `rotate(${item.rot}deg)`,
                        transformOrigin: 'center center',
                        zIndex: isSelected ? 50 : 2,
                        overflow: 'visible'
                      }}
                    >
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#1e293b',
                        border: isSelected ? '2px solid var(--primary)' : '1.8px solid #475569',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        padding: '2px'
                      }}>
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '8px',
                          fontWeight: '800',
                          letterSpacing: '0.5px'
                        }}>
                          🖥️ PANTALLA
                        </div>
                        <div style={{ position: 'absolute', bottom: 2, right: 6, width: 3, height: 3, borderRadius: '50%', background: '#10b981' }} />
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {/* Computadoras en Distribución CAD */}
              {currentPcs.map((item) => {
                const details = getBienDetails(item.bienId);
                const isSelected = selectedElement && selectedElement.type === 'pc' && selectedElement.id === item.bienId;
                const statusColor = getStatusColor(details.estado);

                return (
                  <div
                    key={`map-pc-${item.bienId}`}
                    onMouseDown={(e) => handleItemMouseDown(e, 'pc', item.bienId)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEditing) {
                        setSelectedElement({ type: 'pc', id: item.bienId });
                        setSelectedTool('select');
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (!isEditing && onViewFicha) {
                        onViewFicha(details);
                      }
                    }}
                    className={`interactive-pc-node ${isSelected ? 'selected-item-glow' : ''}`}
                    style={{
                      position: 'absolute',
                      left: item.x * CELL_SIZE + 5,
                      top: item.y * CELL_SIZE + 5,
                      width: CELL_SIZE - 10,
                      height: CELL_SIZE - 10,
                      cursor: isEditing ? 'move' : 'pointer',
                      zIndex: isSelected ? 50 : 3,
                      transform: `rotate(${item.rot}deg)`,
                      transformOrigin: 'center center',
                      transition: draggedItem?.id === item.bienId ? 'none' : 'transform 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'visible'
                    }}
                  >
                    {(() => {
                      // Obtener monitores vinculados a esta PC
                      const monitorId = details.especificaciones?.monitorId;
                      const monitorIds = details.especificaciones?.monitorIds || [];
                      const linkedMonitors = activeBienes.filter(m => {
                        const cat = (m.categoria?.nombre || m.categoria || '').toLowerCase();
                        const isMon = cat.includes('monitor') || m.tipo === 'Monitor';
                        return (
                          isMon &&
                          !m.eliminado &&
                          (m.especificaciones?.pcId === details.id ||
                           m.id === Number(monitorId) ||
                           monitorIds.map(Number).includes(m.id))
                        );
                      });
                      const numMonitors = linkedMonitors.length;

                      if (numMonitors === 2) {
                        return (
                          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" style={{ filter: isSelected ? 'drop-shadow(0 0 6px rgba(0,113,106,0.3))' : 'none' }}>
                            {/* Teclado */}
                            <rect x="5" y="24" width="24" height="6" rx="1.5" fill="var(--bg-card)" stroke={isSelected ? 'var(--primary)' : 'var(--text-secondary)'} strokeWidth="1" />
                            <line x1="8" y1="27" x2="26" y2="27" stroke="var(--text-secondary)" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />
                            {/* Mouse */}
                            <rect x="30" y="24" width="2.5" height="4.5" rx="1" fill={isSelected ? 'var(--primary)' : 'var(--text-secondary)'} />
                            
                            {/* Base doble */}
                            <path d="M 17 19 L 10 15 L 24 15 Z" fill="var(--border)" opacity="0.8" />
                            <ellipse cx="17" cy="19.5" rx="6" ry="1.5" fill="var(--text-secondary)" opacity="0.5" />

                            {/* Monitor Izquierdo (angulado) */}
                            <g transform="rotate(-12, 9, 10)">
                              <rect x="1" y="4" width="15" height="10" rx="1.5" fill="#1e293b" stroke={isSelected ? 'var(--primary)' : '#475569'} strokeWidth="0.8" />
                              <rect x="2" y="5" width="13" height="8" rx="0.5" fill={statusColor} opacity="0.85" />
                              <rect x="3" y="6" width="11" height="1" fill="rgba(255,255,255,0.3)" rx="0.5" />
                            </g>

                            {/* Monitor Derecho (angulado) */}
                            <g transform="rotate(12, 25, 10)">
                              <rect x="18" y="4" width="15" height="10" rx="1.5" fill="#1e293b" stroke={isSelected ? 'var(--primary)' : '#475569'} strokeWidth="0.8" />
                              <rect x="19" y="5" width="13" height="8" rx="0.5" fill={statusColor} opacity="0.85" />
                              <rect x="20" y="6" width="11" height="1" fill="rgba(255,255,255,0.3)" rx="0.5" />
                            </g>
                          </svg>
                        );
                      } else if (numMonitors >= 3) {
                        return (
                          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" style={{ filter: isSelected ? 'drop-shadow(0 0 6px rgba(0,113,106,0.3))' : 'none' }}>
                            {/* Teclado */}
                            <rect x="5" y="24" width="24" height="6" rx="1.5" fill="var(--bg-card)" stroke={isSelected ? 'var(--primary)' : 'var(--text-secondary)'} strokeWidth="1" />
                            <line x1="8" y1="27" x2="26" y2="27" stroke="var(--text-secondary)" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />
                            {/* Mouse */}
                            <rect x="30" y="24" width="2.5" height="4.5" rx="1" fill={isSelected ? 'var(--primary)' : 'var(--text-secondary)'} />
                            
                            {/* Base triple */}
                            <path d="M 17 19 L 6 15 L 28 15 Z" fill="var(--border)" opacity="0.8" />
                            <ellipse cx="17" cy="19.5" rx="6" ry="1.5" fill="var(--text-secondary)" opacity="0.5" />

                            {/* Monitor Izquierdo (Muy angulado) */}
                            <g transform="rotate(-22, 5, 11)">
                              <rect x="-2" y="5" width="11" height="8" rx="1" fill="#1e293b" stroke={isSelected ? 'var(--primary)' : '#475569'} strokeWidth="0.8" />
                              <rect x="-1" y="6" width="9" height="6" rx="0.5" fill={statusColor} opacity="0.8" />
                            </g>

                            {/* Monitor Centro (Plano) */}
                            <g>
                              <rect x="9" y="3" width="16" height="11" rx="1.5" fill="#1e293b" stroke={isSelected ? 'var(--primary)' : '#475569'} strokeWidth="0.8" />
                              <rect x="10.5" y="4.5" width="13" height="8" rx="0.5" fill={statusColor} opacity="0.85" />
                              <rect x="12" y="5.5" width="10" height="1" fill="rgba(255,255,255,0.3)" rx="0.5" />
                            </g>

                            {/* Monitor Derecho (Muy angulado) */}
                            <g transform="rotate(22, 29, 11)">
                              <rect x="25" y="5" width="11" height="8" rx="1" fill="#1e293b" stroke={isSelected ? 'var(--primary)' : '#475569'} strokeWidth="0.8" />
                              <rect x="26" y="6" width="9" height="6" rx="0.5" fill={statusColor} opacity="0.8" />
                            </g>
                          </svg>
                        );
                      } else {
                        return (
                          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" style={{ filter: isSelected ? 'drop-shadow(0 0 6px rgba(0,113,106,0.3))' : 'none' }}>
                            {/* Teclado */}
                            <rect x="5" y="24" width="24" height="6" rx="1.5" fill="var(--bg-card)" stroke={isSelected ? 'var(--primary)' : 'var(--text-secondary)'} strokeWidth="1" />
                            <line x1="8" y1="27" x2="26" y2="27" stroke="var(--text-secondary)" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />
                            {/* Mouse */}
                            <rect x="30" y="24" width="2.5" height="4.5" rx="1" fill={isSelected ? 'var(--primary)' : 'var(--text-secondary)'} />
                            {/* Base del Monitor */}
                            <rect x="13" y="15" width="8" height="5" fill="var(--border)" />
                            <ellipse cx="17" cy="19.5" rx="6" ry="1.5" fill="var(--text-secondary)" opacity="0.5" />
                            {/* Bezel de la Pantalla */}
                            <rect x="2" y="2" width="30" height="15" rx="2.5" fill="#1e293b" stroke={isSelected ? 'var(--primary)' : '#475569'} strokeWidth="1" />
                            {/* Pantalla Activa con color del estado */}
                            <rect x="3.5" y="3.5" width="27" height="12" rx="1" fill={statusColor} opacity="0.85" />
                            {/* Detalle reflejo de la pantalla */}
                            <rect x="5" y="5" width="24" height="1.5" fill="rgba(255,255,255,0.35)" rx="0.5" />
                          </svg>
                        );
                      }
                    })()}

                    {/* Mini Badge Flotante para Etiquetas */}
                    {labelType !== 'none' && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '8px',
                        fontWeight: '800',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        whiteSpace: 'nowrap',
                        zIndex: 5,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                        maxWidth: CELL_SIZE * 1.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {renderPcLabel(details)}
                      </div>
                    )}

                    {/* Tooltip Card Premium */}
                    {!isEditing && (() => {
                      const monitorId = details.especificaciones?.monitorId;
                      const monitorIds = details.especificaciones?.monitorIds || [];
                      const linkedMonitors = activeBienes.filter(m => {
                        const cat = m.categoria?.nombre || m.categoria || '';
                        const isMon = cat === 'Monitores' || m.tipo === 'Monitor';
                        return (
                          isMon &&
                          !m.eliminado &&
                          (m.especificaciones?.pcId === details.id ||
                           m.id === Number(monitorId) ||
                           monitorIds.map(Number).includes(m.id))
                        );
                      });
                      const isNearTop = item.y < 4;
                      return (
                        <div className={`pc-tooltip-card ${isNearTop ? 'tooltip-position-bottom' : ''}`}>
                          <div style={{
                            fontWeight: '800',
                            fontSize: '11.5px',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: 6,
                            marginBottom: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
                            {details.marca} {details.modelo}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
                            <span style={{ fontWeight: '700' }}>Host:</span> <span style={{ fontFamily: 'monospace', color: '#ffffff' }}>{details.especificaciones?.host || '—'}</span>
                            <span style={{ fontWeight: '700' }}>IP:</span> <span style={{ fontFamily: 'monospace', color: '#ffffff' }}>{details.especificaciones?.ip || '—'}</span>
                            <span style={{ fontWeight: '700' }}>S/N:</span> <span style={{ fontFamily: 'monospace', color: '#ffffff' }}>{details.numero_serie || '—'}</span>
                            <span style={{ fontWeight: '700' }}>Código:</span> <span style={{ color: '#ffffff' }}>{details.codigo_inventario?.startsWith('SIN-NUMERO-') ? 'S/N' : details.codigo_inventario}</span>
                            <span style={{ fontWeight: '700' }}>Estado:</span> <span style={{ color: statusColor, fontWeight: '800' }}>{details.estado}</span>
                            {linkedMonitors.length > 0 && (
                              <>
                                <span style={{ fontWeight: '700' }}>{linkedMonitors.length > 1 ? 'Monitores:' : 'Monitor:'}</span> 
                                <span style={{ color: '#5eead4', fontWeight: '600', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {linkedMonitors.map(m => (
                                    <span key={m.id}>🖥️ {m.marca} {m.modelo} ({m.numero_serie || 'S/N'})</span>
                                  ))}
                                </span>
                              </>
                            )}
                          </div>
                          <div style={{
                            fontSize: '8.5px',
                            color: 'rgba(255,255,255,0.4)',
                            textAlign: 'center',
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            paddingTop: 5,
                            marginTop: 8,
                            fontStyle: 'italic'
                          }}>
                            Doble clic para ver ficha técnica
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              {/* Contextual Floating Toolbar (Rendered at unrotated grid level) */}
              {isEditing && selectedElement && (() => {
                let item = null;
                if (selectedElement.type === 'furniture') {
                  item = furniture.find(f => f.id === selectedElement.id);
                } else if (selectedElement.type === 'pc') {
                  item = pcs.find(p => Number(p.bienId) === Number(selectedElement.id));
                }

                if (!item) return null;

                const itemW = selectedElement.type === 'pc' ? 1 : (item.w || 1);
                const itemH = selectedElement.type === 'pc' ? 1 : (item.h || 1);

                const pixelX = item.x * CELL_SIZE;
                const pixelY = item.y * CELL_SIZE;
                const pixelW = itemW * CELL_SIZE;
                const pixelH = itemH * CELL_SIZE;

                const isTopRow = item.y === 0;
                const toolbarTop = isTopRow ? (pixelY + pixelH + 8) : (pixelY - 52);
                const toolbarLeft = pixelX + pixelW / 2;

                return renderQuickActions(item, toolbarLeft, toolbarTop);
              })()}
            </div>
          </div>
        </div>

        {/* Panel Lateral Premium */}
        <div style={{
          flex: '1 1 280px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          {isEditing ? (
            /* PANEL DE EDICIÓN GLASSMORPHIC */
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(0, 113, 106, 0.02) 100%)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  🛠️ Editor de Distribución
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Modifica las dimensiones del laboratorio y arrastra elementos al plano.
                </p>
              </div>

              {/* Ajuste de Rejilla */}
              <div>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Tamaño de la Sala</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10.5, fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Columnas</label>
                    <input
                      type="number"
                      min={8}
                      max={26}
                      value={cols}
                      onChange={(e) => setCols(Math.max(8, Math.min(26, parseInt(e.target.value, 10) || 8)))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: 12.5,
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-body)',
                        color: 'var(--text-primary)',
                        fontWeight: '600'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10.5, fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Filas</label>
                    <input
                      type="number"
                      min={6}
                      max={20}
                      value={rows}
                      onChange={(e) => setRows(Math.max(6, Math.min(20, parseInt(e.target.value, 10) || 6)))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: 12.5,
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-body)',
                        color: 'var(--text-primary)',
                        fontWeight: '600'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Herramientas de Mobiliario */}
              <div>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Herramientas de Mobiliario</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button onClick={() => addFurniture('table_h')} style={toolboxButtonStyle}>
                    <span style={{ width: 14, height: 8, background: '#d97706', borderRadius: 1.5, opacity: 0.7 }} />
                    Mesa H (2x1)
                  </button>
                  <button onClick={() => addFurniture('table_v')} style={toolboxButtonStyle}>
                    <span style={{ width: 8, height: 14, background: '#d97706', borderRadius: 1.5, opacity: 0.7 }} />
                    Mesa V (1x2)
                  </button>
                  <button onClick={() => addFurniture('chair')} style={toolboxButtonStyle}>
                    <span style={{ fontSize: 12 }}>🪑</span>
                    Silla
                  </button>
                  <button onClick={() => addFurniture('door')} style={toolboxButtonStyle}>
                    <span style={{ fontSize: 12 }}>🚪</span>
                    Puerta
                  </button>
                  <button onClick={() => addFurniture('whiteboard')} style={{ gridColumn: 'span 2', ...toolboxButtonStyle }}>
                    <span style={{ width: 24, height: 6, background: '#ffffff', border: '1px solid #64748b', borderRadius: 1 }} />
                    Pizarra Blanca (4x1)
                  </button>
                  <button onClick={() => addFurniture('screen')} style={{ gridColumn: 'span 2', ...toolboxButtonStyle }}>
                    <span style={{ width: 16, height: 10, background: '#1e293b', border: '1px solid #475569', borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: 12, height: 6, background: '#0284c7', borderRadius: 0.5 }} />
                    </span>
                    Pantalla / Monitor (2x1)
                  </button>
                </div>
              </div>

              {/* Controles de Selección Activa */}
              {selectedElement && (
                <div style={{
                  background: 'var(--bg-body)',
                  border: '1px solid var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  boxShadow: '0 4px 10px rgba(0, 113, 106, 0.05)'
                }}>
                  <span style={{ fontSize: 11, fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Selección: {selectedElement.type === 'pc' ? 'Computadora' : 'Mobiliario'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleRotateSelected}
                      style={{
                        flex: 1,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        padding: '6px 10px',
                        fontSize: 11.5,
                        fontWeight: '700',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      🔄 Rotar 90°
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      style={{
                        flex: 1,
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                        padding: '6px 10px',
                        fontSize: 11.5,
                        fontWeight: '700',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      🗑️ Quitar
                    </button>
                  </div>
                </div>
              )}

              {/* Cajón de Computadoras sin Ubicar (Estilo Tarjetas) */}
              <div>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  {pcSearchQuery ? `PCs sin Colocar (${filteredUnassignedBienes.length} de ${unassignedBienes.length})` : `PCs sin Colocar (${unassignedBienes.length})`}
                </span>

                {/* Barra de Búsqueda Premium */}
                {unassignedBienes.length > 0 && (
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="Buscar por S/N, Código o Host..."
                      value={pcSearchQuery}
                      onChange={(e) => setPcSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 30px',
                        fontSize: '11.5px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-body)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        transition: 'all 0.15s ease'
                      }}
                      className="pc-search-input"
                    />
                    <svg 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="var(--text-secondary)" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        opacity: 0.7
                      }}
                    >
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    {pcSearchQuery && (
                      <button
                        onClick={() => setPcSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          padding: '2px 6px'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {unassignedBienes.length === 0 ? (
                  <div style={{
                    padding: 16,
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    background: 'var(--bg-body)'
                  }}>
                    <span style={{ fontSize: 18 }}>🎉</span>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      Todas las PCs colocadas.
                    </p>
                  </div>
                ) : filteredUnassignedBienes.length === 0 ? (
                  <div style={{
                    padding: 20,
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    background: 'var(--bg-body)'
                  }}>
                    <span style={{ fontSize: 16 }}>🔍</span>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      No se encontraron PCs coincidentes.
                    </p>
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '340px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingRight: 4
                  }}>
                    {filteredUnassignedBienes.map(b => {
                      const isSelectedTool = selectedTool && selectedTool.bienId === b.id;
                      return (
                        <div
                          key={`drawer-pc-${b.id}`}
                          onClick={() => selectPcToPlace(b.id)}
                          className="drawer-pc-card"
                          style={{
                            padding: '10px 12px',
                            border: isSelectedTool ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            background: isSelectedTool ? 'rgba(0, 113, 106, 0.05)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            position: 'relative',
                            boxShadow: isSelectedTool ? '0 2px 6px rgba(0, 113, 106, 0.08)' : 'none'
                          }}
                        >
                          {/* Indicador de arrastre */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.35 }}>
                            <div style={{ display: 'flex', gap: 2 }}><span style={dotStyle}/><span style={dotStyle}/></div>
                            <div style={{ display: 'flex', gap: 2 }}><span style={dotStyle}/><span style={dotStyle}/></div>
                            <div style={{ display: 'flex', gap: 2 }}><span style={dotStyle}/><span style={dotStyle}/></div>
                          </div>
                          
                          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: isSelectedTool ? 'var(--primary)' : 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              💻 {b.especificaciones?.host || b.marca}
                              {b.especificaciones?.host && (
                                <span style={{ fontSize: '9px', fontWeight: 'normal', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                  ({b.marca})
                                </span>
                              )}
                            </div>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1.5,
                              fontSize: '9.5px',
                              color: 'var(--text-secondary)',
                              paddingLeft: 2
                            }}>
                              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {b.modelo}
                              </div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span>S/N: <span style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: '500' }}>{b.numero_serie || '—'}</span></span>
                                {b.especificaciones?.ip && (
                                  <span>• IP: <span style={{ fontFamily: 'monospace', fontSize: '9px' }}>{b.especificaciones.ip}</span></span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            fontSize: '8.5px',
                            fontFamily: 'monospace',
                            color: isSelectedTool ? 'var(--primary)' : 'var(--text-secondary)',
                            background: isSelectedTool ? 'rgba(0, 113, 106, 0.08)' : 'var(--bg-body)',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            border: isSelectedTool ? '1px solid rgba(0, 113, 106, 0.2)' : '1px solid var(--border-light)',
                            fontWeight: '600',
                            alignSelf: 'flex-start'
                          }}>
                            {b.codigo_inventario?.startsWith('SIN-NUMERO-') ? 'S/N' : b.codigo_inventario}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {selectedTool && selectedTool.bienId && (
                  <div style={{
                    marginTop: 10,
                    fontSize: 10.5,
                    background: 'rgba(0, 113, 106, 0.08)',
                    border: '1.5px solid rgba(0, 113, 106, 0.2)',
                    padding: 10,
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--primary)',
                    textAlign: 'center',
                    fontWeight: '600',
                    lineHeight: 1.4
                  }}>
                    📍 Haz clic en cualquier celda de la cuadrícula para posicionar esta PC.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* DETALLE DE ELEMENTO SELECCIONADO (MODO VISOR) */
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(0, 113, 106, 0.02) 100%)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              padding: 20,
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: selectedElement && selectedElement.type === 'pc' ? 'flex-start' : 'center',
              alignItems: selectedElement && selectedElement.type === 'pc' ? 'stretch' : 'center',
              textAlign: selectedElement && selectedElement.type === 'pc' ? 'left' : 'center',
              gap: 14,
              backdropFilter: 'blur(10px)'
            }}>
              {selectedElement && selectedElement.type === 'pc' ? (
                <>
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>🖥️ Ficha de Red</h4>
                    <span style={{
                      display: 'inline-block',
                      background: getStatusColor(getBienDetails(selectedElement.id).estado),
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: '9.5px',
                      fontWeight: 800,
                      boxShadow: `0 2px 6px ${getStatusColor(getBienDetails(selectedElement.id).estado)}44`
                    }}>
                      {getBienDetails(selectedElement.id).estado}
                    </span>
                  </div>
                  
                  {(() => {
                    const b = getBienDetails(selectedElement.id);
                    const monitorId = b.especificaciones?.monitorId;
                    const monitorIds = b.especificaciones?.monitorIds || [];
                    const linkedMonitors = activeBienes.filter(m => {
                      const cat = m.categoria?.nombre || m.categoria || '';
                      const isMon = cat === 'Monitores' || m.tipo === 'Monitor';
                      return (
                        isMon &&
                        !m.eliminado &&
                        (m.especificaciones?.pcId === b.id ||
                         m.id === Number(monitorId) ||
                         monitorIds.map(Number).includes(m.id))
                      );
                    });
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Equipo:</strong> {b.marca} {b.modelo}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>No. Serie:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{b.numero_serie || '—'}</span></div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Cód. Inv:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{b.codigo_inventario?.startsWith('SIN-NUMERO-') ? 'S/N' : b.codigo_inventario}</span></div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Host:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: '700' }}>{b.especificaciones?.host || '—'}</span></div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Dirección IP:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: '700' }}>{b.especificaciones?.ip || '—'}</span></div>
                        <div>
                          <strong style={{ color: 'var(--text-secondary)' }}>🖥️ {linkedMonitors.length > 1 ? 'Monitores:' : 'Monitor:'}</strong>{' '}
                          {linkedMonitors.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, paddingLeft: 8 }}>
                              {linkedMonitors.map(monitor => (
                                <span key={monitor.id} style={{ color: 'var(--primary)', fontWeight: '600' }}>
                                  🖥️ {monitor.marca} {monitor.modelo} <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: '400' }}>(S/N: {monitor.numero_serie || '—'})</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sin monitor enlazado</span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => onViewFicha && onViewFicha(b)}
                          style={{
                            marginTop: 12,
                            width: '100%',
                            background: 'var(--primary)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 12,
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 10px rgba(0, 113, 106, 0.15)'
                          }}
                        >
                          🔍 Abrir Ficha Técnica
                        </button>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div style={{ color: 'var(--text-secondary)', padding: '10px 0' }}>
                  <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>🗺️</span>
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: '500', color: 'var(--text-primary)' }}>
                    Visualiza y Administra la Sala
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    Haz doble clic en una PC para ver su ficha técnica, o arrastra los equipos para reposicionarlos.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estilos CSS embebidos Premium */}
      <style jsx global>{`
        .interactive-pc-node {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }
        .interactive-pc-node:hover {
          transform: scale(1.15) !important;
          z-index: 100 !important;
        }
        .pc-tooltip-card {
          position: absolute;
          bottom: 135%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.96);
          backdrop-filter: blur(8px);
          color: #ffffff;
          padding: 10px 14px;
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          width: 190px;
          z-index: 999;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s, visibility 0.2s, transform 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .pc-tooltip-card.tooltip-position-bottom {
          bottom: auto;
          top: 135%;
        }
        .interactive-pc-node:hover .pc-tooltip-card {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(-2px);
        }
        .interactive-pc-node:hover .pc-tooltip-card.tooltip-position-bottom {
          transform: translateX(-50%) translateY(2px);
        }
        .btn-edit-plano:hover {
          background: var(--primary) !important;
          color: #ffffff !important;
          box-shadow: 0 4px 10px rgba(0, 113, 106, 0.15);
        }
        .drawer-pc-card:hover {
          border-color: var(--primary) !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
          transform: translateY(-1px);
        }
        .context-floating-toolbar {
          animation: slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translate(-50%, 4px) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .toolbar-btn {
          transition: all 0.15s ease;
        }
        .toolbar-btn:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          color: #ffffff !important;
          transform: scale(1.1);
        }
        .toolbar-btn:active {
          transform: scale(0.95);
        }
        .toolbar-btn.delete-btn:hover {
          background: rgba(239, 68, 68, 0.2) !important;
          color: #f87171 !important;
        }
        .toolbar-nudge-btn:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          color: #ffffff !important;
        }
        .toolbar-nudge-btn:active {
          transform: scale(0.9);
        }
        @keyframes select-pulse {
          0% {
            box-shadow: 0 0 8px rgba(0, 113, 106, 0.4);
            border-color: var(--primary) !important;
          }
          50% {
            box-shadow: 0 0 16px rgba(0, 113, 106, 0.8), inset 0 0 6px rgba(0, 113, 106, 0.2);
            border-color: #009688 !important;
          }
          100% {
            box-shadow: 0 0 8px rgba(0, 113, 106, 0.4);
            border-color: var(--primary) !important;
          }
        }
        .selected-item-glow {
          animation: select-pulse 1.8s infinite ease-in-out !important;
          border-width: 2px !important;
        }
        .pc-search-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15) !important;
          background: var(--bg-card) !important;
        }
      `}</style>
    </div>
  );
}

// Estilo de botones de caja de herramientas
const toolboxButtonStyle = {
  background: 'var(--bg-body)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  padding: '8px 10px',
  fontSize: '11px',
  fontWeight: '700',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 8,
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
};

// Estilo de puntitos para simular el agarre de arrastre
const dotStyle = {
  width: 2.5,
  height: 2.5,
  borderRadius: '50%',
  background: 'var(--text-secondary)'
};

// Estilos de la barra flotante de acciones rápidas
const toolbarButtonStyle = {
  background: 'transparent',
  border: 'none',
  color: '#cbd5e1',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  outline: 'none',
  padding: 0
};

const toolbarNudgeButtonStyle = {
  background: 'rgba(255, 255, 255, 0.08)',
  border: 'none',
  color: '#94a3b8',
  width: '18px',
  height: '18px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  fontWeight: 'bold',
  cursor: 'pointer',
  outline: 'none',
  padding: 0
};

const toolbarDividerStyle = {
  width: '1px',
  height: '18px',
  background: 'rgba(255, 255, 255, 0.15)'
};
