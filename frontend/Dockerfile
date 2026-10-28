FROM node:26.12.1-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} NEXT_TELEMETRY_DISABLED=1
RUN mkdir -p public && npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:26.12.1-alpine AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /app/.next .next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/next.config.js ./
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
USER node
COPY --from=build /app/public ./public
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "const r=require('http').get('http://127.0.0.1:3000',s=>{s.resume();process.exit(s.statusCode===200?0:1)});r.setTimeout(3000,()=>{r.destroy();process.exit(1)});r.on('error',()=>process.exit(1))"
CMD ["npm", "run", "start"]
