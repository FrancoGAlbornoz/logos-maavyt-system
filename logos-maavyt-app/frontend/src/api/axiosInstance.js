const API_BASE = '/api/v1';

export async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  // Timeout de 25 segundos para evitar que la petición quede colgada indefinidamente
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 25000);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: controller.signal,
      ...options
    });

    clearTimeout(timeoutId);

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
