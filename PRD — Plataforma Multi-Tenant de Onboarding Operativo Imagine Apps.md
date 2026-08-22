# PRD — Plataforma Multi-Tenant de Onboarding Operativo

**Producto:** Plataforma de Onboarding Operativo  
**Versión:** 1.0  
**Estado:** Definición funcional y técnica  
**Tipo:** Aplicación Web SaaS Multi-Tenant  
**Usuarios iniciales:** PDM, UX/UI Designer y Administrador  
**Base de datos:** MongoDB  
**Frontend / Backend:** Next.js + TypeScript  
**Despliegue:** Vercel  
**Arquitectura:** Modular, componetizada, stateless y escalable  
**Cache externa:** No  
**Redis:** No  

---

# 1. Visión del producto

Construir una plataforma web de onboarding que permita a diferentes organizaciones gestionar el proceso de incorporación, adaptación y aprendizaje operativo de sus nuevos integrantes.

La plataforma debe funcionar como un **recorrido guiado desde el día 1**, permitiendo que cada nuevo integrante conozca la organización, su cultura, los líderes relevantes, los principios de trabajo y los procesos necesarios para desempeñar correctamente su rol.

La experiencia debe sentirse como:

> **"Te acompañamos paso a paso para entender cómo trabajamos y cómo hacer tu trabajo."**

No debe sentirse como un LMS, una biblioteca de documentos ni un centro de cursos.

---

# 2. Objetivo general

Construir una plataforma de onboarding inicialmente enfocada en Imagine Apps, pero diseñada desde su primera versión bajo un modelo **multi-tenant**, de manera que pueda soportar posteriormente otras organizaciones sin necesidad de reconstruir la arquitectura.

El sistema debe permitir:

1. Crear organizaciones/tenants.
2. Registrar o invitar usuarios.
3. Asociar usuarios a un tenant.
4. Asignar roles funcionales.
5. Asignar una ruta de onboarding según el rol.
6. Presentar contenido común y contenido específico.
7. Guiar al usuario secuencialmente.
8. Registrar el progreso.
9. Permitir gestionar contenido desde un panel administrativo.
10. Mantener aislada la información entre tenants.

---

# 3. Principio central de producto

La plataforma no debe sentirse como un curso, una biblioteca de contenidos ni un centro de aprendizaje abierto.

Debe sentirse como un **recorrido acompañado**.

El usuario no debería tener que adivinar:

- Qué hacer primero.
- Qué información revisar.
- Qué proceso aprender.
- Qué paso debe completar.
- Qué viene después.

La plataforma debe responder constantemente:

> **Dónde estoy → qué debo hacer → qué debo completar → qué sigue.**

---

# 4. Principios de producto

## 4.1 Experiencia guiada

La navegación principal debe estar basada en una ruta.

La navegación libre puede existir como mecanismo secundario, pero nunca debe convertirse en la experiencia principal.

---

## 4.2 Progressive Disclosure

La información debe presentarse progresivamente.

No mostrar todo el contenido disponible de una vez.

---

## 4.3 Contenido accionable

El contenido debe responder:

- ¿Qué es?
- ¿Por qué importa?
- ¿Qué debo hacer?
- ¿Cómo lo hago?
- ¿Cómo sé que terminé?

---

## 4.4 Simplicidad

La plataforma debe priorizar:

1. Claridad.
2. Facilidad de uso.
3. Velocidad.
4. Mantenibilidad.
5. Escalabilidad.

No se deben agregar funcionalidades únicamente porque sean técnicamente posibles.

---

# 5. Modelo Multi-Tenant

La plataforma debe construirse desde el inicio como **multi-tenant**.

Un tenant representa una organización independiente que utiliza la plataforma.

Inicialmente:

```text
Tenant
└── Imagine Apps
```

Pero la arquitectura debe permitir:

```text
Tenants
├── Imagine Apps
├── Empresa B
├── Empresa C
└── Empresa D
```

