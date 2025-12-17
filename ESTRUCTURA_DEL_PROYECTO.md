# 📱 BarberShop App - Estructura del Proyecto

## 🎯 Resumen del MVP Extendido

Aplicación móvil y web para gestión integral de barberías con:
- ✅ Autenticación (Firebase - **Pendiente de configuración**)
- ✅ Sistema de citas completo
- ✅ Panel administrativo
- ✅ Perfiles de barberos con portafolio
- ✅ Historial de clientes
- ✅ Notificaciones push (Expo Notifications)
- ✅ IA para recomendaciones faciales (Gemini 2.5 Flash - **Pendiente integración**)

---

## 📁 Estructura de Archivos

```
/app
├── backend/
│   ├── server.py              # FastAPI server con todos los endpoints
│   ├── requirements.txt       # Dependencias Python (Firebase, Motor, etc.)
│   └── .env                   # Variables de entorno
│
├── frontend/
│   ├── app/
│   │   ├── _layout.tsx                 # Layout raíz con providers
│   │   ├── index.tsx                   # Pantalla de carga inicial
│   │   │
│   │   ├── (auth)/                     # Grupo de autenticación
│   │   │   ├── welcome.tsx             # Pantalla de bienvenida
│   │   │   └── login.tsx               # Login (Firebase pendiente)
│   │   │
│   │   ├── (client)/                   # Grupo para clientes
│   │   │   ├── _layout.tsx             # Tab navigation
│   │   │   ├── home.tsx                # Buscar barberías
│   │   │   ├── appointments.tsx        # Mis citas
│   │   │   ├── ai-scan.tsx             # Escaneo facial IA
│   │   │   └── profile.tsx             # Perfil usuario
│   │   │
│   │   ├── (barber)/                   # Grupo para barberos
│   │   │   └── (Pendiente crear)
│   │   │
│   │   └── (admin)/                    # Grupo para administradores
│   │       └── (Pendiente crear)
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx             # Gestión de autenticación
│   │   └── NotificationContext.tsx     # Gestión de notificaciones
│   │
│   ├── components/
│   │   └── ui/
│   │       ├── Button.tsx              # Botón reutilizable
│   │       ├── Input.tsx               # Input con label y error
│   │       └── Card.tsx                # Tarjeta con sombra
│   │
│   ├── app.json                        # Configuración Expo
│   ├── package.json                    # Dependencias Node.js
│   └── .env                            # Variables de entorno frontend
│
├── auth_testing.md                     # Playbook testing autenticación
├── image_testing.md                    # Playbook testing imágenes IA
└── test_result.md                      # Log de pruebas
```

---

## 🗄️ Base de Datos MongoDB

### Colecciones Implementadas:

#### 1. **users**
```javascript
{
  user_id: "user_abc123",
  email: "usuario@email.com",
  name: "Juan Pérez",
  picture: "https://...",
  role: "client | barber | admin",
  phone: "+1234567890",
  barbershop_id: "shop_xyz789",  // Solo para barberos/admins
  created_at: ISODate(...)
}
```

#### 2. **barbershops**
```javascript
{
  shop_id: "shop_abc123",
  owner_user_id: "user_xyz789",
  name: "Barbería El Corte",
  address: "Calle Principal 123",
  phone: "+1234567890",
  description: "La mejor barbería de la ciudad",
  photos: ["base64_image_1", "base64_image_2"],
  working_hours: {
    "monday": {"open": "09:00", "close": "18:00"},
    "tuesday": {"open": "09:00", "close": "18:00"}
  },
  location: {"lat": 40.7128, "lng": -74.0060},
  created_at: ISODate(...)
}
```

#### 3. **barbers**
```javascript
{
  barber_id: "barber_abc123",
  shop_id: "shop_xyz789",
  user_id: "user_def456",
  bio: "Barbero profesional con 10 años de experiencia",
  specialties: ["Fade", "Undercut", "Beard styling"],
  portfolio: ["base64_image_1", "base64_image_2"],
  availability: {
    "monday": ["09:00-12:00", "14:00-18:00"]
  },
  status: "available | busy | unavailable",
  rating: 4.8,
  total_reviews: 127,
  created_at: ISODate(...)
}
```

