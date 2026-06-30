# 📄 Manual de Usuario Oficial — SICOB

**Sistema de Control y Operación de Bienes**  
*Universidad Politécnica del Estado de Nayarit*

---

## 📌 1. Introducción al Sistema
**SICOB** es una plataforma web e industrial diseñada específicamente para la administración, rastreo y mantenimiento del inventario de bienes tecnológicos, mobiliario de oficina, laboratorios y consumibles. 

El sistema cuenta con soporte para:
* **PWA (Progressive Web App)**: Instalable en dispositivos móviles y utilizable bajo intermitencias de red.
* **Firmas Digitales Táctiles**: Captura de firmas para actas y vales de forma directa en pantallas táctiles o mouse.
* **Generación y Calibración de Códigos de Barras**: Impresión adaptativa en hojas Avery, Uline o rollo continuo.

---

## 📊 2. Panel de Control (Dashboard)
El Dashboard es la pantalla de inicio del sistema y proporciona una vista de 360 grados sobre el estado del patrimonio de la universidad.

* **Métricas Principales**:
  * **Total de Bienes**: Suma de todos los equipos tecnológicos y de oficina registrados.
  * **Bienes en Mantenimiento**: Cantidad de equipos actualmente en taller o soporte técnico.
  * **Consumibles Críticos**: Alertas de insumos que han descendido de su inventario mínimo de seguridad.
  * **Incidentes Activos**: Reportes abiertos en laboratorios de cómputo y aulas sin resolver.
* **Gráficas de Distribución**: Visualización del inventario agrupado por categoría (computadoras, proyectores, mobiliario, etc.) y estado operativo.
* **Alertas Rápidas**: Accesos directos a bienes de baja o en mantenimiento.

---

## 💻 3. Inventario de Bienes (Tecnológico e Inmobiliario)
El sistema divide los activos en dos grandes clasificaciones para facilitar su consulta y reporte: **Bienes Tecnológicos** y **Bienes Inmobiliarios**.

### 3.1 Registro de Activos
1. **Registro Individual**:
   * Haz clic en **"➕ Nuevo Bien"** o **"➕ Nuevo Mobiliario"**.
   * Llena los campos generales: Descripción, Marca, Modelo, Número de Serie, Estado Físico, Valor Estimado, Ubicación y Departamento.
   * **Especificaciones Técnicas (Solo Tecnológicos)**: Campo dinámico que permite almacenar de forma estructurada memoria RAM, Procesador, Almacenamiento, etc.
   * **Número de Inventario**: Puede ingresarse de forma manual o dejarlo en blanco para que el sistema lo **autogenere** basado en la plantilla institucional configurada.
2. **Registro en Lote**:
   * Si vas a registrar múltiples activos idénticos (ej. 30 sillas de pala o 20 computadoras), ingresa la **cantidad** a crear. El sistema autogenerará consecutivamente los códigos de inventario sin colisiones.

### 3.2 Acciones de Gestión
* **Ficha de Detalle**: Al seleccionar un bien, se abre su ficha técnica mostrando su historial completo de asignaciones, mantenimientos preventivos/correctivos e incidentes reportados.
* **Dar de Baja (Soft Delete)**: Permite marcar un bien como "Baja" justificando el motivo (descompuesto, robo, obsolescencia). El bien no se elimina físicamente de la base de datos para preservar la integridad del historial.

---

## ✍️ 4. Resguardos Colectivos (Actas de Asignación)
Este módulo gestiona la asignación oficial de bienes a custodios (personal docente o administrativo).

### 4.1 Generación de Actas
1. Selecciona el **Resguardos** en el menú lateral.
2. Busca al custodio en el listado.
3. El sistema listará automáticamente todos los activos tecnológicos e inmobiliarios que tiene asignados actualmente.
4. Haz clic en **"🖨️ Ver Acta"** para generar la vista de impresión oficial (con membrete, políticas de resguardo y espacio de firmas).

### 4.2 Firma Digital Colectiva
* **Estampar Firma**: Si el custodio está presente, haz clic en **"✍️ Firmar Conformidad"**. Se abrirá el lienzo táctil para dibujar la firma.
* **Persistencia**: Al guardar, la firma se almacena en Base64 en la base de datos PostgreSQL, vinculándose de forma permanente con las asignaciones activas de ese custodio.
* **Visualización**: La firma real aparecerá impresa en el bloque *"Recibió de Conformidad"* de las actas subsiguientes de forma automática.

---

