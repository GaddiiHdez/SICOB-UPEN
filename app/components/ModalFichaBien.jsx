'use client';
import { useState, useRef, useEffect } from 'react';
import { ESTADO_BADGE, ESTADOS_BIEN } from '@/lib/constants';
import { generateBarcodeSVG } from '@/lib/barcode';
import { formatCurrency, formatDateLong as formatDate } from '@/lib/formatters';

/**
 * ModalFichaBien — Ficha Técnica Completa y Detallada del Bien
 * Despliega todos los campos de forma altamente estética, permite subir/editar una
 * fotografía en tiempo real en Base64, e imprimir la ficha técnica en PDF con maquetación optimizada.
 */
export default function ModalFichaBien({ bien, configuracion = {}, onClose, onEdit, onDelete, onRestore, onDeletePermanent, onUpdateImage, savingImage, onViewActaColectiva, onPrintLabel, onMaintenanceChange, onStatusChange, isAdmin }) {
  const fileInputRef = useRef(null);
  const [localImage, setLocalImage] = useState(bien.imagen_url || null);
  const [fullBienDetails, setFullBienDetails] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Cargar el historial y los detalles completos del bien (incluyendo imagen_url en Base64) de forma asíncrona
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/bienes?id=${bien.id}&_=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setFullBienDetails(data);
          setLocalImage(data.imagen_url || null);
        }
      } catch (err) {
        console.error("Error al cargar historial del bien", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [bien.id]);

  // Limpiar y resetear el estado de la ficha si cambia el ID del bien prop
  useEffect(() => {
    Promise.resolve().then(() => {
      setLocalImage(bien.imagen_url || null);
      setFullBienDetails(null);
      setLoadingHistory(true);
    });
  }, [bien.id, bien.imagen_url]);

  // Manejar la selección y conversión de archivo a Base64
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido.');
      return;
    }

    // Validar tamaño (máximo 4MB para evitar saturar base de datos con Base64)
    if (file.size > 4 * 1024 * 1024) {
      alert('La imagen es demasiado grande. El límite máximo es 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setLocalImage(base64String);
      if (onUpdateImage) {
        await onUpdateImage(bien.id, base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  // Disparar el click del input de archivo oculto
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Simular la impresión de la ficha técnica
  const handlePrintFicha = () => {
    window.print();
  };

  // Delegar al panel de mantenimientos para abrir su modal de programación
  // (reemplaza el flujo anterior basado en window.prompt() — ver ModalFichaBien audit)
  const handleSendToMaintenance = () => {
    if (onMaintenanceChange) onMaintenanceChange('send', bien);
    onClose();
  };

  const handleCompleteMaintenance = () => {
    const activeMant = fullBienDetails?.mantenimientos?.find(m => m.estado === 'En proceso');
    if (!activeMant) {
      alert('No se encontró un registro de mantenimiento activo para este equipo.');
      return;
    }
    if (onMaintenanceChange) onMaintenanceChange('complete', bien, activeMant);
    onClose();
  };

  // Mapear todas las especificaciones técnicas del JSON
  const technicalSpecs = bien.especificaciones ? Object.entries(bien.especificaciones) : [];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Contenedor Principal del Modal de la Ficha Técnica */}
      <div 
        className="modal-box fade-in" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: 950, 
          width: '95%', 
          maxHeight: '90vh', 
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
      >
        
        {/* Cabecera del Modal (Oculta al imprimir) */}
        <div className="no-print" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '20px 24px', 
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)'
        }}>
          <div>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🔍</span> Ficha Técnica del Bien
            </div>
            <div className="modal-sub">Información detallada, especificaciones y control de inventario</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              onClick={() => {
                onEdit(bien);
                onClose();
              }} 
              className="btn btn-primary" 
              style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ✏️ Editar
            </button>
            <button onClick={handlePrintFicha} className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
              🖨️ Exportar Ficha PDF
            </button>
            <button className="btn-icon" onClick={onClose} style={{ border: 'none', background: 'transparent' }}>✕</button>
          </div>
        </div>

        {/* Cuerpo de la Ficha Técnica (Rejilla de 2 columnas) - Scrollable */}
        <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: '400px', flex: 1, overflowY: 'auto' }} className="print-layout-override">
          
          {/* COLUMNA IZQUIERDA: Fotografía, Código de Barras y Carga de Archivos */}
          <div style={{ 
            flex: 1, 
            minWidth: 320, 
            borderRight: '1px solid var(--border)', 
            padding: '32px',
            background: 'var(--bg-body)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 24
          }} className="print-sidebar-width">
            
            {/* Contenedor de Fotografía */}
            <div style={{
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: 'var(--radius-md)',
              border: localImage ? '1px solid var(--border)' : '2px dashed var(--border)',
              background: 'var(--bg-body, #F3F4F6)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)',
              transition: 'all 0.3s ease'
            }}>
              {localImage ? (
                <>
                  {/* Blurred background backing for beautiful border filling */}
                  <div 
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${localImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(16px) brightness(0.95)',
                      opacity: 0.4,
                      transform: 'scale(1.15)',
                      zIndex: 0,
                      pointerEvents: 'none'
                    }}
                  />
                  <img 
                    src={localImage} 
                    alt={bien.nombre} 
                    className="hover-zoom-img"
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      position: 'relative',
                      zIndex: 1,
                      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} 
                  />
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 20, zIndex: 1 }}>
                  <div style={{ fontSize: 44, marginBottom: 8 }}>{bien.icono || '🔧'}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Sin Fotografía del Equipo</div>
                  <div style={{ fontSize: 10, marginTop: 4 }}>Formatos admitidos: JPG, PNG</div>
                </div>
              )}

              {/* Loader de guardado */}
              {savingImage && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  ⏳ Guardando foto...
                </div>
              )}
            </div>

            {/* Input de archivo oculto para la subida de foto (Oculto al imprimir) */}
            <div className="no-print" style={{ width: '100%' }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              <button 
                onClick={triggerFileInput} 
                disabled={savingImage}
                className="btn btn-ghost" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12 }}
              >
                📷 {localImage ? 'Cambiar Fotografía' : 'Subir Fotografía Real'}
              </button>
            </div>

            {/* Código de Barras e Inventario Patrimonial */}
            {(() => {
              const rawHeader = configuracion.cabecera_etiqueta_impresion 
                ? configuracion.cabecera_etiqueta_impresion.replace('{siglas}', configuracion.siglas_institucion || 'UPEN')
                : `CONTROL INTERNO DE ACTIVO FIJO ${configuracion.siglas_institucion || 'UPEN'}`;
              const headerText = rawHeader.toUpperCase().startsWith("CONTROL INTERNO DE ACTIVO FIJO")
                ? `ACTIVO FIJO ${configuracion.siglas_institucion || 'UPEN'}`
                : rawHeader;

              const anchoEtiqueta = parseFloat(configuracion.etiqueta_ancho_mm || '30');
              const altoEtiqueta = parseFloat(configuracion.etiqueta_alto_mm || '15');
              
              const previewWidth = 260; // Ancho en píxeles aproximado en el sidebar
              const scale = previewWidth / anchoEtiqueta;
              const ptToPx = (pt) => pt * 0.3527 * scale;

              const cabeceraPt = parseFloat(configuracion.etiqueta_letra_cabecera_pt || '4.5');
              const marcaModeloPt = parseFloat(configuracion.etiqueta_letra_marca_modelo_pt || '4.2');
              const codigoPt = parseFloat(configuracion.etiqueta_letra_codigo_pt || '5.5');
              const serialPt = parseFloat(configuracion.etiqueta_letra_serial_pt || '5.0');
              const barcodeHeightMm = parseFloat(configuracion.etiqueta_altura_codigo_barras_mm || '5.6');

              return (
                <div style={{
                  width: '100%',
                  height: (previewWidth * altoEtiqueta) / anchoEtiqueta,
                  background: '#FFFFFF',
                  color: '#000000',
                  border: '1.5px solid #111827',
                  borderRadius: 6,
                  padding: `${0.8 * scale}px ${1.5 * scale}px ${1 * scale}px`,
                  textAlign: 'center',
                  fontFamily: '"Inter", sans-serif',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxSizing: 'border-box'
                }}>
                  <style dangerouslySetInnerHTML={{ __html: `
                    .preview-barcode-svg-ficha-container svg {
                      width: 100% !important;
                      height: 100% !important;
                      display: block !important;
                    }
                    .hover-zoom-img:hover {
                      transform: scale(1.05) !important;
                    }
                  ` }} />

                  {/* Cabecera de Etiqueta */}
                  {configuracion.etiqueta_mostrar_cabecera !== 'false' && (
                    <div style={{ fontSize: `${ptToPx(cabeceraPt)}px`, fontWeight: 900, textTransform: 'uppercase', color: '#1F2937', letterSpacing: '0.01em', lineHeight: 1.0, width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {headerText}
                    </div>
                  )}

                  {/* Marca y Modelo */}
                  {configuracion.etiqueta_mostrar_marca_modelo !== 'false' && (
                    <div style={{ fontSize: `${ptToPx(marcaModeloPt)}px`, fontWeight: 700, textTransform: 'uppercase', color: '#4B5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.0, width: '100%' }}>
                      {bien.marca} {bien.modelo}
                    </div>
                  )}
                  
                  {/* Representación de Barras en SVG Real */}
                  {!bien.etiqueta.startsWith('SIN-NUMERO-') ? (
                    <div 
                      className="preview-barcode-svg-ficha-container"
                      style={{ width: '100%', height: barcodeHeightMm * scale, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(bien.etiqueta, false) }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: barcodeHeightMm * scale, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '9px', color: '#888', border: '1px dashed #ccc', borderRadius: '4px', background: '#fafafa', boxSizing: 'border-box' }}>
                      [SIN NÚMERO]
                    </div>
                  )}

                  {/* Pie de Etiqueta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '4px' }}>
                    <span style={{ fontSize: `${ptToPx(codigoPt)}px`, fontWeight: 900, fontFamily: 'monospace', color: '#000000', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: configuracion.etiqueta_mostrar_serial !== 'false' ? '55%' : '100%', textAlign: 'left' }}>
                      {bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}
                    </span>
                    {configuracion.etiqueta_mostrar_serial !== 'false' && (
                      <span style={{ fontSize: `${ptToPx(serialPt)}px`, fontWeight: 900, fontFamily: 'monospace', color: '#111827', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '45%', textAlign: 'right' }}>
                        S/N: {bien.serial || 'N/S'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* COLUMNA DERECHA: Desglose Completo de Información Técnica */}
          <div style={{ flex: 1.5, minWidth: 320, padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Header del Bien */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span 
                  className={ESTADO_BADGE[bien.estado] ?? 'badge badge-gray'} 
                  style={{ padding: '0 0 0 8px', position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                  title="Cambiar estado"
                >
                  <select
                    value={bien.estado}
                    onChange={(e) => onStatusChange(bien.id, e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'inherit',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      padding: '3px 16px 3px 4px',
                      margin: 0,
                      fontFamily: 'inherit'
                    }}
                  >
                    {ESTADOS_BIEN.map(e => (
                      <option key={e} value={e} style={{ color: 'var(--text-primary)', background: 'var(--bg-card)' }}>
                        {e}
                      </option>
                    ))}
                  </select>
                  <span style={{ position: 'absolute', right: '6px', pointerEvents: 'none', fontSize: '7px', opacity: 0.6 }}>▼</span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Categoría: <strong>{bien.tipo}</strong></span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 10, color: 'var(--text-primary)' }}>
                {bien.nombre}
              </h2>
              {bien.descripcion && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, marginTop: 8, fontStyle: 'italic' }}>
                  &quot;{bien.descripcion}&quot;
                </p>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />

            {/* Fila de Datos Generales / Administrativos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Número de Serie</div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', marginTop: 4, color: 'var(--text-primary)' }}>{bien.serial || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Valor Patrimonial</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>{formatCurrency(bien.valor_estimado)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Ubicación Física</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>🏫 {bien.area || 'Desconocida'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Departamento</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{bien.departamentoIcono || '🏢'}</span>
                  <span>{bien.departamento || 'Sin departamento'}</span>
                </div>
                {bien.departamentoUbicacion && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>📍 Oficina:</span>
                    <span>{bien.departamentoUbicacion.icono || '🏫'}</span>
                    <span>{bien.departamentoUbicacion.nombre}</span>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Responsable de Resguardo</div>
                {bien.responsableId ? (
                  <div 
                    onClick={() => onViewActaColectiva && onViewActaColectiva(bien.responsableId)}
                    style={{ 
                      fontSize: 13, 
                      fontWeight: 600, 
                      marginTop: 4, 
                      color: 'var(--primary)', 
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      textDecoration: 'underline'
                    }}
                    title="Clic para abrir el Acta de Resguardo de este custodio"
                  >
                    👤 {bien.responsable} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--primary-dark)' }}>🔗</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: 'var(--text-secondary)' }}>
                    👤 Sin responsable asignado
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Programa de Adquisición</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>📦 {bien.programa_adquisicion || 'Recurso General'}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Fecha de Adquisición</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, color: 'var(--text-primary)' }}>📅 {formatDate(bien.fecha_adquisicion)}</div>
              </div>
              {bien.departamentoUbicacion && String(bien.ubicacionId) !== String(bien.departamentoUbicacion.id) && (
                <div style={{
                  gridColumn: 'span 2',
                  fontSize: 11.5,
                  color: '#B45309',
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.15)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  lineHeight: 1.4,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'flex-start'
                }} className="no-print">
                  <span>⚠️</span>
                  <span>
                    <strong>Ubicación Diferente:</strong> Este equipo se encuentra físicamente asignado a <strong>{bien.area}</strong>, pero el departamento principal opera en la oficina <strong>{bien.departamentoUbicacion.nombre}</strong>.
                  </span>
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 0 }} />

            {/* SECCIÓN: Especificaciones Técnicas JSON */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                ⚙️ Especificaciones Técnicas
              </h3>
              {technicalSpecs.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px 0' }}>
                  No se registraron especificaciones técnicas particulares para este bien.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  background: 'var(--bg-body)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px'
                }}>
                  {technicalSpecs.map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN: Historial de Resguardos y Movimientos */}
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                📋 Historial de Resguardos y Movimientos
              </h3>
              {loadingHistory ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '10px 0' }}>
                  ⏳ Cargando registro de movimientos...
                </div>
              ) : (!fullBienDetails?.asignaciones || fullBienDetails.asignaciones.length === 0) ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px 0' }}>
                  Este equipo no cuenta con movimientos o resguardos previos registrados en el sistema.
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  background: 'var(--bg-body)',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {fullBienDetails.asignaciones.map((asig, index) => {
                    const esActivo = !asig.fecha_retorno;
                    return (
                      <div 
                        key={asig.id} 
                        onClick={() => {
                          if (esActivo && onViewActaColectiva) {
                            onViewActaColectiva(asig.personalId);
                          }
                        }}
                        style={{ 
                          display: 'flex', 
                          gap: 12, 
                          alignItems: 'flex-start',
                          paddingBottom: index !== fullBienDetails.asignaciones.length - 1 ? 12 : 0,
                          borderBottom: index !== fullBienDetails.asignaciones.length - 1 ? '1px solid var(--border)' : 'none',
                          cursor: esActivo ? 'pointer' : 'default',
                          transition: 'background 0.2s',
                          padding: esActivo ? '8px 12px' : '0px',
                          margin: esActivo ? '-4px -8px 8px' : '0px',
                          borderRadius: esActivo ? 'var(--radius-md)' : '0px',
                          background: esActivo ? 'rgba(13, 148, 136, 0.03)' : 'transparent',
                          border: esActivo ? '1px dashed rgba(13, 148, 136, 0.2)' : 'none'
                        }}
                        className={esActivo ? 'hover-highlight' : ''}
                        title={esActivo ? "Clic para abrir el Acta de Resguardo de este custodio" : undefined}
                      >
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: esActivo ? '#10B981' : 'var(--text-muted)',
                          marginTop: 5,
                          flexShrink: 0
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                              👤 {asig.personal?.nombre || 'Desconocido'}
                            </span>
                            <span style={{ 
                              fontSize: 10, 
                              fontWeight: 600, 
                              color: esActivo ? '#059669' : 'var(--text-secondary)',
                              background: esActivo ? 'rgba(16, 185, 129, 0.1)' : 'var(--border)',
                              padding: '2px 6px',
                              borderRadius: 4
                            }}>
                              {esActivo ? 'Resguardo Activo 🔗' : 'Retornado'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {asig.personal?.puesto || 'Sin puesto'} • {asig.personal?.correo || 'Sin correo'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12 }}>
                            <span><strong>Asignado:</strong> {formatDate(asig.fecha_asignacion)}</span>
                            {asig.fecha_retorno && (
                              <span><strong>Retornado:</strong> {formatDate(asig.fecha_retorno)}</span>
                            )}
                          </div>
                          {asig.observaciones && (
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                              Nota: &quot;{asig.observaciones}&quot;
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECCIÓN: Historial Clínico de Mantenimientos */}
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                🛠️ Historial Clínico de Mantenimientos
              </h3>
              {loadingHistory ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '10px 0' }}>
                  ⏳ Cargando registro de mantenimientos...
                </div>
              ) : (!fullBienDetails?.mantenimientos || fullBienDetails.mantenimientos.length === 0) ? (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px 0' }}>
                  Este equipo no registra mantenimientos o revisiones previas.
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  background: 'var(--bg-body)',
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {fullBienDetails.mantenimientos.map((mant, index) => {
                    return (
                      <div 
                        key={mant.id} 
                        style={{ 
                          display: 'flex', 
                          gap: 12, 
                          alignItems: 'flex-start',
                          paddingBottom: index !== fullBienDetails.mantenimientos.length - 1 ? 12 : 0,
                          borderBottom: index !== fullBienDetails.mantenimientos.length - 1 ? '1px solid var(--border)' : 'none'
                        }}
                      >
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: mant.estado === 'Completado' ? '#10B981' : mant.estado === 'En proceso' ? '#F59E0B' : '#3B82F6',
                          marginTop: 5,
                          flexShrink: 0
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                              🔧 {mant.tipo} - {mant.estado}
                            </span>
                            <span style={{ 
                              fontSize: 10, 
                              fontWeight: 700, 
                              color: mant.estado === 'Completado' ? '#059669' : mant.estado === 'En proceso' ? '#D97706' : '#2563EB',
                              background: mant.estado === 'Completado' ? 'rgba(16, 185, 129, 0.1)' : mant.estado === 'En proceso' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                              padding: '2px 6px',
                              borderRadius: 4
                            }}>
                              {mant.costo ? formatCurrency(mant.costo) : 'Sin costo'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {mant.descripcion}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', gap: 12 }}>
                            <span><strong>Fecha:</strong> {formatDate(mant.fecha_mantenimiento)}</span>
                            {mant.tecnico_encargado && (
                              <span><strong>Técnico:</strong> {mant.tecnico_encargado}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer del Modal (Acciones Rápidas - Oculto al imprimir) */}
        <div className="no-print" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '16px 24px', 
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-card)'
        }}>
          <div>
            {bien.eliminado ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => {
                    if (confirm('¿Deseas re-activar este equipo y devolverlo al inventario activo?')) {
                      onRestore(bien.id);
                      onClose();
                    }
                  }} 
                  className="btn" 
                  style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                >
                  🟢 Re-activar Equipo
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => {
                      onDeletePermanent(bien.id);
                      onClose();
                    }} 
                    className="btn" 
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  >
                    🗑️ Borrar Permanentemente
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={() => {
                  if (confirm('¿Estás seguro de que deseas dar de baja este equipo? Esta acción conservará el registro histórico pero cambiará su estatus.')) {
                    onDelete(bien.id);
                    onClose();
                  }
                }} 
                className="btn" 
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                🗑️ Dar de Baja
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!bien.eliminado && (
              bien.estado === 'Mantenimiento' ? (
                <button 
                  onClick={handleCompleteMaintenance} 
                  className="btn" 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10B981', color: '#FFF', padding: '8px 14px', fontSize: 12 }}
                >
                  ✅ Completar Mantenimiento
                </button>
              ) : (bien.estado === 'Activo' || bien.estado === 'En reserva') ? (
                <button 
                  onClick={handleSendToMaintenance} 
                  className="btn" 
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F59E0B', color: '#FFF', padding: '8px 14px', fontSize: 12 }}
                >
                  🛠️ Enviar a Reparación
                </button>
              ) : null
            )}
            <button onClick={onClose} className="btn btn-ghost">Cerrar</button>
            <button 
              onClick={() => onPrintLabel && onPrintLabel(bien)} 
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0D9488', color: '#FFF' }}
            >
              🏷️ Imprimir Etiqueta
            </button>
            <button 
              onClick={() => {
                onEdit(bien);
                onClose();
              }} 
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ✏️ Editar Datos
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
