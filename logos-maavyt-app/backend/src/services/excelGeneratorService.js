const ExcelJS = require('exceljs');

/**
 * Genera la Planilla de Liquidación Quincenal en formato Excel (.xlsx)
 * @param {Array<Object>} servicios 
 * @param {Object} periodoInfo 
 * @returns {Promise<Buffer>}
 */
async function generateLiquidacionExcel(servicios = [], periodoInfo = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Logos-MAAVYT System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Liquidación Quincenal');

  // Ajustes de Impresión
  worksheet.pageSetup.orientation = 'landscape';
  worksheet.pageSetup.paperSize = 9; // A4

  // Estilos Base
  const titleStyle = {
    font: { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }, // Azul Ejecutivo
    alignment: { vertical: 'middle', horizontal: 'center' }
  };

  const headerStyle = {
    font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }, // Slate 700
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } }
    }
  };

  // 1. Título
  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'LOGOS TRAVEL / MAAVYT - PLANILLA DE LIQUIDACION QUINCENAL';
  titleCell.style = titleStyle;
  worksheet.getRow(1).height = 35;

  // 2. Información del Período
  worksheet.mergeCells('A2:K2');
  const subTitleCell = worksheet.getCell('A2');
  subTitleCell.value = `Período: ${periodoInfo.periodo_nombre || 'Quincenal'} | Fecha de Generación: ${new Date().toLocaleDateString('es-AR')}`;
  subTitleCell.font = { name: 'Calibri', size: 11, italic: true };
  subTitleCell.alignment = { horizontal: 'center' };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]); // Espaciador

  // 3. Encabezados de Tabla (Fila 4)
  const headers = [
    'FECHA',
    'N° RESERVA',
    'PASAJEROS',
    'CATEGORÍA',
    'ORIGEN',
    'DESTINO',
    'SUBTOTAL',
    'ESPERAS ($)',
    'ADICIONALES ($)',
    'TOTAL ($)',
    'ESTADO'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  // 4. Agregar Datos
  const currencyFormat = '"$"#,##0.00';
  let startRowIndex = 5;

  servicios.forEach((s) => {
    const pnames = s.pasajeros_concatenados || s.pasajeros?.map(p => p.nombre_completo).join(' / ') || 'PAX';
    const row = worksheet.addRow([
      s.fecha_servicio ? new Date(s.fecha_servicio).toLocaleDateString('es-AR') : '',
      s.nro_reserva || 'S/N',
      pnames,
      s.categoria_vehiculo || 'Auto Std',
      s.origen || '',
      s.destino || '',
      Number(s.subtotal) || 0,
      Number(s.monto_espera) || 0,
      Number(s.monto_adicionales) || 0,
      Number(s.total) || 0,
      s.estado_servicio || 'Confirmado'
    ]);

    row.height = 20;

    // Formatear Números de Moneda
    row.getCell(7).numberFormat = currencyFormat;
    row.getCell(8).numberFormat = currencyFormat;
    row.getCell(9).numberFormat = currencyFormat;
    row.getCell(10).numberFormat = currencyFormat;

    // Alineaciones
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(11).alignment = { horizontal: 'center' };

    // Bordes
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  const endRowIndex = startRowIndex + servicios.length - 1;

  // 5. Fila de Totales con Fórmulas de Excel
  if (servicios.length > 0) {
    const totalRow = worksheet.addRow([
      'TOTALES',
      '',
      '',
      '',
      '',
      '',
      { formula: `SUM(G${startRowIndex}:G${endRowIndex})` },
      { formula: `SUM(H${startRowIndex}:H${endRowIndex})` },
      { formula: `SUM(I${startRowIndex}:I${endRowIndex})` },
      { formula: `SUM(J${startRowIndex}:J${endRowIndex})` },
      ''
    ]);

    totalRow.height = 24;
    worksheet.mergeCells(`A${totalRow.number}:F${totalRow.number}`);

    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 11, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E293B' } },
        bottom: { style: 'double', color: { argb: 'FF1E293B' } }
      };
      if (colNumber >= 7 && colNumber <= 10) {
        cell.numberFormat = currencyFormat;
      }
    });

    totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  // 6. Ancho automático de columnas
  worksheet.columns.forEach((column, index) => {
    let maxLen = 12;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const cellLen = cell.value ? String(cell.value).length : 0;
      if (cellLen > maxLen) maxLen = cellLen;
    });
    column.width = Math.min(maxLen + 4, 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  generateLiquidacionExcel
};
