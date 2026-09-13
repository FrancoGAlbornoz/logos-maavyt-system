const PDFDocument = require('pdfkit');

/**
 * Formatea una fecha de manera 100% segura en español con día y números (ej: Jue 03/09/2026)
 * Evita conversiones automáticas al inglés de Node.js o desfasajes de zona horaria UTC.
 * @param {Date|string} dateVal 
 * @returns {string}
 */
function formatFechaEspanol(dateVal) {
  if (!dateVal) return '';

  let year, month, day, dayOfWeek;

  if (dateVal instanceof Date) {
    const iso = dateVal.toISOString().split('T')[0];
    const [y, m, d] = iso.split('-').map(Number);
    const fixedDate = new Date(y, m - 1, d, 12, 0, 0);
    year = y;
    month = String(m).padStart(2, '0');
    day = String(d).padStart(2, '0');
    dayOfWeek = fixedDate.getDay();
  } else {
    const str = String(dateVal).substring(0, 10);
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      const fixedDate = new Date(y, m - 1, d, 12, 0, 0);
      year = y;
      month = String(m).padStart(2, '0');
      day = String(d).padStart(2, '0');
      dayOfWeek = fixedDate.getDay();
    } else {
      return str;
    }
  }

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const diaNombre = diasSemana[dayOfWeek] || '';

  return `${diaNombre} ${day}/${month}/${year}`;
}

/**
 * Genera la Hoja de Servicios Operativos en PDF formato A4 Horizontal (Landscape)
 * optimizada para impresión y despacho.
 * Columnas requeridas: N° Servicio, Fecha/Hora, Pasajeros, Origen, Destino y Observaciones.
 * @param {Array<Object>} servicios Lista de servicios a incluir
 * @param {Object} metadata Datos contextuales (rangeLabel, conductor, etc.)
 * @returns {Promise<Buffer>} Buffer del documento PDF
 */
