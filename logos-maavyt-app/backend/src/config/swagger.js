const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Logos-MAAVYT Manager API',
      version: '1.0.0',
      description: 'API RESTful para la gestión operativa de traslados ejecutivos, ingesta automática desde Gmail, liquidaciones quincenales y reportes en PDF/Excel.',
      contact: {
        name: 'Franco Genaro Albornoz',
        email: 'francog.albornoz17@gmail.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Servidor Local de Desarrollo'
      }
    ],
    components: {
      schemas: {
        Servicio: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nro_reserva: { type: 'string', example: '230309' },
            fecha_servicio: { type: 'string', format: 'date', example: '2026-09-02' },
            hora_servicio: { type: 'string', example: '14:50:00' },
            categoria_vehiculo: { type: 'string', enum: ['Auto Std', 'Auto', 'Ejecutivo', 'Van', 'Minibus'], example: 'Auto Std' },
            origen: { type: 'string', example: 'Aeropuerto TUC' },
            destino: { type: 'string', example: 'Hilton Garden Inn Tucuman' },
            vuelo_observacion: { type: 'string', example: 'AR 1476' },
            estado_servicio: { type: 'string', enum: ['Pendiente', 'Confirmado', 'Realizado', 'No Show', 'Cancelado'], example: 'Confirmado' },
            subtotal: { type: 'number', example: 25417.00 },
            monto_espera: { type: 'number', example: 4000.00 },
            monto_adicionales: { type: 'number', example: 0.00 },
            total: { type: 'number', example: 29417.00 },
            deleted_at: { type: 'string', nullable: true, example: null }
          }
        },
        Pasajero: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            servicio_id: { type: 'integer', example: 1 },
            nombre_completo: { type: 'string', example: 'TORRES DIEGO' },
            documento_o_referencia: { type: 'string', example: '48704300' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('[Swagger] Documentación OpenAPI disponible en http://localhost:3001/api-docs');
}

module.exports = setupSwagger;
