
const { parseVoucherText } = require('./src/services/textParserService');

const text = \File	Nro Rva	Fecha	Hora	Pax	Cant	Origen	Destino	Categoría	Observaciones
NEG 273992	124611	25/09/26	05:00	Constanza Maria (VIP) PASTERIS	1	Tucumán	Aeropuerto Tucumán AR 1469 07:55	Tradicional	PAX VIP! - Country El Nogal, Cristóbal Colón, Yerba Buena, Prov. Tucumán (CP 4107)
NEG 273992	124612	05/10/26	10:30	Constanza Maria (VIP) PASTERIS	1	Aeropuerto Tucumán AR 1472 10:30	Tucumán	Tradicional	PAX VIP! - · Country El Nogal, Cristóbal Colón, Yerba Buena, Prov. Tucumán (CP 4107)\;

console.log(JSON.stringify(parseVoucherText(text, ''), null, 2));

