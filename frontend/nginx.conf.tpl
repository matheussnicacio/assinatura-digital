server {
  listen 8080;
  server_name _;
  server_tokens off;
  root /usr/share/nginx/html;
  index index.html;

  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "DENY" always;
  add_header Referrer-Policy "no-referrer" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' __API_ORIGIN__; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
  # Em produção com TLS no próprio nginx, acrescente:
  # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

  location / {
    try_files $uri $uri/ $uri.html /index.html;
  }
}
