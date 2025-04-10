# Étape de build
FROM node:18-alpine AS build

# Installe bash sans mettre à jour apk
RUN apk add --no-cache bash

WORKDIR /app

COPY client ./client
COPY bin ./bin

RUN chmod +x ./bin/build.sh
RUN cp client/config/config_build.json-dist client/config/config_build.json
RUN ./bin/build.sh

# Étape de production
FROM node:18-alpine

WORKDIR /app

# Copie les fichiers de l'étape de build
COPY --from=build /app/client /app/client
COPY --from=build /app/bin /app/bin

EXPOSE 8080

CMD ["http-server", "client-build", "-p", "8080"]
