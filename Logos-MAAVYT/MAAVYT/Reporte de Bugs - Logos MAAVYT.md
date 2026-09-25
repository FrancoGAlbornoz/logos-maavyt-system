# 🐛 Reporte de Bugs y Hoja de Ruta de Mejoras: Logos-MAAVYT Manager

> **Tags**: #bugs #auditoria #logos-maavyt #mejores-practicas

---

## 📌 Registros de Bugs y Soluciones Aplicadas

### 🔴 BUG-001: Detección Errónea de Reservas Falsas (Ej. `#48185`)
* **Fecha de Detección**: 01/09/2026
* **Descripción del Síntoma**: Se ingresaron 2 registros con número de reserva erróneo (`48185`), pasajeros `"A DEFINIR"` y origen/destino `"A definir"`.
* **Causa Raíz**: 
  - La expresión regular anterior intentó matchear cualquier secuencia aislada de 5 a 7 dígitos (ej. códigos postales, partes de fechas como `48185` o fragmentos de números de teléfono).
  - Al no requerir obligatoriamente la presencia de origen/destino reales en la línea, creó una reserva en blanco.
* **Acción de Corrección Aplicada**:
  - Se eliminó el registro erróneo `#48185` de la base de datos MySQL.
  - Se reforzó `textParserService.js` exigiendo que toda reserva parseada tenga obligatoriamente un formato corporativo de voucher válido y campos de Origen/Destino no nulos.

---

### 🔴 BUG-002: Inconsistencia en Filtros Operativos, Sincronización Gmail y Jerarquía de Vistas
* **Fecha de Detección**: 03/09/2026
* **Descripción del Síntoma**:
  - Al pulsar el filtro "Próximos 3 Días" en Servicios Operativos, la lista no cambiaba ni filtraba los traslados pasados.
  - Existía un filtro rígido "Desde 01/09/2026" que perdería sentido en meses posteriores, y un botón "Todos" que traía registros antiguos ya facturados de la base de datos.
  - La pantalla principal abría en Ingesta de Vouchers con 3 opciones de extracción que generaban confusión al terminar redirigiendo siempre a la vista mensual completa.
* **Causa Raíz**:
  - `ServiciosPage.jsx` tenía la fecha inicial fija en `'2026-09-01'` dentro de la lógica del preset `proximos3`, abarcando todos los servicios del mes en lugar de contar únicamente a partir de la fecha de hoy.
  - No existía un cálculo dinámico mes a mes ni selectores visibles para búsquedas personalizadas.
  - El botón de sincronización de Gmail no estaba en la vista de trabajo operativa diaria.
* **Acción de Corrección Aplicada**:
  - **Jerarquía de Pantallas**: Se configuró `Servicios Operativos` como pantalla principal y default de entrada, y la navegación en Navbar ordenada: Servicios Operativos -> Ingesta de Vouchers -> Liquidación & Reportes.
  - **Sincronización Operativa Directa**: Se integró el botón "Sincronizar desde Gmail Ahora" en la cabecera de Servicios Operativos, con ejecución asíncrona y refresco reactivo de la grilla.
  - **Reestructuración de Filtros**:
    - ⚡ **Próximos 3 Días** (activo por defecto): calcula dinámicamente desde `hoy` a `hoy + 3 días`.
    - 📍 **Hoy**: muestra únicamente los servicios del día.
    - 📅 **Próximos 7 Días**: ventana semanal operativa.
    - 📊 **Mes Actual**: dinámico mes a mes (`01/MM` a fin de mes).
    - 🗓️ **Personalizado**: selectores `Desde` y `Hasta` editables.
    - Se eliminó el botón "Todos" y el filtro fijo "01/09/2026".
  - **Simplificación de Ingesta**: Se removieron los selectores de extracción redundantes, dejando la vista enfocada en la carga manual por texto de vouchers y preview interactivo.

---

### 🟢 REQ-003: Exportación e Impresión en PDF y Excel Sincronizada con Filtros Operativos
* **Fecha de Implementación**: 03/09/2026
* **Descripción de la Necesidad**:
  - Posibilidad de imprimir y descargar en formato PDF A4 Horizontal y Excel (.xlsx) la hoja operativa para choferes y despacho.
  - Columnas requeridas: `N° Servicio`, `Fecha/Hora`, `Pasajeros`, `Origen`, `Destino` y `Observaciones`.
  - La exportación debe respetar estrictamente el filtro seleccionado en pantalla (si está en 3 días exporta 3 días, si está en hoy exporta hoy, si está en 7 días exporta la semana, o rango personalizado/búsqueda).
* **Solución Implementada**:
  - **Servicio PDF (`pdfGeneratorService.js`)**: Generación en PDFKit con A4 Horizontal, cabecera con rango dinámico, tabla de 6 columnas proporcionales (781 pt), paginación y diseño corporativo limpio listo para imprimir (`Ctrl+P`).
  - **Servicio Excel (`excelGeneratorService.js`)**: Generación en ExcelJS con configuración de página A4 Horizontal y autoajuste de columnas.
  - **Endpoints API (`reportesController.js` y `reportesRoutes.js`)**: `/api/v1/reportes/servicios/pdf` y `/api/v1/reportes/servicios/excel`, recibiendo parámetros de filtrado en tiempo real.
  - **Integración en UI (`ServiciosPage.jsx`)**: Botones `Imprimir / PDF` y `Excel` en la barra de acciones superior vinculados reactivamente al estado de los filtros.
  - **Formateo de Fechas en Español**: Se corrigió la conversión de fechas para mostrar el día de la semana en español y la fecha numérica completa (`Jue 03/09/2026`), eliminando nombres en inglés.

