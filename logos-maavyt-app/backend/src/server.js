const app = require('./app');
const { checkConnection } = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

async function startServer() {
  await checkConnection();
  
  app.listen(PORT, () => {
    console.log(`[Server] Logos-MAAVYT Backend corriendo en el puerto ${PORT}`);
    console.log(`[Server] Healthcheck: http://localhost:${PORT}/api/v1/health`);
  });
}

startServer();
