/**
 * textParserService.js
 * Servicio inteligente para la detección de intenciones (Altas, Modificaciones, Cancelaciones, Confirmaciones)
 * y extracción de reservas masivas o individuales de Logos Travel / MAAVYT
 */

function cleanHtmlTags(str) {
  if (!str) return '';
  return str
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detecta la intención principal del correo (CANCELACION, MODIFICACION, CONFIRMACION, ALTA)
 * @param {string} subject 
 * @param {string} textBody 
 * @returns {string} 'CANCELACION' | 'MODIFICACION' | 'CONFIRMACION' | 'ALTA'
 */
function detectEmailIntent(subject = '', textBody = '') {
  const full = `${subject} ${textBody}`.toUpperCase();

  if (/CANCELACIO?N|CANCELADO|CANCELAR|SE CANCELA|BAJA DE SERVICIO/i.test(full)) {
    return 'CANCELACION';
  }
  if (/MODIFICACIO?N|MODIFICA|CAMBIO DE HORA|CAMBIO DE VUELO|REPROGRAMADO/i.test(full)) {
    return 'MODIFICACION';
  }
  if (/CONFIRMACIO?N|CONFIRMADO|VOUCHER CONFIRMADO/i.test(full)) {
    return 'CONFIRMACION';
  }
  return 'ALTA';
}

/**
 * Extrae todos los números de reserva válidos (5 a 7 dígitos) presentes en el texto o asunto
 * @param {string} text 
 * @param {string} subject 
 * @returns {Array<string>} Lista de números de reserva únicos
 */
function extractReservationNumbers(text = '', subject = '') {
  const combined = `${subject} ${text}`;
  const matches = combined.match(/\b\d{5,7}(?:-[A-Z0-9]+)?\b/gi) || [];
  
  // Eliminar duplicados y códigos inválidos
  const unique = Array.from(new Set(matches.map(m => m.toUpperCase())));
  return unique.filter(nro => nro.length >= 5 && !/^(11111|12345|00000)$/.test(nro));
}

/**
 * Parsea texto crudo o HTML de vouchers, soportando tablas masivas "SOLICITUD DE SERVICIO".
 */
function parseVoucherText(rawText, htmlBody = '') {
  if (!rawText && !htmlBody) return [];

  // 1. Intentar parsear tabla HTML si está disponible
  if (htmlBody && (htmlBody.includes('<table') || htmlBody.includes('<tr'))) {
    const htmlServices = parseHtmlTable(htmlBody);
    if (htmlServices.length > 0) {
      return htmlServices;
    }
  }

  // 2. Intentar parsear líneas tabulares en texto plano
  if (rawText) {
    const tabularServices = parseTabularText(rawText);
    if (tabularServices.length > 0) {
      return tabularServices;
    }
  }

  // 3. Fallback: Parsear por tarjetas/bloques individuales
  return parseBlockCards(rawText || cleanHtmlTags(htmlBody));
}

/**
 * Extrae servicios directamente desde la estructura de tabla HTML (tr/td)
 */
function parseHtmlTable(htmlBody) {
  const services = [];

  const trMatches = htmlBody.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
  if (!trMatches || trMatches.length === 0) return [];

  for (const trHtml of trMatches) {
    const tdMatches = trHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi);
    if (!tdMatches || tdMatches.length < 4) continue;

    const cells = tdMatches.map(td => cleanHtmlTags(td));

    let nroReservaIdx = -1;
    let nro_reserva = '';

    for (let c = 0; c < Math.min(3, cells.length); c++) {
      const match = cells[c].match(/\b\d{5,7}(?:-[A-Z0-9]+)?\b/);
      if (match) {
        nroReservaIdx = c;
        nro_reserva = match[0];
        break;
      }
    }

    if (nroReservaIdx === -1 || !nro_reserva) continue;

    const categoria = cells[nroReservaIdx + 1] || 'Auto Std';
    const rawFecha = cells[nroReservaIdx + 2] || '';
    const rawHora = cells[nroReservaIdx + 3] || '00:00';
    const origen = cells[nroReservaIdx + 4] || 'A definir';
    const destino = cells[nroReservaIdx + 5] || 'A definir';
    const rawPasajeros = cells[nroReservaIdx + 6] || '';
    const observacion = cells[nroReservaIdx + 7] || '';

    const fecha_servicio = formatToISODate(rawFecha);
    const hora_servicio = formatToISOTime(rawHora);
    const pasajeros = parsePasajerosString(rawPasajeros);

    services.push({
      nro_reserva,
      fecha_servicio,
      hora_servicio,
      categoria_vehiculo: normalizeCategoria(categoria),
      origen,
      destino,
      vuelo_observacion: observacion || null,
      subtotal: 0,
      monto_espera: 0,
      monto_adicionales: 0,
      total: 0,
      pasajeros: pasajeros.length > 0 ? pasajeros : [{ nombre_completo: 'A DEFINIR', documento_o_referencia: null }]
    });
  }

  return services;
}

