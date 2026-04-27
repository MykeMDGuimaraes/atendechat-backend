# Backlog — atendechat-backend

Ordenado por prioridade. Cada item já está num formato pronto para virar
issue no GitHub.

Legenda: **P0** = segurança crítica (faça hoje); **P1** = estabilidade
ou UX importante; **P2** = polimento / dívida técnica.

---

## P0 — Segurança

### [P0] Fail-fast quando JWT_SECRET / JWT_REFRESH_SECRET não estiverem setadas

**Onde:** `src/config/auth.ts`

```ts
secret: process.env.JWT_SECRET || "mysecret",
refreshSecret: process.env.JWT_REFRESH_SECRET || "myanothersecret",
```

O fallback `"mysecret"` / `"myanothersecret"` é PÚBLICO no GitHub. Se as
envs não estiverem setadas no EasyPanel, qualquer pessoa forja tokens
válidos e entra como qualquer usuário.

**Aceite:**
- [ ] Em produção, ausência de `JWT_SECRET` ou `JWT_REFRESH_SECRET` faz
      o processo falhar no boot com mensagem clara
- [ ] Em desenvolvimento (`NODE_ENV !== production`), mantém um fallback
      de DEV gerado randomicamente a cada boot ou exige set explícito
- [ ] Documentar no `.env.example`

---

### [P0] Adicionar rate-limit em /auth/*

**Onde:** `src/app.ts` + nova rota `routes.use("/auth", limiter, authRoutes)`

Hoje `/auth/login` aceita brute-force ilimitado. As mensagens de erro
diferentes (`ERR_USER_DONT_EXISTS` vs `ERR_INVALID_CREDENTIALS`) também
permitem enumerar e-mails válidos.

**Aceite:**
- [ ] `express-rate-limit` instalado
- [ ] `/auth/login`, `/auth/signup`, `/auth/refresh_token`,
      `/auth/forgot-password` limitados a, p.ex., 5 req / 15 min por IP
- [ ] Unificar erro de login para `ERR_INVALID_CREDENTIALS` (não vazar
      se o e-mail existe)
- [ ] Headers `RateLimit-*` e status `429` quando estourar

---

### [P0] Restringir CORS do Socket.IO

**Onde:** `src/libs/socket.ts:17`

```ts
io = new SocketIO(httpServer, {
  cors: { origin: "*", credentials: true, ... }
});
```

`origin: "*"` + `credentials: true` é combinação inválida pela spec CORS
e expõe o socket a qualquer origem.

**Aceite:**
- [ ] `origin: process.env.FRONTEND_URL` (igual ao Express)
- [ ] Aceitar lista de origens via env (`FRONTEND_URLS=...`) se houver
      múltiplos clientes

---

## P1 — Estabilidade & UX

### ~~[P1] Endpoint `/health` para liveness/readiness~~ ✅ DONE

**Onde:** `src/routes/healthRoutes.ts` (novo) + registro em `src/routes/index.ts`

**Entregue:**
- [x] `GET /health` retorna `200 { ok, service, version, env, uptime_s, timestamp }`
- [x] `GET /health/db` valida `SELECT 1` no Sequelize, retorna 200 se up,
      503 se down, com `latency_ms` em ambos casos
- [x] Documentado neste backlog
- [x] Comentário no `routes/index.ts` explicando posição (antes das
      outras rotas, sem auth)

---

### [P1] Validar payload no POST /auth/login (devolver 400 ao invés de 500)

**Onde:** `src/controllers/SessionController.ts:11`

`req.body` undefined / sem campos vai cair no service e estourar 500.
Devia ser 400 com mensagem de validação.

**Aceite:**
- [ ] Validação Yup ou Joi de `email` (string, format) e `password`
      (string, length >= 1) antes de chamar o service
- [ ] Resposta `400 { error: "ERR_VALIDATION_FAILED", details: [...] }`
- [ ] Não polui mais o Sentry com 500 espúrios

---

### [P1] Aumentar `expiresIn` do access token (15m → 1h ou 2h)

**Onde:** `src/config/auth.ts:3`

15 minutos gera muito 403 → refresh round-trip. Refresh token continua
em cookie httpOnly de 7 dias, então o trade-off de segurança é
pequeno.

**Aceite:**
- [ ] `expiresIn: "1h"` (ou justificar outra escolha)
- [ ] Frontend continua tratando 403 como "tentar refresh", como hoje

---

### [P1] StartAllWhatsAppsSessions não-bloqueante no boot

**Onde:** `src/server.ts:11-23`

Hoje o `server.listen` faz `await Company.findAll()` + dispara
`StartAllWhatsAppsSessions` para todas no callback. Em uma instância
com várias companies + WhatsApp/Baileys + Puppeteer, o cold-start trava
a porta por minutos. Liveness probe falha durante esse tempo.

**Aceite:**
- [ ] Server passa a aceitar conexões assim que `listen` resolver
- [ ] StartAllWhatsAppsSessions roda em background (`setImmediate` ou
      `Promise.resolve().then(...)`) com log de progresso
- [ ] /health responde 200 antes de todos os WhatsApps subirem

---

### ~~[P1] Remover `routes.use(messageRoutes)` duplicado~~ ✅ DONE

**Onde:** `src/routes/index.ts`

Linha duplicada removida no mesmo PR do `/health`.

**Entregue:**
- [x] Linha duplicada removida
- [ ] Smoke test pós-deploy: GET /messages, POST /messages continuam
      respondendo (verificar após o próximo build)

---

### [P1] `maxAge` no cookie `jrt` alinhado com refresh JWT

**Onde:** `src/helpers/SendRefreshToken.ts` (já editado para SameSite=None)

Sem `maxAge`/`expires`, o cookie é "session cookie" — some quando
fecha o browser. UX ruim para "manter logado".

**Aceite:**
- [ ] Adicionar `maxAge: 7 * 24 * 60 * 60 * 1000` ao buildJrtCookieOptions
- [ ] Refresh JWT continua expirando em 7d (já configurado em
      `authConfig.refreshExpiresIn`)

---

## P2 — Polimento & dívida técnica

### [P2] Helmet (security headers)

**Onde:** `src/app.ts`

`X-Frame-Options`, `X-Content-Type-Options`, CSP, etc. Para um app
multi-tenant com PII e financeiro, é o mínimo.

**Aceite:**
- [ ] `helmet` instalado e plugado em `app.use()` antes das rotas
- [ ] CSP avaliado caso a caso (pode exigir relaxar para iframes)

---

### [P2] Cobertura mínima de testes em /auth/*

**Onde:** `src/__tests__/`

Já existe esqueleto Jest, mas só `authMe.spec.ts`. Casos críticos sem
cobertura.

**Aceite:**
- [ ] Test: login feliz retorna 200 + token + Set-Cookie com
      `SameSite=None; Secure` em prod
- [ ] Test: login com payload inválido retorna 400
- [ ] Test: refresh sem cookie retorna 401
- [ ] Test: refresh com cookie válido renova e devolve novo token
- [ ] Test: logout limpa cookie

---

### [P2] Auditar `npm audit` (201 vulnerabilidades reportadas no build atual)

**Onde:** `package.json` / `package-lock.json`

Maioria são transitivas, várias bibliotecas legadas. Triagem
necessária.

**Aceite:**
- [ ] Atualizar dependências de baixo risco (patch + minor)
- [ ] Documentar as transitivas que NÃO podem subir e o porquê
- [ ] Considerar trocar `request` (deprecated) por `axios` ou `fetch`
