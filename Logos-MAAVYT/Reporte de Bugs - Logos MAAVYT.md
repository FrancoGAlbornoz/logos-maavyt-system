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