sin modificar la arquitectura principal.

---

# 6. Jerarquía del sistema

La estructura conceptual será:

```text
Tenant
   │
   ├── Usuarios
   │     │
   │     ├── Rol funcional
   │     │
   │     ├── Rol de plataforma
   │     │
   │     └── Progreso
   │
   ├── Contenido común
   │
   ├── Contenido por rol
   │
   ├── Líderes
   │
   ├── Rutas
   │     │
   │     ├── Etapas
   │     ├── Procesos
   │     └── Pasos
   │
   └── Configuración
```

---

# 7. Aislamiento entre tenants

Esta es una regla crítica de arquitectura.

Un usuario únicamente puede acceder a información perteneciente a su tenant.

Un tenant nunca puede:

- Consultar usuarios de otro tenant.
- Consultar contenido de otro tenant.
- Modificar contenido de otro tenant.
- Consultar progreso de otro tenant.
- Acceder a procesos de otro tenant.
- Acceder a líderes de otro tenant.

Todas las consultas que trabajen con información tenant-specific deben considerar el `tenantId`.

La seguridad multi-tenant debe aplicarse en backend.

No confiar únicamente en filtros realizados desde frontend.

---

# 8. Identidad del usuario

Cada usuario debe pertenecer obligatoriamente a un tenant.

Modelo conceptual:

```text
User
├── id
├── tenantId
├── email
├── name
├── platformRole
├── functionalRoleId
├── status
└── createdAt
```

---

# 9. Roles

Se deben separar dos conceptos:

## 9.1 Rol de plataforma

Define qué puede hacer el usuario dentro del sistema.

Inicialmente:

```text
USER
ADMIN
```

### USER

Puede:

- Realizar su onboarding.
- Consultar su contenido.
- Completar pasos.
- Consultar su progreso.

No puede:

- Crear contenido.
- Modificar contenido.
- Administrar usuarios.
- Administrar procesos.

### ADMIN

Puede:

- Administrar usuarios.
- Administrar contenido.
- Administrar procesos.
- Administrar pasos.
- Administrar líderes.
- Administrar roles.
- Administrar rutas.
- Publicar/despublicar contenido.

---

# 10. Rol funcional

Define qué tipo de onboarding debe realizar el usuario.

Inicialmente:

```text
PDM
UX_UI_DESIGNER
```

La arquitectura debe permitir posteriormente:

```text
DEVELOPER
QA
PROJECT_MANAGER
SALES
MARKETING
CUSTOM_ROLE
```

sin modificar la arquitectura principal.

---

# 11. Registro e incorporación del usuario

El usuario debe poder ingresar al sistema mediante:

- Invitación.
- Registro controlado.

Para el MVP se recomienda priorizar el modelo de **invitación administrativa**.

Flujo:

```text
Admin
 ↓
Crear invitación
 ↓
Definir email
 ↓
Definir tenant
 ↓
Definir rol funcional
 ↓
Enviar invitación
 ↓
Usuario acepta
 ↓
Completa registro
 ↓
Cuenta activada
 ↓
Ruta de onboarding asignada
 ↓
Inicio del onboarding
```

---

# 12. Regla de asignación del rol

El usuario no debe poder seleccionar libremente su rol funcional durante el registro cuando la organización utilice invitaciones.

El administrador define:

```text
Email
+
Tenant
+
Rol funcional
```

Ejemplo:

```text
santiago@empresa.com
Tenant: Imagine Apps
Rol: PDM
```

Al aceptar la invitación:

```text
Usuario
   ↓
Imagine Apps
   ↓
PDM
   ↓
Ruta PDM
```

Esto evita que el usuario seleccione accidentalmente una ruta incorrecta.

---

# 13. Estado del usuario

Un usuario puede tener:

```text
INVITED
ACTIVE
INACTIVE
```

### INVITED

La cuenta aún no ha sido activada.

### ACTIVE

Puede acceder a la plataforma.