function generateHojaDeRutaPDF(servicios = [], metadata = {}) {
  return new Promise((resolve, reject) => {
    try {
      // Configuración A4 Horizontal (841.89 x 595.28 pt) con márgenes de 30 pt
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
        bufferPages: true
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Paleta Corporativa
      const PRIMARY_COLOR = '#1E3A8A'; // Azul Ejecutivo
      const SECONDARY_COLOR = '#475569'; // Gris Oscuro
      const BORDER_COLOR = '#CBD5E1'; // Borde Gris Claro
      const ALT_ROW_COLOR = '#F8FAFC'; // Alternado suave

      const startX = 30;
      const contentWidth = 781;

      // Anchos exactos para las 6 columnas solicitadas (Suma = 781 pt)
      const colWidths = {
        reserva: 70,       // N° Servicio / Reserva
        fechaHora: 80,     // Fecha / Hora
        pasajeros: 155,    // Pasajeros
        origen: 165,       // Origen
        destino: 165,      // Destino
        observaciones: 146 // Observaciones / Vuelo
      };

      const now = new Date();
      const nowStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} hs`;

      const renderHeader = (isFirstPage = false) => {
        if (isFirstPage) {
          // Banner de Cabecera
          doc.rect(startX, 25, contentWidth, 48).fill(PRIMARY_COLOR);
          doc.fillColor('#FFFFFF')
             .fontSize(15)
             .font('Helvetica-Bold')
             .text('LOGOS TRAVEL / MAAVYT - HOJA OPERATIVA DE SERVICIOS', startX + 15, 34);

          const subtitle = `Filtro: ${metadata.rangeLabel || 'Período Operativo'} | Total: ${servicios.length} traslado(s) | Impreso: ${nowStr}`;
          doc.fontSize(9)
             .font('Helvetica')
             .text(subtitle, startX + 15, 54);
        }

        // Fila de Encabezados de Tabla
        const headerY = isFirstPage ? 83 : 30;
        doc.rect(startX, headerY, contentWidth, 22).fill('#E2E8F0');
        doc.fillColor('#0F172A').fontSize(8).font('Helvetica-Bold');

        let x = startX + 6;
        doc.text('N° SERVICIO', x, headerY + 6);
        x += colWidths.reserva;

        doc.text('FECHA / HORA', x, headerY + 6);
        x += colWidths.fechaHora;

        doc.text('PASAJEROS', x, headerY + 6);
        x += colWidths.pasajeros;

        doc.text('ORIGEN', x, headerY + 6);
        x += colWidths.origen;

        doc.text('DESTINO', x, headerY + 6);
        x += colWidths.destino;

        doc.text('OBSERVACIONES', x, headerY + 6);

        return headerY + 22;
      };

      let currentY = renderHeader(true);

      // Renderizar Filas de Servicios
      servicios.forEach((s, idx) => {
        const hasSecondStop = Boolean(s.destino_2 || s.origen_2);
        const rowHeight = hasSecondStop ? 34 : 28;

        // Salto de página antes de dibujar si se acerca al pie
        if (currentY + rowHeight > 540) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
          currentY = renderHeader(false);
        }

        // Fondo alternado
        if (idx % 2 === 1) {
          doc.rect(startX, currentY, contentWidth, rowHeight).fill(ALT_ROW_COLOR);
        }

        // Borde inferior
        doc.moveTo(startX, currentY + rowHeight)
           .lineTo(startX + contentWidth, currentY + rowHeight)
           .strokeColor(BORDER_COLOR)
           .lineWidth(0.5)
           .stroke();

        doc.fillColor('#1E293B');

        let x = startX + 6;

        // 1. N° Servicio / Reserva
        doc.font('Helvetica-Bold').fontSize(8.5);
        doc.text(s.nro_reserva || `#${s.id}`, x, currentY + (hasSecondStop ? 11 : 9), { width: colWidths.reserva - 8 });
        x += colWidths.reserva;

        // 2. Fecha / Hora en Español (ej: Jue 03/09/2026)
        doc.font('Helvetica').fontSize(7.5);
        const fechaStr = formatFechaEspanol(s.fecha_servicio);
        const horaStr = (s.hora_servicio || '').substring(0, 5) ? `${(s.hora_servicio || '').substring(0, 5)} hs` : '';
        doc.text(`${fechaStr}\n${horaStr}`, x, currentY + 4, { width: colWidths.fechaHora - 8 });
        x += colWidths.fechaHora;

        // 3. Pasajeros
        const pnames = s.pasajeros_concatenados || s.pasajeros?.map(p => p.nombre_completo).join(' / ') || 'A definir';
        doc.text(pnames, x, currentY + 4, { width: colWidths.pasajeros - 8, height: hasSecondStop ? 26 : 20, ellipsis: true });
        x += colWidths.pasajeros;

        // 4. Origen (con soporte para 2da parada)
        const origText = s.origen_2 ? `1) ${s.origen || '-'}\n2) ${s.origen_2}` : (s.origen || '-');
        doc.text(origText, x, currentY + 4, { width: colWidths.origen - 8, height: hasSecondStop ? 26 : 20, ellipsis: true });
        x += colWidths.origen;

        // 5. Destino (con soporte para 2da parada)
        const destText = s.destino_2 ? `1) ${s.destino || '-'}\n2) ${s.destino_2}` : (s.destino || '-');
        doc.text(destText, x, currentY + 4, { width: colWidths.destino - 8, height: hasSecondStop ? 26 : 20, ellipsis: true });
        x += colWidths.destino;

        // 6. Observaciones
        const obs = s.vuelo_observacion || s.detalle_espera || '-';
        doc.text(obs, x, currentY + 4, { width: colWidths.observaciones - 8, height: hasSecondStop ? 26 : 20, ellipsis: true });

        currentY += rowHeight;
      });

      // Pie de Página con Paginación
      const pageRange = doc.bufferedPageRange();
      for (let i = 0; i < pageRange.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor(SECONDARY_COLOR)
           .text(`Página ${i + 1} de ${pageRange.count} - Logos Travel / MAAVYT Manager`, startX, 565, { align: 'center', width: contentWidth });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateHojaDeRutaPDF,
  formatFechaEspanol
};
