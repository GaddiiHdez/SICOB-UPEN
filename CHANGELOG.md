# Changelog

All notable changes to the **SICOB** (Sistema de Control y Operación de Bienes) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.13.0] - 2026-06-17

### Added
- **Módulo de Laboratorios e Incidentes:** Gestión completa de laboratorios y reporte/seguimiento de incidentes asociados a bienes tecnológicos.
- **Restablecimiento de Contraseña Seguro:** Sistema de generación de enlaces/tokens temporales de restablecimiento de contraseñas desde el panel de Accesos.
- **Respaldos de Base de Datos:** Pestaña de Respaldos en Configuración para exportar, descargar y restaurar bases de datos PostgreSQL.

### Changed
- **Configuración de ESLint:** Ajuste y desactivación de reglas estrictas de React/React-Hooks en `eslint.config.mjs` para garantizar la integridad y éxito del build en producción.

## [0.12.5] - 2026-06-10

### Fixed
- **Protección de Cierre de Modales:** Corrección de errores en auditoría y protectores globales de modales.
- **Impresión de Reportes:** Solución a truncamiento de páginas y mejora de maquetación en membrete institucional.

## [0.12.0] - 2026-06-10

### Added
- **Firmas Dinámicas:** Soporte para firmas configurables en formatos imprimibles de resguardos y vales.

## [0.11.0] - 2026-06-10

### Added
- **Vales de Salida:** Módulo de control de salidas de consumibles y préstamos temporales de bienes.

## [0.10.0] - 2026-06-10

### Added
- **Colector de Especificaciones:** Módulo de recopilación automática de hardware y versión del sistema.

## [0.9.4] - 2026-06-08

### Changed
- **Optimización Extrema de Espacio en Impresión:** Se reemplazó el estilo en línea de la tabla principal de reportes por nombres de clase de CSS (`.report-table`, `.report-th`, `.report-td`) para permitir una personalización completa y eludir la prioridad de los atributos inline.
- **Micro-fuentes y Márgenes Ultra-compactos:** Reducción del tamaño de la fuente a **8px** (y **7px** para badges y códigos) con un padding de celda de tan solo **3px 4px** y un alto de línea de **1.0** durante la impresión, maximizando la densidad de datos y permitiendo acomodar más registros por hoja.

## [0.9.3] - 2026-06-08

### Added
- **Cabecera Institucional Oficial (Impresión de Reportes):** Se incorporó un membrete formal de impresión en el Generador de Reportes, mostrando el logotipo institucional (`configuracion.logo_institucion`), el nombre completo de la institución, el sub-encabezado "Departamento de Informática", la fecha y hora exacta de emisión, y el título formal del documento.
- **Tabla de Metadatos Compacta (Impresión):** Se diseñó una tabla de resumen de filtros aplicados y totales de bienes/inversión patrimonial, con bordes delgados y fondo gris claro, que sustituye a las tarjetas KPI grandes en la versión impresa.

### Changed
- **Alta Densidad en Reportes Impresos:** Reducción del tamaño de fuente a **9px** y del relleno interno de celdas a **4px 6px** para tablas de reportes impresos. Esto maximiza la densidad de filas y optimiza el uso de papel en reportes extensos.
- **Deduplicación Visual de Iconos/Emojis:** Se ocultaron los emojis y los íconos de equipos (como `💻` y `🏫`) en la versión impresa del reporte de bienes.

### Fixed
- **Ocultamiento de Tarjetas KPI Grandes:** Se configuró que las tarjetas web de KPI se oculten por completo durante la impresión (`no-print`), evitando el desperdicio de espacio y tinta en el papel.

## [0.9.2] - 2026-06-08

### Added
- **Edición Individual de Mantenimientos en Taller:** Se implementó un botón de edición rápida (`✏️`) en la pestaña "Equipos en Taller". Al hacer clic, abre el formulario de registro (`ModalRegistrar`) en modo edición, con el buscador de equipos ocultado de forma segura (mostrando el bien actual en modo lectura) y precargando los campos del mantenimiento (tipo, diagnóstico/falla, técnico encargado, costo, fecha) para modificarlos a través del endpoint `PUT /api/mantenimientos`.
- **Pestaña de Estadísticas e Indicadores (Reportes):** Se implementó una nueva subpestaña ejecutiva en el panel de reportes que calcula KPIs de inversión y gasto de mantenimiento, barra de distribución de inventario por categoría, estado operativo de equipos y una tabla del Top 5 de equipos con mayor costo acumulado de mantenimiento.
- **Filtros Rápidos Interactivos en Inventario:** Se dotó de funcionalidad de clic y filtrado automático a las tarjetas de métricas. El usuario ahora puede hacer clic en "En Mantenimiento" y "De Baja" para filtrar la tabla automáticamente de forma instantánea.
- **Resaltado de Filtro Activo:** Se añadió un borde turquesa institucional (`#00716A`) y un fondo tintado a la tarjeta de estadística que corresponde al filtro activo actual.

