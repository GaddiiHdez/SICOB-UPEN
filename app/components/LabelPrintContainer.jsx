'use client';
import React from 'react';
import { generateBarcodeSVG } from '@/lib/barcode';

/**
 * LabelPrintContainer - Contenedor e inyector de estilos de impresión de etiquetas.
 * 
 * Se encarga de aislar y renderizar la plantilla de etiquetas y de inyectar las
 * reglas CSS `@media print` exclusivas del formato seleccionado. Solo se renderiza
 * cuando hay etiquetas activas para imprimir, evitando afectar a otros formatos de impresión.
 * 
 * @param {Object} props
 * @param {Array} props.bienesEtiquetasPrint - Bienes a imprimir.
 * @param {Object} props.configuracion - Configuración global de la base de datos.
 * @param {Object} props.printConfig - Sobrescritura temporal de calibración en curso.
 */
export default function LabelPrintContainer({ bienesEtiquetasPrint, configuracion, printConfig }) {
  if (!bienesEtiquetasPrint || bienesEtiquetasPrint.length === 0) {
    return null;
  }

  const activeFormat = printConfig?.etiqueta_formato_papel || configuracion?.etiqueta_formato_papel || 'avery_5167';
  const isAvery = activeFormat === 'avery_5167';
  const isUline = activeFormat === 'uline_s10425sil';
  const isSheet = isAvery || isUline;

  // Obtener valor parametrizado según el preset activo
  const getFormatValue = (baseKey, defaultValue, isBool = false) => {
    const suffixed = `${baseKey}_${activeFormat}`;
    let raw = undefined;
    if (printConfig && printConfig[baseKey] !== undefined && printConfig[baseKey] !== null) {
      raw = printConfig[baseKey];
    } else if (printConfig && printConfig[suffixed] !== undefined && printConfig[suffixed] !== null) {
      raw = printConfig[suffixed];
    } else if (configuracion && configuracion[suffixed] !== undefined && configuracion[suffixed] !== null) {
      raw = configuracion[suffixed];
    } else if (configuracion && configuracion[baseKey] !== undefined && configuracion[baseKey] !== null) {
      raw = configuracion[baseKey];
    }
    if (raw === undefined || raw === null) return defaultValue;
    if (isBool) {
      if (typeof raw === 'boolean') return raw;
      return raw !== 'false';
    }
    return raw;
  };

  // Dimensiones del papel/etiqueta
  const anchoMm = parseFloat(getFormatValue('etiqueta_ancho_mm', isAvery ? '44' : (isUline ? '66.7' : (activeFormat === 'rollo_51_25' ? '51' : '30'))));
  const altoMm = parseFloat(getFormatValue('etiqueta_alto_mm', isAvery ? '13' : (isUline ? '25.4' : (activeFormat === 'rollo_51_25' ? '25' : '15'))));
  const scalePad = anchoMm / 30;

  // Márgenes y Gaps
  const margenSuperior = parseFloat(getFormatValue('etiqueta_margen_superior', isUline ? '1.27' : '1.0'));
  const margenInferior = parseFloat(getFormatValue('etiqueta_margen_inferior', isUline ? '1.27' : '1.0'));
  const margenIzquierdo = parseFloat(getFormatValue('etiqueta_margen_izquierdo', isUline ? '0.48' : '1.0'));
  const margenDerecho = parseFloat(getFormatValue('etiqueta_margen_derecho', isUline ? '0.48' : '1.0'));
  const gapColumnas = parseFloat(getFormatValue('etiqueta_gap_columnas', isUline ? '0.32' : '0.5'));
  const gapFilas = parseFloat(getFormatValue('etiqueta_gap_filas', '0.0'));

  // Visibilidades
  const mostrarCabecera = getFormatValue('etiqueta_mostrar_cabecera', true, true);
  const mostrarMarcaModelo = getFormatValue('etiqueta_mostrar_marca_modelo', true, true);
  const mostrarSerial = getFormatValue('etiqueta_mostrar_serial', true, true);

  // Tipografías y pesos
  const letraCabeceraPt = parseFloat(getFormatValue('etiqueta_letra_cabecera_pt', isAvery ? '3.8' : (isUline ? '6.5' : (activeFormat === 'rollo_51_25' ? '6.5' : '4.5'))));
  const cabeceraBold = getFormatValue('etiqueta_cabecera_bold', true, true) ? '900' : 'normal';
  const cabeceraItalic = getFormatValue('etiqueta_cabecera_italic', false, true) ? 'italic' : 'normal';

  const letraMarcaModeloPt = parseFloat(getFormatValue('etiqueta_letra_marca_modelo_pt', isAvery ? '3.5' : (isUline ? '6.0' : (activeFormat === 'rollo_51_25' ? '6.0' : '4.2'))));
  const marcaBold = getFormatValue('etiqueta_marca_bold', false, true) ? '700' : 'normal';
  const marcaItalic = getFormatValue('etiqueta_marca_italic', false, true) ? 'italic' : 'normal';

  const alturaCodigoBarrasMm = parseFloat(getFormatValue('etiqueta_altura_codigo_barras_mm', isAvery ? '4.8' : (isUline ? '9.0' : (activeFormat === 'rollo_51_25' ? '9.0' : '5.6'))));

  const letraCodigoPt = parseFloat(getFormatValue('etiqueta_letra_codigo_pt', isAvery ? '4.5' : (isUline ? '7.5' : (activeFormat === 'rollo_51_25' ? '7.5' : '5.5'))));
  const codigoBold = getFormatValue('etiqueta_codigo_bold', true, true) ? '900' : 'normal';
  const codigoItalic = getFormatValue('etiqueta_codigo_italic', false, true) ? 'italic' : 'normal';

  const letraSerialPt = parseFloat(getFormatValue('etiqueta_letra_serial_pt', isAvery ? '4.0' : (isUline ? '6.8' : (activeFormat === 'rollo_51_25' ? '6.8' : '5.0'))));
  const serialBold = getFormatValue('etiqueta_serial_bold', false, true) ? '900' : 'normal';
  const serialItalic = getFormatValue('etiqueta_serial_italic', false, true) ? 'italic' : 'normal';

  // Construcción dinámica de estilos de impresión
  const dynamicPrintStyles = isSheet ? `
    @media print {
      @page {
        size: letter !important;
        margin: 0 !important;
      }
      body.printing-labels {
        background: #FFFFFF !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body.printing-labels .print-labels-container {
        display: grid !important;
        grid-template-columns: repeat(${isUline ? 3 : 4}, ${anchoMm}mm) !important;
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
        page-break-after: always !important;
        break-after: page !important;
      }
      body.printing-labels .print-labels-container:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      body.printing-labels .printable-label {
        width: ${anchoMm}mm !important;
        height: ${altoMm}mm !important;
        box-sizing: border-box !important;
        padding: 0.5mm 1mm !important;
        margin: 0 !important;
        border: 0.1mm solid #D1D5DB !important;
        display: block !important;
        background: #FFFFFF !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
      }
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
  ` : `
    @media print {
      @page {
        size: ${anchoMm}mm ${altoMm}mm !important;
        margin: 0 !important;
      }
      body.printing-labels {
        background: #FFFFFF !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
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
        padding: ${0.8 * scalePad}mm ${1.5 * scalePad}mm ${1.0 * scalePad}mm !important;
        margin: 0 !important;
        border: none !important;
        background-color: #FFFFFF !important;
        display: block !important;
        overflow: hidden !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
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

  // Cabecera textual de la etiqueta
  const rawHeader = configuracion?.cabecera_etiqueta_impresion 
    ? configuracion.cabecera_etiqueta_impresion.replace('{siglas}', configuracion.siglas_institucion || 'UPEN')
    : `CONTROL INTERNO DE ACTIVO FIJO ${configuracion?.siglas_institucion || 'UPEN'}`;
  const headerText = rawHeader.toUpperCase().startsWith("CONTROL INTERNO DE ACTIVO FIJO")
    ? `ACTIVO FIJO ${configuracion?.siglas_institucion || 'UPEN'}`
    : rawHeader;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: dynamicPrintStyles }} />

      {isSheet ? (() => {
        // Paginación (grupos de 80 para Avery, 30 para ULINE por página Carta)
        const pageSize = isUline ? 30 : 80;
        const pages = [];
        for (let i = 0; i < bienesEtiquetasPrint.length; i += pageSize) {
          pages.push(bienesEtiquetasPrint.slice(i, i + pageSize));
        }

        return (
          <div className="print-pages-wrapper">
            {pages.map((pageLabels, pageIdx) => (
              <div key={pageIdx} className="print-labels-container">
                {pageLabels.map((bien) => (
                  <div key={bien.id} className="printable-label">
                    <div className="label-inner-clean">
                      {mostrarCabecera && (
                        <div className="label-header-clean">
                          {headerText}
                        </div>
                      )}
                      {mostrarMarcaModelo && (
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
                        <span className="label-code-clean" style={{ maxWidth: mostrarSerial ? '40%' : '100%' }}>
                          {bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}
                        </span>
                        {mostrarSerial && (
                          <span className="label-serial-clean">
                            S/N: {bien.serial || 'N/S'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })() : (
        // Impresión en rollo térmico continuo
        <div className="print-labels-container">
          {bienesEtiquetasPrint.map((bien) => (
            <div key={bien.id} className="printable-label">
              <div className="label-inner-clean">
                {mostrarCabecera && (
                  <div className="label-header-clean">
                    {headerText}
                  </div>
                )}
                {mostrarMarcaModelo && (
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
                  <span className="label-code-clean" style={{ maxWidth: mostrarSerial ? '40%' : '100%' }}>
                    {bien.etiqueta.startsWith('SIN-NUMERO-') ? 'S/N' : bien.etiqueta}
                  </span>
                  {mostrarSerial && (
                    <span className="label-serial-clean">
                      S/N: {bien.serial || 'N/S'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
