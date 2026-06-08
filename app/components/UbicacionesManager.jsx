'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * UbicacionesManager — Gestor Avanzado de Áreas y Edificios
 * Permite agrupar y visualizar las áreas físicas por Bloque/Edificio de forma gráfica,
 * previniendo redundancias y facilitando la administración del campus.
 */
export default function UbicacionesManager({ showToast }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (bloques) | 'table' (lista plana)
  
  // Buscador y filtros
  const [search, setSearch] = useState('');

  // Estados de Modal
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulario
  const [formId, setFormId] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formEdificio, setFormEdificio] = useState('');
  const [formEncargado, setFormEncargado] = useState('');
  const [formIcono, setFormIcono] = useState('🏫');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [toast, setToast] = useState(null);

  // Estados de Modal para Renombrar Bloque/Edificio
  const [showRenameBlockModal, setShowRenameBlockModal] = useState(false);
  const [blockToRename, setBlockToRename] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [renamingBlock, setRenamingBlock] = useState(false);

  const localShowToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
    if (showToast) showToast(msg, type);
  }, [showToast]);

  // Cargar Ubicaciones
  const fetchUbicaciones = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ubicaciones?_=${Date.now()}`);
      if (!res.ok) throw new Error('Error al cargar áreas y ubicaciones');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
      localShowToast('Error de conexión al cargar ubicaciones', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [localShowToast]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        fetchUbicaciones();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchUbicaciones]);

  // Lista de Edificios existentes para datalist
  const listaEdificios = useMemo(() => {
    const list = data.map(u => u.edificio?.trim()).filter(Boolean);
    return [...new Set(list)].sort();
  }, [data]);

  // Agrupamiento y filtrado de ubicaciones
  const filteredData = useMemo(() => {
    let list = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.nombre.toLowerCase().includes(q) ||
        (u.edificio || '').toLowerCase().includes(q) ||
        (u.encargado || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, search]);

  // Ubicaciones agrupadas por Edificio
  const agrupadoPorEdificio = useMemo(() => {
    const map = {};
    
    filteredData.forEach(u => {
      const bName = u.edificio?.trim() || 'Otros / Sin Edificio';
      if (!map[bName]) {
        map[bName] = {
          nombre: bName,
          esOtros: !u.edificio?.trim(),
          areas: []
        };
      }
      map[bName].areas.push(u);
    });

    // Ordenar edificios: primero los que tienen nombre, al final "Otros"
    return Object.values(map).sort((a, b) => {
      if (a.esOtros) return 1;
      if (b.esOtros) return -1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [filteredData]);

  // Abrir Modal de Creación/Edición
  const handleOpenModal = (item = null, presetEdificio = '') => {
    if (item) {
      setIsEdit(true);
      setFormId(item.id);
      setFormNombre(item.nombre);
      setFormEdificio(item.edificio || '');
      setFormEncargado(item.encargado || '');
      setFormIcono(item.icono || '🏫');
    } else {
      setIsEdit(false);
      setFormId(null);
      setFormNombre('');
      setFormEdificio(presetEdificio);
      setFormEncargado('');
      setFormIcono('🏫');
    }
    setShowEmojiPicker(false);
    setShowModal(true);
  };

  // Guardar Registro
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      alert('El nombre del área o aula es requerido.');
      return;
    }
    setSaving(true);
    try {
      const method = isEdit ? 'PUT' : 'POST';
      const payload = {
        nombre: formNombre.trim(),
        edificio: formEdificio.trim() || null,
        encargado: formEncargado.trim() || null,
        icono: formIcono.trim() || '🏫'
      };
      if (isEdit) {
        payload.id = formId;
      }

      const res = await fetch('/api/ubicaciones', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Error al guardar la ubicación');

      localShowToast(`Área ${isEdit ? 'actualizada' : 'registrada'} con éxito ✓`);
      setShowModal(false);
      fetchUbicaciones();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Registro
  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar el área "${nombre}"? Esta acción no se puede deshacer.`)) return;

    try {
      const res = await fetch(`/api/ubicaciones?id=${id}`, {
        method: 'DELETE'
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Error al eliminar la ubicación');

      localShowToast('Área física eliminada con éxito ✓');
      fetchUbicaciones();
    } catch (error) {
      alert(error.message || 'Error al eliminar');
    }
  };

  // Abrir Modal para Renombrar Bloque / Edificio
  const handleOpenRenameBlockModal = (nombreEdificio) => {
    setBlockToRename(nombreEdificio);
    setNewBlockName(nombreEdificio);
    setShowRenameBlockModal(true);
  };

  const handleRenameBlockSubmit = async (e) => {
    e.preventDefault();
    if (!newBlockName.trim() || newBlockName.trim() === blockToRename) {
      setShowRenameBlockModal(false);
      return;
    }
    setRenamingBlock(true);
    try {
      const res = await fetch('/api/ubicaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ antiguoEdificio: blockToRename, nuevoEdificio: newBlockName.trim() })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al renombrar el bloque');

      localShowToast('Edificio renombrado con éxito ✓');
      setShowRenameBlockModal(false);
      fetchUbicaciones();
    } catch (error) {
      alert(error.message);
    } finally {
      setRenamingBlock(false);
    }
  };

  // Eliminar Edificio / Bloque Completo y todas sus áreas
  const handleDeleteEdificio = async (nombreEdificio) => {
    if (!confirm(`¿Estás seguro de eliminar el bloque "${nombreEdificio}" y todas sus aulas/áreas asociadas? Esta acción no se puede deshacer.`)) return;

    try {
      const res = await fetch(`/api/ubicaciones?edificio=${encodeURIComponent(nombreEdificio)}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al eliminar el bloque');

      localShowToast('Edificio y todas sus áreas eliminados con éxito ✓');
      fetchUbicaciones();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={{ padding: '24px', width: '100%' }}>
      {/* ── BARRA SUPERIOR DE ACCIONES ────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        {/* Título */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 40, opacity: 0.9 }}>🏫</div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>
              Bloques, Edificios y Aulas
            </h2>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Gestión visual y jerárquica de la estructura física del campus
            </div>
          </div>
        </div>

        {/* Controles de Vista y Búsqueda */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Buscador */}
          <div className="search-input-wrap" style={{ minWidth: 240 }}>
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              placeholder="Buscar área o bloque..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Selector de Modo de Vista */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-body)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 2
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: viewMode === 'grid' ? '600' : '400',
                fontSize: 12,
                borderRadius: 'calc(var(--radius-md) - 2px)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: viewMode === 'grid' ? 'var(--shadow-sm)' : 'none'
              }}
              title="Vista de bloques agrupados por Edificio"
            >
              🏢 Edificios
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: viewMode === 'table' ? 'var(--bg-card)' : 'transparent',
                color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: viewMode === 'table' ? '600' : '400',
                fontSize: 12,
                borderRadius: 'calc(var(--radius-md) - 2px)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none'
              }}
              title="Vista de lista plana estándar"
            >
              📋 Lista Plana
            </button>
          </div>

          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            ＋ Nueva Área
          </button>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL ───────────────────────────────── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <div className="dash-pulse" style={{ margin: '0 auto 12px', width: 12, height: 12 }}></div>
          <div>Cargando distribución del campus...</div>
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <h3 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No se encontraron ubicaciones</h3>
          <p style={{ fontSize: 12, marginTop: 4 }}>Intenta ajustar la búsqueda o agrega un nuevo espacio físico.</p>
        </div>
      ) : viewMode === 'table' ? (
        /* VISTA LISTA PLANA ESTÁNDAR */
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre del Área / Aula</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edificio / Bloque</th>
                <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 240, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr 
                  key={row.id} 
                  style={{ 
                    borderBottom: idx === filteredData.length - 1 ? 'none' : '1px solid var(--border)',
                    transition: 'background-color 0.2s',
                  }}
                  className="hover-highlight"
                >
                  <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '18px' }}>{row.icono || '🏫'}</span>
                      <span>{row.nombre}</span>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ 
                      background: 'rgba(13, 148, 136, 0.08)', 
                      color: 'var(--primary)', 
                      padding: '4px 10px', 
                      borderRadius: 'var(--radius-md)',
                      fontWeight: '500',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      🏫 {row.edificio || 'Sin Edificio'}
                    </span>
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleOpenModal(row)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(13, 148, 136, 0.2)',
                          background: 'rgba(13, 148, 136, 0.1)',
                          color: 'var(--primary)',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                        className="btn-edit-action"
                        title="Editar área"
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(row.id, row.nombre)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#EF4444',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                        className="btn-delete-action"
                        title="Eliminar área"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* VISTA VISUAL AGRUPADA POR BLOQUES (EDIFICIOS) */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 24
        }}>
          {agrupadoPorEdificio.map(building => (
            <div
              key={building.nombre}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                animation: 'slideUp 0.3s ease-out'
              }}
              className="hover-card-effect"
            >
              {/* Encabezado del Edificio */}
              <div style={{
                background: 'var(--bg-body)',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🏫</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {building.nombre}
                  </span>

                  {/* Botones de acción rápidos para el Bloque/Edificio */}
                  {!building.esOtros && (
                    <div style={{ display: 'inline-flex', gap: 6, marginLeft: 6 }}>
                      <button
                        onClick={() => handleOpenRenameBlockModal(building.nombre)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.6, fontSize: 11, padding: '2px 4px', outline: 'none' }}
                        title="Renombrar bloque / edificio"
                        className="btn-edit-action"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteEdificio(building.nombre)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.6, fontSize: 11, padding: '2px 4px', color: '#EF4444', outline: 'none' }}
                        title="Eliminar bloque / edificio completo"
                        className="btn-delete-action"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: 'rgba(13, 148, 136, 0.1)',
                  color: 'var(--primary)',
                  padding: '2px 8px',
                  borderRadius: 12
                }}>
                  {building.areas.length} área{building.areas.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Listado de Aulas/Salones dentro de ese Edificio */}
              <div style={{
                flex: 1,
                padding: '12px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 280,
                overflowY: 'auto'
              }}>
                {building.areas.map(area => (
                  <div
                    key={area.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--bg-body)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: 12
                    }}
                    className="hover-highlight"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{area.icono || '🏫'} {area.nombre}</span>
                    </div>
                    {/* Botones de acción rápidos */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleOpenModal(area)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.7, padding: 4 }}
                        title="Editar área"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(area.id, area.nombre)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.7, padding: 4, color: '#EF4444' }}
                        title="Eliminar área"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón rápido para agregar área en este edificio */}
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--border)',
                background: 'var(--bg-card)',
                textAlign: 'center'
              }}>
                <button
                  onClick={() => handleOpenModal(null, building.esOtros ? '' : building.nombre)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  className="hover-highlight"
                >
                  ＋ Agregar Área en este Bloque
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL DE ADMINISTRACIÓN ───────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{isEdit ? '✏️ Editar Área / Ubicación' : '🏫 Registrar Nueva Ubicación'}</h3>
                <p className="modal-sub">Define las propiedades del espacio físico en el campus</p>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)} disabled={saving}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Nombre de la Ubicación */}
                <div>
                  <label className="form-label">Nombre del Área / Salón / Oficina</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Aula 102, Laboratorio de Redes, Cubículo A"
                    value={formNombre}
                    onChange={e => setFormNombre(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>

                {/* Edificio / Pabellón con Autocomplete (datalist) */}
                <div>
                  <label className="form-label">Edificio / Bloque / Pabellón</label>
                  <input
                    type="text"
                    className="form-input"
                    list="edificios-datalist"
                    placeholder="Selecciona uno existente o escribe uno nuevo..."
                    value={formEdificio}
                    onChange={e => setFormEdificio(e.target.value)}
                    disabled={saving}
                  />
                  <datalist id="edificios-datalist">
                    {listaEdificios.map(edif => (
                      <option key={edif} value={edif} />
                    ))}
                  </datalist>
                  <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                    El agrupamiento gráfico se realiza según el nombre exacto del edificio.
                  </span>
                </div>

                {/* Icono / Emoji de la Ubicación */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-body)',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      outline: 'none'
                    }}
                    className="hover-highlight"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '18px' }}>{formIcono}</span>
                      <span>Personalizar Icono / Emoji</span>
                    </div>
                    <span>{showEmojiPicker ? '▲ Ocultar' : '▼ Personalizar'}</span>
                  </button>

                  {showEmojiPicker && (
                    <div style={{ marginTop: 12, animation: 'slideDown 0.2s ease-out' }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Escribe o pega un emoji..."
                          value={formIcono}
                          onChange={e => setFormIcono(e.target.value)}
                          disabled={saving}
                          style={{ flex: 1, textAlign: 'center', fontSize: '20px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--bg-body)', padding: 8, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        {['🏫', '🔬', '🚪', '🏢', '📚', '💻', '🛠️', '🩺', '🎨', '🧪', '🧬', '🖥️', '🔊', '🔋', '🔌', '📡', '🌱', '🌍', '🍽️', '🏋️'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setFormIcono(emoji)}
                            disabled={saving}
                            style={{
                              fontSize: '18px',
                              padding: '4px 8px',
                              border: '1px solid var(--border)',
                              background: formIcono === emoji ? 'rgba(13, 148, 136, 0.15)' : 'var(--bg-card)',
                              borderColor: formIcono === emoji ? 'var(--primary)' : 'var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              transition: 'all 0.1s ease',
                            }}
                            className="emoji-quick-picker"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Premium para Renombrar Bloque / Edificio */}
      {showRenameBlockModal && (
        <div className="modal-overlay" onClick={() => setShowRenameBlockModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">✏️ Renombrar Edificio / Bloque</h3>
                <p className="modal-sub">Cambia el nombre agrupador para todas las áreas asociadas</p>
              </div>
              <button className="btn-icon" onClick={() => setShowRenameBlockModal(false)} disabled={renamingBlock}>✕</button>
            </div>

            <form onSubmit={handleRenameBlockSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Nombre Anterior:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={blockToRename}
                    disabled
                    style={{ opacity: 0.6, background: 'var(--bg-body)' }}
                  />
                </div>

                <div>
                  <label className="form-label">Nuevo Nombre:</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newBlockName}
                    onChange={e => setNewBlockName(e.target.value)}
                    required
                    disabled={renamingBlock}
                    placeholder="Ej. Edificio de Ciencias, Biblioteca General..."
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowRenameBlockModal(false)} disabled={renamingBlock}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={renamingBlock}>
                  {renamingBlock ? '⏳ Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Local */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
