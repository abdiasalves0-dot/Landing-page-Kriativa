# 🚀 Guia de Implantação Docker na Hostinger — Kriativa

Este repositório está 100% configurado com suporte a **Docker** e **Docker Compose** usando uma imagem ultra-leve e otimizada de **Nginx Alpine** (~15MB), pronta para implantação com 1 clique na Hostinger.

---

## 📁 Arquivos Docker inclusos:
- **`Dockerfile`**: Imagem Nginx Alpine com healthcheck e cópia dos assets estáticos.
- **`nginx.conf`**: Configuração com compressão Gzip, cabeçalhos de segurança (X-Frame-Options, XSS, etc.) e cache para CSS/JS/Imagens/Fontes.
- **`docker-compose.yml`**: Orquestrador pronto para subir o container na porta 80 (ou porta customizada via variável `$PORT`).
- **`.dockerignore`**: Exclui arquivos desnecessários do build do container, mantendo a imagem enxuta e rápida.

---

## 🛠️ Como criar a aplicação na Hostinger

Existem duas formas principais na Hostinger, dependendo do seu plano:

### Opção 1: Via Gerenciador Docker do Painel Hostinger (hPanel / VPS)
1. Acesse o **hPanel** da Hostinger ([hpanel.hostinger.com](https://hpanel.hostinger.com)).
2. Vá em **VPS** > Selecione o seu servidor.
3. No menu lateral, clique em **Docker** ou **Docker Manager** (se estiver disponível no seu template de sistema).
4. Clique em **Criar Aplicação** / **Novo Container**:
   - **Origem / Git Repository**: `https://github.com/abdiasalves0-dot/Landing-page-Kriativa`
   - **Branch**: `main`
   - **Porta do Host**: `80` (ou `8080` caso já use a 80 em outro serviço)
   - **Porta do Container**: `80`
5. Clique em **Deploy** / **Implantar**. O painel fará o clone automático, buildará a imagem e iniciará o container.

---

### Opção 2: Via Terminal SSH / Docker Compose na Hostinger VPS
Caso utilize VPS Ubuntu/Debian com Docker instalado na Hostinger:

1. Conecte-se ao seu servidor VPS via SSH:
   ```bash
   ssh root@SEU_IP_HOSTINGER
   ```

2. Clone o repositório ou atualize:
   ```bash
   git clone https://github.com/abdiasalves0-dot/Landing-page-Kriativa.git
   cd Landing-page-Kriativa
   ```

3. Suba o container com o Docker Compose em segundo plano:
   ```bash
   docker compose up -d --build
   ```

4. Verifique se o container está rodando:
   ```bash
   docker ps
   ```

A landing page estará imediatamente acessível no IP do servidor ou no domínio apontado para a VPS na porta 80.

---

### 🔄 Como atualizar o site após novos commits
Sempre que fizer alterações e novos commits no GitHub, para atualizar na Hostinger:
- **No Docker Manager do painel**: clique no botão **Redeploy** / **Reimplantar**.
- **No terminal VPS**:
  ```bash
  cd Landing-page-Kriativa
  git pull origin main
  docker compose up -d --build
  ```

---

## 🔒 Domínio e SSL (HTTPS)
Se estiver usando um proxy reverso (Nginx Proxy Manager, Traefik ou Cloudflare) na Hostinger, basta apontar seu domínio (ex: `kriativa.com.br`) para a porta `80` do container para ter SSL automático gratuito com Let's Encrypt.
