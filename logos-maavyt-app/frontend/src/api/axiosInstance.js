const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1` 
  : '/api/v1';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  // Timeout configurable: 60s por defecto, o el especificado en options.timeout (ej. 180s para Gmail Sync)
  const controller = new AbortController();
  const timeoutMs = options.timeout || 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Inyectar Token JWT si existe en localStorage
  const token = localStorage.getItem('maavyt_token');
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      },
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      // Sesion expirada o token invalido: limpiar almacenamiento y emitir evento
      localStorage.removeItem('maavyt_token');
      localStorage.removeItem('maavyt_user');
      window.dispatchEvent(new Event('maavyt_unauthorized'));
      throw new Error('Tu sesion ha expirado o no estas autenticado. Por favor, inicia sesion.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errorData.message || `Error HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`La peticion ha superado el tiempo limite (${Math.round(timeoutMs / 1000)}s). Si estas sincronizando Gmail con muchos correos, el servidor sigue procesando en segundo plano.`);
    }
    throw err;
  }
}