/**
 * textParserService.js
 * Servicio inteligente para la detección de intenciones (Altas, Modificaciones, Cancelaciones, Confirmaciones)
 * y extracción de reservas masivas o individuales de Logos Travel / MAAVYT
 * Con soporte para múltiples tramos / 2das paradas y detección precisa de pasajeros.
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
 * Detecta encabezados dinámicos (incluyendo columnas Estado, Unidad, Pasajero)
 * y vincula automáticamente filas secundarias (2das paradas) a su reserva principal.
 */
function parseHtmlTable(htmlBody) {
  const services = [];

  const trMatches = htmlBody.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
  if (!trMatches || trMatches.length === 0) return [];

  let headerMap = null;

  for (const trHtml of trMatches) {
    const tdMatches = trHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi);
    if (!tdMatches || tdMatches.length < 3) continue;

    const cells = tdMatches.map(td => cleanHtmlTags(td));

    // Identificar fila de encabezado
    const isHeaderRow = cells.some(c => /n[°º]?\s*res|categ|origen|destino|pasajero/i.test(c));
    if (isHeaderRow) {
      headerMap = {
        nro_reserva: cells.findIndex(c => /n[°º]?\s*res/i.test(c)),
        categoria: cells.findIndex(c => /categ/i.test(c)),
        fecha: cells.findIndex(c => /fecha/i.test(c)),
        hora: cells.findIndex(c => /hora|hs/i.test(c)),
        origen: cells.findIndex(c => /origen|desde|pickup/i.test(c)),
        destino: cells.findIndex(c => /destino|hasta|dropoff/i.test(c)),
        pasajeros: cells.findIndex(c => /pasajero/i.test(c) || (/pax/i.test(c) && !/#|cant/i.test(c))),
        observacion: cells.findIndex(c => /vuelo|obs/i.test(c))
      };
      continue;
    }

    let nro_reserva = '';
    let categoria = 'Auto Std';
    let rawFecha = '';
    let rawHora = '00:00';
    let origen = '';
    let destino = '';
    let rawPasajeros = '';
    let observacion = '';

    if (headerMap && headerMap.origen !== -1 && headerMap.destino !== -1) {
      if (headerMap.nro_reserva !== -1 && cells[headerMap.nro_reserva]) {
        const m = cells[headerMap.nro_reserva].match(/\b\d{5,7}(?:-[A-Z0-9]+)?\b/);
        if (m) nro_reserva = m[0];
      }
      if (headerMap.categoria !== -1) categoria = cells[headerMap.categoria] || 'Auto Std';
      if (headerMap.fecha !== -1) rawFecha = cells[headerMap.fecha] || '';
      if (headerMap.hora !== -1) rawHora = cells[headerMap.hora] || '00:00';
      if (headerMap.origen !== -1) origen = cells[headerMap.origen] || '';
      if (headerMap.destino !== -1) destino = cells[headerMap.destino] || '';
      if (headerMap.pasajeros !== -1) rawPasajeros = cells[headerMap.pasajeros] || '';
      if (headerMap.observacion !== -1) observacion = cells[headerMap.observacion] || '';
    } else if (cells.length >= 10) {
      // Tabla estándar cliente:
      // [0] N° Res, [1] Categ, [2] Fecha, [3] Hora, [4] Estado, [5] Unidad, [6] Nombre Unidad, [7] Origen, [8] Destino, [9] # Pax, [10] Pasajero
      const m = cells[0].match(/\b\d{5,7}(?:-[A-Z0-9]+)?\b/);
      if (m) nro_reserva = m[0];
      categoria = cells[1] || 'Auto Std';
      rawFecha = cells[2] || '';
      rawHora = cells[3] || '00:00';
      origen = cells[7] || '';
      destino = cells[8] || '';
      rawPasajeros = cells[10] || cells[9] || '';
      observacion = cells[11] || '';
    } else {
      // Fallback estándar por búsqueda de celda de reserva
      let nroReservaIdx = -1;
      for (let c = 0; c < Math.min(3, cells.length); c++) {
        const match = cells[c].match(/\b\d{5,7}(?:-[A-Z0-9]+)?\b/);
        if (match) {
          nroReservaIdx = c;
          nro_reserva = match[0];
          break;
        }
      }

      if (nroReservaIdx !== -1) {
        categoria = cells[nroReservaIdx + 1] || 'Auto Std';
        rawFecha = cells[nroReservaIdx + 2] || '';
        rawHora = cells[nroReservaIdx + 3] || '00:00';
        origen = cells[nroReservaIdx + 4] || '';
        destino = cells[nroReservaIdx + 5] || '';
        rawPasajeros = cells[nroReservaIdx + 6] || '';
        observacion = cells[nroReservaIdx + 7] || '';
      }
    }

    // SI NO TIENE N° RESERVA, PERO TIENE ORIGEN Y DESTINO:
    // Corresponde a la 2da parada / 2do tramo del servicio anterior (ej: #231859 segunda fila)
    if (!nro_reserva && origen && destino && services.length > 0) {
      const lastService = services[services.length - 1];
      lastService.origen_2 = origen;
      lastService.destino_2 = destino;
      if (rawPasajeros) {
        const extraPaxs = parsePasajerosString(rawPasajeros);
        for (const ep of extraPaxs) {
          if (!lastService.pasajeros.some(p => p.nombre_completo === ep.nombre_completo)) {
            lastService.pasajeros.push(ep);
          }
        }
      }
      continue;
    }

    if (!nro_reserva) continue;

    const fecha_servicio = formatToISODate(rawFecha);
    const hora_servicio = formatToISOTime(rawHora);
    const pasajeros = parsePasajerosString(rawPasajeros);

    services.push({
      nro_reserva,
      fecha_servicio,
      hora_servicio,
      categoria_vehiculo: normalizeCategoria(categoria),
      origen: origen || 'A definir',
      destino: destino || 'A definir',
      origen_2: null,
      destino_2: null,
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

  for (const line of lines) {
    const parts = line.split(/\t+|\s{2,}/);
    if (parts.length < 2) continue;

    const resMatch = parts[0].match(/\b\d{5,7}(?:-[A-Z0-9]+)?\b/);
    if (resMatch) {
      const nro_reserva = resMatch[0];
      let categoria = 'Auto Std';
      let rawFecha = '';
      let rawHora = '00:00';
      let origen = 'A definir';
      let destino = 'A definir';
      let rawPasajeros = '';
      let obs = '';

      if (parts.length >= 10) {
        // [0] Res, [1] Categ, [2] Fecha, [3] Hora, [4] Estado, [5] Unidad, [6] Nombre Unidad, [7] Origen, [8] Destino, [9] # Pax, [10] Pasajero
        categoria = parts[1] || 'Auto Std';
        rawFecha = parts[2] || '';
        rawHora = parts[3] || '00:00';
        origen = parts[7] || 'A definir';
        destino = parts[8] || 'A definir';
        rawPasajeros = parts[10] || parts[9] || '';
        obs = parts.slice(11).join(' ');
      } else if (parts.length >= 5) {
        categoria = parts[1] || 'Auto Std';
        rawFecha = parts[2] || '';
        rawHora = parts[3] || '00:00';
        origen = parts[4] || 'A definir';
        destino = parts[5] || 'A definir';
        rawPasajeros = parts[6] || '';
        obs = parts.slice(7).join(' ');
      }

      services.push({
        nro_reserva,
        fecha_servicio: formatToISODate(rawFecha),
        hora_servicio: formatToISOTime(rawHora),
        categoria_vehiculo: normalizeCategoria(categoria),
        origen,
        destino,
        origen_2: null,
        destino_2: null,
        vuelo_observacion: obs || null,
        subtotal: 0,
        monto_espera: 0,
        monto_adicionales: 0,
        total: 0,
        pasajeros: parsePasajerosString(rawPasajeros)
      });
    } else if (services.length > 0) {
      // Fila subordinada sin N° Res (2da parada)
      let o2 = '';
      let d2 = '';
      if (parts.length >= 8) {
        o2 = parts[6] || parts[7] || '';
        d2 = parts[7] || parts[8] || '';
      } else if (parts.length >= 2) {
        o2 = parts[0];
        d2 = parts[1];
      }
      if (o2 && d2) {
        const last = services[services.length - 1];
        last.origen_2 = o2;
        last.destino_2 = d2;
      }
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
  let origen_2 = null;
  let destino_2 = null;
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

    if (/(?:ORIGEN\s*2|PARADA\s*2|2DO\s*TRAMO|ORIGEN\s*ADICIONAL)[:\s]*(.+)/i.test(line)) {
      origen_2 = line.replace(/(?:ORIGEN\s*2|PARADA\s*2|2DO\s*TRAMO|ORIGEN\s*ADICIONAL)[:\s]*/i, '').trim();
    } else if (/(?:ORIGEN|DESDE|PICKUP)[:\s]*(.+)/i.test(line)) {
      origen = line.replace(/(?:ORIGEN|DESDE|PICKUP)[:\s]*/i, '').trim();
    }

    if (/(?:DESTINO\s*2|2DO\s*DOMICILIO|DESTINO\s*ADICIONAL)[:\s]*(.+)/i.test(line)) {
      destino_2 = line.replace(/(?:DESTINO\s*2|2DO\s*DOMICILIO|DESTINO\s*ADICIONAL)[:\s]*/i, '').trim();
    } else if (/(?:DESTINO|HASTA|DROPOFF)[:\s]*(.+)/i.test(line)) {
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
    origen_2: origen_2 || null,
    destino_2: destino_2 || null,
    vuelo_observacion: vuelo_observacion || null,
    subtotal: 0,
    monto_espera: 0,
    monto_adicionales: 0,
    total: 0,
    pasajeros: pasajeros.length > 0 ? pasajeros : [{ nombre_completo: 'A DEFINIR', documento_o_referencia: null }]
  };
}

/**
 * Parsea y separa nombres de pasajeros.
 * Soporta delimitadores corporativos: '/', ';', y coma ',' entre nombres completos.
 * Ej: "MARTINEZ CAMILA, LERTORA MICAELA" -> 2 pasajeros
 * Ej: "GIRAUDO DE CEJAS CYNTHIA VANINA, BASBUS CLAUDIO DANIEL" -> 2 pasajeros
 */
function parsePasajerosString(rawPasajeros) {
  if (!rawPasajeros) return [];
  const list = [];

  // Separar primero por slash o punto y coma
  const rawParts = rawPasajeros.split(/\s*[\/;]\s*/);
  const candidateParts = [];

  for (const part of rawParts) {
    // Si contiene coma, verificar si separa nombres completos
    if (part.includes(',')) {
      const subParts = part.split(',').map(s => s.trim()).filter(Boolean);
      // Si tenemos por ejemplo "MARTINEZ CAMILA, LERTORA MICAELA" (ambos tienen 2+ palabras)
      // O si hay múltiples nombres:
      const allMultiWord = subParts.every(sp => sp.split(/\s+/).length >= 2);
      if (allMultiWord && subParts.length >= 2) {
        candidateParts.push(...subParts);
      } else if (subParts.length === 2 && subParts[0].split(/\s+/).length === 1 && subParts[1].split(/\s+/).length === 1) {
        // "APELLIDO, NOMBRE" -> un solo pasajero
        candidateParts.push(`${subParts[0]} ${subParts[1]}`);
      } else {
        // Separación estándar por coma
        candidateParts.push(...subParts);
      }
    } else {
      candidateParts.push(part.trim());
    }
  }

  for (const p of candidateParts) {
    const cleaned = p.trim();
    if (cleaned && cleaned.length > 2 && !/^(ASIGNADO|\d+|AUTO|AUTO STD|UNIDAD)$/i.test(cleaned)) {
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
  parseTabularText,
  parsePasajerosString
};
