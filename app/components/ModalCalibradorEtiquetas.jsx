'use client';
import { useState, useEffect } from 'react';
import { generateBarcodeSVG } from '@/lib/barcode';

/**
 * ModalCalibradorEtiquetas — Panel de Calibración Premium y Vista Previa en Tiempo Real.
 * Permite al usuario ajustar márgenes, gaps y dimensiones de etiquetas con una
 * superposición de la plantilla física de fondo para una alineación milimétrica.
 */
const parseBool = (val, defaultVal = true) => {
  if (val === undefined || val === null) return defaultVal;
  if (val === 'false' || val === false) return false;
  if (val === 'true' || val === true) return true;
  return !!val;
};

export default function ModalCalibradorEtiquetas({ 
  isOpen, 
  onClose, 
  bienes = [], 
  configuracion = {}, 
  onSaveConfig, 
  onPrint 
}) {
  // Inicialización de estados locales para calibración basados en la configuración existente
  const [formatoPapel, setFormatoPapel] = useState(configuracion.etiqueta_formato_papel || 'avery_5167');
  const [margenSuperior, setMargenSuperior] = useState(parseFloat(configuracion.etiqueta_margen_superior || '1.0'));
  const [margenInferior, setMargenInferior] = useState(parseFloat(configuracion.etiqueta_margen_inferior || '1.0'));
  const [margenIzquierdo, setMargenIzquierdo] = useState(parseFloat(configuracion.etiqueta_margen_izquierdo || '1.0'));
  const [margenDerecho, setMargenDerecho] = useState(parseFloat(configuracion.etiqueta_margen_derecho || '1.0'));
  const [gapColumnas, setGapColumnas] = useState(parseFloat(configuracion.etiqueta_gap_columnas || '0.5'));
  const [gapFilas, setGapFilas] = useState(parseFloat(configuracion.etiqueta_gap_filas || '0.0'));
  const [anchoMm, setAnchoMm] = useState(parseFloat(configuracion.etiqueta_ancho_mm || '44'));
  const [altoMm, setAltoMm] = useState(parseFloat(configuracion.etiqueta_alto_mm || '13'));

  // Estados visuales del calibrador
  const [mostrarPlantillaFondo, setMostrarPlantillaFondo] = useState(true);
  const [opacidadPlantilla, setOpacidadPlantilla] = useState(0.4);
  const [opacidadEtiquetas, setOpacidadEtiquetas] = useState(0.85); // Nueva opacidad regulable para el fondo de las etiquetas
  const [esEscalaGris, setEsEscalaGris] = useState(false);
  const [mostrarBordesGuia, setMostrarBordesGuia] = useState(true);
  const [imprimirConPlantilla, setImprimirConPlantilla] = useState(false);
  const [showPdfToast, setShowPdfToast] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Escala del preview en pantalla para que quepa en la interfaz (Letter es 21.59 x 27.94 cm)
  const [scale, setScale] = useState(0.45);

  const isAveryLocal = formatoPapel === 'avery_5167';
  const isUlineLocal = formatoPapel === 'uline_s10425sil';
  const isSheetLocal = isAveryLocal || isUlineLocal;

  // Header textual de las etiquetas
  const rawHeader = configuracion.cabecera_etiqueta_impresion 
    ? configuracion.cabecera_etiqueta_impresion.replace('{siglas}', configuracion.siglas_institucion || 'UPEN')
    : `CONTROL INTERNO DE ACTIVO FIJO ${configuracion.siglas_institucion || 'UPEN'}`;
  const headerText = rawHeader.toUpperCase().startsWith("CONTROL INTERNO DE ACTIVO FIJO")
    ? `ACTIVO FIJO ${configuracion.siglas_institucion || 'UPEN'}`
    : rawHeader;

  // Mapear configuración de etiquetas institucional para la vista previa de forma adaptativa
  const getFormatStyleVal = (baseKey, defaultValue, isBool = false) => {
    const suffixed = `${baseKey}_${formatoPapel}`;
    if (configuracion[suffixed] !== undefined && configuracion[suffixed] !== null) {
      const raw = configuracion[suffixed];
      if (isBool) return parseBool(raw, defaultValue);
      return raw;
    }
    const savedFormat = configuracion.etiqueta_formato_papel || 'avery_5167';
    if (formatoPapel === savedFormat && configuracion[baseKey] !== undefined && configuracion[baseKey] !== null) {
      const raw = configuracion[baseKey];
      if (isBool) return parseBool(raw, defaultValue);
      return raw;
    }
    return defaultValue;
  };

  const etiquetaMostrarCabecera = getFormatStyleVal('etiqueta_mostrar_cabecera', true, true);
  const etiquetaMostrarMarcaModelo = getFormatStyleVal('etiqueta_mostrar_marca_modelo', true, true);
  const etiquetaMostrarSerial = getFormatStyleVal('etiqueta_mostrar_serial', true, true);

  const letraCabeceraPt = parseFloat(getFormatStyleVal('etiqueta_letra_cabecera_pt', isAveryLocal ? '3.8' : (isUlineLocal ? '6.5' : (formatoPapel === 'rollo_51_25' ? '6.5' : '4.5'))));
  const cabeceraBold = getFormatStyleVal('etiqueta_cabecera_bold', true, true) ? '900' : 'normal';
  const cabeceraItalic = getFormatStyleVal('etiqueta_cabecera_italic', false, true) ? 'italic' : 'normal';

  const letraMarcaModeloPt = parseFloat(getFormatStyleVal('etiqueta_letra_marca_modelo_pt', isAveryLocal ? '3.5' : (isUlineLocal ? '6.0' : (formatoPapel === 'rollo_51_25' ? '6.0' : '4.2'))));
  const marcaBold = getFormatStyleVal('etiqueta_marca_bold', false, true) ? '700' : 'normal';
  const marcaItalic = getFormatStyleVal('etiqueta_marca_italic', false, true) ? 'italic' : 'normal';

  const alturaCodigoBarrasMm = parseFloat(getFormatStyleVal('etiqueta_altura_codigo_barras_mm', isAveryLocal ? '4.8' : (isUlineLocal ? '9.0' : (formatoPapel === 'rollo_51_25' ? '9.0' : '5.6'))));

  const letraCodigoPt = parseFloat(getFormatStyleVal('etiqueta_letra_codigo_pt', isAveryLocal ? '4.5' : (isUlineLocal ? '7.5' : (formatoPapel === 'rollo_51_25' ? '7.5' : '5.5'))));
  const codigoBold = getFormatStyleVal('etiqueta_codigo_bold', true, true) ? '900' : 'normal';
  const codigoItalic = getFormatStyleVal('etiqueta_codigo_italic', false, true) ? 'italic' : 'normal';

  const letraSerialPt = parseFloat(getFormatStyleVal('etiqueta_letra_serial_pt', isAveryLocal ? '4.0' : (isUlineLocal ? '6.8' : (formatoPapel === 'rollo_51_25' ? '6.8' : '5.0'))));
  const serialBold = getFormatStyleVal('etiqueta_serial_bold', false, true) ? '900' : 'normal';
  const serialItalic = getFormatStyleVal('etiqueta_serial_italic', false, true) ? 'italic' : 'normal';

  const injectTemporalPrintStyles = () => {
    const estiloTemporal = document.createElement('style');
    estiloTemporal.id = 'temp-calibration-styles';

    const labelBorder = (imprimirConPlantilla && mostrarBordesGuia)
      ? '0.15mm dashed #4F46E5 !important'
      : 'none !important';

    const labelBg = imprimirConPlantilla
      ? `rgba(255, 255, 255, ${opacidadEtiquetas}) !important`
      : '#FFFFFF !important';

    const backgroundPseudo = (imprimirConPlantilla && mostrarPlantillaFondo && isSheetLocal) ? `
        body.printing-labels .print-labels-container::before {
          content: "" !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 21.59cm !important;
          height: 27.94cm !important;
          background-image: url('${formatoPapel === 'uline_s10425sil' ? '/images/plantilla_uline.jpg' : '/images/plantilla_etiquetas.jpg'}') !important;
          background-size: 100% 100% !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          opacity: ${opacidadPlantilla} !important;
          z-index: 1 !important;
          pointer-events: none !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
    ` : '';

    const formatStyles = isSheetLocal ? `
        @page {
          size: letter !important;
          margin: 0 !important;
        }
        body.printing-labels .print-labels-container {
          position: relative !important;
          display: grid !important;
          grid-template-columns: repeat(${isUlineLocal ? 3 : 4}, ${anchoMm}mm) !important;
          grid-auto-rows: ${altoMm}mm !important;
          align-content: start !important;
          padding-top: ${margenSuperior}cm !important;
          padding-bottom: ${margenInferior}cm !important;
          padding-left: ${margenIzquierdo}cm !important;
          padding-right: ${margenDerecho}cm !important;
          box-sizing: border-box !important;
          width: 21.59cm !important;
          height: 27.94cm !important;
          background: #FFFFFF !important;
          gap: ${gapFilas}cm ${gapColumnas}cm !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        ${backgroundPseudo}
        body.printing-labels .printable-label {
          position: relative !important;
          z-index: 2 !important;
          width: ${anchoMm}mm !important;
          height: ${altoMm}mm !important;
          box-sizing: border-box !important;
          padding: 0.5mm 1mm !important;
          margin: 0 !important;
          border: ${labelBorder};
          background-color: ${labelBg};
          display: block !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
    ` : `
        @page {
          size: ${anchoMm}mm ${altoMm}mm !important;
          margin: 0 !important;
        }
        body.printing-labels .print-labels-container {
          display: block !important;
          width: ${anchoMm}mm !important;
          height: auto !important;
          padding: 0 !important;
          margin: 0 !important;
          background: transparent !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body.printing-labels .printable-label {
          width: ${anchoMm}mm !important;
          height: ${altoMm}mm !important;
          page-break-after: always !important;
          page-break-inside: avoid !important;
          box-sizing: border-box !important;
          padding: 0.5mm 1mm !important;
          margin: 0 !important;
          border: ${imprimirConPlantilla ? '0.15mm dashed #4F46E5 !important' : 'none !important'};
          background-color: #FFFFFF !important;
          display: block !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
    `;

    estiloTemporal.innerHTML = `
      @media print {
        body.printing-labels {
          background: #FFFFFF !important;
          margin: 0 !important;
          padding: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        ${formatStyles}
        body.printing-labels .label-inner-clean {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          align-items: center !important;
          box-sizing: border-box !important;
        }
        body.printing-labels .label-header-clean {
          font-size: ${letraCabeceraPt}pt !important;
          line-height: 1.0 !important;
          margin: 0 !important;
          text-align: center !important;
          font-weight: ${cabeceraBold} !important;
          font-style: ${cabeceraItalic} !important;
        }
        body.printing-labels .label-details-clean {
          font-size: ${letraMarcaModeloPt}pt !important;
          line-height: 1.0 !important;
          margin: 0 !important;
          text-align: center !important;
          font-weight: ${marcaBold} !important;
          font-style: ${marcaItalic} !important;
        }
        body.printing-labels .label-barcode-clean {
          height: ${alturaCodigoBarrasMm}mm !important;
          width: 90% !important;
          margin: 0 auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        body.printing-labels .label-barcode-clean svg {
          max-height: 100% !important;
          width: 100% !important;
        }
        body.printing-labels .label-code-clean {
          font-size: ${letraCodigoPt}pt !important;
          font-weight: ${codigoBold} !important;
          font-style: ${codigoItalic} !important;
        }
        body.printing-labels .label-serial-clean {
          font-size: ${letraSerialPt}pt !important;
          font-weight: ${serialBold} !important;
          font-style: ${serialItalic} !important;
        }
      }
    `;
    const oldStyles = document.getElementById('temp-calibration-styles');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(estiloTemporal);
  };

  useEffect(() => {
    // Escuchar el tamaño de la ventana para auto-ajustar la escala si es necesario
    const handleResize = () => {
      if (window.innerWidth < 1200) {
        setScale(0.35);
      } else if (window.innerWidth < 1400) {
        setScale(0.42);
      } else {
        setScale(0.48);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sincronizar dimensiones y márgenes específicos del formato seleccionado al cambiar el dropdown
  useEffect(() => {
    const f = formatoPapel;
    const getVal = (baseKey, defaultValue) => {
      const suffixed = `${baseKey}_${f}`;
      if (configuracion[suffixed] !== undefined && configuracion[suffixed] !== null) {
        return configuracion[suffixed];
      }
      const savedFormat = configuracion.etiqueta_formato_papel || 'avery_5167';
      if (f === savedFormat && configuracion[baseKey] !== undefined && configuracion[baseKey] !== null) {
        return configuracion[baseKey];
      }
      return defaultValue;
    };

    if (f === 'avery_5167') {
      setAnchoMm(parseFloat(getVal('etiqueta_ancho_mm', '44')));
      setAltoMm(parseFloat(getVal('etiqueta_alto_mm', '13')));
      setMargenSuperior(parseFloat(getVal('etiqueta_margen_superior', '1.0')));
      setMargenInferior(parseFloat(getVal('etiqueta_margen_inferior', '1.0')));
      setMargenIzquierdo(parseFloat(getVal('etiqueta_margen_izquierdo', '1.0')));
      setMargenDerecho(parseFloat(getVal('etiqueta_margen_derecho', '1.0')));
      setGapColumnas(parseFloat(getVal('etiqueta_gap_columnas', '0.5')));
      setGapFilas(parseFloat(getVal('etiqueta_gap_filas', '0.0')));
    } else if (f === 'uline_s10425sil') {
      setAnchoMm(parseFloat(getVal('etiqueta_ancho_mm', '66.7')));
      setAltoMm(parseFloat(getVal('etiqueta_alto_mm', '25.4')));
      setMargenSuperior(parseFloat(getVal('etiqueta_margen_superior', '1.27')));
      setMargenInferior(parseFloat(getVal('etiqueta_margen_inferior', '1.27')));
      setMargenIzquierdo(parseFloat(getVal('etiqueta_margen_izquierdo', '0.48')));
      setMargenDerecho(parseFloat(getVal('etiqueta_margen_derecho', '0.48')));
      setGapColumnas(parseFloat(getVal('etiqueta_gap_columnas', '0.32')));
      setGapFilas(parseFloat(getVal('etiqueta_gap_filas', '0.0')));
    } else if (f === 'rollo_51_25') {
      setAnchoMm(parseFloat(getVal('etiqueta_ancho_mm', '51')));
      setAltoMm(parseFloat(getVal('etiqueta_alto_mm', '25')));
    } else { // 'rollo' (generic custom)
      setAnchoMm(parseFloat(getVal('etiqueta_ancho_mm', '30')));
      setAltoMm(parseFloat(getVal('etiqueta_alto_mm', '15')));
    }
  }, [formatoPapel, configuracion]);

  if (!isOpen) return null;

  // Restaurar valores por defecto de Avery 5167
  const handleRestablecerAvery = () => {
    setFormatoPapel('avery_5167');
    setMargenSuperior(1.0);
    setMargenInferior(1.0);
    setMargenIzquierdo(1.0);
    setMargenDerecho(1.0);
    setGapColumnas(0.5);
    setGapFilas(0.0);
    setAnchoMm(44.0);
    setAltoMm(13.0);
  };

  // Restaurar valores por defecto de ULINE S-10425SIL
  const handleRestablecerUline = () => {
    setFormatoPapel('uline_s10425sil');
    setMargenSuperior(1.27);
    setMargenInferior(1.27);
    setMargenIzquierdo(0.48);
    setMargenDerecho(0.48);
    setGapColumnas(0.32);
    setGapFilas(0.0);
    setAnchoMm(66.7);
    setAltoMm(25.4);
  };

  // Guardar configuración permanentemente y proceder a imprimir
  const handleGuardarEImprimir = async () => {
    setGuardando(true);
    try {
      const f = formatoPapel;
      const payload = {
        etiqueta_formato_papel: f,
        
        // active generic values
        etiqueta_margen_superior: String(margenSuperior),
        etiqueta_margen_inferior: String(margenInferior),
        etiqueta_margen_izquierdo: String(margenIzquierdo),
        etiqueta_margen_derecho: String(margenDerecho),
        etiqueta_gap_columnas: String(gapColumnas),
        etiqueta_gap_filas: String(gapFilas),
        etiqueta_ancho_mm: String(anchoMm),
        etiqueta_alto_mm: String(altoMm),

        // format-specific suffixed values
        [`etiqueta_margen_superior_${f}`]: String(margenSuperior),
        [`etiqueta_margen_inferior_${f}`]: String(margenInferior),
        [`etiqueta_margen_izquierdo_${f}`]: String(margenIzquierdo),
        [`etiqueta_margen_derecho_${f}`]: String(margenDerecho),
        [`etiqueta_gap_columnas_${f}`]: String(gapColumnas),
        [`etiqueta_gap_filas_${f}`]: String(gapFilas),
        [`etiqueta_ancho_mm_${f}`]: String(anchoMm),
        [`etiqueta_alto_mm_${f}`]: String(altoMm)
      };

      if (onSaveConfig) {
        await onSaveConfig(payload);
      }

      injectTemporalPrintStyles();

      if (onPrint) {
        onPrint(bienes, {
          etiqueta_formato_papel: formatoPapel,
          etiqueta_ancho_mm: anchoMm,
          etiqueta_alto_mm: altoMm,
          etiqueta_letra_cabecera_pt: letraCabeceraPt,
          etiqueta_letra_marca_modelo_pt: letraMarcaModeloPt,
          etiqueta_letra_codigo_pt: letraCodigoPt,
          etiqueta_letra_serial_pt: letraSerialPt,
          etiqueta_altura_codigo_barras_mm: alturaCodigoBarrasMm,
          etiqueta_mostrar_cabecera: String(etiquetaMostrarCabecera),
          etiqueta_mostrar_marca_modelo: String(etiquetaMostrarMarcaModelo),
          etiqueta_mostrar_serial: String(etiquetaMostrarSerial),
          etiqueta_cabecera_bold: cabeceraBold === '900' ? 'true' : 'false',
          etiqueta_cabecera_italic: cabeceraItalic === 'italic' ? 'true' : 'false',
          etiqueta_marca_bold: marcaBold === '700' ? 'true' : 'false',
          etiqueta_marca_italic: marcaItalic === 'italic' ? 'true' : 'false',
          etiqueta_codigo_bold: codigoBold === '900' ? 'true' : 'false',
          etiqueta_codigo_italic: codigoItalic === 'italic' ? 'true' : 'false',
          etiqueta_serial_bold: serialBold === '900' ? 'true' : 'false',
          etiqueta_serial_italic: serialItalic === 'italic' ? 'true' : 'false',
          etiqueta_margen_superior: String(margenSuperior),
          etiqueta_margen_inferior: String(margenInferior),
          etiqueta_margen_izquierdo: String(margenIzquierdo),
          etiqueta_margen_derecho: String(margenDerecho),
          etiqueta_gap_columnas: String(gapColumnas),
          etiqueta_gap_filas: String(gapFilas)
        });
      }

      setTimeout(() => {
        const styles = document.getElementById('temp-calibration-styles');
        if (styles) styles.remove();
      }, 1000);

      onClose();
    } catch (error) {
      console.error('Error al guardar calibración:', error);
    } finally {
      setGuardando(false);
    }
  };

  // Imprimir directo temporal (Prueba rápida sin guardar a BD)
  const handleImprimirPrueba = () => {
    injectTemporalPrintStyles();

    if (onPrint) {
      onPrint(bienes, {
        etiqueta_formato_papel: formatoPapel,
        etiqueta_ancho_mm: anchoMm,
        etiqueta_alto_mm: altoMm,
        etiqueta_letra_cabecera_pt: letraCabeceraPt,
        etiqueta_letra_marca_modelo_pt: letraMarcaModeloPt,
        etiqueta_letra_codigo_pt: letraCodigoPt,
        etiqueta_letra_serial_pt: letraSerialPt,
        etiqueta_altura_codigo_barras_mm: alturaCodigoBarrasMm,
        etiqueta_mostrar_cabecera: String(etiquetaMostrarCabecera),
        etiqueta_mostrar_marca_modelo: String(etiquetaMostrarMarcaModelo),
        etiqueta_mostrar_serial: String(etiquetaMostrarSerial),
        etiqueta_cabecera_bold: cabeceraBold === '900' ? 'true' : 'false',
        etiqueta_cabecera_italic: cabeceraItalic === 'italic' ? 'true' : 'false',
        etiqueta_marca_bold: marcaBold === '700' ? 'true' : 'false',
        etiqueta_marca_italic: marcaItalic === 'italic' ? 'true' : 'false',
        etiqueta_codigo_bold: codigoBold === '900' ? 'true' : 'false',
        etiqueta_codigo_italic: codigoItalic === 'italic' ? 'true' : 'false',
        etiqueta_serial_bold: serialBold === '900' ? 'true' : 'false',
        etiqueta_serial_italic: serialItalic === 'italic' ? 'true' : 'false',
        etiqueta_margen_superior: String(margenSuperior),
        etiqueta_margen_inferior: String(margenInferior),
        etiqueta_margen_izquierdo: String(margenIzquierdo),
        etiqueta_margen_derecho: String(margenDerecho),
        etiqueta_gap_columnas: String(gapColumnas),
        etiqueta_gap_filas: String(gapFilas)
      });
    }

    // Remover los estilos temporales después de la impresión
    setTimeout(() => {
      const styles = document.getElementById('temp-calibration-styles');
      if (styles) styles.remove();
    }, 1000);
  };

  const handleExportarPDF = () => {
    setShowPdfToast(true);
    setTimeout(() => {
      setShowPdfToast(false);
      handleImprimirPrueba();
    }, 2500);
  };

  // Rellenamos con códigos mock hasta completar una página (80) si hay pocos bienes, 
  // para que el usuario pueda calibrar y visualizar toda la hoja Avery 5167 completa.
  const previewBienes = [...bienes];
  const sheetCapacity = isAveryLocal ? 80 : (isUlineLocal ? 30 : 0);
  if (isSheetLocal && previewBienes.length < sheetCapacity) {
    const originalLength = previewBienes.length;
    for (let i = 0; i < sheetCapacity - originalLength; i++) {
      const mockIndex = i % (originalLength || 1);
      const matchedBien = originalLength > 0 ? previewBienes[mockIndex] : {
        id: `mock-${i}`,
        marca: 'Marca',
        modelo: 'Modelo',
        etiqueta: 'UPEN-0000000',
        serial: 'SER-000000'
      };
      previewBienes.push({
        ...matchedBien,
        id: `mock-${i}`,
        isMock: true
      });
    }
  }

  // Limitamos a la primera página de preview para optimizar el rendimiento (80 para Avery, 30 para ULINE)
  const firstPageBienes = isSheetLocal ? previewBienes.slice(0, sheetCapacity) : previewBienes;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
      <div 
        className="modal-box" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '1240px', 
          width: '95%', 
          height: '90vh',
          borderRadius: 18, 
          border: '1px solid var(--border)', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          position: 'relative'
        }}
      >
        {showPdfToast && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <span>💡 <strong>Tip:</strong> Selecciona <strong>"Guardar como PDF"</strong> en la opción de Impresora.</span>
          </div>
        )}
        {/* Cabecera del modal */}
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, #075E54 0%, #004D40 100%)',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>⚡ Calibración Dinámica en Tiempo Real</h3>
            <span style={{ fontSize: 11, opacity: 0.8 }}>Ajusta los márgenes e imprime con precisión milimétrica usando la hoja plantilla.</span>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              color: '#fff', 
              fontSize: 16, 
              width: 32, 
              height: 32, 
              borderRadius: '50%', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}
          >✕</button>
        </div>

        {/* Cuerpo del modal (2 columnas) */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          
          {/* Columna Izquierda: Controles */}
          <div style={{ 
            width: '380px', 
            borderRight: '1px solid var(--border)', 
            padding: '20px', 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'rgba(255,255,255,0.01)'
          }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                Formato de Papel
              </label>
              <select 
                className="form-select"
                value={formatoPapel}
                onChange={e => setFormatoPapel(e.target.value)}
                style={{ width: '100%', height: 36, fontSize: 13 }}
              >
                <option value="avery_5167">Avery 5167 (4 x 20 / Carta)</option>
                <option value="uline_s10425sil">ULINE S-10425SIL (3 x 10 / Carta)</option>
                <option value="rollo_51_25">Rollo 51 x 25 mm (2" x 1")</option>
                <option value="rollo">Rollo Continuo Personalizado</option>
              </select>
            </div>

            {/* Configuración visual del background */}
            <div style={{ 
              background: 'rgba(13, 148, 136, 0.05)', 
              border: '1px solid rgba(13, 148, 136, 0.15)', 
              borderRadius: 8, 
              padding: '12px' 
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', display: 'block', marginBottom: 8 }}>
                Visualización de Plantilla
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Superponer plantilla de fondo:</span>
                <input 
                  type="checkbox" 
                  checked={mostrarPlantillaFondo} 
                  onChange={e => setMostrarPlantillaFondo(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
              </div>

              {mostrarPlantillaFondo && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                    <span>Opacidad plantilla:</span>
                    <strong>{Math.round(opacidadPlantilla * 100)}%</strong>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.01"
                    value={opacidadPlantilla} 
                    onChange={e => setOpacidadPlantilla(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </div>
              )}

              {/* Opacidad de etiquetas para ver el fondo */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>
                  <span>Opacidad de etiquetas:</span>
                  <strong>{Math.round(opacidadEtiquetas * 100)}%</strong>
                </div>
                <input 
                  type="range" 
                  min="0.0" 
                  max="1.0" 
                  step="0.01"
                  value={opacidadEtiquetas} 
                  onChange={e => setOpacidadEtiquetas(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>Mostrar bordes de corte:</span>
                <input 
                  type="checkbox" 
                  checked={mostrarBordesGuia} 
                  onChange={e => setMostrarBordesGuia(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, borderTop: '1px dashed rgba(13, 148, 136, 0.25)', paddingTop: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>Imprimir con plantilla y guías:</span>
                <input 
                  type="checkbox" 
                  checked={imprimirConPlantilla} 
                  onChange={e => setImprimirConPlantilla(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'block', marginTop: 4, lineHeight: '1.2' }}>
                Incluye la plantilla de fondo y bordes en el papel impreso (útil para pruebas de calibración).
              </span>
            </div>

            {/* Sliders de Calibración */}
            {isSheetLocal ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                  Márgenes de la Hoja (CM)
                </span>

                {/* Superior */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Margen Superior:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input 
                        type="number" 
                        value={margenSuperior} 
                        onChange={e => setMargenSuperior(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                        step="0.001"
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0.0" 
                    max="4.0" 
                    step="0.001"
                    value={margenSuperior} 
                    onChange={e => setMargenSuperior(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>

                {/* Izquierdo */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Margen Izquierdo:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input 
                        type="number" 
                        value={margenIzquierdo} 
                        onChange={e => setMargenIzquierdo(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                        step="0.001"
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0.0" 
                    max="4.0" 
                    step="0.001"
                    value={margenIzquierdo} 
                    onChange={e => setMargenIzquierdo(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>

                {/* Inferior */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Margen Inferior:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input 
                        type="number" 
                        value={margenInferior} 
                        onChange={e => setMargenInferior(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                        step="0.001"
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0.0" 
                    max="4.0" 
                    step="0.001"
                    value={margenInferior} 
                    onChange={e => setMargenInferior(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>

                {/* Derecho */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Margen Derecho:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input 
                        type="number" 
                        value={margenDerecho} 
                        onChange={e => setMargenDerecho(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                        step="0.001"
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0.0" 
                    max="4.0" 
                    step="0.001"
                    value={margenDerecho} 
                    onChange={e => setMargenDerecho(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>

                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginTop: 8 }}>
                  Espaciado entre Etiquetas (CM)
                </span>

                {/* Gap Columnas */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Separación Columnas:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input 
                        type="number" 
                        value={gapColumnas} 
                        onChange={e => setGapColumnas(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                        step="0.001"
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0.0" 
                    max="2.0" 
                    step="0.001"
                    value={gapColumnas} 
                    onChange={e => setGapColumnas(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>

                {/* Gap Filas */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Separación Filas:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input 
                        type="number" 
                        value={gapFilas} 
                        onChange={e => setGapFilas(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                        step="0.001"
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>cm</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0.0" 
                    max="1.5" 
                    step="0.001"
                    value={gapFilas} 
                    onChange={e => setGapFilas(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(13, 148, 136, 0.05)',
                border: '1px dashed rgba(13, 148, 136, 0.15)',
                borderRadius: 8,
                padding: '12px',
                color: 'var(--text-secondary)',
                fontSize: 12,
                lineHeight: '1.4'
              }}>
                ℹ️ <strong>Formato Rollo Continuo:</strong> En este modo, cada etiqueta se imprime de forma individual. Los márgenes de hoja y espaciados entre columnas no aplican. Ajusta únicamente las dimensiones de ancho y alto de la etiqueta a continuación.
              </div>
            )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginTop: 8 }}>
                  Dimensión Etiqueta (MM)
                </span>

                {/* Ancho Etiqueta */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Ancho de Etiqueta:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input 
                        type="number" 
                        value={anchoMm} 
                        onChange={e => setAnchoMm(Math.max(10, parseFloat(e.target.value) || 10))}
                        style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                        step="0.01"
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>mm</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="20.0" 
                    max="100.0" 
                    step="0.01"
                    value={anchoMm} 
                    onChange={e => setAnchoMm(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>

                {/* Alto Etiqueta */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>Alto de Etiqueta:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input 
                        type="number" 
                        value={altoMm} 
                        onChange={e => setAltoMm(Math.max(5, parseFloat(e.target.value) || 5))}
                        style={{ width: 54, height: 20, fontSize: 11, padding: '0 4px', borderRadius: 4, border: '1px solid var(--border)' }}
                        step="0.01"
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>mm</span>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="5.0" 
                    max="50.0" 
                    step="0.01"
                    value={altoMm} 
                    onChange={e => setAltoMm(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                </div>
              </div>

            {isAveryLocal && (
              <button 
                className="btn btn-ghost" 
                onClick={handleRestablecerAvery}
                style={{ width: '100%', border: '1px dashed var(--border)', fontSize: 12, marginTop: 8 }}
              >
                🔄 Restablecer Plantilla Avery 5167
              </button>
            )}
            {isUlineLocal && (
              <button 
                className="btn btn-ghost" 
                onClick={handleRestablecerUline}
                style={{ width: '100%', border: '1px dashed var(--border)', fontSize: 12, marginTop: 8 }}
              >
                🔄 Restablecer Plantilla ULINE S-10425SIL
              </button>
            )}
          </div>

          {/* Columna Derecha: Vista Previa Interactiva */}
          <div style={{ 
            flex: 1, 
            background: 'var(--bg-body)', 
            padding: '24px', 
            overflow: 'auto',
            display: 'flex',
            position: 'relative'
          }}>
            {/* Control Flotante de Zoom */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '24px',
              zIndex: 10,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              userSelect: 'none'
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Zoom:
              </span>
              <button 
                type="button"
                onClick={() => setScale(prev => Math.max(0.2, +(prev - 0.05).toFixed(2)))}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 'bold',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                -
              </button>
              <input 
                type="range" 
                min="0.2" 
                max="1.5" 
                step="0.05"
                value={scale} 
                onChange={e => setScale(parseFloat(e.target.value))}
                style={{ width: 100, accentColor: 'var(--primary)', cursor: 'pointer', margin: 0 }}
              />
              <button 
                type="button"
                onClick={() => setScale(prev => Math.min(1.5, +(prev + 0.05).toFixed(2)))}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: 'bold',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                +
              </button>
              <span style={{ fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: 'right', color: 'var(--text-primary)' }}>
                {Math.round(scale * 100)}%
              </span>
              <button 
                type="button"
                onClick={() => {
                  if (window.innerWidth < 1200) {
                    setScale(0.35);
                  } else if (window.innerWidth < 1400) {
                    setScale(0.42);
                  } else {
                    setScale(0.48);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.color = 'var(--primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                Ajustar
              </button>
            </div>

            {/* Contenedor del tamaño real de la escala para prevenir recortes de scroll */}
            <div style={{
              width: isSheetLocal ? `${21.59 * scale}cm` : '300px',
              height: isSheetLocal ? `${27.94 * scale}cm` : '580px',
              position: 'relative',
              flexShrink: 0,
              margin: 'auto',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              overflowY: isSheetLocal ? 'visible' : 'auto',
              background: isSheetLocal ? 'transparent' : 'rgba(0, 0, 0, 0.25)',
              borderRadius: isSheetLocal ? 0 : 12,
              padding: isSheetLocal ? 0 : '24px 16px',
              border: isSheetLocal ? 'none' : '1px solid var(--border)',
              boxSizing: 'border-box'
            }}>
              {/* If it is a roll, we wrap it in a scaled scroll container to calculate scroll height properly */}
              {!isSheetLocal ? (
                <div style={{
                  width: `${(anchoMm / 10) * scale}cm`,
                  height: `${(((altoMm + 2) * firstPageBienes.length) / 10) * scale}cm`,
                  position: 'relative',
                  overflow: 'hidden',
                  margin: '0 auto'
                }}>
                  <div 
                    className="calibrator-preview-container"
                    style={{
                      width: `${anchoMm}mm`,
                      height: 'auto',
                      backgroundColor: 'transparent',
                      transform: `scale(${scale})`,
                      transformOrigin: 'top left',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      boxSizing: 'border-box',
                      transition: 'all 0.1s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2mm'
                    }}
                  >
                    <style dangerouslySetInnerHTML={{ __html: `
                      .calibrator-preview-container .printable-label {
                        width: ${anchoMm}mm !important;
                        height: ${altoMm}mm !important;
                        box-sizing: border-box !important;
                        padding: 0.6mm 1.2mm !important;
                        border: ${mostrarBordesGuia ? '0.15mm dashed #4F46E5' : 'none'} !important;
                        border-radius: 1.2mm !important;
                        background-color: rgba(255, 255, 255, ${opacidadEtiquetas}) !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        overflow: hidden !important;
                      }
                      .calibrator-preview-container .label-inner-clean {
                        width: 100% !important;
                        height: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        box-sizing: border-box !important;
                      }
                      .calibrator-preview-container .label-header-clean {
                        font-size: ${letraCabeceraPt}pt !important;
                        line-height: 1.0 !important;
                        font-weight: ${cabeceraBold} !important;
                        font-style: ${cabeceraItalic} !important;
                        color: #000000 !important;
                        text-align: center !important;
                        text-transform: uppercase !important;
                        width: 100% !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                      }
                      .calibrator-preview-container .label-details-clean {
                        font-size: ${letraMarcaModeloPt}pt !important;
                        line-height: 1.0 !important;
                        font-weight: ${marcaBold} !important;
                        font-style: ${marcaItalic} !important;
                        color: #333333 !important;
                        text-align: center !important;
                        width: 100% !important;
                        white-space: nowrap !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                      }
                      .calibrator-preview-container .label-barcode-clean {
                        height: ${alturaCodigoBarrasMm}mm !important;
                        width: 90% !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        overflow: hidden !important;
                      }
                      .calibrator-preview-container .label-barcode-clean svg {
                        max-height: 100% !important;
                        width: 100% !important;
                      }
                      .calibrator-preview-container .label-footer-clean {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        width: 100% !important;
                        line-height: 1.0 !important;
                      }
                      .calibrator-preview-container .label-code-clean {
                        font-size: ${letraCodigoPt}pt !important;
                        font-weight: ${codigoBold} !important;
                        font-style: ${codigoItalic} !important;
                        color: #000000 !important;
                        max-width: ${etiquetaMostrarSerial ? '40%' : '100%'} !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        white-space: nowrap !important;
                      }
                      .calibrator-preview-container .label-serial-clean {
                        font-size: ${letraSerialPt}pt !important;
                        font-weight: ${serialBold} !important;
                        font-style: ${serialItalic} !important;
                        color: #000000 !important;
                        opacity: 0.8 !important;
                        max-width: 60% !important;
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        white-space: nowrap !important;
                      }
                    `}} />

                    {firstPageBienes.map((bien, idx) => (
                      <div 
                        key={bien.id} 
                        className="printable-label"
                        style={{
                          opacity: bien.isMock ? 0.6 : 1
                        }}
                      >
                        <div className="label-inner-clean">
                          {etiquetaMostrarCabecera && (
                            <div className="label-header-clean">
                              {headerText}
                            </div>
                          )}

                          {etiquetaMostrarMarcaModelo && (
                            <div className="label-details-clean">
                              {bien.marca} {bien.modelo}
                            </div>
                          )}

                          {!bien.etiqueta.startsWith('SIN-NUMERO-') ? (
                            <div 
                              className="label-barcode-clean"
                              dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(bien.etiqueta, false) }}
                            />
                          ) : (
                            <div className="label-barcode-clean" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', color: '#999', border: '1px dashed #ccc', borderRadius: '3px' }}>
                              [SIN NÚMERO]
                            </div>
                          )}

                          <div className="label-footer-clean">
                            <span className="label-code-clean">
                              {bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}
                            </span>
                            {etiquetaMostrarSerial && (
                              <span className="label-serial-clean">
                                S/N: {bien.serial || 'N/S'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* If it is Avery 5167, we render the Letter sheet container absolutely positioned */
                <div 
                  className="calibrator-preview-container"
                  style={{
                    width: '21.59cm',
                    height: '27.94cm',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    boxSizing: 'border-box',
                    transition: 'all 0.1s ease'
                  }}
                >
                  <style dangerouslySetInnerHTML={{ __html: `
                    .calibrator-preview-container .printable-label {
                      width: ${anchoMm}mm !important;
                      height: ${altoMm}mm !important;
                      box-sizing: border-box !important;
                      padding: 0.6mm 1.2mm !important;
                      border: ${mostrarBordesGuia ? '0.15mm dashed #4F46E5' : 'none'} !important;
                      border-radius: 1.2mm !important;
                      background-color: rgba(255, 255, 255, ${opacidadEtiquetas}) !important;
                      display: flex !important;
                      flex-direction: column !important;
                      justify-content: space-between !important;
                      align-items: center !important;
                      overflow: hidden !important;
                    }
                    .calibrator-preview-container .label-inner-clean {
                      width: 100% !important;
                      height: 100% !important;
                      display: flex !important;
                      flex-direction: column !important;
                      justify-content: space-between !important;
                      align-items: center !important;
                      box-sizing: border-box !important;
                    }
                    .calibrator-preview-container .label-header-clean {
                      font-size: ${letraCabeceraPt}pt !important;
                      line-height: 1.0 !important;
                      font-weight: ${cabeceraBold} !important;
                      font-style: ${cabeceraItalic} !important;
                      color: #000000 !important;
                      text-align: center !important;
                      text-transform: uppercase !important;
                      width: 100% !important;
                      white-space: nowrap !important;
                      overflow: hidden !important;
                      text-overflow: ellipsis !important;
                    }
                    .calibrator-preview-container .label-details-clean {
                      font-size: ${letraMarcaModeloPt}pt !important;
                      line-height: 1.0 !important;
                      font-weight: ${marcaBold} !important;
                      font-style: ${marcaItalic} !important;
                      color: #333333 !important;
                      text-align: center !important;
                      width: 100% !important;
                      white-space: nowrap !important;
                      overflow: hidden !important;
                      text-overflow: ellipsis !important;
                    }
                    .calibrator-preview-container .label-barcode-clean {
                      height: ${alturaCodigoBarrasMm}mm !important;
                      width: 90% !important;
                      display: flex !important;
                      align-items: center !important;
                      justify-content: center !important;
                      overflow: hidden !important;
                    }
                    .calibrator-preview-container .label-barcode-clean svg {
                      max-height: 100% !important;
                      width: 100% !important;
                    }
                    .calibrator-preview-container .label-footer-clean {
                      display: flex !important;
                      justify-content: space-between !important;
                      align-items: center !important;
                      width: 100% !important;
                      line-height: 1.0 !important;
                    }
                    .calibrator-preview-container .label-code-clean {
                      font-size: ${letraCodigoPt}pt !important;
                      font-weight: ${codigoBold} !important;
                      font-style: ${codigoItalic} !important;
                      color: #000000 !important;
                      max-width: ${etiquetaMostrarSerial ? '40%' : '100%'} !important;
                      overflow: hidden !important;
                      text-overflow: ellipsis !important;
                      white-space: nowrap !important;
                    }
                    .calibrator-preview-container .label-serial-clean {
                      font-size: ${letraSerialPt}pt !important;
                      font-weight: ${serialBold} !important;
                      font-style: ${serialItalic} !important;
                      color: #000000 !important;
                      opacity: 0.8 !important;
                      max-width: 60% !important;
                      overflow: hidden !important;
                      text-overflow: ellipsis !important;
                      white-space: nowrap !important;
                    }
                  `}} />

                  {/* Imagen de la plantilla de fondo para calibración */}
                  {mostrarPlantillaFondo && isSheetLocal && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: `url(${formatoPapel === 'uline_s10425sil' ? "'/images/plantilla_uline.jpg'" : "'/images/plantilla_etiquetas.jpg'"})`,
                        backgroundSize: '100% 100%',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        opacity: opacidadPlantilla,
                        pointerEvents: 'none',
                        zIndex: 1
                      }}
                    />
                  )}

                  {/* Grid contenedor de las etiquetas en tiempo real */}
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '21.59cm',
                      height: '27.94cm',
                      display: 'grid',
                      gridTemplateColumns: `repeat(${isUlineLocal ? 3 : 4}, ${anchoMm}mm)`,
                      gridAutoRows: `${altoMm}mm`,
                      alignContent: 'start',
                      paddingTop: `${margenSuperior}cm`,
                      paddingBottom: `${margenInferior}cm`,
                      paddingLeft: `${margenIzquierdo}cm`,
                      paddingRight: `${margenDerecho}cm`,
                      gap: `${gapFilas}cm ${gapColumnas}cm`,
                      boxSizing: 'border-box',
                      zIndex: 2,
                      pointerEvents: 'none'
                    }}
                  >
                    {firstPageBienes.map((bien, idx) => (
                      <div 
                        key={bien.id} 
                        className="printable-label"
                        style={{
                          opacity: bien.isMock ? 0.6 : 1
                        }}
                      >
                        <div className="label-inner-clean">
                          {etiquetaMostrarCabecera && (
                            <div className="label-header-clean">
                              {headerText}
                            </div>
                          )}

                          {etiquetaMostrarMarcaModelo && (
                            <div className="label-details-clean">
                              {bien.marca} {bien.modelo}
                            </div>
                          )}

                          {!bien.etiqueta.startsWith('SIN-NUMERO-') ? (
                            <div 
                              className="label-barcode-clean"
                              dangerouslySetInnerHTML={{ __html: generateBarcodeSVG(bien.etiqueta, false) }}
                            />
                          ) : (
                            <div className="label-barcode-clean" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', color: '#999', border: '1px dashed #ccc', borderRadius: '3px' }}>
                              [SIN NÚMERO]
                            </div>
                          )}

                          <div className="label-footer-clean">
                            <span className="label-code-clean">
                              {bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}
                            </span>
                            {etiquetaMostrarSerial && (
                              <span className="label-serial-clean">
                                S/N: {bien.serial || 'N/S'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer del modal */}
        <div style={{ 
          padding: '16px 24px', 
          background: 'var(--bg-body)', 
          borderTop: '1px solid var(--border)', 
          display: 'flex', 
          gap: 12, 
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginRight: 'auto' }}>
            📋 {bienes.length} bienes seleccionados para imprimir ({firstPageBienes.length} en preview).
          </span>

          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={onClose}
            disabled={guardando}
            style={{ padding: '8px 16px', borderRadius: 8 }}
          >
            Cancelar
          </button>

          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={handleImprimirPrueba}
            disabled={guardando || showPdfToast}
            style={{ 
              border: '1px solid var(--primary)', 
              color: 'var(--primary)',
              padding: '8px 18px', 
              borderRadius: 8,
              fontWeight: 600
            }}
          >
            🖨️ Imprimir Prueba Rápida
          </button>

          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={handleExportarPDF}
            disabled={guardando || showPdfToast}
            style={{ 
              border: '1px solid #0284c7', 
              color: '#0284c7',
              padding: '8px 18px', 
              borderRadius: 8,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            📄 {showPdfToast ? 'Preparando...' : 'Guardar como PDF'}
          </button>

          <button 
            type="button" 
            className="btn" 
            onClick={handleGuardarEImprimir}
            disabled={guardando}
            style={{ 
              background: 'linear-gradient(135deg, var(--primary) 0%, #004D40 100%)', 
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 24px', 
              borderRadius: 8,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)'
            }}
          >
            {guardando ? 'Guardando...' : '💾 Guardar Calibración e Imprimir'}
          </button>
        </div>
      </div>
    </div>
  );
}
