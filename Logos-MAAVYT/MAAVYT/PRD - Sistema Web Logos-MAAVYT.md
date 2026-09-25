# 📌 Documento de Requerimientos y Plan de Implementación: Sistema Web Logos-MAAVYT

> **Tags**: #requerimientos #prd #logos-maavyt #backend #frontend #database

## 1. Información General del Proyecto
* **Nombre del Proyecto**: Logos-MAAVYT Manager (Sistema de Gestión de Traslados y Liquidaciones)
* **Organización / Cliente**: MAAVYT (Servicios de Transporte de Pasajeros - Titular: Miguel Ángel Albornoz) & Logos Travel
* **Desarrollador / Líder Técnico**: Franco Genaro Albornoz
* **Entorno de Desarrollo**: Antigravity IDE / Antigravity Agent
* **Base de Conocimiento**: Obsidian Brain Vault

---

## 2. Contexto y Problema Actual
Actualmente, la gestión operativa de los traslados ejecutivos y corporativos de MAAVYT implica:
1. **Recepción fragmentada de reservas**: Los datos de los viajes llegan vía correo electrónico o vouchers de texto desde agencias (Logos Travel).
2. **Carga y formateo manual**: Extraer manualmente números de reserva, fechas, horas, pasajeros, vuelos, orígenes y destinos consume tiempo y es propenso a errores humanos.
3. **Generación repetitiva de documentos**: Para cada quincena o jornada se requiere armar hojas de ruta operativas en PDF (A4 horizontal) para el conductor y planillas de liquidación con subtotales, esperas y adicionales.
4. **Dependencia de prompts externos**: Se requiere una solución autónoma, escalable y persistente en una base de datos relacional.

---

## 3. Solución Propuesta
Desarrollar una aplicación web full-stack con arquitectura desacoplada:
* **Módulo de Ingesta Inteligente (Parser)**: Procesa texto crudo de correos/vouchers y extrae automáticamente las entidades estructuradas con opción de previsualización y confirmación.
* **Gestor Operativo y Base de Datos (MySQL)**: Almacena traslados, pasajeros, estados, tarifas y períodos quincenales.
* **Motor de Reportes**:
  * Exportación de **Hoja de Ruta Operativa en PDF** en formato A4 horizontal listo para imprimir o enviar por mensajería.
  * Generación de **Liquidaciones en Excel (.xlsx)** y resumen de facturación quincenal.
* **Frontend Intuitivo (React + Tailwind)**: Permite carga rápida, edición en grilla y visualización de métricas.

---

## 4. Requerimientos del Sistema

### 4.1 Requerimientos Funcionales (RF)
* **RF-01 (Parser de Texto)**: Capacidad de interpretar formatos estándar de correos de Logos, detectando número de reserva, fechas, horarios, nombres de pasajeros, orígenes/destinos, aerolíneas/vuelos y observaciones.
* **RF-02 (Gestión de Quincenas/Períodos)**: Agrupación de servicios por quincena (1ra: días 1-15, 2da: días 16-fin de mes) para cierres contables y auditoría.
* **RF-03 (CRUD de Servicios)**: Alta, baja, modificación y consulta con filtros por fecha, conductor, estado y búsqueda de texto.
* **RF-04 (Control de Pasajeros Múltiples)**: Soporte para asignar múltiples pasajeros y documentos por traslado (incluyendo reservas divididas como `227777-A` y `227777-B`).
* **RF-05 (Cálculo Financiero y Esperas)**: Registro de tarifas base, minutos de espera, recargos adicionales, no-shows y cálculo automático del total.
* **RF-06 (Exportación PDF)**: Generación de la Hoja de Ruta Operativa en PDF formato A4 horizontal, con tabla de servicios ordenada cronológicamente.
* **RF-07 (Exportación Excel)**: Generación de planilla `.xlsx` con el detalle de liquidación quincenal.

### 4.2 Requerimientos No Funcionales (RNF)
* **RNF-01 (Rendimiento)**: Respuestas de API inferiores a 200ms para operaciones CRUD y menor a 2s para generación de PDFs.
* **RNF-02 (Arquitectura Modular)**: Separación clara en capas (Controladores, Servicios, Repositorios/Modelos, Rutas y Utilidades).
* **RNF-03 (Seguridad y Validación)**: Validación estricta de esquemas de entrada (vía `zod` o `joi`), sanitización de SQL (`mysql2/promise` con consultas preparadas) y manejo centralizado de errores.
* **RNF-04 (Usabilidad y Responsive)**: Frontend adaptable para uso en escritorio y dispositivos móviles.

---

## 5. Stack Tecnológico

* **Backend**: Node.js v20+ / Express.js
* **Base de Datos**: MySQL 8.0+ (`mysql2/promise`)
* **Validación**: Zod
* **Generación de Reportes**:
  * PDF: `pdfkit` / `pdf-lib` / `puppeteer-core`
  * Excel: `exceljs`
* **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons
* **Herramientas de Desarrollo**: Antigravity IDE, Git, Postman / Insomnia

---

## 6. Estructura de Archivos del Proyecto

```text
logos-maavyt-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # Conexión MySQL pool
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── serviciosController.js
│   │   │   ├── parserController.js
│   │   │   ├── reportesController.js
│   │   │   └── periodosController.js
│   │   ├── models/
│   │   │   ├── servicioModel.js
│   │   │   ├── pasajeroModel.js
│   │   │   └── periodoModel.js
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   ├── serviciosRoutes.js
│   │   │   ├── parserRoutes.js
│   │   │   ├── reportesRoutes.js
│   │   │   └── periodosRoutes.js
│   │   ├── services/
│   │   │   ├── textParserService.js # Lógica de Regex / Extracción de vouchers
│   │   │   ├── pdfGeneratorService.js # Renderizado de Hoja de Ruta A4
│   │   │   └── excelGeneratorService.js # Renderizado de Liquidación
│   │   ├── middlewares/
│   │   │   ├── errorHandler.js
│   │   │   └── validator.js
│   │   ├── utils/
│   │   │   └── dateFormatter.js
│   │   ├── app.js                   # Configuración de Express
│   │   └── server.js                # Entry point
│   ├── sql/
│   │   ├── schema.sql               # DDL de la base de datos
│   │   └── seeds.sql                # Datos iniciales
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/                     # Cliente Axios / Fetch
│   │   ├── components/
│   │   │   ├── layout/              # Navbar, Sidebar
│   │   │   ├── parser/              # Input de texto crudo y vista previa
│   │   │   ├── servicios/           # Tablas, filtros, modales de edición
│   │   │   └── reportes/            # Botones y visualizadores de descarga
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── IngestaPage.jsx
│   │   │   ├── ServiciosPage.jsx
│   │   │   └── LiquidacionPage.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   └── package.json
└── docs/
    └── PRD-Logos-Maavyt.md
```