### INACTIVE

No puede acceder al sistema.

La información histórica del usuario no debe eliminarse automáticamente al desactivarlo.

---

# 14. Ruta de onboarding

Cada usuario debe tener una ruta determinada por:

```text
Tenant
+
Rol funcional
```

Ejemplo:

```text
Imagine Apps + PDM
→ Ruta PDM

Imagine Apps + UX/UI
→ Ruta UX/UI
```

Otro tenant podría tener:

```text
Empresa B + Developer
→ Ruta Developer
```

---

# 15. Estructura de la ruta

Una ruta estará compuesta por etapas:

```text
Ruta
├── Bienvenida
├── Conoce Imagine
├── Conoce a tu equipo
├── No negociables
├── Ruta por rol
└── Paso a paso operativo
```

El orden debe ser configurable.

---

# 16. Contenido común y contenido por rol

El sistema debe diferenciar:

### Contenido común

Aplica a todos los usuarios de un tenant.

Ejemplos:

- Bienvenida.
- Misión.
- Visión.
- Valores.
- Cultura.
- Políticas.
- No negociables.

### Contenido específico

Aplica a determinados roles.

Ejemplos:

```text
PDM
├── Gestión de proyectos
├── Backlog
├── Historias de usuario
└── Comunicación con clientes
```

```text
UX/UI
├── Investigación
├── Flujos
├── Diseño
└── Validación
```

---

# 17. Bienvenida

Objetivo:

Generar una primera impresión cercana y humana.

Puede contener:

- Video.
- Mensaje de gerencia.
- Mensaje de bienvenida.
- Introducción a la ruta.
- Tiempo estimado.

La bienvenida debe ser breve.

---

# 18. Conoce Imagine

Contenido:

- Quiénes somos.
- Misión.
- Visión.
- Valores.
- Cultura.
- Forma de trabajo.
- Principios.

Todo el contenido debe ser editable desde el panel administrativo.

---

# 19. Conoce a tu equipo

Mostrar personas relevantes para el usuario.

Cada líder puede tener:

- Nombre.
- Cargo.
- Fotografía.
- Descripción.
- Rol.
- Información adicional.
- Video opcional.
- Rol(es) asociados.

Un líder puede estar disponible para:

```text
Todos
PDM
UX/UI
```

---

# 20. No negociables

Contenido relacionado con:

- Políticas.
- Código de conducta.
- Comunicación.
- Expectativas.
- Beneficios.
- Canales.
- Reglas de convivencia.
- Reglas operativas.

Cada contenido puede definirse como:

```text
OBLIGATORY
INFORMATIONAL
```

---

# 21. Ruta por rol

La ruta debe mostrar contenido específico del rol.

## PDM

Debe abordar, como mínimo:

- Gestión de productos.
- Gestión de proyectos.
- Backlog.
- Historias de usuario.
- Comunicación con clientes.
- Coordinación interna.
- Seguimiento operativo.
- Herramientas de trabajo.

## UX/UI Designer

Debe abordar, como mínimo:

- Investigación.
- Usuarios.
- Flujos.
- Diseño de interfaces.
- Validación.
- Documentación.
- Handoff.
- Trabajo con producto.
- Trabajo con desarrollo.

---

# 22. Paso a paso operativo

Los procesos deben transformarse en guías accionables.

Modelo:

```text
Proceso
├── Objetivo
├── Contexto
├── Resultado esperado
├── Paso 1
├── Paso 2
├── Paso 3
└── Recursos
```

---

# 23. Pasos

Cada paso debe tener:

- Título.
- Descripción.
- Instrucción.
- Recursos opcionales.
- Video opcional.
- Links opcionales.
- Criterio de finalización.
- Orden.

Estados:

```text
PENDING
IN_PROGRESS
COMPLETED
```

---

# 24. Progreso

El sistema debe guardar el progreso individual del usuario.

Debe poder determinar:

