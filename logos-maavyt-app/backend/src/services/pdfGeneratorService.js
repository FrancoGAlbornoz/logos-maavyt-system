const PDFDocument = require('pdfkit');

/**
 * Genera la Hoja de Ruta Operativa en PDF formato A4 Horizontal (Landscape)
 * @param {Array<Object>} servicios Lista de servicios a incluir
 * @param {Object} metadata Datos contextuales (fecha, conductor, periodo)
 * @returns {Promise<Buffer>} Buffer del documento PDF
 */
function generateHojaDeRutaPDF(servicios = [], metadata = {}) {
  return new Promise((resolve, reject) => {
    try {
      // Configuración A4 Horizontal (841.89 x 595.28 pt)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Colores Corporativos MAAVYT
      const PRIMARY_COLOR = '#1E3A8A'; // Azul Ejecutivo
      const SECONDARY_COLOR = '#475569'; // Gris Oscuro
      const BORDER_COLOR = '#CBD5E1'; // Gris Claro
      const ALT_ROW_COLOR = '#F8FAFC'; // Blanco/Gris tenue

      // Encabezado
      doc.rect(30, 25, 781, 45).fill(PRIMARY_COLOR);
      doc.fillColor('#FFFFFF')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('MAAVYT - HOJA DE RUTA OPERATIVA DE TRASLADOS', 45, 35);

      doc.fontSize(10)
         .font('Helvetica')
         .text(`Conductor: ${metadata.conductor || 'Miguel Ángel Albornoz (Unidad 430)'} | Fecha Impresión: ${new Date().toLocaleDateString('es-AR')}`, 45, 53);

      // Tabla de Servicios
      const startY = 85;
      const colWidths = {
        fecha: 55,
        hora: 40,
        reserva: 65,
        pasajeros: 155,
        origen: 160,
        destino: 160,
        vuelo: 80,
        espera: 66
      };

      const startX = 30;

      // Render Encabezados de Tabla
      doc.rect(startX, startY, 781, 22).fill('#E2E8F0');
      doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold');

      let currentX = startX + 5;
      doc.text('FECHA', currentX, startY + 6);
      currentX += colWidths.fecha;

      doc.text('HS', currentX, startY + 6);
      currentX += colWidths.hora;

      doc.text('RESERVA', currentX, startY + 6);
      currentX += colWidths.reserva;

      doc.text('PASAJEROS / DNI', currentX, startY + 6);
      currentX += colWidths.pasajeros;

      doc.text('ORIGEN', currentX, startY + 6);
      currentX += colWidths.origen;

      doc.text('DESTINO', currentX, startY + 6);
      currentX += colWidths.destino;

      doc.text('VUELO / OBS', currentX, startY + 6);
      currentX += colWidths.vuelo;

      doc.text('ESPERA', currentX, startY + 6);

      // Render Filas
      let y = startY + 22;
      doc.font('Helvetica').fontSize(7.5);

      servicios.forEach((s, idx) => {
        const rowHeight = 24;

        // Fondo alternado
        if (idx % 2 === 1) {
          doc.rect(startX, y, 781, rowHeight).fill(ALT_ROW_COLOR);
        }

        // Borde inferior
        doc.moveTo(startX, y + rowHeight)
           .lineTo(startX + 781, y + rowHeight)
           .strokeColor(BORDER_COLOR)
           .stroke();

        doc.fillColor('#1E293B');

        let x = startX + 5;

        // Fecha
        const fechaFormatted = formatDateShort(s.fecha_servicio);
        doc.text(fechaFormatted, x, y + 7, { width: colWidths.fecha - 5 });
        x += colWidths.fecha;

        // Hora
        doc.text((s.hora_servicio || '').substring(0, 5), x, y + 7, { width: colWidths.hora - 5 });
        x += colWidths.hora;

        // Reserva
        doc.font('Helvetica-Bold').text(s.nro_reserva || 'S/N', x, y + 7, { width: colWidths.reserva - 5 }).font('Helvetica');
        x += colWidths.reserva;

        // Pasajeros
        const pnames = s.pasajeros_concatenados || s.pasajeros?.map(p => p.nombre_completo).join(' / ') || 'PAX';
        doc.text(pnames, x, y + 7, { width: colWidths.pasajeros - 5, height: 18, ellipsis: true });
        x += colWidths.pasajeros;

        // Origen
        doc.text(s.origen || '', x, y + 7, { width: colWidths.origen - 5, height: 18, ellipsis: true });
        x += colWidths.origen;

        // Destino
        doc.text(s.destino || '', x, y + 7, { width: colWidths.destino - 5, height: 18, ellipsis: true });
        x += colWidths.destino;

        // Vuelo
        doc.text(s.vuelo_observacion || '-', x, y + 7, { width: colWidths.vuelo - 5, height: 18, ellipsis: true });
        x += colWidths.vuelo;

        // Espera
        doc.text(s.detalle_espera || '-', x, y + 7, { width: colWidths.espera - 5 });

        y += rowHeight;

        // Salto de página si excede el borde
        if (y > 530 && idx < servicios.length - 1) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
          y = 40;
        }
      });

      // Pie de Página
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .fillColor(SECONDARY_COLOR)
           .text(`Página ${i + 1} de ${pageCount} - Logos-MAAVYT System`, 30, 565, { align: 'center', width: 781 });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

module.exports = {
  generateHojaDeRutaPDF
};
