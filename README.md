# Módulo de Assinatura Digital — Relatórios de Despesa

Trabalho **N2 – Segurança da Informação** (Católica de Santa Catarina). Módulo que permite a funcionários
submeter relatórios de despesa com recibos, ao gerente validá-los, ao funcionário **assiná-los digitalmente** e ao
gerente **verificar** a autenticidade das assinaturas.

**Stack:** Node.js + Express (API) · MongoDB · Next.js + Material-UI + Tailwind (frontend) · Docker · JWT · Helmet · Nodemailer · Web Crypto API / Node Crypto.

## Como executar (Docker)

```bash
cp .env.example .env        # troque TODAS as senhas e o JWT_SECRET (openssl rand -hex 32)
docker compose up --build
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api/health |
| E-mails (MailHog) | http://localhost:8025 |

O primeiro **gerente** é criado automaticamente com `SEED_MANAGER_EMAIL` / `SEED_MANAGER_PASSWORD`. Depois, cadastre
funcionários em **Funcionários**.

> A Web Crypto API só funciona em contexto seguro: `https://` ou `http://localhost`.

### Sem Docker
```bash
cd backend  && npm install && JWT_SECRET=... MONGODB_URI=... SEED_MANAGER_EMAIL=... SEED_MANAGER_PASSWORD=... UPLOAD_DIR=./uploads npm start
cd frontend && npm install && npm run dev      # http://localhost:3000
cd backend  && npm test                         # teste de interoperabilidade da assinatura
```

## Fluxo de negócio

```
Funcionário                         Gerente                          Funcionário                     Gerente
submitExpense  ──► SUBMETIDA ──►  pendingExpenses/validateExpense ──► VALIDADA ──► signExpense ──► ASSINADA ──► signedExpenses/verifySignature
 (recibos + e-mail ao gerente)    (aprova/rejeita + e-mail)                     (chave privada no navegador)       (6 verificações + Web Crypto)
```

## Mapa do enunciado → entregáveis

