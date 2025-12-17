# Barber_App

Guía rápida para levantar el backend (FastAPI) y el frontend (Expo) en tu computadora.

## Requisitos previos
- Python 3.11+ y `pip`
- Node.js 18+ y `npm`
- MongoDB en ejecución (local o remoto)
- Opcional para IA: clave `EMERGENT_LLM_KEY`

## Backend (FastAPI)
1. Instala dependencias:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # En Windows: .venv\\Scripts\\activate
   pip install -r requirements.txt
   ```
2. Crea `backend/.env` con tus variables (ejemplo):
   ```bash
   MONGO_URL="mongodb://localhost:27017"
   DB_NAME="barbershop_db"
   EMERGENT_LLM_KEY="tu-clave-opcional"
   ```
3. Ejecuta el servidor en http://localhost:8000:
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 8000
   ```

### Levantar backend con Docker
1. Crea `backend/.env` con las variables necesarias (usa la URL interna de Mongo en Docker):
   ```bash
   MONGO_URL="mongodb://mongo:27017"
   DB_NAME="barbershop_db"
   EMERGENT_LLM_KEY="tu-clave-opcional"
   ```
2. Construye y levanta los contenedores (backend + MongoDB):
   ```bash
   docker compose up --build
   ```
   - El backend quedará en http://localhost:8000.
   - Mongo expone el puerto 27017 por si quieres conectarte desde tu máquina.

## Frontend (Expo/React Native)
1. Instala dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Expone la URL del backend para el cliente móvil/web (usa tu host/puerto reales):
   ```bash
   EXPO_PUBLIC_BACKEND_URL=http://localhost:8000 npx expo start --clear
   ```
   - Abre el QR en Expo Go o inicia el emulador web/Android/iOS desde el menú de Expo.

## Notas útiles
- Los archivos `google-services.json` (Android) y `GoogleService-Info.plist` (iOS) ya están versionados para pruebas locales. Ajusta los IDs de proyecto si usas tu propio Firebase.
- Si cambias el puerto del backend, actualiza `EXPO_PUBLIC_BACKEND_URL` para que la app consuma la API correctamente.
