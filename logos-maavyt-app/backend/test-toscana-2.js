const { parseVoucherText } = require('./src/services/textParserService');

const text = `File	Nro Rva	Fecha	Hora	Pax	Cant	Origen	Destino	Categoria	Observaciones
NEG 273992	124611	25/09/26	05:00	Constanza Maria (VIP) PASTERIS	1	Tucuman	Aeropuerto Tucuman AR 1469 07:55	Tradicional	PAX VIP!
NEG 273992	124612	05/10/26	10:30	Constanza Maria (VIP) PASTERIS	1	Aeropuerto Tucuman AR 1472 10:30	Tucuman	Tradicional	PAX VIP!`;

console.log(JSON.stringify(parseVoucherText(text, ''), null, 2));
