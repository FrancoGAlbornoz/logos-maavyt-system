/**
 * textParserService.js
 * Servicio para parsear vouchers estructurados de Logos Travel / MAAVYT
 */

function cleanText(str) {
  if (!str) return '';
  return str.replace(/\r/g, '').trim();
}

/**
 * Parsea un bloque de texto que contiene uno o varios vouchers.
 * @param {string} rawText 
 * @returns {Array<Object>} Lista de servicios parseados válidos
 */
function parseVoucherText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  const cleaned = cleanText(rawText);
  
  // Separar únicamente por marcadores claros de vouchers
  const blocks = cleaned.split(/(?=(?:RESERVA|VOUCHER|SOLICITUD DE SERVICIO|SERVICIO N[°º]|---+=+))/i)
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

/**
 * Parsea un único bloque de voucher con validaciones estrictas
 * @param {string} block 
 */
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
  let subtotal = 0;
  let monto_espera = 0;
  let monto_adicionales = 0;
  let total = 0;

  const reservaRegex = /(?:RESERVA|VOUCHER|CODIGO|SOLICITUD|CONFIRMACION)[:\s#]*([A-Z0-9\/-]{4,15})/i;
  const fechaRegex = /(?:FECHA)[:\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})|(\b\d{4}-\d{2}-\d{2}\b)|(\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b)/i;
  const horaRegex = /(?:HORA|HS|HORARIO)[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)|(\b\d{1,2}:\d{2}\b)/i;
  const categoriaRegex = /\b(Auto Std|Auto|Ejecutivo|Van|Minibus)\b/i;
  const vueloRegex = /(?:VUELO|FLIGHT|AEROLINEA)[:\s]*([A-Z0-9\s]+)|(\b[A-Z]{2}\s?\d{3,4}\b)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Reserva (exigir al menos 4 caracteres numéricos o formateados)
    if (!nro_reserva) {
      const match = line.match(reservaRegex);
      if (match && match[1].length >= 4) {
        nro_reserva = match[1].trim();
      } else {
        const standaloneMatch = line.match(/\b\d{5,7}(?:-[A-Z0-9]+)?\b/);
        if (standaloneMatch && i < 3) {
          nro_reserva = standaloneMatch[0];
        }
      }
    }

    // Fecha
    if (!fecha_servicio) {
      const match = line.match(fechaRegex);
      if (match) {
        const rawDate = match[1] || match[2] || match[3];
        fecha_servicio = formatToISODate(rawDate);
      }
    }

    // Hora
    if (hora_servicio === '00:00:00') {
      const match = line.match(horaRegex);
      if (match) {
        const rawTime = match[1] || match[2];
        hora_servicio = formatToISOTime(rawTime);
      }
    }

    // Categoría
    const catMatch = line.match(categoriaRegex);
    if (catMatch) {
      categoria_vehiculo = normalizeCategoria(catMatch[1]);
    }

    // Origen
    if (/(?:ORIGEN|DESDE|PICKUP|RETIRO)[:\s]*(.+)/i.test(line)) {
      origen = line.replace(/(?:ORIGEN|DESDE|PICKUP|RETIRO)[:\s]*/i, '').trim();
    }

    // Destino
    if (/(?:DESTINO|HASTA|DROPOFF|LLEGADA)[:\s]*(.+)/i.test(line)) {
      destino = line.replace(/(?:DESTINO|HASTA|DROPOFF|LLEGADA)[:\s]*/i, '').trim();
    }

    // Vuelo / Obs
    const vMatch = line.match(vueloRegex);
    if (vMatch && !vuelo_observacion) {
      vuelo_observacion = (vMatch[1] || vMatch[2]).trim();
    }

    // Pasajeros
    if (/(?:PASAJEROS?|PAX)[:\s]*(.+)/i.test(line)) {
      const paxText = line.replace(/(?:PASAJEROS?|PAX)[:\s]*/i, '').trim();
      paxText.split(/[\/;,\n]/).forEach(p => {
        const cleanedPax = p.trim();
        if (cleanedPax && cleanedPax.length > 2) {
          pasajeros.push(extractPassengerInfo(cleanedPax));
        }
      });
    }

    // Importes
    if (/(?:SUBTOTAL|TARIFA BASE|BASE)[:\s]*\$?\s*([\d\.,]+)/i.test(line)) {
      const m = line.match(/(?:SUBTOTAL|TARIFA BASE|BASE)[:\s]*\$?\s*([\d\.,]+)/i);
      if (m) subtotal = parseMoney(m[1]);
    }
    if (/(?:ESPERA|MONTO ESPERA)[:\s]*\$?\s*([\d\.,]+)/i.test(line)) {
      const m = line.match(/(?:ESPERA|MONTO ESPERA)[:\s]*\$?\s*([\d\.,]+)/i);
      if (m) monto_espera = parseMoney(m[1]);
    }
    if (/(?:TOTAL)[:\s]*\$?\s*([\d\.,]+)/i.test(line)) {
      const m = line.match(/(?:TOTAL)[:\s]*\$?\s*([\d\.,]+)/i);
      if (m) total = parseMoney(m[1]);
    }
  }

  // VALIDACION ESTRICTA: Descartar si no hay nro de reserva válido O si no tiene origen/destino
  if (!nro_reserva || nro_reserva.length < 4 || /^(de|el|la|los|un|una|S|S\/N)$/i.test(nro_reserva)) {
    return null;
  }

  if (total === 0 && subtotal > 0) {
    total = subtotal + monto_espera + monto_adicionales;
  }

  return {
    nro_reserva,
    fecha_servicio: fecha_servicio || new Date().toISOString().split('T')[0],
    hora_servicio,
    categoria_vehiculo,
    origen: origen || 'A definir',
    destino: destino || 'A definir',
    vuelo_observacion: vuelo_observacion || null,
    subtotal,
    monto_espera,
    monto_adicionales,
    total,
    pasajeros: pasajeros.length > 0 ? pasajeros : [{ nombre_completo: 'A DEFINIR', documento_o_referencia: null }],
    observaciones_internas: null
  };
}

function extractPassengerInfo(rawPax) {
  const dniMatch = rawPax.match(/(?:DNI|DOC|REF)[:\s]*([\d\.]+)/i);
  let documento = dniMatch ? dniMatch[1].replace(/\./g, '') : null;
  let nombre = rawPax;

  if (dniMatch) {
    nombre = rawPax.replace(dniMatch[0], '').replace(/^[\s\-\:]+/, '').trim();
  }

  return {
    nombre_completo: nombre.toUpperCase(),
    documento_o_referencia: documento
  };
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
  const lower = cat.toLowerCase();
  if (lower.includes('van')) return 'Van';
  if (lower.includes('minibus')) return 'Minibus';
  if (lower.includes('ejecutivo')) return 'Ejecutivo';
  if (lower === 'auto') return 'Auto';
  return 'Auto Std';
}

function parseMoney(valStr) {
  if (!valStr) return 0;
  const cleaned = valStr.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

module.exports = {
  parseVoucherText,
  parseSingleBlock
};