/**
 * Extrae servicios desde filas tabulares en texto plano
 */
function parseTabularText(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const services = [];

  const rowRegex = /^\s*(\d{5,7}(?:-[A-Z0-9]+)?)\s+(Auto\s*Std|Auto|Ejecutivo|Van|Minibus)?\s*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})\s+(\d{1,2}:\d{2})\s+(.+)$/i;

  for (const line of lines) {
    const match = line.match(rowRegex);
    if (match) {
      const nro_reserva = match[1];
      const categoria = match[2] || 'Auto Std';
      const fecha_servicio = formatToISODate(match[3]);
      const hora_servicio = formatToISOTime(match[4]);
      const rest = match[5];

      const parts = rest.split(/\s{2,}|\t/);
      let origen = 'A definir';
      let destino = 'A definir';
      let rawPasajeros = '';
      let obs = '';

      if (parts.length >= 3) {
        origen = parts[0];
        destino = parts[1];
        rawPasajeros = parts[2];
        obs = parts.slice(3).join(' ');
      } else {
        origen = rest;
      }

      services.push({
        nro_reserva,
        fecha_servicio,
        hora_servicio,
        categoria_vehiculo: normalizeCategoria(categoria),
        origen,
        destino,
        vuelo_observacion: obs || null,
        subtotal: 0,
        monto_espera: 0,
        monto_adicionales: 0,
        total: 0,
        pasajeros: parsePasajerosString(rawPasajeros)
      });
    }
  }

  return services;
}

/**
 * Parsea por tarjetas individuales (Fallback)
 */
function parseBlockCards(text) {
  const blocks = text.split(/(?=(?:RESERVA|VOUCHER|SOLICITUD DE SERVICIO|SERVICIO N[°º]|---+=+))/i)
    .filter(b => b.trim().length > 0);

  const results = [];
  for (const block of blocks) {
    const parsed = parseSingleBlock(block);
    if (parsed) {
      results.push(parsed);
    }
  }
  return results;
}