- Etapa actual.
- Etapas completadas.
- Procesos completados.
- Pasos completados.

No depender exclusivamente de un porcentaje almacenado.

El progreso debe poder reconstruirse a partir de los estados persistidos.

---

# 25. Navegación guiada

Ejemplo:

```text
✓ Bienvenida
✓ Conoce Imagine
● No negociables
○ Conoce a tu equipo
○ Ruta PDM
○ Procesos
```

El usuario debe visualizar:

- Etapa actual.
- Etapas completadas.
- Próxima etapa.

---

# 26. Dependencias y desbloqueo

Las etapas podrán tener dependencias.

Ejemplo:

```text
Bienvenida
   ↓
Conoce Imagine
   ↓
No negociables
   ↓
Ruta por rol
```

El administrador podrá determinar si:

- Una etapa es obligatoria.
- Una etapa bloquea la siguiente.

La arquitectura debe permitir agregar reglas de dependencia posteriormente.

---

# 27. Panel administrativo

El panel debe permitir administrar:

```text
Dashboard
Usuarios
Invitaciones
Roles
Contenido
Procesos
Pasos
Líderes
Rutas
Configuración
Auditoría
```

El administrador no debe necesitar conocimientos de programación.

---

# 28. Gestión de contenido

Debe poder gestionarse:

- Texto.
- Videos.
- Imágenes.
- Líderes.
- Procesos.
- Pasos.
- Orden.
- Publicación.
- Asociación por rol.

No debe existir contenido operativo hardcodeado en frontend.

---

# 29. Estados de contenido

Todo contenido administrable debe manejar:

```text
DRAFT
PUBLISHED
ARCHIVED
```

Reglas:

- DRAFT no es visible.
- PUBLISHED es visible.
- ARCHIVED no debe aparecer en nuevas rutas.
- Evitar eliminación física cuando exista valor histórico.

---

# 30. Versionamiento futuro

La arquitectura debe permitir incorporar posteriormente:

- Versiones de contenido.
- Historial de cambios.
- Rollback.
- Publicación programada.

No es necesario desarrollar estas funcionalidades en el MVP.

---

# 31. Modelo de datos MongoDB

Colecciones iniciales:

```text
tenants
users
roles
invitations
onboarding_routes
onboarding_stages
content_items
leaders
processes
process_steps
user_progress
media
audit_logs
```

---

# 32. Regla fundamental de MongoDB

Las entidades pertenecientes a un tenant deben contener una referencia clara al tenant.

Ejemplo:

```text
{
  _id,
  tenantId,
  name,
  status,
  ...
}
```

La aplicación debe evitar depender únicamente de relaciones indirectas para determinar la pertenencia a un tenant.

---

# 33. Índices

Los índices deben diseñarse según los patrones reales de consulta.

Como mínimo evaluar:

```text
users:
  tenantId + email
  tenantId + platformRole
  tenantId + functionalRoleId

content:
  tenantId + status
  tenantId + roleId
  tenantId + type + order

routes:
  tenantId + roleId

processes:
  tenantId + roleId + status

process_steps:
  tenantId + processId + order

progress:
  tenantId + userId
  tenantId + userId + stepId
```

No crear índices indiscriminadamente.

---

# 34. Arquitectura tecnológica

Stack recomendado:

### Frontend

- Next.js.
- React.
- TypeScript.
- Tailwind CSS o equivalente.
- Componentes reutilizables.

### Backend

- Next.js Route Handlers / API.
- TypeScript.
- Service Layer.
- Repository Layer.
- Validaciones.
- Manejo centralizado de errores.

### Base de datos

- MongoDB Atlas.

### Hosting

- Vercel.

---

# 35. Arquitectura lógica

```text
Browser
   ↓
Next.js
   ↓
UI Components
   ↓
Feature Modules
   ↓
API / Route Handlers
   ↓
Services
   ↓
Repositories
   ↓
MongoDB
```

---

# 36. Arquitectura stateless

La aplicación debe ser stateless.

