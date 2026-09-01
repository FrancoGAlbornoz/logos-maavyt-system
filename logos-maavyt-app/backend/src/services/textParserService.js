/**
 * textParserService.js
 * Servicio inteligente para parsear vouchers de texto crudo de Logos Travel / MAAVYT
 */

function cleanText(str) {
  if (!str) return '';
  return str.replace(/\r/g, '').trim();
}

/**
 * Parsea un bloque de texto que contiene uno o varios vouchers.
 * @param {string} rawText 
 * @returns {Array<Object>} Lista de servicios parseados
 */
function parseVoucherText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  const cleaned = cleanText(rawText);
  
  // Separar múltiples vouchers si vienen demarcados por líneas divisoras o palabra RESERVA / VOUCHER
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
 * Parsea un único bloque de voucher
 * @param {string} block 
 */
function parseSingleBlock(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

  // Defaults
  let nro_reserva = 'S/N';
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
  let observaciones_internas = '';

  // Regex Patterns
  const reservaRegex = /(?:RESERVA|VOUCHER|N[°º]|CODIGO|SOLICITUD)[:\s]*([A-Z0-9\/-]+)/i;
  const fechaRegex = /(?:FECHA)[:\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})|(\b\d{4}-\d{2}-\d{2}\b)|(\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b)/i;
  const horaRegex = /(?:HORA|HS|HORARIO)[:\s]*(\d{1,2}:\d{2}(?::\d{2})?)|(\b\d{1,2}:\d{2}\b)/i;
  const categoriaRegex = /\b(Auto Std|Auto|Ejecutivo|Van|Minibus)\b/i;
  const vueloRegex = /(?:VUELO|FLIGHT|AEROLINEA)[:\s]*([A-Z0-9\s]+)|(\b[A-Z]{2}\s?\d{3,4}\b)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Reserva
    if (nro_reserva === 'S/N') {
      const match = line.match(reservaRegex);
      if (match) {
        nro_reserva = match[1].trim();
      } else {
        // Intentar detectar número de reserva aislado tipo 230309 o 227777-A
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

    // Categoria Vehículo
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

    // Vuelo / Observaciones
    const vMatch = line.match(vueloRegex);
    if (vMatch && !vuelo_observacion) {
      vuelo_observacion = (vMatch[1] || vMatch[2]).trim();
    } else if (/(?:OBSERVACIO?N|NOTAS?|CARTEL)[:\s]*(.+)/i.test(line)) {
      const obsText = line.replace(/(?:OBSERVACIO?N|NOTAS?|CARTEL)[:\s]*/i, '').trim();
      vuelo_observacion = vuelo_observacion ? `${vuelo_observacion} - ${obsText}` : obsText;
    }

    // Pasajeros
    if (/(?:PASAJEROS?|PAX)[:\s]*(.+)/i.test(line)) {
      const paxText = line.replace(/(?:PASAJEROS?|PAX)[:\s]*/i, '').trim();
      paxText.split(/[\/;,\n]/).forEach(p => {
        const cleanedPax = p.trim();
        if (cleanedPax) {
          pasajeros.push(extractPassengerInfo(cleanedPax));
        }
      });
    }

    // Importes Financieros
    if (/(?:SUBTOTAL|TARIFA BASE|BASE)[:\s]*\$?\s*([\d\.,]+)/i.test(line)) {
      const m = line.match(/(?:SUBTOTAL|TARIFA BASE|BASE)[:\s]*\$?\s*([\d\.,]+)/i);
      if (m) subtotal = parseMoney(m[1]);
    }
    if (/(?:ESPERA|MONTO ESPERA)[:\s]*\$?\s*([\d\.,]+)/i.test(line)) {
      const m = line.match(/(?:ESPERA|MONTO ESPERA)[:\s]*\$?\s*([\d\.,]+)/i);
      if (m) monto_espera = parseMoney(m[1]);
    }
    if (/(?:ADICIONALES|PEAJES)[:\s]*\$?\s*([\d\.,]+)/i.test(line)) {
      const m = line.match(/(?:ADICIONALES|PEAJES)[:\s]*\$?\s*([\d\.,]+)/i);
      if (m) monto_adicionales = parseMoney(m[1]);
    }
    if (/(?:TOTAL)[:\s]*\$?\s*([\d\.,]+)/i.test(line)) {
      const m = line.match(/(?:TOTAL)[:\s]*\$?\s*([\d\.,]+)/i);
      if (m) total = parseMoney(m[1]);
    }
  }

  // Si no se detectó origen/destino explícitamente, intentar inferir por líneas libres
  if (!origen && lines.length > 2) {
    const originLine = lines.find(l => /ARPT|Aeropuerto|Hotel|Hilton|Centro|TUC/i.test(l) && !l.includes(destino));
    if (originLine) origen = originLine;
  }

  if (total === 0 && subtotal > 0) {
    total = subtotal + monto_espera + monto_adicionales;
  }

  if (!fecha_servicio) {
    fecha_servicio = new Date().toISOString().split('T')[0];
  }

  return {
    nro_reserva,
    fecha_servicio,
    hora_servicio,
    categoria_vehiculo,
    origen: origen || 'A definir',
    destino: destino || 'A definir',
    vuelo_observacion: vuelo_observacion || null,
    subtotal,
    monto_espera,
    monto_adicionales,
    total,
    pasajeros: pasajeros.length > 0 ? pasajeros : [{ nombre_completo: 'A DEFINIR', documento_o_referencia: null, telefono: null }],
    observaciones_internas: observaciones_internas || null
  };
}

function extractPassengerInfo(rawPax) {
  // Ejemplo: "DNI: 48704300 - TORRES DIEGO" o "CALCATERRA, PABLO"
  const dniMatch = rawPax.match(/(?:DNI|DOC|REF)[:\s]*([\d\.]+)/i);
  let documento = dniMatch ? dniMatch[1].replace(/\./g, '') : null;
  let nombre = rawPax;

  if (dniMatch) {
    nombre = rawPax.replace(dniMatch[0], '').replace(/^[\s\-\:]+/, '').trim();
  }

  return {
    nombre_completo: nombre.toUpperCase(),
    documento_o_referencia: documento,
    telefono: null
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
  // Reemplazar puntos de miles y coma decimal por punto decimal standard
  const cleaned = valStr.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

module.exports = {
  parseVoucherText,
  parseSingleBlock
};