function parseSingleBlock(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

  let nro_reserva = null;
  let fecha_servicio = null;
  let hora_servicio = '00:00:00';
  let categoria_vehiculo = 'Auto Std';
  let origen = '';
  let destino = '';
  let vuelo_observacion = '';
  let pasajeros = [];

  const reservaRegex = /(?:RESERVA|VOUCHER|CODIGO|SOLICITUD)[:\s#]*([A-Z0-9\/-]{4,15})/i;
  const fechaRegex = /(?:FECHA)[:\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})|(\b\d{4}-\d{2}-\d{2}\b)|(\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b)/i;
  const horaRegex = /(?:HORA|HS|HORARIO)[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)|(\b\d{1,2}:\d{2}\b)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!nro_reserva) {
      const match = line.match(reservaRegex);
      if (match && match[1].length >= 4) {
        nro_reserva = match[1].trim();
      } else {
        const standaloneMatch = line.match(/\b\d{5,7}(?:-[A-Z0-9]+)?\b/);
        if (standaloneMatch && i < 3) nro_reserva = standaloneMatch[0];
      }
    }

    if (!fecha_servicio) {
      const match = line.match(fechaRegex);
      if (match) fecha_servicio = formatToISODate(match[1] || match[2] || match[3]);
    }

    if (hora_servicio === '00:00:00') {
      const match = line.match(horaRegex);
      if (match) hora_servicio = formatToISOTime(match[1] || match[2]);
    }

    if (/(?:ORIGEN|DESDE|PICKUP)[:\s]*(.+)/i.test(line)) {
      origen = line.replace(/(?:ORIGEN|DESDE|PICKUP)[:\s]*/i, '').trim();
    }
    if (/(?:DESTINO|HASTA|DROPOFF)[:\s]*(.+)/i.test(line)) {
      destino = line.replace(/(?:DESTINO|HASTA|DROPOFF)[:\s]*/i, '').trim();
    }
    if (/(?:PASAJEROS?|PAX)[:\s]*(.+)/i.test(line)) {
      pasajeros = parsePasajerosString(line.replace(/(?:PASAJEROS?|PAX)[:\s]*/i, ''));
    }
  }

  if (!nro_reserva || nro_reserva.length < 4 || /^(de|el|la|los|un|una|S|S\/N)$/i.test(nro_reserva)) {
    return null;
  }

  return {
    nro_reserva,
    fecha_servicio: fecha_servicio || new Date().toISOString().split('T')[0],
    hora_servicio,
    categoria_vehiculo,
    origen: origen || 'A definir',
    destino: destino || 'A definir',
    vuelo_observacion: vuelo_observacion || null,
    subtotal: 0,
    monto_espera: 0,
    monto_adicionales: 0,
    total: 0,
    pasajeros: pasajeros.length > 0 ? pasajeros : [{ nombre_completo: 'A DEFINIR', documento_o_referencia: null }]
  };
}

function parsePasajerosString(rawPasajeros) {
  if (!rawPasajeros) return [];
  const list = [];
  const parts = rawPasajeros.split(/\s+-\s+|\/|;/);
  for (const p of parts) {
    const cleaned = p.trim();
    if (cleaned && cleaned.length > 2) {
      const dniMatch = cleaned.match(/(?:DNI|DOC|REF)[:\s]*([\d\.]+)/i);
      const doc = dniMatch ? dniMatch[1].replace(/\./g, '') : null;
      const name = dniMatch ? cleaned.replace(dniMatch[0], '').replace(/^[\s\-\:]+/, '').trim() : cleaned;

      list.push({
        nombre_completo: name.toUpperCase(),
        documento_o_referencia: doc
      });
    }
  }
  return list;
}

function formatToISODate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const parts = dateStr.split(/[\/\.-]/);
  if (parts.length === 3) {
    let day = parts[0].padStart(2, '0');
    let month = parts[1].padStart(2, '0');
    let year = parts[2];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

function formatToISOTime(timeStr) {
  if (!timeStr) return '00:00:00';
  const parts = timeStr.split(':');
  const hours = parts[0].padStart(2, '0');
  const minutes = (parts[1] || '00').padStart(2, '0');
  const seconds = (parts[2] || '00').padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function normalizeCategoria(cat) {
  if (!cat) return 'Auto Std';
  const lower = cat.toLowerCase();
  if (lower.includes('van')) return 'Van';
  if (lower.includes('minibus')) return 'Minibus';
  if (lower.includes('ejecutivo')) return 'Ejecutivo';
  if (lower === 'auto') return 'Auto';
  return 'Auto Std';
}

module.exports = {
  detectEmailIntent,
  extractReservationNumbers,
  parseVoucherText,
  parseHtmlTable,
  parseTabularText
};
