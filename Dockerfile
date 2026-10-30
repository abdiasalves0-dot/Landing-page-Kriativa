# Imagem base oficial do Nginx em versão Alpine (leve, segura e rápida ~15MB)
FROM nginx:alpine

# Metadados informativos
LABEL maintainer="Kriativa Studio <kriaativadesign@gmail.com>"
LABEL description="Landing Page Kriativa Studio & Software House"

# Remove a configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copia a nossa configuração otimizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos da landing page para a raiz do servidor web
COPY . /usr/share/nginx/html

# Expõe a porta 80 do container
EXPOSE 80

# Healthcheck para monitorar a saúde do container na Hostinger e em orquestradores
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1

# Comando padrão de inicialização do Nginx
CMD ["nginx", "-g", "daemon off;"]
