# ====== Etapa de Construcción ======
FROM node:20-alpine AS builder

# Instala dependencias necesarias para compilar en Alpine (opcional, pero buena práctica por dependencias como html-to-image/canvas/PUPPETEER etc si aplicaran de fondo)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copia los archivos de manifiesto de dependencias 
# y la info de versionamiento
COPY package.json package-lock.json* ./

# Instala las dependencias y desactiva las auditorías para acelerar el proceso
RUN npm ci

# Copia el código fuente completo del proyecto
COPY . .

# Ejecuta el build de Astro en Node SSR mode
RUN npm run build

# Opcional: Elimina devDependencies si usaste `npm install` normal y quieres reducir peso. 
# Como usamos npm ci, podemos hacer un prune para solo dejar pre-reqs de producion
RUN npm prune --production

# ====== Etapa de Producción ======
FROM node:20-alpine AS runner

WORKDIR /app

# Se define el entorno de producción oficial
ENV NODE_ENV=production
# Dokploy expone por defecto el puerto 3000
ENV PORT=3000
# El host se debe atar a todas las interfaces
ENV HOST=0.0.0.0

# Copia las dependencias de producción ya parseadas desde la fase builder
COPY --from=builder /app/node_modules ./node_modules
# Copia los assets generados y el manifest SSR de Astro
COPY --from=builder /app/dist ./dist
# Copia las keys, si hay
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Comando para lanzar de manera aislada el servidor compilado pre-renderizado Node de Astro
CMD ["node", "./dist/server/entry.mjs"]
