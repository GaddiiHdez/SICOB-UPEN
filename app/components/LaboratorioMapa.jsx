'use client';
import React, { useState, useEffect, useRef } from 'react';

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

  // Referencia al contenedor de la cuadrícula para el cálculo de arrastre
  const gridRef = useRef(null);
  const justDraggedRef = useRef(false);
  const [draggedItem, setDraggedItem] = useState(null); // { type: 'furniture'|'pc', id, startX, startY, originalGridX, originalGridY }

  const CELL_SIZE = 44; // Tamaño de celda en píxeles ligeramente mayor para comodidad y legibilidad

  // Obtener bienes asignados al laboratorio actualmente
  const activeBienes = selectedLab?.ubicacion?.bienes || [];
  
  // Limpiar PCs huérfanas
  const currentPcs = pcs.filter(p => activeBienes.some(b => b.id === p.bienId));
  
  // Obtener bienes que no están colocados en el mapa (filtrando solo computadoras reales)
  const unassignedBienes = activeBienes.filter(b => 
    (b.tipo === 'Desktop' || b.tipo === 'Laptop' || b.tipo === 'Computadora') && 
    !currentPcs.some(p => p.bienId === b.id)
  );

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
  const handleRotateSelected = () => {
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
        if (p.bienId === selectedElement.id) {
          return { ...p, rot: (p.rot + 90) % 360 };
        }
        return p;
      }));
    }
  };

  // Eliminar elemento seleccionado
  const handleDeleteSelected = () => {
    if (!selectedElement) return;

    if (selectedElement.type === 'furniture') {
      setFurniture(prev => prev.filter(f => f.id !== selectedElement.id));
      setSelectedElement(null);
    } else if (selectedElement.type === 'pc') {
      setPcs(prev => prev.filter(p => p.bienId !== selectedElement.id));
      setSelectedElement(null);
    }
  };

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
      const p = pcs.find(x => x.bienId === itemId);
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
          if (p.bienId === draggedItem.id) {
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

  const renderQuickActions = (item) => {
    return (
      <>
        {/* Botón Borrar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteSelected();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Eliminar"
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#ef4444',
            color: '#ffffff',
            border: '1.5px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 999,
            padding: 0,
            lineHeight: 1,
            '--counter-rot': `${-item.rot}deg`
          }}
          className="quick-action-btn"
        >
          ✕
        </button>
        {/* Botón Rotar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRotateSelected();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          title="Rotar"
          style={{
            position: 'absolute',
            bottom: -20,
            right: -20,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#ffffff',
            border: '1.5px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 999,
            padding: 0,
            lineHeight: 1,
            '--counter-rot': `${-item.rot}deg`
          }}
          className="quick-action-btn"
        >
          ⟳
        </button>
      </>
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
        flexWrap: 'wrap-reverse'
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
                  fontSize: 10,
                  fontWeight: '800',
                  color: 'var(--text-secondary)',
                  fontFamily: 'monospace',
                  opacity: 0.6
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
                    fontSize: 10,
                    fontWeight: '800',
                    color: 'var(--text-secondary)',
                    fontFamily: 'monospace',
                    opacity: 0.6
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
                background: 'var(--bg-body)',
                borderRadius: '8px',
                border: '2px solid var(--border)',
                boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.06)',
                // Rejilla de CAD moderna con líneas finas cruzadas
                backgroundImage: `
                  linear-gradient(var(--border) 0.8px, transparent 0.8px),
                  linear-gradient(90deg, var(--border) 0.8px, transparent 0.8px)
                `,
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                backgroundPosition: '-0.5px -0.5px',
                userSelect: 'none'
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
                      {isEditing && isSelected && renderQuickActions(item)}
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
                      {isEditing && isSelected && renderQuickActions(item)}
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
                      {isEditing && isSelected && renderQuickActions(item)}
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
                      {isEditing && isSelected && renderQuickActions(item)}
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
                      {isEditing && isSelected && renderQuickActions(item)}
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
                    {/* SVG Vectorial Premium del Computador Top-Down */}
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
                      const monitor = details.especificaciones?.monitorId 
                        ? activeBienes.find(m => m.id === Number(details.especificaciones.monitorId)) 
                        : null;
                      return (
                        <div className="pc-tooltip-card">
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
                            {monitor && (
                              <>
                                <span style={{ fontWeight: '700' }}>Monitor:</span> 
                                <span style={{ color: '#5eead4', fontWeight: '600' }}>
                                  🖥️ {monitor.marca} {monitor.modelo} ({monitor.numero_serie || 'S/N'})
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
                    {isEditing && isSelected && renderQuickActions(item)}
                  </div>
                );
              })}
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
                  PCs sin Colocar ({unassignedBienes.length})
                </span>
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
                ) : (
                  <div style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    paddingRight: 4
                  }}>
                    {unassignedBienes.map(b => {
                      const isSelectedTool = selectedTool && selectedTool.bienId === b.id;
                      return (
                        <div
                          key={`drawer-pc-${b.id}`}
                          onClick={() => selectPcToPlace(b.id)}
                          className="drawer-pc-card"
                          style={{
                            padding: '8px 12px',
                            border: isSelectedTool ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            background: isSelectedTool ? 'rgba(0, 113, 106, 0.05)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            position: 'relative'
                          }}
                        >
                          {/* Indicador de arrastre */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.35 }}>
                            <div style={{ display: 'flex', gap: 2 }}><span style={dotStyle}/><span style={dotStyle}/></div>
                            <div style={{ display: 'flex', gap: 2 }}><span style={dotStyle}/><span style={dotStyle}/></div>
                            <div style={{ display: 'flex', gap: 2 }}><span style={dotStyle}/><span style={dotStyle}/></div>
                          </div>
                          
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: isSelectedTool ? 'var(--primary)' : 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              💻 {b.especificaciones?.host || b.marca}
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                              {b.modelo}
                            </div>
                          </div>

                          <span style={{
                            fontSize: '9px',
                            fontFamily: 'monospace',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-body)',
                            padding: '1px 4px',
                            borderRadius: 3,
                            border: '1px solid var(--border-light)'
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
                    const monitor = b.especificaciones?.monitorId 
                      ? activeBienes.find(m => m.id === Number(b.especificaciones.monitorId)) 
                      : null;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Equipo:</strong> {b.marca} {b.modelo}</div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>No. Serie:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{b.numero_serie || '—'}</span></div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Cód. Inv:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{b.codigo_inventario?.startsWith('SIN-NUMERO-') ? 'S/N' : b.codigo_inventario}</span></div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Host:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: '700' }}>{b.especificaciones?.host || '—'}</span></div>
                        <div><strong style={{ color: 'var(--text-secondary)' }}>Dirección IP:</strong> <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: '700' }}>{b.especificaciones?.ip || '—'}</span></div>
                        <div>
                          <strong style={{ color: 'var(--text-secondary)' }}>🖥️ Monitor:</strong>{' '}
                          {monitor ? (
                            <span style={{ color: 'var(--primary)', fontWeight: '600' }}>
                              {monitor.marca} {monitor.modelo} <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: '400' }}>(S/N: {monitor.numero_serie || '—'})</span>
                            </span>
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
        .interactive-pc-node:hover .pc-tooltip-card {
          opacity: 1;
          visibility: visible;
          transform: translateX(-50%) translateY(-2px);
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
        .quick-action-btn {
          transform: rotate(var(--counter-rot, 0deg)) scale(1);
          transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease, border-color 0.15s ease !important;
        }
        .quick-action-btn:hover {
          transform: rotate(var(--counter-rot, 0deg)) scale(1.2) !important;
        }
        .quick-action-btn:active {
          transform: rotate(var(--counter-rot, 0deg)) scale(0.9) !important;
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
