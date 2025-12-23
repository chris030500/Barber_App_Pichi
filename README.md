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
2. Crea `backend/.env` con tus variables (puedes partir de `backend/.env.example`):
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
1. Opcional: copia las variables de ejemplo y personalízalas (útil si quieres cambiar valores por defecto). No es obligatorio para levantar el stack.
   ```bash
   cp backend/.env.example backend/.env  # Ajusta valores si lo necesitas
   ```
2. Construye y levanta los contenedores (backend + MongoDB). El `docker-compose.yml` ya define valores por defecto (`mongodb://mongo:27017` y base `barbershop_db`). Si quieres sobreescribirlos, exporta las variables (`MONGO_URL`, `DB_NAME`, `EMERGENT_LLM_KEY`) antes de ejecutar el comando.
   ```bash
   docker compose up --build
   ```
   - El backend quedará en http://localhost:8000.
   - Mongo expone el puerto 27017 por si quieres conectarte desde tu máquina.

### Nota sobre la dependencia `emergentintegrations`
- El paquete oficial es privado y **no está en PyPI**, lo que puede romper instalaciones automatizadas.
- Para que el contenedor compile sin acceso al paquete, se incluyó un **shim** mínimo en `backend/emergentintegrations/` que deja las importaciones operativas pero devuelve mensajes de función no disponible.
- Si necesitas las funciones de IA reales, instala el wheel oficial durante el build (por ejemplo: `pip install /ruta/al/emergentintegrations-<ver>.whl`) o sustituye el shim por tu cliente.

## Frontend (Expo/React Native)
1. Instala dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Copia las variables públicas y reemplázalas con tu proyecto de Firebase y backend:
   ```bash
   cd frontend
   cp .env.example .env
   # Edita .env con tus claves reales de Firebase y la URL del backend
   ```
   - Las variables `EXPO_PUBLIC_FIREBASE_*` deben apuntar a tu propio proyecto para evitar errores `auth/invalid-credential`.
   - Si no las defines, se usarán valores de fallback y es probable que el login falle con credenciales válidas.
3. Levanta el cliente apuntando a tu backend:
   ```bash
   EXPO_PUBLIC_BACKEND_URL=http://localhost:8000 npx expo start --clear
   ```
   - Abre el QR en Expo Go o inicia el emulador web/Android/iOS desde el menú de Expo.

## Notas útiles
- Los archivos `google-services.json` (Android) y `GoogleService-Info.plist` (iOS) ya están versionados para pruebas locales. Ajusta los IDs de proyecto si usas tu propio Firebase.
- Si cambias el puerto del backend, actualiza `EXPO_PUBLIC_BACKEND_URL` para que la app consuma la API correctamente.
- Para ver todas las colecciones en la base de datos cuando corres con Docker Compose:
  1. Entra al contenedor de MongoDB: `docker exec -it <mongo-container> mongosh` (el nombre suele ser `barber_app_pichi-mongo-1`).
  2. Selecciona la base usada por la app: `use ${DB_NAME:-barbershop_db}`.
  3. Lista las colecciones disponibles: `show collections`.
- Programa de fidelidad (MVP):
  - Configura reglas en `PUT /api/loyalty/rules` (puntos por cita, bono por referido, meta de recompensa) y consulta las vigentes en `GET /api/loyalty/rules`.
  - Visualiza el progreso de un usuario con `GET /api/loyalty/wallet/{user_id}` y registra su código de referido con `POST /api/loyalty/referrals`.
  - Acredita puntos al cerrar una cita completada con `POST /api/loyalty/earn/appointment` (evita duplicados por cita).
- Reservas y recordatorios:
  - Crea citas con anticipo opcional enviando `deposit_required` y `deposit_amount` a `POST /api/appointments`; registra el pago simulado con `POST /api/payments/deposits` y confirma estados con `POST /api/payments/deposits/{id}/confirm`.
  - Reprograma con `POST /api/appointments/{id}/reschedule` (regla: al menos 2h antes) y dispara recordatorios push/SMS manualmente con `POST /api/appointments/reminders/run` (ventanas de 24h y 2h).

## Pruebas manuales rápidas
- **Roles y navegación:** inicia sesión con un administrador y confirma que carga el layout de pestañas de admin; repite con un cliente y verifica que llegue al flujo `(client)`.
- **Logout consistente:** en perfil de admin, cliente y barbero, pulsa “Cerrar sesión” y comprueba que regresa a `/login` tanto en web como en dispositivo/emulador.
- **Notificaciones push:** prueba el registro de notificaciones solo en dispositivo físico; en web no debería montarse ningún listener ni pedir permisos.
