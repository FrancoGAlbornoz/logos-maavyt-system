const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/v1` 
  : '/api/v1';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  // Timeout de 25 segundos para evitar que la petición quede colgada indefinidamente
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 25000);

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
      // Sesión expirada o token inválido: limpiar almacenamiento y emitir evento
      localStorage.removeItem('maavyt_token');
      localStorage.removeItem('maavyt_user');
      window.dispatchEvent(new Event('maavyt_unauthorized'));
      throw new Error('Tu sesión ha expirado o no estás autenticado. Por favor, inicia sesión.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errorData.message || `Error HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('La petición ha superado el tiempo límite de respuesta. Verifica que el servidor backend esté en ejecución.');
    }
    throw err;
  }
}
