const ExcelJS = require('exceljs');

async function inspectAll() {
  const filePath = 'E:/Proyectos-2026/Logos-Maavyt/Tarifario M.A.A.V.Y.T - Vigencia desde 01.05 al 30.09.2026.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('Hoja1');
  let currentZona = '';

  const list = [];

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

    if (tramo && tarifa) {
      list.push({
        zona: currentZona,
        tramo,
        tarifa
      });
    }
  });

  console.log(`Total de tramos tarifados cargados: ${list.length}`);
  console.log(JSON.stringify(list, null, 2));
}

inspectAll();
