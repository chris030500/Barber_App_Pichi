# Roadmap inicial

Esta guía prioriza qué abordar primero para seguir evolucionando la app y reducir riesgos.

## 1) Estabilizar la base
- **Autenticación y roles**: verificar que el rol se normalice (admin/barber/cliente) al iniciar sesión y que las rutas protegidas usen ese valor. Añadir pruebas manuales de: login admin → pestañas de admin; login cliente → flujo de cliente.
- **Logout consistente**: confirmar que todos los botones de cerrar sesión limpian `AsyncStorage`/contexto y redirigen a `/login` en web, iOS y Android.
- **Notificaciones push**: mantener el registro solo en dispositivos físicos y evitar listeners en web para prevenir loops de render.

## 2) Habilitar gestión completa de sucursales
- **CRUD de barberías**: permitir a admin crear/editar/eliminar sucursales con validaciones de horarios y capacidad.
- **Barberos ligados a sucursal**: forzar la selección de barbería al crear barberos y mostrar chips/selector coherente.
- **Servicios por sucursal**: cargar y editar servicios filtrados por barbería seleccionada, mostrando estados vacíos claros.

## 3) Primera funcionalidad nueva sugerida
- **Programa de fidelidad y referidos** (alcance mínimo viable):
  - Endpoints para acumular puntos por cita completada y registrar códigos de referido.
  - UI para ver puntos y recompensas en el perfil de cliente; sección de configuración en admin para definir reglas de puntos/canje.
  - Notificaciones push/email al alcanzar recompensas o cuando un referido completa su primera cita.

## 4) Observabilidad y métricas
- **Panel rápido de admin**: ocupación de agenda, citas del día, ticket promedio y top servicios por barbería. Usar gráficas simples y estados de carga/sin datos.
- **Logs y errores**: capturar fallas de red y mostrar mensajes de error claros; registrar en backend para trazabilidad.

## 5) Experiencia de reservas
- **Recordatorios automáticos**: push/SMS 24h y 2h antes de la cita; permitir reprogramar dentro de reglas.
- **Depósito opcional**: integrar pasarela (Stripe/Mercado Pago) para cobrar anticipo y reducir no-shows.

## Cómo arrancar esta semana
1. Revisar logout/roles en dispositivos y web (checklist de humo).
2. Completar CRUD de barberías y amarrar barberos/servicios a la sucursal seleccionada.
3. Diseñar modelo de puntos y flujo de UI mínimo para fidelidad; publicar endpoints stub y pantalla de puntos del cliente.

Cada bloque es incremental, de modo que siempre haya funcionalidad utilizable aun si el sprint se corta antes.
