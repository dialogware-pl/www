FROM node:16-alpine

WORKDIR /app

# Instalacja zależności systemowych
RUN apk add --no-cache \
    chromium \
    redis \
    mongodb

# Kopiowanie plików projektu
COPY package*.json ./
COPY . .

# Instalacja zależności
RUN npm install

# Budowanie aplikacji
RUN npm run build

# Ekspozycja portów
EXPOSE 3000 8080

# Uruchomienie aplikacji
CMD ["npm", "start"]