No almacenar en memoria del servidor:

- Progreso.
- Sesiones críticas.
- Estado de workflows.
- Configuración necesaria para operar.

El estado persistente debe estar en MongoDB.

---

# 37. Escalabilidad

La aplicación debe poder ejecutarse en múltiples instancias sin depender de estado local.

Escalabilidad significa:

- Modularidad.
- Bajo acoplamiento.
- Stateless.
- MongoDB bien diseñado.
- Índices.
- APIs consistentes.
- Componentes reutilizables.
- Separación de responsabilidades.

Escalabilidad **NO significa implementar microservicios desde el inicio**.

---

# 38. Regla de infraestructura

La primera versión debe ser deliberadamente liviana.

No utilizar:

- Redis.
- Memcached.
- Kafka.
- RabbitMQ.
- Kubernetes.
- Microservicios.
- Elasticsearch.
- Workers permanentes.
- Servidores dedicados.
- Bases de datos adicionales.

Solo agregar infraestructura cuando exista una necesidad técnica demostrable.

---

# 39. Cache

No implementar Redis ni cache externa.

Optimizar mediante:

- MongoDB indexes.
- Queries eficientes.
- Proyecciones.
- Paginación.
- Evitar N+1.
- Reutilización de consultas.
- Server Components.
- Revalidación nativa de Next.js cuando sea apropiada.
- Optimización de assets.

La cache no debe utilizarse para ocultar problemas de arquitectura o consultas ineficientes.

---

# 40. Vercel

El sistema debe estar diseñado para desplegarse directamente en Vercel.

Evitar:

- Procesos persistentes.
- Servidores permanentes.
- Dependencias de filesystem local.
- Jobs de larga duración.
- Estado local persistente.

Las APIs deben ser compatibles con el modelo de ejecución de Vercel.

---

# 41. Componentización obligatoria

Toda la interfaz debe estar construida mediante componentes reutilizables.

No se debe implementar UI duplicada directamente en múltiples páginas.

Ejemplo:

```text
Design System
├── Button
├── Input
├── Select
├── Modal
├── Card
├── Badge
├── Avatar
├── Tabs
├── Progress
├── StepIndicator
└── VideoPlayer
```

Componentes de dominio:

```text
Onboarding
├── OnboardingHeader
├── OnboardingProgress
├── OnboardingStage
├── OnboardingStep
├── ProcessCard
└── StepNavigation
```

```text
Admin
├── ContentEditor
├── ProcessEditor
├── StepEditor
├── LeaderEditor
├── UserEditor
└── RoleSelector
```

---

# 42. Principios de componentización

Un componente debe:

- Tener una responsabilidad clara.
- Ser reutilizable cuando exista una necesidad real.
- Evitar lógica de negocio innecesaria.
- Recibir datos mediante props/interfaces claras.
- Evitar dependencias innecesarias.
- Mantener consistencia visual.

No crear componentes excesivamente pequeños únicamente por cumplir una regla de componentización.

---

# 43. Design System

El producto debe contar con un sistema de diseño reutilizable.

Debe centralizar:

- Tipografía.
- Colores.
- Espaciados.
- Tamaños.
- Bordes.
- Sombras.
- Iconografía.
- Botones.
- Inputs.
- Cards.
- Modales.
- Estados.
- Componentes de navegación.

El objetivo es evitar inconsistencias visuales entre pantallas.

---

# 44. Lineamiento de diseño proporcionado por Product Owner

El Product Owner proporcionará posteriormente un **lineamiento de diseño visual**.

Ese documento será considerado la **fuente de verdad para la implementación de la interfaz**.

La IA y el equipo de desarrollo deben seguir dicho lineamiento.

No se deben inventar:

- Colores.
- Tipografías.
- Componentes.
- Espaciados.
- Patrones visuales.
- Estilos de botones.
- Estados.
- Interacciones.

cuando estos ya estén definidos en el lineamiento.

---

