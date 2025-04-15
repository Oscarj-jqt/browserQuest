FROM node:22.8.0

WORKDIR /app

COPY package*.json ./

COPY server/maps/world_server.json /app/server/maps/world_server.json

RUN npm install

COPY . .

EXPOSE 8000

CMD ["node", "server/js/main.js"]
