# ==========================================
# Logos-MAAVYT Backend API - Dockerfile de Produccion
# Base: Node.js 20 Alpine (ultra liviana y segura)
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Herramientas para healthcheck
RUN apk add --no-cache wget

# Copiar definiciones de dependencias
COPY package*.json ./

# Instalar dependencias estrictas de produccion
RUN npm ci --only=production

# Copiar codigo fuente y datos
COPY . .

# Seguridad: cambiar propiedad a usuario 'node' sin privilegios
RUN chown -R node:node /app
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health || exit 1

CMD ["node", "src/server.js"]