# 45. Regla ante elementos de diseño no definidos

Si el lineamiento de diseño no contempla un elemento necesario:

1. Identificar la ausencia.
2. Proponer una solución consistente con el sistema existente.
3. Explicar la decisión.
4. Esperar aprobación cuando el cambio pueda afectar el sistema visual.
5. Implementar el componente reutilizable.

La IA no debe resolver inconsistencias visuales de manera arbitraria.

---

# 46. Responsive Design

La plataforma debe ser responsive.

Prioridad:

1. Desktop.
2. Tablet.
3. Mobile.

Los componentes deben adaptarse sin duplicar implementaciones.

---

# 47. Accesibilidad

Como mínimo:

- Navegación por teclado.
- Contraste adecuado.
- Labels.
- Jerarquía semántica.
- Estados visibles.
- Alt text.
- Focus states.
- Controles accesibles.

---

# 48. Autenticación y autorización

El sistema debe:

- Identificar al usuario.
- Identificar tenant.
- Identificar rol de plataforma.
- Identificar rol funcional.
- Proteger rutas.
- Proteger APIs.
- Validar permisos en backend.

Nunca confiar únicamente en el frontend.

---

# 49. Seguridad Multi-Tenant

Toda petición debe establecer el contexto:

```text
Authenticated User
        ↓
Tenant
        ↓
Authorization
        ↓
Resource
```

Ejemplo:

```text
GET /api/processes/123
```

El backend debe validar:

```text
¿El proceso 123 pertenece al tenant del usuario?
```

Si no pertenece:

```text
403 FORBIDDEN
```

o el comportamiento de seguridad definido por la arquitectura.

Nunca devolver información de otro tenant.

---

# 50. Validación

Utilizar schemas para validar:

- Request body.
- Query params.
- Route params.
- Formularios.
- Contenido administrativo.
- Datos provenientes de usuarios.

La validación debe realizarse en backend.

---

# 51. Manejo de errores

Las APIs deben utilizar respuestas consistentes.

Ejemplo:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "El recurso solicitado no existe."
  }
}
```

Nunca exponer:

- Stack traces.
- Queries.
- Secrets.
- Información interna.
- Credenciales.

---

# 52. Observabilidad

Debe existir una capa operativa mínima.

Debe incluir:

- Logs estructurados.
- Registro de errores.
- Errores frontend.
- Errores backend.
- Acciones administrativas importantes.
- Monitoring de disponibilidad.

Utilizar servicios existentes cuando sea posible.

No construir infraestructura de observabilidad propia innecesariamente.

---

# 53. Auditoría

Registrar acciones administrativas importantes:

```text
USER_INVITED
USER_CREATED
USER_UPDATED
USER_DEACTIVATED

CONTENT_CREATED
CONTENT_UPDATED
CONTENT_PUBLISHED
CONTENT_ARCHIVED

PROCESS_CREATED
PROCESS_UPDATED

