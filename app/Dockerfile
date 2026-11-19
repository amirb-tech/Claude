# Cueline: one Node process serving the API, media and the built app.
# Needs a persistent volume mounted at /data for the SQLite database.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx vite build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install --no-save tsx@4.19.2
COPY --from=build /app/dist ./dist
COPY server ./server
# media/ (audio + covers) is generated or uploaded separately and mounted or copied in at deploy
COPY media ./media
EXPOSE 8080
CMD ["sh", "-c", "node --import tsx server/seed.ts && exec node --import tsx server/index.ts"]
