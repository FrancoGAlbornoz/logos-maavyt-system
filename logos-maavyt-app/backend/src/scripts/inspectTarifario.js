const ExcelJS = require('exceljs');
const path = require('path');

async function inspectTarifario() {
  const filePath = 'E:/Proyectos-2026/Logos-Maavyt/Tarifario M.A.A.V.Y.T - Vigencia desde 01.05 al 30.09.2026.xlsx';
  console.log(`--- Cargando Tarifario Excel desde: ${filePath} ---`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  console.log(`Hojas encontradas en el Excel: ${workbook.worksheets.map(w => w.name).join(', ')}`);

  workbook.worksheets.forEach((sheet) => {
    console.log(`\n========================================`);
    console.log(`HOJA: "${sheet.name}" (Filas: ${sheet.rowCount})`);
    console.log(`========================================`);

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 50) { // Mostrar las primeras 50 filas
        const values = row.values.slice(1).map(v => {
          if (v && typeof v === 'object' && v.result !== undefined) return v.result;
          if (v && typeof v === 'object' && v.richText) return v.richText.map(t => t.text).join('');
          return v;
        });
        console.log(`Fila [${String(rowNumber).padStart(2, '0')}]:`, JSON.stringify(values));
      }
    });
  });
}

inspectTarifario();
