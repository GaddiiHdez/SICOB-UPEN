'use client';
import { useState, useRef, useEffect } from 'react';
import { ESTADOS_BIEN } from '@/lib/constants';

/**
 * ModalNuevoBien — Formulario con pestañas para registrar/editar un bien.
 */
export default function ModalNuevoBien({ initialData, categorias, ubicaciones, departamentos, personal, onClose, onSave }) {
  const isEdit = !!initialData && !!initialData.id;
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para Registro Masivo en Lote
  const [esLote, setEsLote] = useState(false);
  const [cantidadLote, setCantidadLote] = useState(2);
  const [loteItems, setLoteItems] = useState([
    { numero_serie: '', codigo_inventario: '' },
    { numero_serie: '', codigo_inventario: '' }
  ]);
  const [pastedSerials, setPastedSerials] = useState('');

  const handleCantidadLoteChange = (val) => {
    const num = Math.max(1, Math.min(100, parseInt(val) || 1));
    setCantidadLote(num);
    setLoteItems(prev => {
      const copy = [...prev];
      if (copy.length < num) {
        while (copy.length < num) {
          copy.push({ numero_serie: '', codigo_inventario: '' });
        }
      } else if (copy.length > num) {
        copy.splice(num);
      }
      return copy;
    });
  };

  const handleLoteItemChange = (index, field, value) => {
    setLoteItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAutoFillSerials = () => {
    if (!pastedSerials.trim()) return;
    const list = pastedSerials
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
    
    if (list.length > 0) {
      setCantidadLote(list.length);
      setLoteItems(list.map(s => ({ numero_serie: s, codigo_inventario: '' })));
      setPastedSerials('');
    }
  };

  // Formatear fecha para el input type="date" (YYYY-MM-DD)
  const formatFecha = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const [form, setForm] = useState({
    marca: initialData?.marca || '',
    modelo: initialData?.modelo || '',
    serial: initialData?.serial || initialData?.numero_serie || '',
    etiqueta: (initialData?.etiqueta && typeof initialData.etiqueta === 'string' && !initialData.etiqueta.startsWith('SIN-NUMERO-')) 
      ? initialData.etiqueta 
      : ((initialData?.codigo_inventario && typeof initialData.codigo_inventario === 'string' && !initialData.codigo_inventario.startsWith('SIN-NUMERO-')) 
        ? initialData.codigo_inventario 
        : ''),
    estado: initialData?.estado || 'Activo',
    categoriaId: initialData?.categoriaId || (categorias[0]?.id ?? ''),
    ubicacionId: initialData?.ubicacionId || (ubicaciones[0]?.id ?? ''),
    departamentoId: initialData?.departamentoId || (departamentos[0]?.id ?? ''),
    descripcion: initialData?.descripcion || '',
    fecha_adquisicion: formatFecha(initialData?.fecha_adquisicion) || '',
    programa_adquisicion: initialData?.programa_adquisicion || '',
    valor_estimado: initialData?.valor_estimado || '',
    responsableId: initialData?.responsableId || '', // Vinculado a la asignación/personal
    responsableNombre: '',
    especificaciones: initialData?.especificaciones || {},
  });

  // Autocompletado de Custodios
  const [custodioSearch, setCustodioSearch] = useState(
    initialData?.responsable && initialData.responsable !== 'Sin asignar' ? initialData.responsable : ''
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const comboboxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-completar ubicación en base al departamento seleccionado
  useEffect(() => {
    let active = true;
    if (!isEdit && form.departamentoId) {
      const depto = departamentos.find(d => String(d.id) === String(form.departamentoId));
      if (depto && depto.ubicacionId) {
        Promise.resolve().then(() => {
          if (active) {
            setForm(f => ({ ...f, ubicacionId: depto.ubicacionId }));
          }
        });
      }
    }
    return () => {
      active = false;
    };
  }, [form.departamentoId, departamentos, isEdit]);

  const handleSelectCustodio = (p) => {
    setForm(f => ({ ...f, responsableId: p.id, responsableNombre: '' }));
    setCustodioSearch(p.nombre);
    setShowDropdown(false);
  };

  const handleClearCustodio = () => {
    setForm(f => ({ ...f, responsableId: '', responsableNombre: '' }));
    setCustodioSearch('');
    setShowDropdown(false);
  };

  const handleCreateTempCustodio = () => {
    setForm(f => ({ ...f, responsableId: '', responsableNombre: custodioSearch.trim() }));
    setShowDropdown(false);
  };

  const filteredPersonal = personal.filter(p =>
    p.nombre.toLowerCase().includes(custodioSearch.toLowerCase())
  );

  const tieneCoincidenciaExacta = personal.some(
    p => p.nombre.toLowerCase().trim() === custodioSearch.toLowerCase().trim()
  );

  // Estado temporal para agregar nuevas especificaciones (Key-Value)
  const [newSpec, setNewSpec] = useState({ key: '', value: '' });

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleUploadColectorJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (!data.numero_serie && !data.marca && !data.modelo) {
          setError('El archivo JSON no parece ser un reporte válido del colector SICOB.');
          return;
        }

        setForm(f => ({
          ...f,
          marca: data.marca || f.marca,
          modelo: data.modelo || f.modelo,
          serial: data.numero_serie || f.serial,
          descripcion: data.descripcion || f.descripcion || 'Computadora registrada mediante agente colector.',
          especificaciones: {
            ...f.especificaciones,
            ...(data.especificaciones || {})
          }
        }));

        if (data.categoria_sugerida && categorias) {
          const matchCat = categorias.find(c => 
            c.nombre.toLowerCase().includes(data.categoria_sugerida.toLowerCase())
          );
          if (matchCat) {
            setForm(f => ({ ...f, categoriaId: matchCat.id }));
          }
        }

        setError(null);
        setActiveTab('especificaciones');
      } catch (err) {
        console.error(err);
        setError('Error al leer el archivo JSON. Asegúrate de que no esté corrupto.');
      }
    };
    reader.readAsText(file);
  };

  // Manejo de Especificaciones Dinámicas
  const handleAddSpec = () => {
    if (!newSpec.key.trim() || !newSpec.value.trim()) return;
    setForm(f => ({
      ...f,
      especificaciones: { ...f.especificaciones, [newSpec.key.trim()]: newSpec.value.trim() }
    }));
    setNewSpec({ key: '', value: '' });
  };

  const handleRemoveSpec = (keyToRemove) => {
    setForm(f => {
      const newSpecs = { ...f.especificaciones };
      delete newSpecs[keyToRemove];
      return { ...f, especificaciones: newSpecs };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Sincronización automática de custodio si el usuario escribió un nombre no registrado por teclado
    let finalForm = { ...form };
    if (custodioSearch.trim() && !form.responsableId) {
      const coincidencia = personal.find(
        p => p.nombre.toLowerCase().trim() === custodioSearch.toLowerCase().trim()
      );
      if (coincidencia) {
        finalForm.responsableId = coincidencia.id;
        finalForm.responsableNombre = '';
      } else {
        finalForm.responsableId = '';
        finalForm.responsableNombre = custodioSearch.trim();
      }
    } else if (!custodioSearch.trim()) {
      finalForm.responsableId = '';
      finalForm.responsableNombre = '';
    }

    if (esLote && !isEdit) {
      const vacios = loteItems.some(it => !it.numero_serie.trim());
      if (vacios) {
        setError('Por favor, ingresa el número de serie para todas las unidades del lote.');
        return;
      }
      finalForm.esLote = true;
      finalForm.items = loteItems;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(finalForm);
    } catch (err) {
      setError(err.message ?? 'Ocurrió un error al guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
        
        {/* Encabezado */}
        <div className="modal-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
          <div>
            <div className="modal-title">{isEdit ? 'Editar Equipo Técnico' : 'Registro de Equipo'}</div>
            <div className="modal-sub">{isEdit ? 'Actualizar información' : 'Añadir nuevo recurso al inventario'}</div>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={loading} style={{ border: 'none' }}>✕</button>
        </div>

        {/* Pestañas (Tabs) */}
        <div style={{ display: 'flex', gap: 20, padding: '0 24px', borderBottom: '1px solid var(--border)', marginTop: 16 }}>
          {['general', 'adquisicion', 'especificaciones'].map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                padding: '8px 4px', fontSize: 13, fontWeight: activeTab === tab ? 600 : 400, color: activeTab === tab ? 'var(--text)' : 'var(--text-secondary)',
                cursor: 'pointer', textTransform: 'capitalize'
              }}
            >
              {tab === 'general' ? 'Datos Generales' : tab === 'adquisicion' ? 'Adquisición y Resguardo' : 'Especificaciones Técnicas'}
            </button>
          ))}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ minHeight: 320 }}>
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16, display: 'flex', gap: 8 }}>
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            {activeTab === 'general' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {!isEdit && (
                  <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(0, 113, 106, 0.04)', border: '1px dashed var(--primary)', borderRadius: 10, padding: '14px 16px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <strong style={{ fontSize: 13, color: 'var(--primary)', display: 'block', fontWeight: 700 }}>💻 Autocompletar con Agente Colector</strong>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'block', lineHeight: 1.4 }}>
                          Descarga el script en la computadora nueva, ejecútalo para generar su ficha técnica en un archivo JSON y súbelo aquí.
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <a 
                          href="/colector-sicob.ps1" 
                          download="colector-sicob.ps1"
                          className="btn btn-secondary" 
                          style={{ fontSize: 11, padding: '6px 12px', height: 'auto', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                        >
                          📥 Descargar Script
                        </a>
                        <label 
                          className="btn btn-primary" 
                          style={{ fontSize: 11, padding: '6px 12px', height: 'auto', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', margin: 0, fontWeight: 600 }}
                        >
                          🔌 Cargar JSON
                          <input 
                            type="file" 
                            accept=".json" 
                            onChange={handleUploadColectorJson}
                            style={{ display: 'none' }} 
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                <div><label className="form-label">Marca</label><input className="form-input" name="marca" value={form.marca} onChange={handleChange} required disabled={loading} /></div>
                <div><label className="form-label">Modelo</label><input className="form-input" name="modelo" value={form.modelo} onChange={handleChange} required disabled={loading} /></div>
                <div>
                  <label className="form-label">Categoría</label>
                  <select className="form-select" name="categoriaId" value={form.categoriaId} onChange={handleChange} disabled={loading} required>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                {!isEdit && (
                  <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(13, 148, 136, 0.05)', borderRadius: 8, border: '1px solid rgba(13, 148, 136, 0.1)', marginTop: 4 }}>
                    <input 
                      type="checkbox" 
                      id="esLote" 
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
                      checked={esLote} 
                      onChange={e => setEsLote(e.target.checked)} 
                    />
                    <label htmlFor="esLote" style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer', userSelect: 'none' }}>
                      📦 Registro Múltiple (Agregar lote de unidades idénticas)
                    </label>
                  </div>
                )}

                {!esLote ? (
                  <>
                    <div><label className="form-label">Número de Serie</label><input className="form-input" name="serial" value={form.serial} onChange={handleChange} required disabled={loading} /></div>
                    <div><label className="form-label">No. de Inventario</label><input className="form-input" name="etiqueta" value={form.etiqueta} onChange={handleChange} placeholder={isEdit ? '' : 'Auto-generada al guardar'} disabled={loading} /></div>
                  </>
                ) : (
                  <div style={{ gridColumn: '1/-1', border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--bg-body)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Unidades en este Lote</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Cantidad:</span>
                        <input 
                          type="number" 
                          min="1" 
                          max="100" 
                          className="form-input" 
                          style={{ width: 70, height: 32, padding: '4px 8px', fontSize: 12 }} 
                          value={cantidadLote} 
                          onChange={e => handleCantidadLoteChange(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
                      <label className="form-label" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Pegar lista de números de serie (uno por línea o separados por comas):</label>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <textarea 
                          className="form-input" 
                          style={{ minHeight: 48, fontSize: 11, padding: 6, flex: 1, resize: 'vertical' }} 
                          placeholder="Serie_01&#10;Serie_02&#10;Serie_03"
                          value={pastedSerials}
                          onChange={e => setPastedSerials(e.target.value)}
                        />
                        <button 
                          type="button" 
                          onClick={handleAutoFillSerials} 
                          className="btn btn-secondary" 
                          style={{ fontSize: 11, padding: '0 12px', height: 'auto' }}
                        >
                          Rellenar
                        </button>
                      </div>
                    </div>

                    <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '6px 10px', textAlign: 'center', width: 40 }}>#</th>
                            <th style={{ padding: '6px 10px', textAlign: 'left' }}>Número de Serie *</th>
                            <th style={{ padding: '6px 10px', textAlign: 'left', width: 220 }}>No. de Inventario (Opcional)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loteItems.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>{idx + 1}</td>
                              <td style={{ padding: '4px 8px' }}>
                                <input 
                                  className="form-input" 
                                  style={{ height: 28, fontSize: 11, padding: '4px 8px' }} 
                                  placeholder="Escribe o escanea..."
                                  value={item.numero_serie}
                                  onChange={e => handleLoteItemChange(idx, 'numero_serie', e.target.value)}
                                  required
                                />
                              </td>
                              <td style={{ padding: '4px 8px' }}>
                                <input 
                                  className="form-input" 
                                  style={{ height: 28, fontSize: 11, padding: '4px 8px', fontFamily: 'monospace' }} 
                                  placeholder="Auto-generada"
                                  value={item.codigo_inventario}
                                  onChange={e => handleLoteItemChange(idx, 'codigo_inventario', e.target.value)}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <label className="form-label">Estado de conservación</label>
                  <select className="form-select" name="estado" value={form.estado} onChange={handleChange} disabled={loading}>
                    {ESTADOS_BIEN.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Descripción o Notas</label>
                  <textarea className="form-input" name="descripcion" value={form.descripcion} onChange={handleChange} disabled={loading} style={{ minHeight: 60, resize: 'vertical' }} />
                </div>
              </div>
            )}

            {/* TAB: ADQUISICIÓN Y RESGUARDO */}
            {activeTab === 'adquisicion' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="form-label">Fecha de Adquisición</label>
                  <input type="date" className="form-input" name="fecha_adquisicion" value={form.fecha_adquisicion} onChange={handleChange} disabled={loading} />
                </div>
                <div>
                  <label className="form-label">Programa / Origen del Recurso</label>
                  <input className="form-input" name="programa_adquisicion" value={form.programa_adquisicion} onChange={handleChange} placeholder="Ej. Programa U079" disabled={loading} />
                </div>
                <div>
                  <label className="form-label">Valor Patrimonial (MXN)</label>
                  <input type="number" step="0.01" min="0" className="form-input" name="valor_estimado" value={form.valor_estimado} onChange={handleChange} placeholder="Ej. 18500.00" disabled={loading} />
                </div>
                <div style={{ gridColumn: '1/-1', marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Ubicación Administrativa y Física</div>
                </div>
                <div>
                  <label className="form-label">Departamento / Coordinación</label>
                  <select className="form-select" name="departamentoId" value={form.departamentoId} onChange={handleChange} disabled={loading}>
                    <option value="">Seleccione...</option>
                    {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Área / Espacio Físico</label>
                  <select className="form-select" name="ubicacionId" value={form.ubicacionId} onChange={handleChange} disabled={loading} required>
                    <option value="">Seleccione...</option>
                    {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
                {form.departamentoId && form.ubicacionId && departamentos.find(d => String(d.id) === String(form.departamentoId))?.ubicacionId && String(form.ubicacionId) !== String(departamentos.find(d => String(d.id) === String(form.departamentoId))?.ubicacionId) && (
                  <div style={{
                    gridColumn: '1/-1',
                    fontSize: '12px',
                    color: '#B45309',
                    background: 'rgba(245, 158, 11, 0.05)',
                    border: '1px solid rgba(245, 158, 11, 0.15)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    lineHeight: 1.4,
                    display: 'flex',
                    gap: 6,
                    alignItems: 'flex-start',
                    marginTop: -4
                  }}>
                    <span>💡</span>
                    <span>
                      Nota: El departamento o coordinación seleccionado opera principalmente en <strong>{departamentos.find(d => String(d.id) === String(form.departamentoId))?.ubicacion?.nombre}</strong>. Estás asignando este equipo a una ubicación física diferente (<strong>{ubicaciones.find(u => String(u.id) === String(form.ubicacionId))?.nombre}</strong>).
                    </span>
                  </div>
                )}
                 <div style={{ gridColumn: '1/-1', background: 'var(--bg)', padding: 16, borderRadius: 8, marginTop: 8 }} ref={comboboxRef}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Empleado Resguardante (Custodio)</label>
                  
                  <div style={{ position: 'relative', marginTop: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Escribe el nombre del custodio para buscar o registrar..."
                      value={custodioSearch}
                      onChange={(e) => {
                        setCustodioSearch(e.target.value);
                        setForm(f => ({ ...f, responsableId: '', responsableNombre: '' }));
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      disabled={loading}
                      style={{ paddingRight: '36px', height: '40px' }}
                    />
                    
                    {custodioSearch && (
                      <button
                        type="button"
                        onClick={handleClearCustodio}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '4px'
                        }}
                      >
                        ✕
                      </button>
                    )}
                    
                    {showDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-card, #FFFFFF)',
                        border: '1px solid var(--border, #E5E7EB)',
                        borderRadius: 'var(--radius-md, 8px)',
                        boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))',
                        zIndex: 1100,
                        maxHeight: '220px',
                        overflowY: 'auto'
                      }}>
                        {/* Opción Sin Asignar */}
                        <div
                          onClick={handleClearCustodio}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            color: 'var(--text-secondary, #6B7280)',
                            borderBottom: '1px solid var(--border, #E5E7EB)',
                            background: !custodioSearch ? 'var(--bg-body, #F3F4F6)' : 'transparent',
                            transition: 'background 0.2s'
                          }}
                        >
                          📦 Sin asignar (En Bodega)
                        </div>
                        
                        {/* Opciones filtradas */}
                        {filteredPersonal.map(p => {
                          const esSeleccionado = form.responsableId === p.id;
                          const esTemporal = p.noRegistrado;
                          return (
                            <div
                              key={p.id}
                              onClick={() => handleSelectCustodio(p)}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: 'var(--text, #111827)',
                                background: esSeleccionado ? 'rgba(13, 148, 136, 0.1)' : 'transparent',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid rgba(0,0,0,0.02)'
                              }}
                            >
                              <span>
                                {p.nombre}{' '}
                                {esTemporal && (
                                  <span style={{ 
                                    color: '#F59E0B', 
                                    background: 'rgba(245, 158, 11, 0.1)', 
                                    fontSize: '9px', 
                                    marginLeft: '6px', 
                                    fontWeight: 'bold',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    ⚠️ Temporal
                                  </span>
                                )}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary, #6B7280)' }}>
                                {p.puesto || 'Sin puesto'}
                              </span>
                            </div>
                          );
                        })}
                        
                        {/* Opción Registrar como Temporal */}
                        {custodioSearch.trim() && !tieneCoincidenciaExacta && (
                          <div
                            onClick={handleCreateTempCustodio}
                            style={{
                              padding: '12px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              color: 'var(--primary, #0D9488)',
                              fontWeight: 600,
                              background: 'rgba(13, 148, 136, 0.05)',
                              borderTop: '1px dashed var(--border, #E5E7EB)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            ➕ Registrar &quot;{custodioSearch.trim()}&quot; como custodio temporal (no registrado)
                          </div>
                        )}
                        
                        {/* Estado vacío */}
                        {filteredPersonal.length === 0 && !custodioSearch.trim() && (
                          <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary, #6B7280)' }}>
                            No hay custodios en el directorio
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                    {form.responsableNombre ? (
                      <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                        ⚠️ Se registrará temporalmente a &quot;{form.responsableNombre}&quot; en el inventario. Podrás completar su ficha en la pestaña de Personal.
                      </span>
                    ) : (
                      'Escribe para filtrar el directorio o escribe un nombre nuevo para registrarlo como temporal.'
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ESPECIFICACIONES */}
            {activeTab === 'especificaciones' && (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}><label className="form-label">Propiedad (Ej. RAM)</label><input className="form-input" value={newSpec.key} onChange={e => setNewSpec({...newSpec, key: e.target.value})} disabled={loading} /></div>
                  <div style={{ flex: 1 }}><label className="form-label">Valor (Ej. 16GB)</label><input className="form-input" value={newSpec.value} onChange={e => setNewSpec({...newSpec, value: e.target.value})} disabled={loading} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSpec())} /></div>
                  <button type="button" className="btn btn-secondary" onClick={handleAddSpec} disabled={loading || !newSpec.key || !newSpec.value}>Agregar</button>
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <table className="inventory-table" style={{ margin: 0 }}>
                    <thead style={{ background: 'var(--bg)' }}>
                      <tr><th style={{ width: '40%' }}>Propiedad</th><th>Valor</th><th style={{ width: 50 }}></th></tr>
                    </thead>
                    <tbody>
                      {Object.keys(form.especificaciones).length === 0 ? (
                        <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>Sin especificaciones registradas</td></tr>
                      ) : (
                        Object.entries(form.especificaciones).map(([k, v]) => (
                          <tr key={k}>
                            <td style={{ fontWeight: 500, fontSize: 13 }}>{k}</td>
                            <td style={{ fontSize: 13 }}>{v}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button type="button" className="btn-icon" onClick={() => handleRemoveSpec(k)} style={{ color: '#EF4444' }}>🗑</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: 140 }}>
              {loading ? '⏳ Guardando…' : isEdit ? '💾 Guardar Cambios' : '💾 Registrar Equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