| Item do PDF | Onde está |
|---|---|
| 1. Docker com políticas de segurança | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` (não-root, `read_only`, `cap_drop: ALL`, `no-new-privileges`, limites, rede interna, Mongo com `--auth` e sem porta publicada) |
| 2. Banco (MongoDB / nuvem) | `backend/src/models/` (User, Expense, AuditLog). Para nuvem, defina `MONGODB_URI` do **MongoDB Atlas** e remova o serviço `mongo` |
| 3. Frontend React/Next.js, MUI + Tailwind | `frontend/` (MUI nos componentes, Tailwind no layout; `preflight` desligado para não conflitar) |
| 4. Backend Node/Express + JWT | `backend/src/routes/`, `middleware/auth.js` (JWT HS256, expiração, bloqueio após 5 falhas) |
| 5. Criptografia (Node Crypto + Web Crypto) | `frontend/lib/crypto.js` (gera chave e assina), `backend/src/services/crypto.js` (verifica) |
| 6. Segurança (SQL/NoSQL, XSS, CSRF, Helmet, HTTPS) | tabela abaixo; `.github/workflows/deploy.yml` publica no GH Pages |
| 7. Páginas mínimas | `frontend/pages/`: `login`, `dashboard`, `employees`, `submitExpense`, `pendingExpenses`, `validateExpense`, `signExpense`, `signedExpenses`, `verifySignature` |
| 7. Notificação por e-mail (Nodemailer) | `backend/src/services/mailer.js` — envia ao submeter, validar/rejeitar, assinar e criar conta |

## Como a assinatura garante autenticidade, integridade e não repúdio

1. **Chave:** em `signExpense`, o navegador gera um par **ECDSA P-256** com a Web Crypto API. A chave **privada é não extraível**
   e fica no IndexedDB; só a **pública** (SPKI) vai ao servidor, após reconfirmar a senha. Chaves antigas são revogadas, nunca apagadas.
2. **Documento canônico:** o servidor monta um JSON determinístico (id, autor, título, valor, data, **hash SHA-256 de cada recibo**, validador e data da validação). O usuário vê esses dados e o hash antes de assinar.
3. **Assinatura:** o navegador assina o documento (ECDSA + SHA-256). O servidor **recalcula** o documento, verifica a assinatura com a chave pública (Node Crypto) e grava: assinatura, chave usada, documento assinado, hash, data/hora e IP.
4. **Verificação (gerente):** seis checagens — assinatura válida; chave pertence ao signatário; chave válida na data; hash confere; **dados não alterados depois da assinatura**; **recibos intactos** — mais uma conferência independente no navegador com a Web Crypto API.

- **Autenticidade:** só quem possui a chave privada produz uma assinatura que a chave pública registrada valida.
- **Integridade:** qualquer mudança nos dados ou nos recibos altera o hash e a verificação falha.
- **Não repúdio:** a chave privada nunca sai do navegador do autor; a chave pública fica vinculada à conta, com trilha de auditoria (`AuditLog`).

### Enquadramento na legislação brasileira
O módulo implementa **assinatura eletrônica avançada** (Lei 14.063/2020, art. 4º, II): identifica o signatário, usa dado sob seu controle
exclusivo e detecta alterações posteriores. A MP 2.200-2/2001 reconhece a validade de documentos eletrônicos assinados por outros meios
quando as partes aceitam (art. 10, §2º). Para o nível **qualificado** (equivalente à assinatura de próprio punho), seria necessário
certificado **ICP-Brasil** e carimbo do tempo de uma Autoridade de Carimbo do Tempo — veja "Limitações".

## Medidas de segurança implementadas

| Ameaça | Proteção |
|---|---|
| Senhas | bcrypt (custo 12), política de senha forte, resposta de login com tempo igualado, bloqueio de 15 min após 5 falhas, rate limit |
| Injeção (SQL/NoSQL) | MongoDB via Mongoose (sem concatenar consultas), `express-mongo-sanitize`, validação de tipos com Zod, `hpp` |
| XSS | React escapa a saída; entradas de texto passam por `xss` (sem tags); CSP no nginx e na API |
| CSRF | JWT em cabeçalho `Authorization` (não em cookie), CORS com lista de origens, verificação de `Origin` e cabeçalho `X-Requested-With` em métodos que alteram estado |
| Cabeçalhos HTTP | Helmet (HSTS, nosniff, frame-ancestors, referrer-policy, CSP) e cabeçalhos equivalentes no nginx |
| Upload | só PDF/JPG/PNG, 5 MB, 5 arquivos, conferência dos bytes iniciais do arquivo, nome aleatório no disco, hash SHA-256 |
| Controle de acesso | perfis `gerente` / `funcionario`; funcionário só enxerga suas despesas; gerente não valida a própria (segregação de funções) |
| Transporte | HTTPS/TLS no GitHub Pages (e na hospedagem da API) |

## Publicação no GitHub Pages (HTTPS)

O GitHub Pages hospeda só arquivos estáticos, então o **frontend** vai para lá e a **API** precisa de outro host com HTTPS
(Render, Railway, Fly.io…) apontando para o MongoDB Atlas.

1. Suba o projeto para um repositório no GitHub (branch `main`).
2. *Settings → Pages → Source:* **GitHub Actions**; marque **Enforce HTTPS**.
3. *Settings → Secrets and variables → Actions → Variables:* crie `API_URL` = `https://sua-api.exemplo.com/api`.
4. Na API, defina `CORS_ORIGINS=https://SEU_USUARIO.github.io` e `APP_URL=https://SEU_USUARIO.github.io/NOME_DO_REPO`.
5. Faça `git push`; o workflow `.github/workflows/deploy.yml` compila e publica.

## Limitações e próximos passos
- A chave privada vive em um navegador; perder o navegador exige registrar nova chave (a anterior é revogada, assinaturas antigas continuam verificáveis).
- A data da assinatura é do servidor; para valor legal pleno, usar carimbo do tempo ICP-Brasil e certificados ICP-Brasil.
- No GitHub Pages não é possível definir cabeçalhos HTTP (CSP/HSTS) do frontend; a imagem nginx do compose os define.
- Sugestões: 2FA no login, antivírus nos uploads, armazenamento de recibos em bucket privado, `npm audit` no CI.
