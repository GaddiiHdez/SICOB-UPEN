'use client';
import { useState, useEffect, useRef } from 'react';

/**
 * ModalImportador — Asistente de Mapeo Visual e Importador de Hojas de Cálculo (Excel/CSV).
 * 
 * Flujo por pasos:
 * 1. Carga de Archivo (SheetJS dinámico)
 * 2. Mapeo de Columnas (Marca, Modelo, Serie, Código, etc.)
 * 3. Resolventes de Relaciones (Categoría y Ubicación)
 * 4. Previsualización y Corrección en Rejilla (Marcar errores, corregir, desmarcar para ignorar)
 * 5. Barra de Progreso de Importación (Envío en Chunks de 50 elementos)
 */
export default function ModalImportador({ onClose, onImportSuccess, bienes = [], categorias = [], ubicaciones = [], departamentos = [] }) {
  const [step, setStep] = useState(1);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Estados del archivo
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [detectedSheets, setDetectedSheets] = useState([]);
  const [activeWorkbook, setActiveWorkbook] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState('');

  // Estados de mapeo de campos
  const [fieldMappings, setFieldMappings] = useState({
    marca: '',
    modelo: '',
    numero_serie: '',
    codigo_inventario: '',
    valor_estimado: '',
    fecha_adquisicion: '',
    programa_adquisicion: '',
    descripcion: ''
  });

  // Mapeo dinámico de relaciones
  const [catColumn, setCatColumn] = useState('');
  const [globalDefaultCat, setGlobalDefaultCat] = useState('');
  const [catMappings, setCatMappings] = useState({}); // { 'EXCEL_VAL': 'SYSTEM_ID' }
  const [uniqueExcelCats, setUniqueExcelCats] = useState([]);

  const [ubiColumn, setUbiColumn] = useState('');
  const [globalDefaultUbi, setGlobalDefaultUbi] = useState('');
  const [ubiMappings, setUbiMappings] = useState({}); // { 'EXCEL_VAL': 'SYSTEM_ID' }
  const [uniqueExcelUbis, setUniqueExcelUbis] = useState([]);

  const [deptColumn, setDeptColumn] = useState('');
  const [globalDefaultDept, setGlobalDefaultDept] = useState('');
  const [deptMappings, setDeptMappings] = useState({}); // { 'EXCEL_VAL': 'SYSTEM_ID' }
  const [uniqueExcelDepts, setUniqueExcelDepts] = useState([]);

  // Datos finales procesados para previsualización
  const [processedItems, setProcessedItems] = useState([]);

  // Estado del proceso de importación
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState({ type: 'idle', msg: '' });
  const [importStats, setImportStats] = useState({ success: 0, total: 0 });

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Carga dinámica de SheetJS con soporte de estilos (xlsx-js-style)
  useEffect(() => {
    // Si ya existe nuestro script con soporte de estilos, marcamos como cargado
    const existing = document.getElementById('xlsx-style-script');
    if (existing) {
      setLibraryLoaded(true);
      return;
    }
    
    const script = document.createElement('script');
    script.id = 'xlsx-style-script';
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js';
    script.async = true;
    script.onload = () => {
      setLibraryLoaded(true);
    };
    script.onerror = () => setLoadError('No se pudo cargar el decodificador de Excel (SheetJS). Verifica tu conexión.');
    document.body.appendChild(script);
  }, []);

  const handleDownloadTemplate = () => {
    if (!window.XLSX) {
      alert("Cargando el motor de Excel, por favor intenta de nuevo en un segundo.");
      return;
    }
    const XLSX = window.XLSX;
    
    // Definir los encabezados de la plantilla maestra
    const headers = [
      "Marca",
      "Modelo",
      "Número de Serie",
      "Código de Inventario (Opcional)",
      "Categoría",
      "Ubicación",
      "Departamento",
      "Valor Estimado (Pesos)",
      "Fecha de Adquisición (AAAA-MM-DD)",
      "Programa de Adquisición",
      "Descripción"
    ];

    // Ejemplo de filas para que el usuario entienda el formato en base a sus catálogos
    const rows = [
      [
        "Dell",
        "Latitude 5430",
        "DELL-SN-123456",
        "", // Código opcional
        categorias[0]?.nombre || "Computadoras de Escritorio",
        ubicaciones[0]?.nombre || "Bodega General",
        departamentos[0]?.nombre || "Coordinación de Sistemas",
        "15800.00",
        "2026-06-16",
        "Recurso General",
        "Equipo de cómputo para oficina"
      ],
      [
        "HP",
        "LaserJet M404dn",
        "HP-PRNT-998877",
        "UPEN-PRNT-001", // Código manual
        categorias[1]?.nombre || "Impresoras",
        ubicaciones[1]?.nombre || "Aulas de Cómputo",
        departamentos[1]?.nombre || "Administración",
        "7450.00",
        "2026-05-10",
        "Fondo Federal U006",
        "Impresora láser de red para docentes"
      ]
    ];

    // Matriz completa con títulos y espacio de instrucciones
    const aoa = [
      ["PLANTILLA MAESTRA DE IMPORTACIÓN - SICOB UPEN", "", "", "", "", "", "", "", "", "", ""],
      ["Instrucciones: Completa la información respetando las columnas. Los ejemplos sombreados en verde son ilustrativos y deben ser borrados o reemplazados.", "", "", "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", "", ""],
      headers,
      ...rows
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Combinaciones de celdas (Merges)
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // Combinar título A1:K1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } }  // Combinar instrucciones A2:K2
    ];

    // Estilos premium
    const titleStyle = {
      font: { name: "Segoe UI", sz: 13, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0D9488" } }, // Teal primary
      alignment: { horizontal: "center", vertical: "center" }
    };

    const subtitleStyle = {
      font: { name: "Segoe UI", sz: 9.5, color: { rgb: "E0F2F1" }, italic: true },
      fill: { fgColor: { rgb: "0F766E" } }, // Teal dark
      alignment: { horizontal: "center", vertical: "center" }
    };

    const headerStyle = {
      font: { name: "Segoe UI", sz: 10.5, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0D9488" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "CCCCCC" } },
        bottom: { style: "medium", color: { rgb: "0F766E" } },
        left: { style: "thin", color: { rgb: "CCCCCC" } },
        right: { style: "thin", color: { rgb: "CCCCCC" } }
      }
    };

    const exampleStyle = {
      font: { name: "Segoe UI", sz: 9.5, color: { rgb: "374151" } },
      fill: { fgColor: { rgb: "F0FDF4" } }, // Suave fondo verde claro para diferenciar ejemplos
      alignment: { vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "E5E7EB" } },
        bottom: { style: "thin", color: { rgb: "E5E7EB" } },
        left: { style: "thin", color: { rgb: "E5E7EB" } },
        right: { style: "thin", color: { rgb: "E5E7EB" } }
      }
    };

    // Función auxiliar para obtener la clave de celda (A1, B5...)
    const getCellKey = (colIndex, rowIndex) => {
      const colName = String.fromCharCode(65 + colIndex);
      return `${colName}${rowIndex + 1}`;
    };

    // Aplicar estilos celda por celda
    for (let r = 0; r < aoa.length; r++) {
      for (let c = 0; c < 11; c++) {
        const key = getCellKey(c, r);
        if (!worksheet[key]) continue;

        if (r === 0) {
          worksheet[key].s = titleStyle;
        } else if (r === 1) {
          worksheet[key].s = subtitleStyle;
        } else if (r === 3) {
          worksheet[key].s = headerStyle;
        } else if (r > 3) {
          worksheet[key].s = {
            ...exampleStyle,
            alignment: {
              ...exampleStyle.alignment,
              horizontal: (c === 2 || c === 3 || c === 7 || c === 8) ? "center" : "left"
            }
          };
        }
      }
    }

    // Configurar anchos de columna recomendados
    worksheet['!cols'] = [
      { wch: 15 }, // Marca
      { wch: 18 }, // Modelo
      { wch: 20 }, // Número de Serie
      { wch: 28 }, // Código de Inventario
      { wch: 24 }, // Categoría
      { wch: 22 }, // Ubicación
      { wch: 24 }, // Departamento
      { wch: 18 }, // Valor Estimado
      { wch: 28 }, // Fecha
      { wch: 22 }, // Programa
      { wch: 30 }  // Descripción
    ];

    // Configurar altos de filas recomendados
    worksheet['!rows'] = [
      { hpt: 30 }, // Título
      { hpt: 20 }, // Instrucciones
      { hpt: 10 }, // Espacio vacío
      { hpt: 28 }, // Encabezados
      { hpt: 22 }, // Ejemplo 1
      { hpt: 22 }  // Ejemplo 2
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Importación");
    XLSX.writeFile(workbook, "plantilla_maestra_bienes_upen.xlsx");
  };

  // Procesar una hoja específica del libro de trabajo
  const parseSheet = (workbook, sheetName) => {
    try {
      const worksheet = workbook.Sheets[sheetName];

      // Obtener filas completas como objetos
      const rows = window.XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rows.length === 0) {
        setImportStatus({ type: 'error', msg: `La hoja "${sheetName}" está vacía.` });
        return;
      }

      // Obtener headers de la primera fila
      const headers = Object.keys(rows[0]);
      setRawHeaders(headers);
      setRawRows(rows);

      // Preselección inteligente basada en coincidencias de nombres de columnas
      const mappings = {
        marca: '',
        modelo: '',
        numero_serie: '',
        codigo_inventario: '',
        valor_estimado: '',
        fecha_adquisicion: '',
        programa_adquisicion: '',
        descripcion: ''
      };
      headers.forEach(h => {
        const l = h.toLowerCase().replace(/[^a-z_]/g, '');
        if (['marca', 'brand', 'fabricante'].includes(l)) mappings.marca = h;
        if (['modelo', 'model', 'tipo_modelo'].includes(l)) mappings.modelo = h;
        if (['serie', 'serial', 'sn', 'no_serie', 'n_s'].includes(l)) mappings.numero_serie = h;
        if (['inventario', 'codigo', 'etiqueta', 'folio', 'no_inventario'].includes(l)) mappings.codigo_inventario = h;
        if (['valor', 'costo', 'precio', 'estimado'].includes(l)) mappings.valor_estimado = h;
        if (['fecha', 'adquisicion_fecha', 'alta'].includes(l)) mappings.fecha_adquisicion = h;
        if (['programa', 'recurso', 'proyecto', 'fondo'].includes(l)) mappings.programa_adquisicion = h;
        if (['descripcion', 'detalles', 'observaciones'].includes(l)) mappings.descripcion = h;
      });

      // Intentar autodetectar columnas de categoría, ubicación y departamento
      setCatColumn('');
      setUbiColumn('');
      setDeptColumn('');
      headers.forEach(h => {
        const l = h.toLowerCase().replace(/[^a-z_]/g, '');
        if (['categoria', 'tipo', 'tipo_equipo', 'clase'].includes(l)) setCatColumn(h);
        if (['ubicacion', 'area', 'salon', 'laboratorio', 'aula'].includes(l)) setUbiColumn(h);
        if (['departamento', 'depto', 'oficina'].includes(l)) setDeptColumn(h);
      });

      setFieldMappings(mappings);
      setImportStatus({ type: 'idle', msg: '' });
      setStep(2);
    } catch (err) {
      console.error(err);
      setImportStatus({ type: 'error', msg: 'Error al procesar la hoja del archivo.' });
    }
  };

  // Manejar el archivo seleccionado
  const processFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    setImportStatus({ type: 'processing', msg: 'Analizando archivo...' });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length > 1) {
          setActiveWorkbook(workbook);
          setDetectedSheets(workbook.SheetNames);
          setSelectedSheet(workbook.SheetNames[0]);
          setImportStatus({ type: 'idle', msg: '' });
        } else {
          parseSheet(workbook, workbook.SheetNames[0]);
        }
      } catch (err) {
        console.error(err);
        setImportStatus({ type: 'error', msg: 'Error al procesar el archivo. Asegúrate de que sea un archivo de Excel o CSV válido.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    if (dropZoneRef.current) dropZoneRef.current.classList.add('drag-active');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (dropZoneRef.current) dropZoneRef.current.classList.remove('drag-active');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (dropZoneRef.current) dropZoneRef.current.classList.remove('drag-active');
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  // Ir al Paso 3: Analizar y mapear relaciones
  const handleGoToStep3 = () => {
    // Validar requeridos mínimos en el mapeo
    if (!fieldMappings.marca) return alert('Por favor, mapea la columna de Marca.');
    if (!fieldMappings.modelo) return alert('Por favor, mapea la columna de Modelo.');
    if (!fieldMappings.numero_serie) return alert('Por favor, mapea la columna de Número de Serie.');

    // Extraer valores únicos de Excel para Categorías
    if (catColumn) {
      const cats = [...new Set(rawRows.map(r => r[catColumn]?.toString().trim()))].filter(Boolean);
      setUniqueExcelCats(cats);
      // Auto-mapeo inteligente con las del sistema
      const newMappings = {};
      cats.forEach(c => {
        const sysMatch = categorias.find(sc => sc.nombre.toLowerCase() === c.toLowerCase());
        if (sysMatch) newMappings[c] = sysMatch.id.toString();
      });
      setCatMappings(newMappings);
    } else {
      setUniqueExcelCats([]);
    }

    // Extraer valores únicos de Excel para Ubicaciones
    if (ubiColumn) {
      const ubis = [...new Set(rawRows.map(r => r[ubiColumn]?.toString().trim()))].filter(Boolean);
      setUniqueExcelUbis(ubis);
      const newMappings = {};
      ubis.forEach(u => {
        const sysMatch = ubicaciones.find(su => su.nombre.toLowerCase() === u.toLowerCase());
        if (sysMatch) newMappings[u] = sysMatch.id.toString();
      });
      setUbiMappings(newMappings);
    } else {
      setUniqueExcelUbis([]);
    }

    // Extraer valores únicos de Excel para Departamentos
    if (deptColumn) {
      const depts = [...new Set(rawRows.map(r => r[deptColumn]?.toString().trim()))].filter(Boolean);
      setUniqueExcelDepts(depts);
      const newMappings = {};
      depts.forEach(d => {
        const sysMatch = departamentos.find(sd => sd.nombre.toLowerCase() === d.toLowerCase());
        if (sysMatch) newMappings[d] = sysMatch.id.toString();
      });
      setDeptMappings(newMappings);
    } else {
      setUniqueExcelDepts([]);
    }

    setStep(3);
  };

  // Ir al Paso 4: Previsualización y validación local
  const handleGoToStep4 = () => {
    // Validar que tengamos un default o mapeo completo
    if (!catColumn && !globalDefaultCat) {
      return alert('Por favor, selecciona una Categoría predeterminada.');
    }
    if (!ubiColumn && !globalDefaultUbi) {
      return alert('Por favor, selecciona una Ubicación predeterminada.');
    }

    const dbSerials = new Set(bienes.map(b => (b.serial || '').toUpperCase()));
    const dbCodes = new Set(bienes.map(b => (b.etiqueta || '').toUpperCase()));

    const seenSerials = new Set();
    const seenCodes = new Set();

    const items = rawRows.map((row, idx) => {
      // 1. Resolver Categoría
      let cId = globalDefaultCat;
      if (catColumn) {
        const excelVal = row[catColumn]?.toString().trim();
        cId = catMappings[excelVal] || globalDefaultCat;
      }

      // 2. Resolver Ubicación
      let uId = globalDefaultUbi;
      if (ubiColumn) {
        const excelVal = row[ubiColumn]?.toString().trim();
        uId = ubiMappings[excelVal] || globalDefaultUbi;
      }

      // 3. Resolver Departamento
      let dId = globalDefaultDept || '';
      if (deptColumn) {
        const excelVal = row[deptColumn]?.toString().trim();
        dId = deptMappings[excelVal] || globalDefaultDept || '';
      }

      const rawSerial = row[fieldMappings.numero_serie]?.toString().trim() || '';
      const rawCode = fieldMappings.codigo_inventario ? row[fieldMappings.codigo_inventario]?.toString().trim() : '';

      // Determinar errores preliminares
      let err = '';
      let ok = true;

      if (!row[fieldMappings.marca]?.toString().trim()) {
        err = 'Marca vacía';
        ok = false;
      } else if (!row[fieldMappings.modelo]?.toString().trim()) {
        err = 'Modelo vacío';
        ok = false;
      } else if (!rawSerial) {
        err = 'Serie vacía';
        ok = false;
      } else if (dbSerials.has(rawSerial.toUpperCase())) {
        err = 'Serie ya existe en el sistema';
        ok = false;
      } else if (seenSerials.has(rawSerial.toUpperCase())) {
        err = 'Serie duplicada en el archivo';
        ok = false;
      } else if (rawCode && dbCodes.has(rawCode.toUpperCase())) {
        err = 'Código ya existe en el sistema';
        ok = false;
      } else if (rawCode && seenCodes.has(rawCode.toUpperCase())) {
        err = 'Código duplicado en el archivo';
        ok = false;
      } else if (!cId) {
        err = 'Categoría no definida';
        ok = false;
      } else if (!uId) {
        err = 'Ubicación no definida';
        ok = false;
      }

      if (rawSerial) seenSerials.add(rawSerial.toUpperCase());
      if (rawCode) seenCodes.add(rawCode.toUpperCase());

      // Parsear fecha
      let parsedFecha = null;
      const rawFecha = row[fieldMappings.fecha_adquisicion];
      if (rawFecha) {
        // Soporte básico para fecha número de Excel o string
        if (typeof rawFecha === 'number') {
          // Fecha de Excel serial (días desde 1900-01-01)
          const date = new Date((rawFecha - 25569) * 86400 * 1000);
          parsedFecha = date.toISOString().split('T')[0];
        } else {
          const d = new Date(rawFecha);
          if (!isNaN(d.getTime())) {
            parsedFecha = d.toISOString().split('T')[0];
          }
        }
      }

      return {
        key: idx,
        marca: row[fieldMappings.marca]?.toString().trim() || '',
        modelo: row[fieldMappings.modelo]?.toString().trim() || '',
        numero_serie: rawSerial,
        codigo_inventario: rawCode,
        valor_estimado: row[fieldMappings.valor_estimado] ? parseFloat(row[fieldMappings.valor_estimado]) : null,
        fecha_adquisicion: parsedFecha,
        programa_adquisicion: row[fieldMappings.programa_adquisicion]?.toString().trim() || '',
        descripcion: row[fieldMappings.descripcion]?.toString().trim() || '',
        categoriaId: cId,
        ubicacionId: uId,
        departamentoId: dId || null,
        error: err,
        importar: ok // Activo por defecto solo si no hay error
      };
    });

    setProcessedItems(items);
    setStep(4);
  };

  // Modificar fila en caliente durante previsualización
  const handleItemChange = (key, field, value) => {
    setProcessedItems(prev => {
      const next = prev.map(item => {
        if (item.key !== key) return item;
        return { ...item, [field]: value };
      });

      // Recalcular validaciones de unicidad tras un cambio manual
      const dbSerials = new Set(bienes.map(b => (b.serial || '').toUpperCase()));
      const dbCodes = new Set(bienes.map(b => (b.etiqueta || '').toUpperCase()));
      const seenSerials = new Set();
      const seenCodes = new Set();

      return next.map(item => {
        let err = '';
        let ok = item.importar;

        const rawSerial = item.numero_serie.trim();
        const rawCode = item.codigo_inventario.trim();

        if (!item.marca.trim()) {
          err = 'Marca vacía';
          ok = false;
        } else if (!item.modelo.trim()) {
          err = 'Modelo vacío';
          ok = false;
        } else if (!rawSerial) {
          err = 'Serie vacía';
          ok = false;
        } else if (dbSerials.has(rawSerial.toUpperCase())) {
          err = 'Serie ya existe en el sistema';
          ok = false;
        } else if (seenSerials.has(rawSerial.toUpperCase())) {
          err = 'Serie duplicada en el archivo';
          ok = false;
        } else if (rawCode && dbCodes.has(rawCode.toUpperCase())) {
          err = 'Código ya existe en el sistema';
          ok = false;
        } else if (rawCode && seenCodes.has(rawCode.toUpperCase())) {
          err = 'Código duplicado en el archivo';
          ok = false;
        } else if (!item.categoriaId) {
          err = 'Categoría no definida';
          ok = false;
        } else if (!item.ubicacionId) {
          err = 'Ubicación no definida';
          ok = false;
        }

        if (rawSerial) seenSerials.add(rawSerial.toUpperCase());
        if (rawCode) seenCodes.add(rawCode.toUpperCase());

        // Si se limpió el error y estaba desmarcado por error previo, reactivar
        if (!err && item.error) ok = true;

        return { ...item, error: err, importar: ok };
      });
    });
  };

  // Iniciar la importación masiva final por lotes (chunks)
  const handleStartImport = async () => {
    const activeItems = processedItems.filter(it => it.importar && !it.error);

    if (activeItems.length === 0) {
      return alert('No hay filas válidas seleccionadas para importar.');
    }

    setStep(5);
    setImportProgress(0);
    setImportStats({ success: 0, total: activeItems.length });
    setImportStatus({ type: 'importing', msg: 'Iniciando importación masiva...' });

    // Dividir en chunks de 50 elementos
    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < activeItems.length; i += chunkSize) {
      chunks.push(activeItems.slice(i, i + chunkSize));
    }

    let successCount = 0;

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      setImportStatus({
        type: 'importing',
        msg: `Enviando lote ${index + 1} de ${chunks.length} (${chunk.length} bienes)...`
      });

      try {
        const response = await fetch('/api/bienes/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: chunk })
        });

        const resData = await response.json();

        if (!response.ok) {
          throw new Error(resData.error || 'Error desconocido en el lote.');
        }

        successCount += chunk.length;
        const progress = Math.round(((index + 1) / chunks.length) * 100);
        setImportProgress(progress);
        setImportStats(prev => ({ ...prev, success: successCount }));
      } catch (err) {
        console.error(err);
        setImportStatus({
          type: 'error',
          msg: `Error crítico en el lote ${index + 1}: ${err.message}. La transacción de este lote fue revertida. El resto del inventario ya importado permanece a salvo.`
        });
        return;
      }
    }

    setImportProgress(100);
    setImportStatus({ type: 'success', msg: '¡Importación finalizada con éxito!' });
    if (onImportSuccess) onImportSuccess();
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div 
        className="modal-box fade-in" 
        style={{ 
          maxWidth: step === 4 ? 980 : 650, 
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
      >
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📥</span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Importación Masiva de Bienes</h2>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Paso {step} de 5: {
                  step === 1 ? 'Carga del archivo de inventario' :
                  step === 2 ? 'Mapeo de columnas del archivo' :
                  step === 3 ? 'Asociar Categorías y Ubicaciones' :
                  step === 4 ? 'Validación y corrección de datos' : 'Importación en proceso'
                }
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={importStatus.type === 'importing'}>✕</button>
        </div>

        {/* Stepper Visual */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexShrink: 0 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <div 
              key={s} 
              style={{ 
                height: 4, 
                flex: 1, 
                background: s <= step ? 'var(--primary)' : 'var(--border)', 
                borderRadius: 2, 
                opacity: s === step ? 1 : 0.4,
                transition: 'all 0.3s ease'
              }} 
            />
          ))}
        </div>

        {/* Contenido variable por pasos */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 20, paddingRight: 4 }}>
          
          {/* PASO 1: CARGA DE ARCHIVO */}
          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              {!libraryLoaded && !loadError ? (
                <div style={{ padding: 40, color: 'var(--text-secondary)' }}>
                  <span className="dash-pulse" style={{ display: 'inline-block', width: 8, height: 8, marginRight: 8 }} />
                  Cargando motor de lectura de hojas de cálculo...
                </div>
              ) : loadError ? (
                <div style={{ padding: 20, color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', border: '1px dashed var(--danger)', borderRadius: 10 }}>
                  ⚠️ {loadError}
                </div>
              ) : detectedSheets.length > 1 ? (
                <div style={{ padding: '20px 10px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 32 }}>📂</span>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        Se detectaron múltiples hojas
                      </h3>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        Archivo: <b style={{ color: 'var(--text-primary)' }}>{fileName}</b>
                      </p>
                    </div>
                  </div>
                  
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    Por favor, selecciona la hoja que contiene la información de los bienes a importar:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {detectedSheets.map(s => {
                      const isSelected = selectedSheet === s;
                      return (
                        <div
                          key={s}
                          onClick={() => setSelectedSheet(s)}
                          style={{
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: isSelected ? 'rgba(13, 148, 136, 0.06)' : 'var(--bg-body)',
                            color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: isSelected ? '700' : '500',
                            transition: 'all 0.15s ease',
                            textAlign: 'center',
                            boxShadow: isSelected ? '0 4px 12px rgba(13, 148, 136, 0.1)' : 'none'
                          }}
                          className="sheet-card"
                        >
                          <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>📊</span>
                          <span style={{ fontSize: 13, wordBreak: 'break-all' }}>{s}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: '8px 16px', height: 'auto', fontSize: 12 }}
                      onClick={() => {
                        setActiveWorkbook(null);
                        setDetectedSheets([]);
                        setFileName('');
                        setSelectedSheet('');
                      }}
                    >
                      🔄 Cambiar Archivo
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '48px 24px',
                    cursor: 'pointer',
                    background: 'var(--bg-body)',
                    transition: 'all 0.2s ease',
                  }}
                  className="import-dropzone"
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>
                    Arrastra tu archivo Excel o CSV aquí
                  </h3>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 20px' }}>
                    Soporta formatos .xlsx, .xls y .csv
                  </p>
                  <button type="button" className="btn btn-ghost" style={{ pointerEvents: 'none' }}>
                    Seleccionar Archivo
                  </button>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    style={{ display: 'none' }} 
                    onChange={e => processFile(e.target.files[0])} 
                  />

                  <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                      ¿No tienes un archivo preparado? Descarga nuestra plantilla recomendada:
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Evitar abrir el explorador de archivos
                        handleDownloadTemplate();
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(13, 148, 136, 0.08)',
                        border: '1px solid rgba(13, 148, 136, 0.2)',
                        color: 'var(--primary)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      className="btn-action-teal"
                    >
                      📥 Descargar Plantilla Maestra (.xlsx)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 2: MAPEO DE COLUMNAS */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Asocia las columnas detectadas en tu archivo <b>{fileName}</b> con los campos del sistema. Los campos con asterisco (*) son obligatorios.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Marca de los equipos *</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={fieldMappings.marca}
                    onChange={e => setFieldMappings(p => ({ ...p, marca: e.target.value }))}
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Modelo *</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={fieldMappings.modelo}
                    onChange={e => setFieldMappings(p => ({ ...p, modelo: e.target.value }))}
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Número de Serie *</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={fieldMappings.numero_serie}
                    onChange={e => setFieldMappings(p => ({ ...p, numero_serie: e.target.value }))}
                  >
                    <option value="">-- Seleccionar Columna --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Código de Inventario (Opcional)</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={fieldMappings.codigo_inventario}
                    onChange={e => setFieldMappings(p => ({ ...p, codigo_inventario: e.target.value }))}
                  >
                    <option value="">-- Autogenerar Secuencial --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Valor Estimado (Opcional)</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={fieldMappings.valor_estimado}
                    onChange={e => setFieldMappings(p => ({ ...p, valor_estimado: e.target.value }))}
                  >
                    <option value="">-- No importar --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Fecha de Adquisición (Opcional)</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={fieldMappings.fecha_adquisicion}
                    onChange={e => setFieldMappings(p => ({ ...p, fecha_adquisicion: e.target.value }))}
                  >
                    <option value="">-- No importar --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Fondo/Programa (Opcional)</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={fieldMappings.programa_adquisicion}
                    onChange={e => setFieldMappings(p => ({ ...p, programa_adquisicion: e.target.value }))}
                  >
                    <option value="">-- No importar --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Descripción/Notas (Opcional)</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={fieldMappings.descripcion}
                    onChange={e => setFieldMappings(p => ({ ...p, descripcion: e.target.value }))}
                  >
                    <option value="">-- No importar --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div>
                  <label className="form-label">Columna para Categoría/Tipo</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={catColumn}
                    onChange={e => setCatColumn(e.target.value)}
                  >
                    <option value="">-- Seleccionar (O usar valor por defecto) --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Columna para Ubicación/Área</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={ubiColumn}
                    onChange={e => setUbiColumn(e.target.value)}
                  >
                    <option value="">-- Seleccionar (O usar valor por defecto) --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="form-label">Columna para Departamento / Coordinación</label>
                  <select 
                    className="filter-select" 
                    style={{ width: '100%', height: 38 }}
                    value={deptColumn}
                    onChange={e => setDeptColumn(e.target.value)}
                  >
                    <option value="">-- Seleccionar (O usar valor por defecto) --</option>
                    {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: RESOLUCIÓN DE RELACIONES */}
          {step === 3 && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Mapea las nomenclaturas de tu archivo con los registros del sistema. Si dejas algún valor sin asignar, se aplicará el valor predeterminado global seleccionado.
              </p>

              {/* RESOLVENTE DE CATEGORÍAS */}
              <div style={{ background: 'var(--bg-body)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏷️ Categorías</span>
                  <div style={{ fontSize: 11, fontWeight: 400 }}>
                    Predeterminada global: 
                    <select 
                      className="filter-select" 
                      style={{ height: 24, fontSize: 11, marginLeft: 8, padding: '0 4px' }}
                      value={globalDefaultCat}
                      onChange={e => setGlobalDefaultCat(e.target.value)}
                    >
                      <option value="">-- Seleccionar --</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </h3>

                {uniqueExcelCats.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 150, overflowY: 'auto' }}>
                    {uniqueExcelCats.map(ec => (
                      <div key={ec} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', opacity: 0.8 }}>"{ec}" de tu archivo:</span>
                        <select 
                          className="filter-select" 
                          style={{ height: 30, width: 220, fontSize: 11 }}
                          value={catMappings[ec] || ''}
                          onChange={e => setCatMappings(prev => ({ ...prev, [ec]: e.target.value }))}
                        >
                          <option value="">-- Usar Predeterminada --</option>
                          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                    No se seleccionó columna de categoría en el paso anterior. Se asignará el valor predeterminado global a todos los equipos.
                  </p>
                )}
              </div>

              {/* RESOLVENTE DE UBICACIONES */}
              <div style={{ background: 'var(--bg-body)', padding: 16, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏫 Ubicaciones (Áreas)</span>
                  <div style={{ fontSize: 11, fontWeight: 400 }}>
                    Predeterminada global:
                    <select 
                      className="filter-select" 
                      style={{ height: 24, fontSize: 11, marginLeft: 8, padding: '0 4px' }}
                      value={globalDefaultUbi}
                      onChange={e => setGlobalDefaultUbi(e.target.value)}
                    >
                      <option value="">-- Seleccionar --</option>
                      {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                </h3>

                {uniqueExcelUbis.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 150, overflowY: 'auto' }}>
                    {uniqueExcelUbis.map(eu => (
                      <div key={eu} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', opacity: 0.8 }}>"{eu}" de tu archivo:</span>
                        <select 
                          className="filter-select" 
                          style={{ height: 30, width: 220, fontSize: 11 }}
                          value={ubiMappings[eu] || ''}
                          onChange={e => setUbiMappings(prev => ({ ...prev, [eu]: e.target.value }))}
                        >
                          <option value="">-- Usar Predeterminada --</option>
                          {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                    No se seleccionó columna de ubicación en el paso anterior. Se asignará el valor predeterminado global a todos los equipos.
                  </p>
                )}
              </div>

              {/* RESOLVENTE DE DEPARTAMENTOS */}
              <div style={{ background: 'var(--bg-body)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🏢 Departamentos y Coordinaciones</span>
                  <div style={{ fontSize: 11, fontWeight: 400 }}>
                    Predeterminado global:
                    <select 
                      className="filter-select" 
                      style={{ height: 24, fontSize: 11, marginLeft: 8, padding: '0 4px' }}
                      value={globalDefaultDept}
                      onChange={e => setGlobalDefaultDept(e.target.value)}
                    >
                      <option value="">-- Ninguno (Sin asignar) --</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                </h3>

                {uniqueExcelDepts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 150, overflowY: 'auto' }}>
                    {uniqueExcelDepts.map(ed => (
                      <div key={ed} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 12, fontFamily: 'monospace', opacity: 0.8 }}>"{ed}" de tu archivo:</span>
                        <select 
                          className="filter-select" 
                          style={{ height: 30, width: 220, fontSize: 11 }}
                          value={deptMappings[ed] || ''}
                          onChange={e => setDeptMappings(prev => ({ ...prev, [ed]: e.target.value }))}
                        >
                          <option value="">-- Sin asignar --</option>
                          {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                    No se seleccionó columna de departamento o coordinación en el paso anterior. Se dejará vacío a menos que se defina uno global.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* PASO 4: PREVISUALIZACIÓN Y CORRECCIÓN */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, flexShrink: 0 }}>
                Valida la información final procesada. Corrige los campos en rojo haciendo clic sobre ellos o desmarca la fila en la primera columna para excluirla de la importación.
              </p>

              <div style={{ flex: 1, overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <table className="inventory-table" style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
                    <tr>
                      <th style={{ width: 40, padding: 8 }}>Importar</th>
                      <th style={{ padding: 8 }}>Estatus/Error</th>
                      <th style={{ padding: 8 }}>Marca</th>
                      <th style={{ padding: 8 }}>Modelo</th>
                      <th style={{ padding: 8 }}>No. Serie</th>
                      <th style={{ padding: 8 }}>Código Inventario</th>
                      <th style={{ padding: 8 }}>Categoría</th>
                      <th style={{ padding: 8 }}>Ubicación</th>
                      <th style={{ padding: 8 }}>Valor Est.</th>
                      <th style={{ padding: 8 }}>F. Adq</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedItems.map(item => (
                      <tr 
                        key={item.key} 
                        style={{ 
                          background: item.error ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                          opacity: item.importar ? 1 : 0.5,
                          borderBottom: '1px solid var(--border)'
                        }}
                      >
                        <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                          <input 
                            type="checkbox" 
                            checked={item.importar} 
                            disabled={!!item.error}
                            onChange={e => handleItemChange(item.key, 'importar', e.target.checked)} 
                          />
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          {item.error ? (
                            <span style={{ color: '#F87171', fontWeight: 700 }}>⚠️ {item.error}</span>
                          ) : (
                            <span style={{ color: '#34D399', fontWeight: 600 }}>✓ Listo</span>
                          )}
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input 
                            type="text" 
                            style={{ 
                              width: '100%', 
                              fontSize: 11, 
                              padding: '4px',
                              background: !item.marca ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                              border: !item.marca ? '1px solid var(--danger)' : '1px solid transparent',
                              borderRadius: 4,
                              color: 'var(--text-primary)'
                            }}
                            value={item.marca} 
                            onChange={e => handleItemChange(item.key, 'marca', e.target.value)} 
                          />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input 
                            type="text" 
                            style={{ 
                              width: '100%', 
                              fontSize: 11, 
                              padding: '4px',
                              background: !item.modelo ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                              border: !item.modelo ? '1px solid var(--danger)' : '1px solid transparent',
                              borderRadius: 4,
                              color: 'var(--text-primary)'
                            }}
                            value={item.modelo} 
                            onChange={e => handleItemChange(item.key, 'modelo', e.target.value)} 
                          />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input 
                            type="text" 
                            style={{ 
                              width: '100%', 
                              fontSize: 11, 
                              padding: '4px',
                              background: !item.numero_serie || item.error.includes('Serie') ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                              border: !item.numero_serie || item.error.includes('Serie') ? '1px solid var(--danger)' : '1px solid transparent',
                              borderRadius: 4,
                              color: 'var(--text-primary)'
                            }}
                            value={item.numero_serie} 
                            onChange={e => handleItemChange(item.key, 'numero_serie', e.target.value)} 
                          />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input 
                            type="text" 
                            placeholder="[Autogenerar]"
                            style={{ 
                              width: '100%', 
                              fontSize: 11, 
                              padding: '4px',
                              background: item.error.includes('Código') ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                              border: item.error.includes('Código') ? '1px solid var(--danger)' : '1px solid transparent',
                              borderRadius: 4,
                              color: 'var(--text-primary)'
                            }}
                            value={item.codigo_inventario} 
                            onChange={e => handleItemChange(item.key, 'codigo_inventario', e.target.value)} 
                          />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <select 
                            style={{ width: '100%', fontSize: 11, padding: '4px', background: 'transparent', border: '1px solid transparent', color: 'var(--text-primary)' }}
                            value={item.categoriaId}
                            onChange={e => handleItemChange(item.key, 'categoriaId', e.target.value)}
                          >
                            <option value="">-- No defined --</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <select 
                            style={{ width: '100%', fontSize: 11, padding: '4px', background: 'transparent', border: '1px solid transparent', color: 'var(--text-primary)' }}
                            value={item.ubicacionId}
                            onChange={e => handleItemChange(item.key, 'ubicacionId', e.target.value)}
                          >
                            <option value="">-- No defined --</option>
                            {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input 
                            type="number" 
                            placeholder="0"
                            style={{ width: '100%', fontSize: 11, padding: '4px', background: 'transparent', border: '1px solid transparent', color: 'var(--text-primary)' }}
                            value={item.valor_estimado || ''} 
                            onChange={e => handleItemChange(item.key, 'valor_estimado', e.target.value)} 
                          />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <input 
                            type="date" 
                            style={{ width: '100%', fontSize: 11, padding: '4px', background: 'transparent', border: '1px solid transparent', color: 'var(--text-primary)' }}
                            value={item.fecha_adquisicion || ''} 
                            onChange={e => handleItemChange(item.key, 'fecha_adquisicion', e.target.value)} 
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumen */}
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Total en archivo: {processedItems.length}
                </span>
                <span style={{ color: '#34D399' }}>
                  Listos para importar: {processedItems.filter(it => it.importar && !it.error).length}
                </span>
                <span style={{ color: '#F87171' }}>
                  Con errores / Excluidos: {processedItems.filter(it => !it.importar || !!it.error).length}
                </span>
              </div>
            </div>
          )}

          {/* PASO 5: PROGRESO DE IMPORTACIÓN */}
          {step === 5 && (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                Importando inventario
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 24 }}>
                {importStatus.msg}
              </p>

              {/* Contenedor de la barra */}
              <div style={{ height: 20, width: '100%', background: 'var(--bg-body)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 12 }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${importProgress}%`, 
                    background: importStatus.type === 'error' ? 'var(--danger)' : 'linear-gradient(90deg, var(--primary), var(--accent))', 
                    borderRadius: 10,
                    transition: 'width 0.3s ease'
                  }} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                <span>Progreso: {importProgress}%</span>
                <span>{importStats.success} de {importStats.total} bienes insertados</span>
              </div>

              {importStatus.type === 'success' && (
                <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, animation: 'fade-in 0.3s ease' }}>
                  <div style={{ fontSize: 48 }}>🎉</div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: '#34D399', margin: 0 }}>¡Todo listo!</h4>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, maxWidth: 380 }}>
                    Se han importado exitosamente {importStats.success} bienes al inventario. Los correlativos y asignaciones se han registrado correctamente en la base de datos de PostgreSQL.
                  </p>
                  <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={onClose}>
                    Cerrar Asistente
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Botones de acción del pie */}
        {step < 5 && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 16, flexShrink: 0 }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={() => {
                if (step === 1) {
                  if (detectedSheets.length > 1) {
                    setActiveWorkbook(null);
                    setDetectedSheets([]);
                    setFileName('');
                    setSelectedSheet('');
                  } else {
                    onClose();
                  }
                } else {
                  setStep(step - 1);
                }
              }}
            >
              {step === 1 ? (detectedSheets.length > 1 ? 'Atrás' : 'Cancelar') : 'Atrás'}
            </button>

            {step === 1 && (
              <button 
                type="button" 
                className="btn btn-primary"
                disabled={!fileName || (detectedSheets.length > 1 && !selectedSheet)}
                onClick={() => {
                  if (detectedSheets.length > 1) {
                    parseSheet(activeWorkbook, selectedSheet);
                  } else {
                    setStep(2);
                  }
                }}
              >
                Siguiente
              </button>
            )}

            {step === 2 && (
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleGoToStep3}
              >
                Siguiente
              </button>
            )}

            {step === 3 && (
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleGoToStep4}
              >
                Previsualizar
              </button>
            )}

            {step === 4 && (
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleStartImport}
                style={{ background: 'var(--accent)' }}
              >
                🚀 Importar Ahora
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .import-dropzone:hover {
          border-color: var(--primary) !important;
          background: rgba(15, 58, 95, 0.04) !important;
        }
        .import-dropzone.drag-active {
          border-color: var(--accent) !important;
          background: rgba(13, 148, 136, 0.08) !important;
          transform: scale(0.99);
        }
        .sheet-card:hover {
          border-color: var(--primary) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.12) !important;
        }
      `}</style>
    </div>
  );
}