## 📋 5. Vales de Salida Temporales
Permite el préstamo temporal de equipos para eventos, comisiones de trabajo fuera del campus, o auditorías.

* **Crear Vale de Salida**:
  * Selecciona el custodio responsable y la **Fecha Comprometida de Retorno**.
  * Redacta el motivo de la comisión y observaciones sobre el estado físico de los equipos.
  * Selecciona uno o más bienes de la lista de equipos disponibles.
  * El custodio puede estampar su firma digital táctil en el momento de crear el vale.
* **Firmar Vales Existentes**: Si un vale se generó sin firma, un administrador puede abrir el visor del vale y hacer clic en **"✍️ Estampar Firma"** posteriormente.
* **Registrar Retorno**: Una vez que el custodio devuelva los equipos, haz clic en **"↩️ Registrar Retorno de Equipos"**. Los bienes volverán a estar disponibles y el vale se archivará como `DEVUELTO` con la fecha y hora reales de entrega.

---

## 📦 6. Almacén de Consumibles
Gestión de stock de materiales de desgaste rápido (toners, hojas, cables, conectores, jabón, etc.).

* **Listado de Consumibles**: Muestra la cantidad disponible, categoría e indicador visual de stock crítico (si el stock baja del mínimo configurado, el fondo se tiñe de color rosa/rojo).
* **Movimientos de Entrada y Entrada/Salida**:
  * **Entrada**: Registra la compra o abastecimiento de material (suma al inventario).
  * **Salida**: Registra el consumo o entrega de material a un área específica (resta del inventario).
  * Todos los movimientos guardan la fecha, cantidad, usuario que lo autorizó y observaciones para auditorías de compras.

---

## 🛠️ 7. Historial de Mantenimientos
Registro de acciones preventivas y correctivas aplicadas a los bienes.

* **Programación**: Permite registrar cuándo se realiza un mantenimiento, el técnico encargado, el costo incurrido y la fecha sugerida para el próximo mantenimiento.
* **Finalización**: Cuando el equipo es devuelto, se captura el reporte de acciones realizadas y se cambia el estado del bien de "Mantenimiento" a "Activo" de forma automática.

---

## 🔧 8. Panel de Configuración del Sistema
Este módulo es exclusivo del perfil **ADMINISTRADOR** y define el comportamiento general de SICOB.

### 8.1 Personalización de la Institución
* Permite definir el nombre de la institución (UPEN), las siglas, y cargar el logotipo oficial.
* Permite registrar los nombres y puestos que aparecerán en los bloques de firma oficial de "Patrimonio/Control de Bienes" en las actas de resguardo y vales.

### 8.2 Plantilla de Códigos de Inventario
* Configuración de la estructura de autogeneración de códigos de barras (ej. `{SIGLAS}-{CAT}-{YEAR}-{CORRELATIVO:5}`).
* Permite configurar el autoincremento de código secuencial para evitar duplicados.

### 8.3 Calibración de Impresión de Etiquetas
Permite configurar el tamaño de impresión de las etiquetas de inventario de forma milimétrica.
* **Formatos soportados**:
  * **Avery 5167** (4 columnas, 80 etiquetas por hoja Carta).
  * **Uline S-10425SIL** (3 columnas, 30 etiquetas por hoja Carta).
  * **Rollo Térmico Continuo** (impresión directa en impresora de etiquetas de transferencia térmica).
* **Ajustes de Calibración**: Modificación en tiempo real de márgenes superior, inferior, izquierdo, derecho, y tamaño de letra/código de barras. Cuenta con una plantilla traslúcida digital para alinear con las hojas físicas antes de imprimir.

### 8.4 Respaldo de Datos (Backup)
* **Exportar Backup**: Genera un archivo `.json` con la base de datos completa de SICOB (usuarios, bienes, mantenimientos, etc.) para su descarga y almacenamiento seguro.
* **Importar Backup**: Permite restaurar el sistema a un punto anterior en caso de fallos de disco o cambio de servidor.

---

## 🔐 9. Gestión de Accesos
* **Perfiles de Usuario**:
  * **ADMINISTRADOR**: Acceso total al sistema, altas, bajas, resguardos, configuraciones y base de datos.
  * **USUARIO**: Acceso de consulta al inventario, generación de reportes y lectura de resguardos, pero sin permisos para dar de baja, crear usuarios o modificar configuraciones.
* **Recuperación de Contraseña**: Permite a un administrador generar un código numérico temporal de 6 dígitos para que un usuario pueda restablecer su contraseña en caso de olvido.
