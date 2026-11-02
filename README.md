# ✨ Kriativa — Design Studio & Software House

Landing Page oficial da **Kriativa**, estúdio criativo e software house em Brasília focado em Branding, Identidade Visual, UI/UX e Desenvolvimento de Software de alto padrão.

---

## 🚀 Tecnologias

- **HTML5 & CSS3 Moderno** (com CSS Custom Properties e Design Tokens)
- **JavaScript ES6+** (Three.js, Lenis Smooth Scroll)
- **Node.js & Express** (API Backend para integração Stripe)
- **Stripe API** (Payments, Billing, Invoicing, Tax e Portal do Cliente)
- **Nginx Alpine** (Servidor web de alta performance)
- **Docker & Docker Compose** (Containerização pronta para produção)

---

## 🐳 Executando com Docker

### Desenvolvimento / Execução Local ou em Servidor
```bash
# Iniciar o container em segundo plano
docker compose up -d --build

# Parar o container
docker compose down
```

O site estará acessível em `http://localhost` (ou porta configurada via variável `PORT`).

---

## 💳 Integração Stripe

O projeto conta com arquitetura completa de monetização e pagamentos:
- **Billing / Assinaturas Recorrentes:** Planos mensais de suporte (`Kriativa Care`) e squad dedicada (`Kriativa Growth`).
- **Payments / Pagamentos Avulsos:** Entradas de projeto/milestones (50%) e consultorias estratégicas com checkout seguro.
- **Invoicing B2B:** Emissão formal de faturas para empresas com prazo Net 15/30 e nota.
- **Stripe Tax:** Coleta de CPF/CNPJ e conformidade fiscal internacional.
- **Customer Portal:** Autoatendimento para clientes alterarem cartão, cancelarem ou baixarem recibos.

### Endpoints da API (`/api/`)
- `GET /api/plans` — Lista os produtos e preços cadastrados na Stripe.
- `POST /api/create-checkout-session` — Gera sessão de Stripe Checkout com coleta fiscal.
- `POST /api/create-invoice` — Cria e envia faturas B2B formais por e-mail.
- `POST /api/create-portal-session` — Redireciona o cliente para o Customer Portal da Stripe.
- `POST /api/webhook` — Processa confirmações de pagamento e eventos da assinatura em tempo real.

---

## 🌐 Deploy na Hostinger

Para instruções completas passo a passo sobre como implantar na Hostinger via **Docker Manager** ou **VPS SSH**, consulte o guia:
👉 [DOCKER_HOSTINGER.md](./DOCKER_HOSTINGER.md)
