const ExcelJS = require('exceljs');

async function verify() {
  const origWb = new ExcelJS.Workbook();
  await origWb.xlsx.readFile('E:/Proyectos-2026/Logos-Maavyt/Tarifario M.A.A.V.Y.T - Vigencia desde 01.05 al 30.09.2026.bak.xlsx');
  const modWb = new ExcelJS.Workbook();
  await modWb.xlsx.readFile('E:/Proyectos-2026/Logos-Maavyt/Tarifario M.A.A.V.Y.T - Vigencia desde 01.05 al 30.09.2026.xlsx');

  const origSheet = origWb.worksheets[0];
  const modSheet = modWb.worksheets[0];

  console.log('Filas original:', origSheet.rowCount, '| Filas modificado:', modSheet.rowCount);

  let errors = 0;
  let verified30 = 0;
  let verifiedUnchanged = 0;

  for (let r = 1; r <= Math.max(origSheet.rowCount, modSheet.rowCount); r++) {
    const origRow = origSheet.getRow(r);
    const modRow = modSheet.getRow(r);

    for (let c = 1; c <= 10; c++) {
      const origVal = origRow.getCell(c).value;
      const modVal = modRow.getCell(c).value;

      if (r === 5 && c === 2) {
        if (origVal === 'Aumento 20%' && modVal === 'Aumento 30%') {
          console.log('B5 correctamente actualizado a: "Aumento 30%"');
        } else {
          console.error('Error en B5:', { origVal, modVal });
          errors++;
        }
      } else if (c === 4 && r >= 8 && r <= 83) {
        if (r === 71 || r === 72) {
          if (origVal === modVal) {
            verifiedUnchanged++;
          } else {
            console.error('Fila ' + r + ' (espera/km) debio conservarse:', { origVal, modVal });
            errors++;
          }
        } else if (typeof origVal === 'number' && origVal > 0) {
          const expected = Math.round(origVal * 1.30);
          if (modVal === expected) {
            verified30++;
          } else {
            console.error('Discrepancia en fila ' + r + ':', { origVal, expected, modVal });
            errors++;
          }
        } else if (origVal === 0) {
          if (modVal === 0) {
            verifiedUnchanged++;
          } else {
            console.error('Discrepancia en cero fila ' + r + ':', { origVal, modVal });
            errors++;
          }
        }
      } else {
        // Todo lo demás debe ser idéntico
        if (JSON.stringify(origVal) !== JSON.stringify(modVal)) {
          console.error('Cambio inesperado en celda R' + r + 'C' + c + ':', { origVal, modVal });
          errors++;
        }
      }
    }
  }

  console.log('\nResultado de verificacion:');
  console.log('- Errores detectados: ' + errors);
  console.log('- Tarifas aumentadas un 30% verificadas: ' + verified30);
  console.log('- Celdas sin cambio verificadas (ceros, espera, km): ' + verifiedUnchanged);
  console.log(errors === 0 ? '>>> VERIFICACION 100% EXITOSA <<<' : '>>> FALLO EN VERIFICACION <<<');
}

verify();
