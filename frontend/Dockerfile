# Estágio 1: gera o site estático
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ARG NEXT_PUBLIC_BASE_PATH=
ARG API_ORIGIN=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH NEXT_TELEMETRY_DISABLED=1
RUN npm run build && sed "s|__API_ORIGIN__|${API_ORIGIN}|g" nginx.conf.tpl > nginx.conf

# Estágio 2: servidor web não-root (nginx) com cabeçalhos de segurança
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 8080
