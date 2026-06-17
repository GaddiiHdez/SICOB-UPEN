'use client';
import { useState, useEffect } from 'react';

/**
 * ModalExportador — Modal interactivo para exportar inventarios a Excel (.xlsx) y PDF (.pdf)
 * con personalización de columnas, filtros de origen y metadatos institucionales.
 *
 * Carga dinámicamente:
 * - SheetJS: xlsx.full.min.js
 * - jsPDF: jspdf.umd.min.js
 * - jsPDF-AutoTable: jspdf.plugin.autotable.min.js
 */
export default function ModalExportador({
  onClose,
  data = [],           // Todos los ítems actuales (filtrados)
  selectedIds = [],    // IDs seleccionados por checkbox
  configuracion = {},  // Configuración global (siglas, logo, firmas)
  type = 'bienes'      // 'bienes' o 'mobiliario'
}) {
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Estados de configuración de exportación
  const [exportFormat, setExportFormat] = useState('excel'); // 'excel' | 'pdf'
  const [dataScope, setDataScope] = useState(selectedIds.length > 0 ? 'selected' : 'all'); // 'all' | 'selected'
  
  // PDF Options
  const [pdfOrientation, setPdfOrientation] = useState('l'); // 'p' (Portrait) | 'l' (Landscape)
  const [pdfIncludeSignatures, setPdfIncludeSignatures] = useState(true);
  const [pdfIncludeStats, setPdfIncludeStats] = useState(true);

  // Column definitions based on type
  const columnsDefinition = type === 'bienes' ? [
    { key: 'codigo_inventario', label: 'No. de Inventario', standard: true },
    { key: 'numero_serie', label: 'No. de Serie', standard: true },
    { key: 'nombre', label: 'Nombre del Bien', standard: true },
    { key: 'marca', label: 'Marca', standard: true },
    { key: 'modelo', label: 'Modelo', standard: true },
    { key: 'categoria', label: 'Categoría', standard: true },
    { key: 'area', label: 'Ubicación / Área', standard: true },
    { key: 'departamento', label: 'Depto. / Coordinación', standard: false },
    { key: 'estado', label: 'Estado Operativo', standard: true },
    { key: 'responsable', label: 'Responsable (Custodio)', standard: false },
    { key: 'valor_estimado', label: 'Valor Estimado', standard: false },
    { key: 'programa_adquisicion', label: 'Fondo / Programa', standard: false },
    { key: 'fecha_adquisicion', label: 'Fecha Adquisición', standard: false },
    { key: 'descripcion', label: 'Descripción / Notas', standard: false },
  ] : [
    { key: 'codigo_inventario', label: 'No. de Inventario', standard: true },
    { key: 'descripcion', label: 'Descripción / Artículo', standard: true },
    { key: 'marca', label: 'Marca', standard: true },
    { key: 'modelo', label: 'Modelo', standard: true },
    { key: 'categoria', label: 'Categoría', standard: true },
    { key: 'area', label: 'Ubicación / Área', standard: true },
    { key: 'departamento', label: 'Depto. / Coordinación', standard: false },
    { key: 'estado', label: 'Estado Físico', standard: true },
    { key: 'responsable', label: 'Responsable (Custodio)', standard: false },
    { key: 'valor_estimado', label: 'Valor Estimado', standard: false },
    { key: 'programa_adquisicion', label: 'Fondo / Programa', standard: false },
    { key: 'fecha_adquisicion', label: 'Fecha Adquisición', standard: false },
    { key: 'observaciones', label: 'Observaciones', standard: false },
  ];

  // Selected columns state
  const [selectedColumns, setSelectedColumns] = useState(
    columnsDefinition.filter(c => c.standard).map(c => c.key)
  );

  // Cargar scripts desde CDN secuencialmente
  useEffect(() => {
    let isMounted = true;

    const loadScripts = async () => {
      try {
        // 1. Cargar SheetJS
        if (!window.XLSX) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('No se pudo cargar SheetJS (Excel)'));
            document.body.appendChild(script);
          });
        }

        // 2. Cargar jsPDF
        if (!window.jspdf) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('No se pudo cargar jsPDF (PDF)'));
            document.body.appendChild(script);
          });
        }

        // 3. Cargar jsPDF-AutoTable
        if (window.jspdf && !window.jspdf.jsPDF.API.autoTable) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error('No se pudo cargar jsPDF-AutoTable (PDF)'));
            document.body.appendChild(script);
          });
        }

        if (isMounted) {
          setLibraryLoaded(true);
        }
      } catch (err) {
        console.error('Error loading export libraries:', err);
        if (isMounted) {
          setLoadError(err.message || 'Error al descargar complementos de exportación.');
        }
      }
    };

    loadScripts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Helpers de selección rápida de columnas
  const selectAllColumns = () => {
    setSelectedColumns(columnsDefinition.map(c => c.key));
  };

  const selectNoneColumns = () => {
    setSelectedColumns([]);
  };

  const selectStandardColumns = () => {
    setSelectedColumns(columnsDefinition.filter(c => c.standard).map(c => c.key));
  };

  const handleToggleColumn = (colKey) => {
    setSelectedColumns(prev => 
      prev.includes(colKey)
        ? prev.filter(k => k !== colKey)
        : [...prev, colKey]
    );
  };

  // Helper de mapeo de datos
  const getFieldValue = (item, colKey) => {
    switch (colKey) {
      case 'codigo_inventario':
        const code = item.codigo_inventario || item.etiqueta || '';
        return code.startsWith('SIN-NUMERO-') ? 'S/N' : code;
      case 'numero_serie':
        return item.numero_serie || item.serial || '';
      case 'marca':
        return item.marca || '';
      case 'modelo':
        return item.modelo || '';
      case 'nombre':
        return item.nombre || '';
      case 'categoria':
        return item.categoria || item.tipo || item.categoriaInmobiliario?.nombre || '';
      case 'area':
        return item.area || item.ubicacion?.nombre || '';
      case 'departamento':
        return item.departamento || item.departamento?.nombre || '';
      case 'estado':
        return item.estado || '';
      case 'responsable':
        return item.responsable || item.personal?.nombre || '';
      case 'valor_estimado':
        return item.valor_estimado || 0;
      case 'programa_adquisicion':
        return item.programa_adquisicion || '';
      case 'fecha_adquisicion':
        if (!item.fecha_adquisicion) return '';
        const d = new Date(item.fecha_adquisicion);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-MX');
      case 'descripcion':
        return item.descripcion || '';
      case 'observaciones':
        return item.observaciones || '';
      default:
        return '';
    }
  };

  // Acción principal de exportar
  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      alert('Por favor selecciona al menos una columna para exportar.');
      return;
    }

    // Filtrar origen de datos
    const targetItems = dataScope === 'selected'
      ? data.filter(item => selectedIds.includes(item.id))
      : data;

    if (targetItems.length === 0) {
      alert('No hay registros disponibles para exportar con el origen seleccionado.');
      return;
    }

    setIsExporting(true);

    try {
      if (exportFormat === 'excel') {
        await doExportExcel(targetItems);
      } else {
        await doExportPdf(targetItems);
      }
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al generar el archivo: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar a Excel usando SheetJS
  const doExportExcel = (items) => {
    const XLSX = window.XLSX;
    
    // 1. Obtener headers y filas
    const headers = columnsDefinition
      .filter(c => selectedColumns.includes(c.key))
      .map(c => c.label);

    const rows = items.map(item => 
      columnsDefinition
        .filter(c => selectedColumns.includes(c.key))
        .map(c => getFieldValue(item, c.key))
    );

    // 2. Crear hoja y libro
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type === 'bienes' ? "Bienes" : "Mobiliario");

    // 3. Ajustar anchos de columna automáticamente
    const maxLens = headers.map((h, colIndex) => {
      let maxLen = h.length;
      rows.forEach(r => {
        const val = String(r[colIndex] || '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
    });
    worksheet['!cols'] = maxLens;

    // 4. Guardar archivo
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `inventario_${type}_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, filename);
    onClose();
  };

  // Exportar a PDF usando jsPDF y AutoTable
  const doExportPdf = (items) => {
    const { jsPDF } = window.jspdf;
    
    // Crear documento
    const doc = new jsPDF({
      orientation: pdfOrientation,
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();

    // Obtener headers y filas
    const headers = columnsDefinition
      .filter(c => selectedColumns.includes(c.key))
      .map(c => c.label);

    const rows = items.map(item => 
      columnsDefinition
        .filter(c => selectedColumns.includes(c.key))
        .map(c => {
          const val = getFieldValue(item, c.key);
          if (c.key === 'valor_estimado') {
            return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);
          }
          return val;
        })
    );

    // Variables de control vertical
    let currentY = 32;

    // 1. Si está activo, agregar tabla de estadísticas
    if (pdfIncludeStats && currentY === 32) {
      const totalBienes = items.length;
      const valorTotal = items.reduce((sum, item) => sum + (getFieldValue(item, 'valor_estimado') || 0), 0);
      const valorFormateado = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(valorTotal);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN DE REPORTE:', 14, currentY);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Activos: ${totalBienes} unidades  |  Valor Total de Adquisición: ${valorFormateado}`, 14, currentY + 5);
      
      currentY += 14;
    }

    // 2. Dibujar AutoTable
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: currentY,
      theme: 'grid',
      styles: { 
        fontSize: 7.5, 
        cellPadding: 1.5,
        lineColor: [229, 231, 235],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [0, 113, 106], // `#00716A`
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      margin: { top: 32, bottom: 22, left: 14, right: 14 },
      didDrawPage: function (data) {
        // Cabecera institucional en cada página
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(18, 18, 18);
        
        const titleName = (configuracion?.nombre_institucion || 'Universidad Politécnica del Estado').toUpperCase();
        doc.text(titleName, 32, 12);
        
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(75, 85, 99);
        doc.text('DEPARTAMENTO DE INFORMÁTICA', 32, 17);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`SICOB — Reporte Oficial de Inventario (${type === 'bienes' ? 'Bienes Tecnológicos' : 'Mobiliario'})`, 32, 21);

        // Logo
        if (configuracion?.logo_institucion && configuracion.logo_institucion.startsWith('data:image/')) {
          try {
            doc.addImage(configuracion.logo_institucion, 'PNG', 14, 8, 14, 14);
          } catch (e) {
            console.error('Error drawing PDF logo:', e);
          }
        } else {
          // Fallback logo visual
          doc.setFillColor(0, 113, 106);
          doc.rect(14, 8, 14, 14, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(configuracion?.siglas_institucion || 'UPEN', 16, 17);
        }

        // Línea verde superior divisoria
        doc.setDrawColor(0, 113, 106);
        doc.setLineWidth(0.6);
        doc.line(14, 25, pageWidth - 14, 25);

        // Footer de página
        doc.setFontSize(7.5);
        doc.setTextColor(107, 114, 128);
        
        const dateString = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
        doc.text(`Emitido: ${dateString}`, 14, pageHeight - 10);
        
        const pageNumber = `Página ${doc.internal.getNumberOfPages()}`;
        doc.text(pageNumber, pageWidth - 14 - doc.getTextWidth(pageNumber), pageHeight - 10);
        
        // Línea divisoria inferior
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.2);
        doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
      }
    });

    // 3. Bloque de firmas oficiales al final
    if (pdfIncludeSignatures) {
      const lastTableY = doc.lastAutoTable.finalY;
      const spaceRequired = 35;

      // Si no cabe en esta página, insertar página nueva
      if (lastTableY + spaceRequired > pageHeight - 20) {
        doc.addPage();
        currentY = 32;
      } else {
        currentY = lastTableY + 12;
      }

      const blockWidth = (pageWidth - 28) / 3;
      const signatureLinesY = currentY + 18;

      doc.setFontSize(7.5);
      doc.setTextColor(18, 18, 18);

      // Firma 1: Técnico
      doc.setDrawColor(156, 163, 175);
      doc.setLineWidth(0.3);
      doc.line(14 + 5, signatureLinesY, 14 + blockWidth - 5, signatureLinesY);
      doc.setFont('helvetica', 'bold');
      doc.text(configuracion?.firma_tecnico_nombre || 'Ing. Técnico Responsable', 14 + blockWidth/2, signatureLinesY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(configuracion?.firma_tecnico_puesto || 'Técnico Encargado', 14 + blockWidth/2, signatureLinesY + 8, { align: 'center', maxWidth: blockWidth - 10 });

      // Firma 2: Custodio / Patrimonio
      doc.line(14 + blockWidth + 5, signatureLinesY, 14 + blockWidth * 2 - 5, signatureLinesY);
      doc.setFont('helvetica', 'bold');
      doc.text(configuracion?.firma_patrimonio_nombre || 'Jefe de Control Patrimonial', 14 + blockWidth * 1.5, signatureLinesY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(configuracion?.firma_patrimonio_puesto || 'Control de Activos', 14 + blockWidth * 1.5, signatureLinesY + 8, { align: 'center', maxWidth: blockWidth - 10 });

      // Firma 3: Jefe Departamento
      doc.line(14 + blockWidth * 2 + 5, signatureLinesY, pageWidth - 14 - 5, signatureLinesY);
      doc.setFont('helvetica', 'bold');
      doc.text(configuracion?.firma_jefe_nombre || 'Jefe de Departamento', 14 + blockWidth * 2.5, signatureLinesY + 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(configuracion?.firma_jefe_puesto || 'Vo. Bo. Autorizó', 14 + blockWidth * 2.5, signatureLinesY + 8, { align: 'center', maxWidth: blockWidth - 10 });
    }

    // Guardar archivo
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `reporte_inventario_${type}_${dateStr}.pdf`;
    doc.save(filename);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(17, 24, 39, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      backdropFilter: 'blur(4px)'
    }} className="no-print">
      <div 
        style={{ 
          maxWidth: 680, 
          width: '95%', 
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px', 
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
        className="fade-in"
      >
        {/* Cabecera del Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📥</span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Asistente de Exportación</h2>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Configura los campos y formatos para descargar tu inventario
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={isExporting}>✕</button>
        </div>

        {/* Cuerpo del Modal */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 20, paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!libraryLoaded && !loadError ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <div className="dash-pulse" style={{ margin: '0 auto 12px', width: 10, height: 10 }}></div>
              Descargando complementos de exportación oficiales...
            </div>
          ) : loadError ? (
            <div style={{ padding: '16px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.08)', border: '1px dashed var(--danger)', color: 'var(--danger)', fontSize: 12 }}>
              ⚠️ {loadError}
            </div>
          ) : (
            <>
              {/* Sección 1: Formato y Origen */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>1. Formato de descarga</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button 
                      type="button" 
                      onClick={() => setExportFormat('excel')}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid ' + (exportFormat === 'excel' ? 'var(--primary)' : 'var(--border)'),
                        background: exportFormat === 'excel' ? 'rgba(0, 113, 106, 0.08)' : 'transparent',
                        color: exportFormat === 'excel' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      📊 Excel (.xlsx)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setExportFormat('pdf')}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid ' + (exportFormat === 'pdf' ? 'var(--primary)' : 'var(--border)'),
                        background: exportFormat === 'pdf' ? 'rgba(0, 113, 106, 0.08)' : 'transparent',
                        color: exportFormat === 'pdf' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      📄 PDF (.pdf)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>2. Origen de datos</label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button 
                      type="button" 
                      onClick={() => setDataScope('all')}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid ' + (dataScope === 'all' ? 'var(--primary)' : 'var(--border)'),
                        background: dataScope === 'all' ? 'rgba(0, 113, 106, 0.08)' : 'transparent',
                        color: dataScope === 'all' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        lineHeight: 1.2
                      }}
                    >
                      <span style={{ fontSize: 12 }}>📋 Filtrados</span>
                      <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>({data.length} ítems)</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setDataScope('selected')}
                      disabled={selectedIds.length === 0}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid ' + (dataScope === 'selected' ? 'var(--primary)' : 'var(--border)'),
                        background: dataScope === 'selected' ? 'rgba(0, 113, 106, 0.08)' : 'transparent',
                        color: dataScope === 'selected' ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                        opacity: selectedIds.length > 0 ? 1 : 0.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        lineHeight: 1.2
                      }}
                    >
                      <span style={{ fontSize: 12 }}>☑️ Seleccionados</span>
                      <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>({selectedIds.length} ítems)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sección 2: Columnas a incluir */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>3. Columnas a exportar</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={selectStandardColumns} className="btn" style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-body)', border: '1px solid var(--border)' }}>Estándar</button>
                    <button type="button" onClick={selectAllColumns} className="btn" style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-body)', border: '1px solid var(--border)' }}>Todos</button>
                    <button type="button" onClick={selectNoneColumns} className="btn" style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-body)', border: '1px solid var(--border)' }}>Ninguno</button>
                  </div>
                </div>

                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-body)',
                  padding: 12,
                  maxHeight: 180,
                  overflowY: 'auto'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                    gap: 8
                  }}>
                    {columnsDefinition.map(col => {
                      const isChecked = selectedColumns.includes(col.key);
                      return (
                        <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input 
                            type="checkbox" 
                            id={`col-export-${col.key}`}
                            className="checkbox-custom"
                            checked={isChecked}
                            onChange={() => handleToggleColumn(col.key)}
                            style={{ width: 14, height: 14 }}
                          />
                          <label 
                            htmlFor={`col-export-${col.key}`}
                            style={{ fontSize: 11.5, color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none', fontWeight: isChecked ? 600 : 400 }}
                          >
                            {col.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sección 3: Opciones adicionales (PDF) */}
              {exportFormat === 'pdf' && (
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }} className="fade-in">
                  <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>4. Parámetros del Reporte PDF</label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'center', marginTop: 4 }}>
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Orientación del papel</span>
                      <select 
                        value={pdfOrientation} 
                        onChange={e => setPdfOrientation(e.target.value)}
                        className="filter-select"
                        style={{ width: '100%', height: 32, fontSize: 11.5, marginTop: 4 }}
                      >
                        <option value="p">↕️ Vertical (Portrait)</option>
                        <option value="l">↔️ Horizontal (Landscape)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input 
                          type="checkbox" 
                          id="pdf-opt-stats" 
                          className="checkbox-custom"
                          checked={pdfIncludeStats} 
                          onChange={e => setPdfIncludeStats(e.target.checked)} 
                        />
                        <label htmlFor="pdf-opt-stats" style={{ fontSize: 11.5, cursor: 'pointer', userSelect: 'none' }}>
                          📈 Incluir tarjeta de estadísticas y KPIs al inicio del reporte.
                        </label>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input 
                          type="checkbox" 
                          id="pdf-opt-signatures" 
                          className="checkbox-custom"
                          checked={pdfIncludeSignatures} 
                          onChange={e => setPdfIncludeSignatures(e.target.checked)} 
                        />
                        <label htmlFor="pdf-opt-signatures" style={{ fontSize: 11.5, cursor: 'pointer', userSelect: 'none' }}>
                          ✍️ Incluir renglón de firmas de autorización al pie del reporte.
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie del Modal */}
        <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16, flexShrink: 0 }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-ghost" 
            style={{ flex: 1, border: '1px solid var(--border)', height: 38 }}
            disabled={isExporting}
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleExport} 
            className="btn btn-primary" 
            style={{ flex: 1, height: 38, background: 'var(--primary)', borderColor: 'var(--primary)' }}
            disabled={!libraryLoaded || isExporting}
          >
            {isExporting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="sync-pulse" style={{ background: '#fff', boxShadow: 'none' }}></span>
                Procesando descarga...
              </span>
            ) : (
              'Descargar Archivo'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