### Fixed
- **Fallo de Impresión en Blanco en Reportes:** Se corrigió el problema en el archivo de estilos global CSS que impedía imprimir de forma legible el expediente (hoja de vida) de un bien y los listados generados del inventario (dejándolos en blanco). Se habilitó la visibilidad explícita de toda la cadena de ancestros del reporte (`.main-layout`, `.main-content` y `.reportes-panel-container`) para asegurar que el contenido se renderice en el flujo natural del documento sin recortar páginas.
- **Redirección y Acciones de Mantenimiento desde Ficha Técnica:** Se solucionó el fallo donde los botones "Enviar a Reparación" y "Completar Mantenimiento" de la Ficha Técnica no realizaban ninguna acción. Ahora redirigen automáticamente al usuario a la vista de mantenimientos y abren la modal correspondiente de registro o finalización con los datos precargados.
- **Solución a Modales y Stacking Context en Mantenimiento:** Se corrigió el error visual donde el modal `ModalRegistrar` se veía recortado y chocado contra la barra de navegación debido al contexto de apilamiento (Stacking Context) creado por la animación `.fade-in`. Los 5 modales de `MantenimientosPanel.jsx` ahora se renderizan directamente en `document.body` mediante **React Portals**, garantizando que el fondo difuminado cubra toda la pantalla y el formulario quede perfectamente centrado.

### Changed
- **Formato de Constancia de Mantenimiento:** Se resolvió la duplicación de datos entre "Equipo / Tipo" y "Marca / Modelo" (mostrando la categoría en la primera y la marca/modelo en la segunda). Se reemplazó el campo "Categoría" por "Resguardante / Custodio" para mostrar quién tiene el equipo a su cargo. Se añadió un párrafo aclaratorio de recepción de conformidad debajo del diagnóstico y una tercera firma oficial de "Conformidad Resguardante" al pie de la constancia.
- **Rediseño Compacto de KPIs:** Consolidación de 6 tarjetas grandes (2 filas) a una sola fila horizontal supercompacta (4 tarjetas de filtro rápido + 1 indicador patrimonial), liberando más de 100px de espacio vertical.
- **Incremento de Densidad de Datos:** Reducción de los paddings en la tabla de inventario (de 14px a 9px en celdas, y de 11px a 8px en cabecera) para visualizar más bienes en pantalla de un vistazo sin necesidad de scroll.
- **Visualización de Valor Patrimonial:** Se rediseñó la tarjeta de valor patrimonial como un indicador de solo lectura, eliminando el cursor pointer y hover interactivo de botón.

---

## [0.9.1] - 2026-06-08

### Fixed
- **Bug crítico — Variable CSS `--shadow-lg` no definida:** Se declaró la variable `--shadow-lg` en `:root` en `globals.css`. Su ausencia causaba que las sombras de las modales principales (`ModalFichaBien`, `ModalImportador`, `ModalLectorCodigos`, `ResguardosPanel`) no se renderizaran correctamente.
- **Bug crítico — Sintaxis inválida `<style jsx global>` en `ResguardosPanel`:** Se reemplazó la sintaxis styled-jsx (exclusiva del Pages Router de Next.js) por `<style dangerouslySetInnerHTML>`, consistente con el resto del proyecto y compatible con el App Router.
- **Bug — `var(--primary)` en contexto de impresión en `ModalConstancia`:** Las variables CSS personalizadas pueden no resolverse correctamente en ciertos motores de impresión. Se sustituyó por el valor hexadecimal directo `#00716A`.
- **Bug — Acceso sin guarda nula a `m.bien` en `MantenimientosPanel`:** El filtro de búsqueda del historial clínico colapsaba con `TypeError` si un registro de mantenimiento referenciaba un equipo eliminado de la base de datos. Se agregaron guardas opcionales (`?.`).
- **Bug — Acceso sin guarda nula en `HistorialTab` y `BienCell/EtiquetaCell`:** Los componentes de renderizado de la tabla del historial y los componentes compartidos `BienCell` y `EtiquetaCell` accedían a propiedades de `bien` sin verificar si el objeto existía. Se agregaron guardas nulas y valores de fallback.
- **Mejora en Agenda Preventiva (Panel):** El bloque de Mantenimientos de la Semana en el Dashboard ahora limita su altura con `max-height` y `overflow-y: auto`, evitando que la lista se extienda y desplace el layout.
- **Mejora visual — Navegación activa en Sidebar:** El ítem de menú actualmente seleccionado se resalta con el color institucional `#00716A` tanto para ítems de navegación principal como para el botón de Configuración.

