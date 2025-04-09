FROM node:18-alpine

WORKDIR /app

COPY client ./client
COPY bin ./bin

RUN chmod +x ./bin/build.sh

RUN cp client/config/config_build.json-dist client/config/config_build.json

RUN ./bin/build.sh

RUN npm install -g http-server

# Copier uniquement le résultat (optionnel si tu veux alléger l'image finale)
# Tu pourrais faire un multi-stage build plus tard pour ça

EXPOSE 8080

CMD ["http-server", "client-build", "-p", "8080"]
