FROM node:18

WORKDIR /app

COPY package*.json ./
COPY server ./server
COPY shared ./shared

RUN npm install -d

EXPOSE 8000

CMD ["node", "server/js/main.js"]