STEP_CREATED
STEP_UPDATED
```

Registro mínimo:

```text
tenantId
userId
action
resource
resourceId
timestamp
metadata
```

---

# 54. Media

MongoDB no debe utilizarse para almacenar archivos multimedia pesados.

MongoDB almacena metadata:

```text
url
type
name
size
duration
provider
```

Los archivos deben almacenarse en un servicio especializado.

La arquitectura debe permitir cambiar el proveedor posteriormente.

---

# 55. Performance

La aplicación debe priorizar tiempos de respuesta rápidos.

Reglas:

- Evitar JavaScript innecesario.
- Utilizar Server Components cuando corresponda.
- Minimizar Client Components.
- Optimizar imágenes.
- Evitar consultas duplicadas.
- Implementar paginación en admin.
- Evitar N+1 queries.
- Utilizar índices MongoDB.
- Evitar documentos excesivamente grandes.

---

# 56. Testing

La IA debe implementar pruebas para las funcionalidades críticas.

## Unit

- Reglas de negocio.
- Validaciones.
- Progreso.
- Permisos.
- Resolución de tenant.

## Integration

- APIs.
- MongoDB.
- Usuarios.
- Invitaciones.
- Procesos.
- Progreso.
- Publicación.

## E2E

### Usuario

```text
Invitación
→ Registro
→ Login
→ Identificación de tenant
→ Asignación de rol
→ Inicio onboarding
→ Completar etapa
→ Completar proceso
→ Completar pasos
```

### Administrador

```text
Login
→ Crear invitación
→ Crear contenido
→ Publicar contenido
→ Crear proceso
→ Crear pasos
→ Usuario visualiza contenido
```

---

# 57. Definition of Done

Una funcionalidad solo se considera terminada cuando cumple:

- Requisito funcional.
- Diseño definido.
- Componentización.
- Responsive.
- Validaciones.
- Seguridad.
- Multi-tenancy.
- Persistencia.
- Manejo de errores.
- Loading states.
- Empty states.
- Error states.
- Tests correspondientes.
- Código mantenible.
- Sin lógica duplicada.
- Sin secretos.
- Sin errores críticos en consola.

---

# 58. Reglas para la IA desarrolladora

La IA tendrá el rol de:

> **Senior Full Stack Developer + Software Architect + Technical Lead**

No debe limitarse a ejecutar instrucciones literalmente.

Debe:

1. Analizar requisitos.
2. Detectar inconsistencias.
3. Identificar entidades.
4. Identificar reglas de negocio.
5. Revisar impacto arquitectónico.
6. Evaluar seguridad.
7. Evaluar escalabilidad.
8. Proponer solución.
9. Implementar.
10. Probar.
11. Revisar.
12. Documentar cuando sea necesario.

---

# 59. Regla de autonomía de la IA

La IA puede tomar decisiones técnicas dentro de la arquitectura definida.

Puede decidir:

- Estructura interna de componentes.
- Organización de código.
- Implementación de servicios.
- Queries.
- Validaciones.
- Manejo de estados.
- Refactorizaciones necesarias.

Pero no debe modificar unilateralmente:

- Reglas de negocio.
- Flujo principal.
- Arquitectura multi-tenant.
- Roles.
- Permisos.
- Sistema visual.
- Alcance funcional.

cuando esto implique cambiar la definición del producto.

---

# 60. Regla anti-sobreingeniería

Cuando existan varias soluciones válidas:

```text
A:
Compleja
Muchas dependencias
Más infraestructura

