# www
www.dialogware.pl

# Instalacja i konfiguracja Dialogware Documentation Server

## Wymagania systemowe

```bash
# Wymagania minimalne
Node.js >= 16
Redis >= 6
MongoDB >= 5
Git

# Pakiety systemowe
sudo apt update
sudo apt install -y nodejs npm redis-server mongodb
```

## Instalacja krok po kroku

1. **Klonowanie repozytorium**

```bash
git clone https://github.com/your-org/dialogware-docs.git
cd dialogware-docs
```

2. **Instalacja zależności**

```bash
npm install

# Główne zależności
npm install express marked highlight.js gray-matter i18next
# Bazy danych
npm install redis mongodb mongoose
# Dodatkowe funkcjonalności
npm install socket.io puppeteer analytics-node uuid
```

3. **Konfiguracja środowiska**

```bash
# Stwórz plik .env
cat > .env << EOL
PORT=3000
NODE_ENV=production
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/dialogware-docs
WEBHOOK_SECRET=your-secret-key
GITHUB_TOKEN=your-github-token
ANALYTICS_KEY=your-analytics-key
EOL
```

4. **Struktura katalogów**

```bash
mkdir -p docs/{versions,locales,examples}
mkdir -p public/{css,js,images}

# Struktura projektu
dialogware-docs/
├── docs/
│   ├── versions/
│   │   ├── v1/
│   │   └── v2/
│   ├── locales/
│   │   ├── en/
│   │   └── pl/
│   └── examples/
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── src/
│   ├── server/
│   ├── components/
│   └── utils/
└── package.json
```

5. **Uruchomienie serwera**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Użycie

### 1. Dodawanie dokumentacji

```markdown
# docs/versions/v1/getting-started.md

```

### 2. Dodawanie interaktywnych przykładów

```javascript
// docs/examples/auth-example.js

```

### 3. Dodawanie tłumaczeń

```json
// docs/locales/pl/translation.json
{
  "common": {
    "search": "Szukaj",
    "version": "Wersja",
    "language": "Język"
  },
  "docs": {
    "getting-started": {
      "title": "Rozpoczęcie pracy",
      "description": "Przewodnik rozpoczęcia pracy z Dialogware"
    }
  }
}
```

## Skrypt instalacyjny

```bash
```

## Docker

```dockerfile
# Dockerfile

```

```yaml
# docker-compose.yml

```

## Konfiguracja Nginx (przykład)

```nginx
# /etc/nginx/sites-available/dialogware-docs

```

## Automatyczne wdrożenie

```yaml
# .github/workflows/deploy.yml

```

## Używanie API

```typescript
// Przykład użycia API dokumentacji

// 1. Pobieranie dokumentacji
const docs = await fetch('http://localhost:3000/api/docs/v1/getting-started')
  .then(res => res.json());

// 2. Wyszukiwanie
const results = await fetch('http://localhost:3000/api/search?q=authentication')
  .then(res => res.json());

// 3. Eksport do PDF
const pdf = await fetch('http://localhost:3000/api/export/pdf/getting-started')
  .then(res => res.blob());

// 4. Interaktywne przykłady
const socket = io('http://localhost:8080');

socket.emit('example_run', {
  exampleId: 'auth-example',
  code: 'console.log("Hello World")'
});

socket.on('example_result', (data) => {
  console.log(data);
});
```

Podstawowa konfiguracja jest gotowa. Czy chciałbyś, żebym rozwinął któryś z aspektów lub dodał dodatkowe funkcjonalności?
