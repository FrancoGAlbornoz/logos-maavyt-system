const ExcelJS = require('exceljs');
const { formatFechaEspanol } = require('./pdfGeneratorService');

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
  worksheet.mergeCells('A1:J1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'LOGOS TRAVEL / MAAVYT - PLANILLA DE LIQUIDACION QUINCENAL';
  titleCell.style = titleStyle;
  worksheet.getRow(1).height = 35;

  // 2. Información del Período
  worksheet.mergeCells('A2:J2');
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
    'ESTADO / ESPERA',
    'IMPORTE',
    'TOTAL'
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
    
    let origText = s.origen || '';
    if (s.origen_2) origText += ` / ${s.origen_2}`;
    let destText = s.destino || '';
    if (s.destino_2) destText += ` / ${s.destino_2}`;

    const sub = Number(s.subtotal) || 0;
    const importe = (Number(s.monto_espera) || 0) + (Number(s.monto_adicionales) || 0);
    const tot = Number(s.total) || (sub + importe);

    let estadoEspera = s.detalle_espera || '';
    if (s.estado_servicio === 'No Show') {
      estadoEspera = estadoEspera ? `No Show (${estadoEspera})` : 'No Show';
    } else if (!estadoEspera) {
      estadoEspera = '-';
    }

    const row = worksheet.addRow([
      s.fecha_servicio ? formatFechaEspanol(s.fecha_servicio) : '',
      s.nro_reserva || 'S/N',
      pnames,
      s.categoria_vehiculo || 'Auto Std',
      origText,
      destText,
      sub,
      estadoEspera,
      importe,
      tot
    ]);

    row.height = 20;

    // Formatear Números de Moneda (Col 7: SUBTOTAL, Col 9: IMPORTE, Col 10: TOTAL)
    row.getCell(7).numberFormat = currencyFormat;
    row.getCell(9).numberFormat = currencyFormat;
    row.getCell(10).numberFormat = currencyFormat;

    // Alineaciones
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(8).alignment = { horizontal: 'center' };

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
      '',
      { formula: `SUM(I${startRowIndex}:I${endRowIndex})` },
      { formula: `SUM(J${startRowIndex}:J${endRowIndex})` }
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
      if (colNumber === 7 || colNumber === 9 || colNumber === 10) {
        cell.numberFormat = currencyFormat;
      }
    });

    totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  // 6. Ancho automático de columnas
  worksheet.columns.forEach((column) => {
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

/**
 * Genera la Planilla de Servicios Operativos en Excel (.xlsx) optimizada para impresión y despacho
 * Columnas: N° Servicio, Fecha, Hora, Pasajeros, Origen, Destino y Observaciones
 * @param {Array<Object>} servicios 
 * @param {Object} metadata 
 * @returns {Promise<Buffer>}
 */
async function generateServiciosOperativosExcel(servicios = [], metadata = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Logos-MAAVYT System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Servicios Operativos');

  // Configuración de Impresión en A4 Horizontal
  worksheet.pageSetup.orientation = 'landscape';
  worksheet.pageSetup.paperSize = 9; // A4
  worksheet.pageSetup.fitToPage = true;
  worksheet.pageSetup.fitToWidth = 1;
  worksheet.pageSetup.fitToHeight = 0;

  // Estilos Base
  const titleStyle = {
    font: { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }, // Azul Ejecutivo
    alignment: { vertical: 'middle', horizontal: 'center' }
  };

  const headerStyle = {
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }, // Slate 700
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF1E293B' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    }
  };

  // 1. Título
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'LOGOS TRAVEL / MAAVYT - HOJA OPERATIVA DE SERVICIOS';
  titleCell.style = titleStyle;
  worksheet.getRow(1).height = 32;

  // 2. Subtítulo con rango y fecha
  worksheet.mergeCells('A2:G2');
  const subTitleCell = worksheet.getCell('A2');
  subTitleCell.value = `Filtro: ${metadata.rangeLabel || 'Período Operativo'} | Total: ${servicios.length} traslados | Generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`;
  subTitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]); // Espaciador

  // 3. Encabezados de Tabla (Fila 4)
  const headers = [
    'N° SERVICIO',
    'FECHA',
    'HORA',
    'PASAJEROS',
    'ORIGEN',
    'DESTINO',
    'OBSERVACIONES / VUELO'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });

  // 4. Agregar Filas
  servicios.forEach((s, idx) => {
    const pnames = s.pasajeros_concatenados || s.pasajeros?.map(p => p.nombre_completo).join(' / ') || 'A definir';
    const fechaStr = formatFechaEspanol(s.fecha_servicio);
    const horaStr = s.hora_servicio ? s.hora_servicio.substring(0, 5) : '';

    const row = worksheet.addRow([
      s.nro_reserva || `#${s.id}`,
      fechaStr,
      horaStr ? `${horaStr} hs` : '',
      pnames,
      s.origen_2 ? `1) ${s.origen || ''} | 2) ${s.origen_2}` : (s.origen || ''),
      s.destino_2 ? `1) ${s.destino || ''} | 2) ${s.destino_2}` : (s.destino || ''),
      s.vuelo_observacion || s.detalle_espera || '-'
    ]);

    row.height = 22;

    // Fondo alternado
    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }

    // Alineaciones
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).alignment = { vertical: 'middle', wrapText: true };
    row.getCell(5).alignment = { vertical: 'middle', wrapText: true };
    row.getCell(6).alignment = { vertical: 'middle', wrapText: true };
    row.getCell(7).alignment = { vertical: 'middle', wrapText: true };

    // Bordes
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // 5. Ajuste de anchos de columna
  worksheet.columns = [
    { width: 16 }, // N° Reserva
    { width: 14 }, // Fecha
    { width: 12 }, // Hora
    { width: 32 }, // Pasajeros
    { width: 32 }, // Origen
    { width: 32 }, // Destino
    { width: 28 }  // Observaciones
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  generateLiquidacionExcel,
  generateServiciosOperativosExcel
};