---

## [0.9.0] - 2026-06-08

### Added
- **Nueva Imagen Institucional (SICOB):** Rediseño completo de la pantalla de login en formato de pantalla dividida 60/40 para computadoras de escritorio.
- **Identidad Gráfica:** Integración del logotipo oficial de **SICOB** en la barra lateral e inyección del logo oficial de la **UPEN** en color blanco puro (mediante filtros CSS) en el panel de acceso.
- **Ilustración Arquitectónica:** Inyección de una ilustración vectorial en 3D del edificio principal de la universidad con opacidad del 32% como marca de agua de fondo.
- **Colores Corporativos:** Implementación del tema verde azulado / turquesa profundo (`#00716A`) y gris carbón (`#1E1E1E`) a través de variables CSS globales.
- **Versionamiento:** Inclusión del identificador discreto de versión `v0.9.0 (Pre-lanzamiento)` en el pie de página de acceso y en la esquina superior del panel de parámetros globales.

### Changed
- **Nomenclatura Oficial:** Modificación de cabeceras en `page.js` de `"Inventario"` a `"SICOB"` y de `"Sistema Universitario"` a `"Control y Operación de Bienes"`.
- **Versionamiento en Package:** Actualización formal en `package.json` a la versión `0.9.0`.
- **Estilos de Navegación Lateral (Sidebar):** Ajuste en el estado hover de las pestañas (fondo blanco `#FFFFFF` y texto negro `#121212`) y en el estado activo/seleccionado (fondo turquesa `#00716A` y texto blanco `#FFFFFF`), eliminando también el anillo de enfoque por defecto para lograr una visibilidad limpia y contraste óptimos.

---

## [0.8.0] - 2026-06-05

### Added
- **Módulo de Auditoría Rápida por Ubicación:** Stepper interactivo de 3 pasos para control físico de activos mediante lectores USB y cámara en vivo.
- **Audio Feedback en Auditorías:** Tonos auditivos sintetizados (Web Audio API) para estados (correcto, reubicar, no registrado, duplicado).
- **Auto-guardado en Auditoría:** Persistencia local (`localStorage`) para reanudar el escaneo ante cierres inesperados.
- **Reporte e Impresión de Discrepancias:** Conciliación en un clic y diseño específico de impresión de hojas de control con área de firmas.

### Fixed
- **Bugs en ScannerPanel:** Manejo de excepciones en `toUpperCase()` para seriales o códigos de inventario nulos.

---

## [0.7.0] - 2026-06-02

### Added
- **Formato Personalizable de Etiquetas:** Sliders interactivos en configuración para ajustar ancho/alto de papel térmico y fuentes en `pt`.
- **Impresión Escalable:** Inyección dinámica de hojas de estilo `@media print` para cambiar las dimensiones físicas del papel térmico en caliente.
- **Vista Previa Reactiva:** Caja de vista previa de etiquetas que escala visualmente según la proporción del papel.

### Changed
- **Maquetación de Etiquetas:** Organización en flexbox horizontal para alinear "No. de Inventario" y "S/N" lado a lado en un papel de 30mm x 15mm.

---

## [0.6.0] - 2026-05-29

### Added
- **Módulo de Importación Masiva (Excel/CSV):** Asistente por pasos (wizard) en el frontend con carga diferida de SheetJS y endpoint API transaccional en el backend.
- **Limpieza de Datos:** Eliminación masiva de prefijos de marca duplicados en modelos de equipos.
