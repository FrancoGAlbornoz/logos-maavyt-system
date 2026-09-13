const ExcelJS = require('exceljs');
const path = require('path');

async function updateTarifario() {
  const filePath = 'E:/Proyectos-2026/Logos-Maavyt/Tarifario M.A.A.V.Y.T - Vigencia desde 01.05 al 30.09.2026.xlsx';
  console.log(`Cargando archivo: ${filePath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];

  // 1. Actualizar celda B5
  const b5Cell = sheet.getCell('B5');
  console.log(`Valor previo en B5: "${b5Cell.value}"`);
  b5Cell.value = 'Aumento 30%';
  console.log(`Nuevo valor en B5: "${b5Cell.value}"`);

  let updatedCount = 0;
  let skippedCount = 0;
  const changes = [];

  // 2. Recorrer filas de tarifas (filas 8 a 83)
  for (let r = 8; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const tramoCell = row.getCell(3); // Columna C
    const tarifaCell = row.getCell(4); // Columna D

    const tramoName = tramoCell.value ? String(tramoCell.value).trim() : '';
    const currentValue = tarifaCell.value;

    // Omitir filas vacías
    if (!tramoName && currentValue === null) {
      continue;
    }

    // Filas excluidas explícitamente: HORA DE ESPERA y PRECIO KILOMETRO (filas 71 y 72)
    if (r === 71 || r === 72 || tramoName.toUpperCase().includes('HORA DE ESPERA') || tramoName.toUpperCase().includes('PRECIO KILOMETRO')) {
      console.log(`[CONSERVADO SIN CAMBIOS] Fila ${r}: "${tramoName}" = ${currentValue}`);
      skippedCount++;
      continue;
    }

    if (typeof currentValue === 'number') {
      if (currentValue === 0) {
        console.log(`[VALOR CERO] Fila ${r}: "${tramoName}" = 0 (se mantiene en 0)`);
        skippedCount++;
      } else {
        const newValue = Math.round(currentValue * 1.30);
        tarifaCell.value = newValue;
        updatedCount++;
        changes.push({
          row: r,
          tramo: tramoName,
          oldVal: currentValue,
          newVal: newValue,
          ratio: (newValue / currentValue).toFixed(4)
        });
      }
    }
  }

  console.log(`\nGuardando cambios en archivo Excel...`);
  await workbook.xlsx.writeFile(filePath);
  console.log(`Archivo guardado exitosamente.`);
  console.log(`Total viajes actualizados (+30%): ${updatedCount}`);
  console.log(`Total conceptos conservados / ceros: ${skippedCount}`);

  console.log('\n--- Muestra de primeros 5 cambios ---');
  changes.slice(0, 5).forEach(c => console.log(`Fila ${c.row}: [${c.tramo}] ${c.oldVal} -> ${c.newVal} (x${c.ratio})`));

  console.log('\n--- Muestra de últimos 5 cambios ---');
  changes.slice(-5).forEach(c => console.log(`Fila ${c.row}: [${c.tramo}] ${c.oldVal} -> ${c.newVal} (x${c.ratio})`));
}

updateTarifario().catch(err => {
  console.error('Error actualizando tarifario:', err);
  process.exit(1);
});