---

### 🟢 REQ-004: Soporte de 2da Parada (Origen 2 y Destino 2) y Gestión de Pasajeros en Edición e Ingesta
* **Fecha de Implementación**: 13/09/2026
* **Descripción de la Necesidad**:
  - En reservas corporativas con múltiples pasajeros que van a dos direcciones distintas (ej. reserva `#231859` y `#231867`), el servicio se compone de 2 tramos o paradas.
  - Se requería agregar en el modal de Edición y Alta los 2 campos: **Nuevo Origen (Tramo 2)** y **Nuevo Destino (2do Domicilio)**.
  - Además, faltaba en el modal de edición la visualización y administración de los nombres de los pasajeros, y en la ingesta el parser tomaba nombres incorrectos por desfasaje de columnas de la tabla del cliente (`Estado`, `Unidad`, `Nombre Unidad`, etc.).
* **Solución Implementada**:
  - **Base de Datos**: Migración en MySQL añadiendo `origen_2 VARCHAR(255) NULL` y `destino_2 VARCHAR(255) NULL` a la tabla `servicios`.
  - **Parser Inteligente (`textParserService.js`)**:
    - Detección dinámica de cabeceras en tablas HTML y de texto.
    - Reconocimiento automático de filas subordinadas (segundas paradas con N° Res en blanco) asociando su origen y destino como `origen_2` y `destino_2` de la reserva principal.
    - Separación precisa de pasajeros múltiples delimitados por comas `,` (ej. `"GIRAUDO DE CEJAS CYNTHIA VANINA, BASBUS CLAUDIO DANIEL"` -> 2 pasajeros independientes).
  - **Controladores y Modelos (`serviciosController.js`, `gmailService.js`, `parserController.js`)**:
    - Soporte completo de persistencia para `origen_2`, `destino_2` y guardado/actualización de la relación con la tabla `pasajeros`.
  - **Interfaz de Usuario (`ServiciosPage.jsx` e `IngestaPage.jsx`)**:
    - Modal de Edición y Alta Manual: Sección de 2da Parada (Nuevo Origen y Nuevo Destino) y panel de Pasajeros Asignados (`Nombre completo`, `DNI / Referencia`, botón para agregar y eliminar pasajeros).
    - Visualización en grilla: El 2do tramo se muestra destacado en la columna de Origen / Destino cuando existe.
  - **Exportaciones PDF y Excel**:
    - Impresión en PDF y Planilla Excel formateadas para reflejar claramente ambos tramos cuando aplique.

---

### 🔴 BUG-004: Error de valor de fecha ISO al guardar edición de servicio en MySQL estricto
* **Fecha de Detección**: 13/09/2026
* **Descripción del Síntoma**:
  - Al abrir el modal de edición de un servicio y pulsar "Guardar Servicio", la API arrojaba un error 500: `Incorrect date value: '2026-09-03T00:00:00.000Z' for column 'fecha_servicio' at row 1`.
* **Causa Raíz**:
  - Al consultar el servicio por ID, MySQL devolvía `fecha_servicio` como objeto Date serializado en formato ISO completo (`YYYY-MM-DDTHH:mm:ss.sssZ`). Si el usuario no modificaba el campo de fecha, ese string completo se enviaba de vuelta en el body del PUT, y el motor MySQL en modo estricto rechazaba el valor para la columna de tipo `DATE`.
* **Acción de Corrección Aplicada**:
  - **Backend (`serviciosController.js`)**: Se implementaron funciones `sanitizeDate` y `sanitizeTime` para asegurar que `fecha_servicio` se trunque limpiamente al formato `YYYY-MM-DD` tanto al responder el detalle como antes de ejecutar los `INSERT` y `UPDATE`.
  - **Frontend (`ServiciosPage.jsx`)**: Se normalizó `fecha_servicio` en `openEditModal` y en el payload de `handleSaveModal` asegurando que siempre viaje como `YYYY-MM-DD`.

---

## 🗓️ Hoja de Ruta de Trabajo para Mañana

### 1. 🗄️ Normalización de la Base de Datos (Hasta 3FN)
- **Objetivo**: Asegurar que las tablas del esquema MySQL cumplan con la Tercera Forma Normal (3FN).
- **Acciones**:
  - Eliminar dependencias transitivas entre `servicios`, `clientes`, `conductores` y `vehiculos`.
  - Normalizar la tabla de `pasajeros` y separar zonas/tarifas en tablas independientes desacopladas.

### 2. 🗑️ Borrado Lógico (Soft Delete) y Archivado
- **Objetivo**: Evitar la pérdida física de datos al eliminar un traslado.
- **Acciones**:
  - Agregar columna `deleted_at DATETIME NULL` (o `archivado BOOLEAN DEFAULT FALSE`) a la tabla `servicios`.
  - Actualizar controladores para marcar registros como eliminados/archivados.
  - Crear vista y endpoint en la UI para consultar y restaurar servicios archivados.

### 3. 📜 Documentación de API REST con Swagger / OpenAPI
- **Objetivo**: Proveer una interfaz interactiva e informativa para explorar y probar todos los endpoints del backend.
- **Acciones**:
  - Instalar `swagger-ui-express` y `swagger-jsdoc`.
  - Configurar las especificaciones OpenAPI en `http://localhost:3001/api-docs`.

### 4. 📝 Reporte Continuo de Bugs en Obsidian
- **Objetivo**: Mantener este documento actualizado como registro de auditoría de calidad y bugs resueltos.

### 5. 🚀 Subida y Publicación en Repositorio Git
- **Objetivo**: Conectar el repositorio local con el nuevo repositorio remoto en GitHub / GitLab.