#### 4. **services**
```javascript
{
  service_id: "service_abc123",
  shop_id: "shop_xyz789",
  name: "Corte Clásico",
  description: "Corte tradicional con tijeras",
  price: 25.00,
  duration: 30,  // minutos
  image: "base64_image",
  created_at: ISODate(...)
}
```

#### 5. **appointments**
```javascript
{
  appointment_id: "appt_abc123",
  shop_id: "shop_xyz789",
  barber_id: "barber_def456",
  client_user_id: "user_ghi789",
  service_id: "service_jkl012",
  scheduled_time: ISODate("2025-01-20T15:00:00Z"),
  status: "scheduled | confirmed | in_progress | completed | cancelled",
  notes: "Notas especiales del cliente",
  reminder_sent: false,
  created_at: ISODate(...),
  updated_at: ISODate(...)
}
```

#### 6. **client_history**
```javascript
{
  history_id: "hist_abc123",
  client_user_id: "user_xyz789",
  barber_id: "barber_def456",
  appointment_id: "appt_ghi789",
  photos: ["base64_before", "base64_after"],
  preferences: {
    "preferred_style": "Fade",
    "hair_type": "Straight",
    "notes": "Le gusta corto a los lados"
  },
  notes: "Cliente satisfecho con el resultado",
  created_at: ISODate(...)
}
```

#### 7. **push_tokens**
```javascript
{
  token_id: "token_abc123",
  user_id: "user_xyz789",
  token: "ExponentPushToken[xxxxxxxxxxxxxx]",
  platform: "ios | android | web",
  device_info: {
    "model": "iPhone 14",
    "os_version": "17.2"
  },
  created_at: ISODate(...)
}
```

---

## 🛠️ API Endpoints Implementados

### Usuarios
- `POST /api/users` - Crear usuario
- `GET /api/users/{user_id}` - Obtener usuario
- `GET /api/users?role=client` - Listar usuarios por rol

### Barberías
- `POST /api/barbershops` - Crear barbería
- `GET /api/barbershops/{shop_id}` - Obtener barbería
- `GET /api/barbershops` - Listar barberías
- `PUT /api/barbershops/{shop_id}` - Actualizar barbería

### Barberos
- `POST /api/barbers` - Crear barbero
- `GET /api/barbers/{barber_id}` - Obtener barbero
- `GET /api/barbers?shop_id=xxx` - Listar barberos por barbería
- `PUT /api/barbers/{barber_id}` - Actualizar barbero (estado, portafolio, etc.)

### Servicios
- `POST /api/services` - Crear servicio
- `GET /api/services/{service_id}` - Obtener servicio
- `GET /api/services?shop_id=xxx` - Listar servicios por barbería

### Citas
- `POST /api/appointments` - Crear cita
- `GET /api/appointments/{appointment_id}` - Obtener cita
- `GET /api/appointments?client_user_id=xxx` - Listar citas de cliente
- `GET /api/appointments?barber_id=xxx&status=scheduled` - Citas de barbero
- `PUT /api/appointments/{appointment_id}` - Actualizar cita
- `DELETE /api/appointments/{appointment_id}` - Cancelar cita

### Historial de Clientes
- `POST /api/client-history` - Crear historial
- `GET /api/client-history/{client_user_id}` - Obtener historial

### Push Tokens
- `POST /api/push-tokens` - Registrar token
- `GET /api/push-tokens/{user_id}` - Obtener tokens de usuario

### Dashboard Admin
- `GET /api/dashboard/stats?shop_id=xxx` - Estadísticas de barbería

---

## 🔐 Autenticación (Firebase) - **PENDIENTE CONFIGURACIÓN**

### Lo que necesitas proporcionar:

1. **`google-services.json`** (Android)
2. **`GoogleService-Info.plist`** (iOS)
3. **Firebase Web Config:**
   ```json
   {
     "apiKey": "AIza...",
     "authDomain": "barbershop-app.firebaseapp.com",
     "projectId": "barbershop-app",
     "storageBucket": "barbershop-app.appspot.com",
     "messagingSenderId": "123456789",
     "appId": "1:123456789:web:abc123"
   }
   ```

