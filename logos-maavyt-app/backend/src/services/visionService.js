const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Procesa una imagen adjunta utilizando la API de Google Gemini
 * y devuelve las reservas en formato estándar.
 */
async function parseImageWithGemini(imageBuffer, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Vision Service] GEMINI_API_KEY no configurada. Saltando procesamiento de imagen.");
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

    const prompt = `Extrae las reservas de traslados de la tabla presente en esta imagen y devuélvelas estrictamente en formato JSON válido.
El formato debe ser un array de objetos con esta estructura exacta:
[
  {
    "nro_reserva": "123456",
    "fecha_servicio": "2026-10-05", (en formato YYYY-MM-DD, convierte si es necesario, asume el año de la fecha o del texto si está disponible, o el año actual/próximo)
    "hora_servicio": "10:30:00", (formato HH:MM:SS)
    "categoria_vehiculo": "Auto Std", (por defecto 'Auto Std' si está vacío)
    "origen": "Lugar origen",
    "destino": "Lugar destino",
    "origen_2": null,
    "destino_2": null,
    "vuelo_observacion": "",
    "subtotal": 0,
    "monto_espera": 0,
    "monto_adicionales": 0,
    "total": 0,
    "pasajeros": [
      {
        "nombre_completo": "Nombre del pasajero",
        "documento_o_referencia": null
      }
    ]
  }
]
Si una celda está vacía o no existe, usa valores por defecto como 'A definir'.
Es muy importante que devuelvas SOLO el JSON, sin bloques de código en markdown (sin \`\`\`json) y sin texto adicional.`;

    const imageParts = [
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType
        }
      }
    ];

    console.log("[Vision Service] Solicitando extracción de tabla a Gemini...");
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response.text();
    
    // Limpieza por si Gemini incluye formato markdown
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    const parsedData = JSON.parse(text);
    return Array.isArray(parsedData) ? parsedData : [];
  } catch (err) {
    console.error("[Vision Service] Error al procesar imagen con Gemini:", err.message);
    return [];
  }
}

module.exports = {
  parseImageWithGemini
};
