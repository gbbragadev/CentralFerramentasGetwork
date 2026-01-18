git pull origin main
cd frontend
npm run build
npm install
docker-compose down
docker-compose up -d --build
npm run dev
