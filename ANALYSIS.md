# Informe de revisión y brechas detectadas

## Contexto del backend
- La API está construida con FastAPI y organiza rutas bajo `/api`, usando MongoDB vía Motor sin una capa de repositorios o servicios intermedios.【F:backend/server.py†L1-L359】
- La configuración de CORS permite cualquier origen y el cliente de MongoDB se inicializa en módulo usando `MONGO_URL` obligatorio y `DB_NAME` opcional.【F:backend/server.py†L23-L41】

## Observaciones clave
1. **Sin autenticación ni autorización**: todas las rutas (`/users`, `/barbershops`, `/appointments`, etc.) exponen operaciones de creación, lectura y actualización sin validar identidad ni roles, lo que abre el backend a escritura anónima y acceso a datos sensibles.【F:backend/server.py†L176-L359】
2. **Validación y saneamiento mínimos**: los esquemas aceptan `dict` genéricos para actualizaciones (por ejemplo, `update_barbershop`, `update_appointment`) sin restricciones de campos ni protección contra sobreescritura de claves críticas, lo que facilita estados inconsistentes.【F:backend/server.py†L229-L358】
3. **Dependencia rígida de variables de entorno**: `MONGO_URL` se lee de forma directa al importar el módulo, por lo que levantar el servidor sin dicha variable produce un fallo inmediato; tampoco hay verificación de la clave `EMERGENT_LLM_KEY` antes de construir componentes compartidos.【F:backend/server.py†L19-L26】【F:backend/server.py†L454-L468】
4. **Falta de observabilidad de errores de IA**: los endpoints de IA retornan mensajes genéricos y no registran métricas o códigos de error estructurados, dificultando depurar fallos de Gemini o diferenciar errores de entrada de usuario.【F:backend/server.py†L454-L727】【F:backend/server.py†L728-L829】
5. **Ausencia de pruebas automatizadas**: el repositorio no contiene suites de prueba ejecutables ni pipelines; el archivo `backend_test.py` es un script ad-hoc y no hay casos unitarios/integración que cubran los flujos CRUD o de IA.【F:backend/server.py†L176-L359】【F:backend/server.py†L728-L829】
6. **Seguridad operacional limitada**: CORS abierto a todos los orígenes y ausencia de rate limiting o protección CSRF hacen que el API sea vulnerable a uso indebido en entornos públicos.【F:backend/server.py†L34-L41】

## Pruebas realizadas
- `python -m compileall backend` para validar sintaxis básica del backend; compiló sin errores, pero no ejerce la lógica de negocio ni la integración con MongoDB o Gemini.【296224†L1-L4】

## Qué hace falta
- Incorporar autenticación (p. ej., JWT con roles) y autorización por ruta para proteger operaciones CRUD sensibles.
- Endurecer los esquemas de actualización con modelos Pydantic específicos y validaciones de dominio para evitar modificaciones arbitrarias.
- Manejar de forma segura la configuración: comprobaciones tempranas de variables, mensajes de error claros y carga perezosa de clientes externos.
- Añadir observabilidad y manejo de errores detallado para los endpoints de IA (trazabilidad, métricas, códigos de error diferenciados).
- Implementar pruebas unitarias y de integración que cubran flujos principales (usuarios, citas, generación de imágenes) y configurar un pipeline de CI.
- Restringir CORS y añadir controles de abuso (rate limiting, autenticación de clientes) antes de exponer el backend.
