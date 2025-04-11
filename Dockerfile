FROM node:18

WORKDIR /app

# Copier le serveur et les fichiers partagés
COPY server/ ./server/
COPY shared/ ./shared/

# Copier les fichiers de configuration
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Lancer le serveur
CMD ["node", "server/js/main.js"]
