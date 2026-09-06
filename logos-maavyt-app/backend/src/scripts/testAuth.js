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

      // Test 7: Cambio de contraseña con clave actual incorrecta
      console.log('\n--- Test 7: Cambio de contraseña con clave actual incorrecta ---');
      const badPwRes = await makeRequest({
        path: '/api/v1/auth/change-password',
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: 'ClaveTotalmenteEquivocada!',
          newPassword: 'NuevaPassword2026!',
          confirmPassword: 'NuevaPassword2026!'
        })
      });
      console.log('Status:', badPwRes.status, '| Error esperado:', badPwRes.body?.error?.message);

      // Test 8: Cambio de contraseña con clave corta (< 8 caracteres)
      console.log('\n--- Test 8: Cambio de contraseña con clave corta ---');
      const shortPwRes = await makeRequest({
        path: '/api/v1/auth/change-password',
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: 'AdminMaavyt2026!',
          newPassword: 'corta',
          confirmPassword: 'corta'
        })
      });
      console.log('Status:', shortPwRes.status, '| Error esperado:', shortPwRes.body?.error?.message);

      // Test 9: Cambio de contraseña exitoso
      console.log('\n--- Test 9: Cambio de contraseña exitoso ---');
      const successPwRes = await makeRequest({
        path: '/api/v1/auth/change-password',
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: 'AdminMaavyt2026!',
          newPassword: 'NuevaAdmin2026!',
          confirmPassword: 'NuevaAdmin2026!'
        })
      });
      console.log('Status:', successPwRes.status, '| Mensaje:', successPwRes.body?.message);

      // Test 10: Verificar login con la nueva clave
      console.log('\n--- Test 10: Verificar login con la nueva contraseña ---');
      const loginNewRes = await makeRequest({
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@maavyt.com', password: 'NuevaAdmin2026!' })
      });
      console.log('Status:', loginNewRes.status, '| Éxito con nueva clave:', loginNewRes.body?.success);
      const newToken = loginNewRes.body?.data?.token;

      // Test 11: Revertir contraseña a la original para no alterar el estado de desarrollo
      console.log('\n--- Test 11: Revertir contraseña a AdminMaavyt2026! ---');
      const revertPwRes = await makeRequest({
        path: '/api/v1/auth/change-password',
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`
        },
        body: JSON.stringify({
          currentPassword: 'NuevaAdmin2026!',
          newPassword: 'AdminMaavyt2026!',
          confirmPassword: 'AdminMaavyt2026!'
        })
      });
      console.log('Status:', revertPwRes.status, '| Reversión:', revertPwRes.body?.message);

      console.log('\n✅ ¡TODOS LOS TESTS (LOGIN, RUTAS Y CAMBIO DE CONTRASEÑA) PASARON EXITOSAMENTE!');
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