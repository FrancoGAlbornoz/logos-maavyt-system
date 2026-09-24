// script to rewrite parseTabularText
const fs = require('fs');

const path = './src/services/textParserService.js';
let content = fs.readFileSync(path, 'utf8');

const tabularTextFunctionMatch = content.match(/function parseTabularText\(rawText\) \{[\s\S]*?\n\s*\n\s*return services;\n\}/);

if (!tabularTextFunctionMatch) {
  console.log("Could not find parseTabularText");
  process.exit(1);
}

const oldFunc = tabularTextFunctionMatch[0];

const newFunc = `function parseTabularText(rawText) {
  const lines = rawText.split('\\n').map(l => l.trim()).filter(Boolean);
  const services = [];
  
  let headerMap = null;

  for (const line of lines) {
    const parts = line.split(/\\t+|\\s{2,}/);
    if (parts.length < 2) continue;

    const isHeader = parts.some(p => /n(?:ro|°|º|\\.)?\\s*res|rva|categ|origen|destino|pasajero/i.test(p));
    if (isHeader && !headerMap) {
      headerMap = {
        nro_reserva: parts.findIndex(c => /n(?:ro|°|º|\\.)?\\s*(?:res|rva)|reserva/i.test(c)),
        categoria: parts.findIndex(c => /categ|veh[ií]culo|unidad/i.test(c)),
        fecha: parts.findIndex(c => /fecha/i.test(c)),
        hora: parts.findIndex(c => /hora|hs/i.test(c)),
        origen: parts.findIndex(c => /origen|desde/i.test(c)),
        destino: parts.findIndex(c => /destino|hasta/i.test(c)),
        pasajeros: parts.findIndex(c => /pasajero|pax/i.test(c) && !/cant/i.test(c)),
        observacion: parts.findIndex(c => /observaci|vuelo|obs/i.test(c))
      };
      continue;
    }

    let nro_reserva = '';
    let categoria = 'Auto Std';
    let rawFecha = '';
    let rawHora = '00:00';
    let origen = 'A definir';
    let destino = 'A definir';
    let rawPasajeros = '';
    let obs = '';

    if (headerMap && headerMap.nro_reserva !== -1 && headerMap.origen !== -1) {
      const resVal = parts[headerMap.nro_reserva] || '';
      const m = resVal.match(/\\b\\d{5,7}(?:-[A-Z0-9]+)?\\b/);
      if (m) nro_reserva = m[0];
      
      if (nro_reserva) {
        if (headerMap.categoria !== -1) categoria = parts[headerMap.categoria];
        if (headerMap.fecha !== -1) rawFecha = parts[headerMap.fecha];
        if (headerMap.hora !== -1) rawHora = parts[headerMap.hora];
        if (headerMap.origen !== -1) origen = parts[headerMap.origen];
        if (headerMap.destino !== -1) destino = parts[headerMap.destino];
        if (headerMap.pasajeros !== -1) rawPasajeros = parts[headerMap.pasajeros];
        if (headerMap.observacion !== -1) obs = parts[headerMap.observacion];
      }
    } else {
      const resMatch = parts[0].match(/\\b\\d{5,7}(?:-[A-Z0-9]+)?\\b/);
      if (resMatch) {
        nro_reserva = resMatch[0];
        if (parts.length >= 10) {
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
      } else if (services.length > 0) {
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
        continue;
      }
    }

    if (nro_reserva) {
      services.push({
        nro_reserva,
        fecha_servicio: formatToISODate(rawFecha),
        hora_servicio: formatToISOTime(rawHora),
        categoria_vehiculo: normalizeCategoria(categoria || 'Auto Std'),
        origen: origen || 'A definir',
        destino: destino || 'A definir',
        origen_2: null,
        destino_2: null,
        vuelo_observacion: obs || null,
        subtotal: 0,
        monto_espera: 0,
        monto_adicionales: 0,
        total: 0,
        pasajeros: parsePasajerosString(rawPasajeros)
      });
    }
  }

  if (services.length === 0) {
    let i = 0;
    while (i < lines.length) {
      const m = lines[i].match(/^\\b(\\d{5,7}(?:-[A-Z0-9]+)?)\\b$/);
      if (m && i + 5 < lines.length) {
        const nro_reserva = m[1];
        let offset = 1;
        let categoria = 'Auto Std';
        if (i + offset < lines.length && /(?:Auto|Van|Minibus|Ejecutivo)/i.test(lines[i + offset])) {
          categoria = lines[i + offset];
          offset++;
        }
        let rawFecha = '';
        if (i + offset < lines.length && /\\d{1,2}[\\/\\.-]\\d{1,2}[\\/\\.-]\\d{2,4}/.test(lines[i + offset])) {
          rawFecha = lines[i + offset];
          offset++;
        }
        let rawHora = '00:00';
        if (i + offset < lines.length && /\\d{1,2}:\\d{2}/.test(lines[i + offset])) {
          rawHora = lines[i + offset];
          offset++;
        }
        const origen = lines[i + offset] || 'A definir';
        offset++;
        const destino = lines[i + offset] || 'A definir';
        offset++;
        const rawPasajeros = lines[i + offset] || '';
        offset++;
        let obs = '';
        if (i + offset < lines.length && !/^\\d{5,7}\\b/.test(lines[i + offset]) && !/SOLICITUD|CONFIRMACION|SALUDOS/i.test(lines[i + offset])) {
          obs = lines[i + offset];
          offset++;
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

        i += offset;
        continue;
      }
      i++;
    }
  }

  return services;
}`;

content = content.replace(oldFunc, newFunc);
fs.writeFileSync(path, content, 'utf8');
console.log("Updated parseTabularText");