B:
Simple
Mantenible
Escalable
Menos dependencias
```

Preferir B si cumple el requisito.

---

# 61. Regla de dependencias

Antes de agregar una dependencia:

1. Evaluar si es realmente necesaria.
2. Evaluar si existe solución nativa.
3. Evaluar impacto en bundle.
4. Evaluar impacto en mantenimiento.
5. Evaluar compatibilidad con Vercel.
6. Evaluar seguridad.
7. Evaluar costos.

No agregar librerías por conveniencia.

---

# 62. Regla de arquitectura

No implementar microservicios inicialmente.

La arquitectura debe comenzar como un **monolito modular**.

Esto permite:

- Desarrollo más rápido.
- Menor complejidad.
- Menos infraestructura.
- Menor costo.
- Mayor facilidad de mantenimiento.

Los dominios deben mantenerse suficientemente desacoplados para poder extraerse posteriormente si existe una necesidad real.

---

# 63. Evolución futura

La arquitectura debe permitir agregar:

- Nuevos tenants.
- Nuevos roles.
- Nuevos tipos de contenido.
- Evaluaciones.
- Analytics.
- Notificaciones.
- Versionamiento.
- Integraciones.
- Multiidioma.
- Personalización por tenant.

Estas funcionalidades no forman parte del MVP.

---

# 64. Funcionalidades fuera del MVP

No incluir:

- Gamificación.
- Puntos.
- Rankings.
- Tokens.
- Badges.
- Skills independientes.
- Toolbox principal.
- Dashboard complejo.
- LMS tradicional.
- Chat.
- Foro.
- Red social.
- Gestión de RRHH.
- Evaluaciones complejas.
- Microservicios.
- Redis.
- Sistema de cache externo.

---

# 65. MVP

## Usuario

- Registro/invitación.
- Login.
- Identificación de tenant.
- Asignación de rol.
- Ruta de onboarding.
- Bienvenida.
- Conoce Imagine.
- Conoce a tu equipo.
- No negociables.
- Ruta por rol.
- Procesos.
- Pasos.
- Marcado de pasos.
- Progreso básico.

## Administrador

- Login.
- Gestión de usuarios.
- Invitaciones.
- Gestión de roles.
- Gestión de contenido.
- Gestión de líderes.
- Gestión de rutas.
- Gestión de procesos.
- Gestión de pasos.
- Publicación/despublicación.

## Plataforma

- Multi-tenancy.
- MongoDB.
- API.
- Autenticación.
- Autorización.
- Seguridad.
- Logs.
- Auditoría.
- Testing.
- Responsive.
- Componentización.
- Design System.
- Vercel.

---

# 66. Criterios de éxito

## Usuario

Un nuevo integrante:

- Entiende qué es la organización.
- Entiende cómo trabaja.
- Conoce a sus líderes.
- Conoce las reglas básicas.
- Sabe qué debe aprender.
- Conoce los procesos de su rol.
- Puede seguir procesos paso a paso.
- Puede identificar qué ha completado.
- No necesita depender constantemente de otra persona.

## Administrador

Puede:

- Crear usuarios.
- Invitar usuarios.
- Asignar roles.
- Gestionar contenido.
- Gestionar líderes.
- Crear procesos.
- Crear pasos.
- Modificar rutas.
- Publicar cambios.

## Organización

Puede mantener actualizado el onboarding sin depender de desarrollo para modificar contenido.

## Plataforma

Debe:

- Aislar correctamente los tenants.
- Ser rápida.
- Ser mantenible.
- Ser escalable.
- Operar en Vercel.
- Utilizar MongoDB como persistencia principal.
- Evitar infraestructura innecesaria.

---

# 67. Modelo conceptual final

La plataforma debe entenderse de la siguiente manera:

```text
                         PLATFORM
                            │
             ┌──────────────┴──────────────┐
             │                             │
          TENANT A                       TENANT B
             │                             │
      ┌──────┴──────┐                ┌─────┴─────┐
      │             │                │           │
    USERS         CONTENT          USERS       CONTENT
      │             │                │           │
   ┌──┴──┐       ┌──┴──┐          ┌──┴──┐     ┌──┴──┐
   │     │       │     │          │     │     │     │
  PDM   UX/UI  COMMON  ROLE      ROLE  ROLE  COMMON ROLE
   │     │       │     │
   └──┬──┘       └──┬──┘
      │              │
   ROUTE          CONTENT
      │
   STAGES
      │
 PROCESS
      │
   STEPS
      │
  PROGRESS
```

---

# 68. Principio técnico rector

La plataforma debe construirse bajo la siguiente filosofía:

> **La menor infraestructura necesaria para construir una experiencia de onboarding excelente, manteniendo una arquitectura modular, segura y suficientemente escalable para crecer a múltiples organizaciones, roles y rutas sin rehacer el producto.**

Prioridad:

**Simplicidad → Seguridad → Mantenibilidad → Performance → Escalabilidad**

No:

**Complejidad → Infraestructura → Microservicios → Optimización prematura**

---

# 69. Principio final de producto

La plataforma no debe intentar enseñar todo lo que una organización sabe.

Debe enseñar a cada persona:

> **lo que necesita saber para comenzar a trabajar correctamente dentro de su organización y en su rol.**

La experiencia debe ser:

**Simple + Guiada + Humana + Accionable + Administrable + Escalable.**