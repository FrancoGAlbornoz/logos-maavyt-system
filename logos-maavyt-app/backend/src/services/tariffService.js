const ExcelJS = require('exceljs');
const path = require('path');
const { pool } = require('../config/database');

const TARIFA_HORA_ESPERA = 20302; // $20.302 por hora de espera

/**
 * Importa las tarifas desde el Excel oficial a la tabla `tarifario` en MySQL
 */
async function loadTarifarioFromExcel() {
  const fs = require('fs');
  const candidatePaths = [
    process.env.TARIFARIO_PATH,
    path.join(__dirname, '../../data/Tarifario.xlsx'),
    path.join(__dirname, '../../../../Tarifario M.A.A.V.Y.T - Vigencia desde 01.05 al 30.09.2026.xlsx'),
    path.join(process.cwd(), 'Tarifario M.A.A.V.Y.T - Vigencia desde 01.05 al 30.09.2026.xlsx')
  ].filter(Boolean);

  let filePath = candidatePaths.find(p => fs.existsSync(p));
  if (!filePath) {
    throw new Error(`Archivo de tarifario no encontrado en ninguna de las rutas esperadas: ${candidatePaths.join(', ')}`);
  }
  console.log(`[Tariff Service] Importando tarifario desde: ${filePath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('Hoja1');
  if (!sheet) {
    throw new Error('Hoja1 no encontrada en el Excel de tarifario');
  }

  let currentZona = 'Servicios Tucuman';
  const connection = await pool.getConnection();

  try {
    await connection.execute(`TRUNCATE TABLE tarifario`);

    let importedCount = 0;

    sheet.eachRow((row, rowNum) => {
      if (rowNum < 7) return;

      const v1 = row.getCell(2).value;
      const v2 = row.getCell(3).value;
      const v3 = row.getCell(4).value;

      if (v1 && typeof v1 === 'string' && v1.trim()) {
        currentZona = v1.trim();
      }

      const tramo = v2 ? String(v2).trim() : '';
      const tarifa = typeof v3 === 'number' ? v3 : (v3 && typeof v3 === 'object' && v3.result ? v3.result : 0);

      if (tramo && tarifa > 0) {
        // Desglosar Origen y Destino aproximados desde el texto del tramo
        let origen = 'TUC ARPT';
        let destino = tramo;

        if (tramo.includes('→')) {
          const parts = tramo.split('→');
          origen = parts[0].trim();
          destino = parts[1].trim();
        } else if (tramo.includes('-')) {
          const parts = tramo.split('-');
          origen = parts[0].trim();
          destino = parts[1].trim();
        }

        connection.execute(
          `INSERT INTO tarifario (cliente_id, categoria_vehiculo, origen_zona, destino_zona, tarifa_base, tarifa_hora_espera)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [1, 'Auto Std', origen, destino, tarifa, TARIFA_HORA_ESPERA]
        );

        importedCount++;
      }
    });

    console.log(`[Tariff Service] Se cargaron ${importedCount} tarifas en MySQL exitosamente.`);
    return importedCount;
  } finally {
    connection.release();
  }
}

/**
 * Calcula el subtotal y total sugerido para un origen y destino dados
 * @param {string} origen 
 * @param {string} destino 
 * @param {string} categoria 
 * @param {number} minutosEspera 
 * @returns {Object} { subtotal, monto_espera, total }
 */
async function calculatePrice(origen = '', destino = '', categoria = 'Auto Std', minutosEspera = 0) {
  const cleanOrig = (origen || '').toUpperCase();
  const cleanDest = (destino || '').toUpperCase();
  const combined = `${cleanOrig} ${cleanDest}`;

  let tarifaBase = 25417; // Precio base por defecto (TUC ARPT -> CENTRO)

  // 1. Reglas de Cotejo de Zonas y Tramos
  if (/SANTA MARIA/i.test(combined)) {
    tarifaBase = 274249;
  } else if (/CATAMARCA/i.test(combined)) {
    if (/BELEN/i.test(combined)) tarifaBase = 497710;
    else if (/LONDRES/i.test(combined)) tarifaBase = 507889;
    else if (/ANDALGALA/i.test(combined)) tarifaBase = 609450;
    else if (/VALLE VIEJO/i.test(combined)) tarifaBase = 348000;
    else tarifaBase = 325032;
  } else if (/LA RIOJA/i.test(combined)) {
    tarifaBase = 538345;
  } else if (/SANTIAGO|SDE/i.test(combined)) {
    if (/TERMAS/i.test(combined)) tarifaBase = 142198;
    else if (/FRIAS/i.test(combined)) tarifaBase = 325032;
    else if (/LAVALLE/i.test(combined)) tarifaBase = 264095;
    else if (/LA BANDA/i.test(combined)) tarifaBase = 243797;
    else tarifaBase = 233615;
  } else if (/SALTA/i.test(combined)) {
    if (/METAN/i.test(combined)) tarifaBase = 274249;
    else if (/ROSARIO DE LA FRONTERA/i.test(combined)) tarifaBase = 203160;
    else if (/CAFAYATE/i.test(combined)) tarifaBase = 335212;
    else tarifaBase = 426628;
  } else if (/JUJUY/i.test(combined)) {
    tarifaBase = 497710;
  } else if (/CORDOBA/i.test(combined)) {
    tarifaBase = 771985;
  } else if (/TAFI DEL VALLE|MOLLAR/i.test(combined)) {
    tarifaBase = 152353;
  } else if (/CONCEPCION|AGUILARES/i.test(combined)) {
    tarifaBase = 121900;
  } else if (/SIMOCA/i.test(combined)) {
    tarifaBase = 96496;
  } else if (/MONTEROS/i.test(combined)) {
    tarifaBase = 91418;
  } else if (/FAMAILLA/i.test(combined)) {
    tarifaBase = 71119;
  } else if (/LULES/i.test(combined)) {
    tarifaBase = 50780;
  } else if (/SAN JAVIER/i.test(combined)) {
    tarifaBase = 66041;
  } else if (/YERBA BUENA/i.test(combined)) {
    if (/TERMINAL|CENTRO TUC/i.test(cleanOrig)) tarifaBase = 20302;
    else tarifaBase = 35560;
  } else if (/TAFI VIEJO/i.test(combined)) {
    if (/TERMINAL|CENTRO TUC/i.test(cleanOrig)) tarifaBase = 25404;
    else tarifaBase = 35560;
  } else if (/TERMINAL|CENTRO TUC/i.test(cleanOrig) && /CENTRO/i.test(cleanDest)) {
    tarifaBase = 15221;
  } else if (/ARPT|AEROPUERTO/i.test(combined)) {
    tarifaBase = 25417; // Aeropuerto Tuc -> Centro
  }

  // Multiplicador por Categoría de Vehículo
  if (categoria === 'Ejecutivo') tarifaBase *= 1.25;
  else if (categoria === 'Van') tarifaBase *= 1.6;
  else if (categoria === 'Minibus') tarifaBase *= 2.0;

  // Cálculo de Espera
  const horasEspera = Math.ceil(minutosEspera / 60);
  const montoEspera = horasEspera * TARIFA_HORA_ESPERA;
  const total = tarifaBase + montoEspera;

  return {
    subtotal: Math.round(tarifaBase * 100) / 100,
    monto_espera: montoEspera,
    total: Math.round(total * 100) / 100
  };
}

module.exports = {
  loadTarifarioFromExcel,
  calculatePrice
};