### Una vez tengas las credenciales:
1. Cópialas en `/app/frontend/` (google-services.json y GoogleService-Info.plist)
2. Actualiza AuthContext.tsx con la lógica de Firebase
3. Los métodos de login/register ya están preparados para recibir la implementación

---

## 🤖 IA Gemini 2.5 Flash - **PENDIENTE INTEGRACIÓN**

### Playbook guardado en: `/app/image_testing.md`

### Para integrar:
1. Ya está instalada la librería `emergentintegrations`
2. Obtener Emergent LLM key usando `emergent_integrations_manager` tool
3. Implementar llamada a Gemini en el método `analyzeImage()` de `ai-scan.tsx`
4. Usar base64 para enviar imágenes

---

## 📲 Notificaciones Push

### Implementación:
- ✅ Context creado: `NotificationContext.tsx`
- ✅ Permisos de cámara y notificaciones configurados en `app.json`
- ✅ Backend endpoints para tokens listos

### Para activar:
1. Configura tu proyecto en Expo (obtén `projectId`)
2. Actualiza `app.json` con el `projectId` correcto
3. Las notificaciones se registrarán automáticamente al login

---

## 🎨 Navegación y UX

### Arquitectura:
```
App Root
├── Auth Stack (sin autenticación)
│   ├── Welcome Screen
│   └── Login Screen
│
└── Main App (con autenticación)
    ├── Client Tabs
    │   ├── Home (Buscar)
    │   ├── Appointments (Citas)
    │   ├── AI Scan (IA)
    │   └── Profile (Perfil)
    │
    ├── Barber Tabs (Pendiente)
    │   └── Schedule, Clients, Portfolio, Profile
    │
    └── Admin Tabs (Pendiente)
        └── Dashboard, Barbers, Services, Reports
```

### Componentes UI:
- **Button**: 4 variantes (primary, secondary, outline, danger), 3 tamaños
- **Input**: Con label, placeholder, error
- **Card**: Con sombra, opcionalmente clickeable

---

## 🚀 Próximos Pasos

### Fase 1 (TÚ):
- [ ] Configurar Firebase Authentication
- [ ] Proporcionar credenciales (google-services.json, etc.)
- [ ] Obtener projectId de Expo

### Fase 2 (DESPUÉS DE FIREBASE):
- [ ] Implementar pantallas de Barberos
- [ ] Implementar pantallas de Admin
- [ ] Integrar Gemini 2.5 Flash para IA
- [ ] Implementar sistema de notificaciones completo
- [ ] Agregar geolocalización para buscar barberías cercanas

### Fase 3 (FEATURES AVANZADAS):
- [ ] Sistema de calificaciones y reseñas
- [ ] Chat en tiempo real
- [ ] Programa de lealtad
- [ ] Integración de pagos (Stripe)
- [ ] Notificaciones por WhatsApp

---

## ⚙️ Cómo Probar

### Backend:
```bash
curl http://localhost:8001/api/
# Response: {"message": "BarberShop API v1.0", "status": "running"}
```

### Frontend:
1. La app se está ejecutando en Expo
2. Abre el preview web o escanea el QR con Expo Go
3. Verás la pantalla de bienvenida indicando que Firebase está pendiente

---

## 📝 Notas Importantes

1. **Imágenes**: Todas las imágenes se guardan en base64 en MongoDB
2. **Roles**: `client`, `barber`, `admin` - La navegación cambia según el rol
3. **IDs personalizados**: Se usan `user_id`, `shop_id`, etc. (no `_id` de Mongo)
4. **Timezone**: Todos los datetimes son timezone-aware (UTC)
5. **Firebase**: El proyecto está preparado pero necesita tus credenciales

---

## 📞 Contacto

¿Dudas sobre la estructura? Avísame cuando tengas las credenciales de Firebase listas y continuaremos con la integración completa.
