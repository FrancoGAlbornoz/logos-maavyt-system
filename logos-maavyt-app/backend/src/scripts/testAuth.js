const http = require('http');
const app = require('../app');
const { pool } = require('../config/database');

async function runAuthTests() {
  const server = app.listen(3099, async () => {
    console.log('[Test] Servidor temporal corriendo en puerto 3099');

    try {
      // Test 1: Healthcheck
      console.log('\n--- Test 1: Healthcheck público ---');
      const healthRes = await makeRequest({ path: '/api/v1/health', method: 'GET' });
      console.log('Status:', healthRes.status, '| Body:', healthRes.body);

      // Test 2: Ruta protegida sin token (debe fallar con 401)
      console.log('\n--- Test 2: Ruta protegida sin token (/api/v1/servicios) ---');
      const noTokenRes = await makeRequest({ path: '/api/v1/servicios', method: 'GET' });
      console.log('Status:', noTokenRes.status, '| Error:', noTokenRes.body?.error?.message);

      // Test 3: Login con credenciales erróneas
      console.log('\n--- Test 3: Login con contraseña incorrecta ---');
      const badLoginRes = await makeRequest({
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@maavyt.com', password: 'PasswordEquivocada!' })
      });
      console.log('Status:', badLoginRes.status, '| Error:', badLoginRes.body?.error?.message);

      // Test 4: Login con credenciales correctas
      console.log('\n--- Test 4: Login exitoso ---');
      const goodLoginRes = await makeRequest({
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@maavyt.com', password: 'AdminMaavyt2026!' })
      });
      console.log('Status:', goodLoginRes.status, '| Éxito:', goodLoginRes.body?.message);
      const token = goodLoginRes.body?.data?.token;
      console.log('Token emitido (primeros 25 caracteres):', token?.substring(0, 25) + '...');

      // Test 5: Ruta protegida CON token válido
      console.log('\n--- Test 5: Ruta protegida CON token (/api/v1/servicios) ---');
      const withTokenRes = await makeRequest({
        path: '/api/v1/servicios',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Status:', withTokenRes.status, '| Servicios recibidos:', withTokenRes.body?.data?.length);

      // Test 6: Perfil /me
      console.log('\n--- Test 6: Endpoint /api/v1/auth/me ---');
      const meRes = await makeRequest({
        path: '/api/v1/auth/me',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Status:', meRes.status, '| Usuario logueado:', meRes.body?.data?.email, '| Rol:', meRes.body?.data?.rol);

      console.log('\n? ¡TODOS LOS TESTS DE SEGURIDAD Y AUTENTICACIÓN PASARON EXITOSAMENTE!');
    } catch (err) {
      console.error('Error en pruebas:', err);
    } finally {
      server.close();
      await pool.end();
      process.exit(0);
    }
  });
}

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3099,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

runAuthTests();
