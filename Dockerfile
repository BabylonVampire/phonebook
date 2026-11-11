# ---------- сборка клиента (Vite + React) и сервера (NestJS) ----------
FROM node:22.12-alpine AS build
WORKDIR /app
COPY server/package.json server/package-lock.json server/
COPY client/package.json client/package-lock.json client/
RUN npm ci --prefix server && npm ci --prefix client
COPY server server
COPY client client
RUN npm run build --prefix server && npm run build --prefix client

# ---------- итоговый образ: только сервер, он же раздаёт собранный клиент ----------
FROM node:22.12-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json server/package-lock.json server/
RUN npm ci --omit=dev --prefix server && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
WORKDIR /app/server
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
