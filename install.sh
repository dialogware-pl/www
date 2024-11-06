
#!/bin/bash

# install.sh
echo "Installing Dialogware Documentation Server..."

# Sprawdź wymagania
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required but not installed. Aborting." >&2; exit 1; }

# Instaluj zależności systemowe
if [ -f /etc/debian_version ]; then
    sudo apt update
    sudo apt install -y redis-server mongodb
elif [ -f /etc/redhat-release ]; then
    sudo yum install -y redis mongodb-org
fi

# Klonuj repozytorium
git clone https://github.com/your-org/dialogware-docs.git
cd dialogware-docs

# Instaluj zależności Node.js
npm install

# Konfiguracja podstawowa
cp .env.example .env

# Tworzenie struktury katalogów
mkdir -p docs/{versions,locales,examples}
mkdir -p public/{css,js,images}

# Uruchom serwisy
sudo systemctl start redis
sudo systemctl start mongod

# Inicjalizacja bazy danych
node scripts/init-db.js

# Uruchom serwer
echo "Starting server..."
npm run build
npm start

echo "Installation complete! Server running at http://localhost:3000"
