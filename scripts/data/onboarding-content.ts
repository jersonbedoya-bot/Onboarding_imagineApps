/**
 * Fuente de contenido a sembrar en la ruta de onboarding.
 *
 * Fuente de verdad del contenido: "Metologías (All).md" y
 * "onboarding-imagine-apps UX UI.md" (raíz del repo) — este archivo es la
 * versión curada/estructurada de esos documentos, no un reemplazo.
 *
 * `db:seed:content` (scripts/seed-content.ts) lee este archivo y crea/
 * actualiza todo vía los services reales (Zod-equivalente + scope/roleIds +
 * auditoría) — nunca escribe directo a Mongo. El contenido nuevo se crea en
 * DRAFT; el ya PUBLISHED se actualiza in-place (título/cuerpo) sin tocar su
 * estado de publicación.
 *
 * `matchTitle`/`matchName`: título o nombre bajo el cual el registro pudo
 * haber quedado sembrado en una corrida anterior (antes de renombrarlo acá,
 * ej. al agregar un emoji). El script busca por `title`/`name` actual O por
 * este valor, así puede encontrar y actualizar el registro existente en vez
 * de crear uno duplicado. Una vez migrado, ya no hace falta —queda como
 * historial de qué cambió.
 */
import type { ContentItemType, ContentRequirement, ContentScope, FunctionalRoleKey } from "@/types/enums";

export type SeedContentItem = {
  title: string;
  matchTitle?: string;
  type: ContentItemType;
  requirement: ContentRequirement | null;
  body: string;
  scope: ContentScope;
  roleKeys?: FunctionalRoleKey[];
};

export type SeedProcessStep = {
  title: string;
  matchTitle?: string;
  instruction: string;
};

export type SeedProcess = {
  title: string;
  matchTitle?: string;
  objective: string;
  context: string;
  expectedResult: string;
  resources: string[];
  scope: ContentScope;
  roleKeys?: FunctionalRoleKey[];
  steps: SeedProcessStep[];
};

export type SeedStage = {
  title: string;
  matchTitle?: string;
  isBlocking: boolean;
  dependsOnTitle?: string; // título ACTUAL (con emoji) de la etapa previa; se resuelve a ObjectId en el script
  contentItems?: SeedContentItem[];
  processes?: SeedProcess[];
};

export type SeedLeader = {
  name: string;
  title: string;
  description: string;
  scope: ContentScope;
  roleKeys?: FunctionalRoleKey[];
};

// Los líderes son una colección independiente del tenant (no cuelgan de una
// etapa) — ver leader.service.ts: "Conoce a tu equipo" es información
// general, no ligada a la cascada ruta -> etapa. Sin emoji deliberadamente:
// son nombres y cargos de personas reales, no encabezados de sección.
export const LEADERS: SeedLeader[] = [
  {
    name: "Carlos Haas",
    title: "CEO",
    description: "Director Ejecutivo de Imagine Apps. Lidera la visión estratégica global de la compañía.",
    scope: "COMMON",
  },
  {
    name: "Ángela Forero",
    title: "CTO",
    description: "Directora de Tecnología. Define los estándares de arquitectura, seguridad y desarrollo técnico.",
    scope: "COMMON",
  },
  {
    name: "Angie Rincón",
    title: "Directora de Operaciones",
    description: "Lidera la gestión diaria, la asignación de capacidades de los equipos y la viabilidad de los proyectos.",
    scope: "COMMON",
  },
  {
    name: "Natalia",
    title: "Gerente de Grow",
    description: "",
    scope: "COMMON",
  },
  {
    name: "Kelly Yohana Ospina",
    title: "People",
    description: "",
    scope: "COMMON",
  },
  {
    name: "Ruth",
    title: "Contabilidad",
    description: "",
    scope: "COMMON",
  },
  {
    name: "Mitchell Chavarria Botello",
    title: "Product Delivery Manager (PDM)",
    description: "Líder de entrega operativa. Especialista en gestión de flujos de valor en proyectos de alta complejidad.",
    scope: "ROLE",
    roleKeys: ["PDM"],
  },
  {
    name: "Johan Puerta",
    title: "Product Delivery Manager (PDM)",
    description: "Líder de entrega operativa, con foco en gestión de requerimientos y relación con el cliente.",
    scope: "ROLE",
    roleKeys: ["PDM"],
  },
  {
    name: "Tarek Elneser",
    title: "Diseñador UX/UI",
    description: "",
    scope: "ROLE",
    roleKeys: ["UX_UI_DESIGNER"],
  },
  {
    name: "Alejandro Morales Jimenez",
    title: "Diseñador UX/UI",
    description: "",
    scope: "ROLE",
    roleKeys: ["UX_UI_DESIGNER"],
  },
  {
    name: "Daniela Gómez Noriega",
    title: "Diseñadora UX/UI",
    description: "",
    scope: "ROLE",
    roleKeys: ["UX_UI_DESIGNER"],
  },
  {
    name: "Monica Romero",
    title: "Diseñadora UX/UI",
    description: "",
    scope: "ROLE",
    roleKeys: ["UX_UI_DESIGNER"],
  },
];

export const STAGES: SeedStage[] = [
  {
    title: "🚀 Módulo 1: Onboarding y Bienvenida",
    matchTitle: "Módulo 1: Onboarding y Bienvenida",
    isBlocking: false,
    contentItems: [
      {
        title: "👁️ Quiénes Somos y Nuestra Visión",
        matchTitle: "Quiénes Somos y Nuestra Visión",
        type: "TEXT",
        requirement: "OBLIGATORY",
        scope: "COMMON",
        body: `### Bienvenidos a Imagine Apps

Nuestra visión es ser **la primera empresa de tecnología colombiana de alcance global**.

### Nuestros valores (cinco cosas que no se nos olvidan)

1. **Empatía estratégica:** entendemos el negocio y a las personas antes de diseñar o desarrollar.
2. **Obsesión por el impacto:** no entregamos pantallas ni líneas de código, generamos valor real para el negocio del cliente.
3. **End-to-End Ownership:** nos apropiamos del producto de principio a fin.
4. **Lab Mindset:** experimentamos, probamos y aprendemos sin miedo.
5. **Inteligencia híbrida:** lo mejor de las personas y de la tecnología, human + AI.`,
      },
      {
        title: "⚖️ Principios No Negociables",
        matchTitle: "Principios No Negociables",
        type: "TEXT",
        requirement: "OBLIGATORY",
        scope: "COMMON",
        body: `### Nuestros no negociables

* **Transparencia:** nunca hablamos por canales internos o privados — siempre en canales públicos.
* **Reuniones:** nos conectamos 5 minutos antes de empezar, nunca tenemos reuniones en paralelo, entramos con cámara prendida y con la mejor actitud posible.
* **Gente que resuelve (regla de los 30 minutos):** si un reto del proyecto te tomó más de 30 minutos sin solución, tienes 5 personas del equipo listas para apoyarte.
* **Apropiación del negocio:** nunca hablamos mal de nuestros clientes, ni interna ni externamente; siempre buscamos entender a fondo su negocio antes de proponer una solución.
* **Orientados a la excelencia:** ningún entregable o módulo se presenta a un cliente sin revisión previa del equipo de diseño y del equipo del proyecto.
* **Responsabilidad:** siempre cumplimos nuestros compromisos y mantenemos el calendario actualizado como bitácora real de nuestro trabajo diario, usando la metodología de Timeboxing.`,
      },
    ],
  },
  {
    title: "🧰 Módulo 2: Ecosistema de Herramientas y Bienestar",
    matchTitle: "Módulo 2: Ecosistema de Herramientas y Bienestar",
    isBlocking: true,
    dependsOnTitle: "🚀 Módulo 1: Onboarding y Bienvenida",
    contentItems: [
      {
        title: "💻 Ecosistema Digital de Trabajo",
        matchTitle: "Ecosistema Digital de Trabajo",
        type: "TEXT",
        requirement: "OBLIGATORY",
        scope: "COMMON",
        body: `### Herramientas del día a día

* **Basecamp:** gestión de proyectos, hilos de discusión y asignación de tareas con clientes y equipos.
* **Google Chat y Gmail:** canales oficiales de comunicación sincrónica y asincrónica.
* **Google Drive:** carpetas de proyecto con los entregables internos y externos.
* **Agents Hub:** acceso a los agentes de IA internos (por ejemplo Gimena, para historias de usuario) que apoyan procesos como actas y HUs.
* **Figma:** diseño y prototipado.

### Contacto de contingencia

> **Dato clave:** guarda ya en tu celular el número de Kelly Yohana Ospina (People): **314 860 0139**. Ante una emergencia operativa, People intentará contactarte por teléfono — si no tienes el número guardado, los filtros de spam pueden bloquear la llamada.`,
      },
      {
        title: "⏱️ Uso del Calendario (Timeboxing)",
        matchTitle: "Uso del Calendario (Timeboxing)",
        type: "TEXT",
        requirement: "OBLIGATORY",
        scope: "COMMON",
        body: `### Timeboxing

Organiza tu Google Calendar con la metodología de Timeboxing: asignarle a cada tarea un período de tiempo fijo y limitado, en lugar de trabajar en ella hasta terminarla. Es una de las técnicas más efectivas para equipos multidisciplinarios de alta productividad.

### Configura tu calendario

- [ ] Entra a la configuración de Google Calendar (ícono de engranaje) y ve a General → Horario Laboral y Ubicación.
- [ ] Habilita el horario laboral, elige los días que trabajas y configura los horarios (puedes copiarlos entre días).
- [ ] Si tu horario se interrumpe con regularidad por algo además del almuerzo, registra también ese quiebre.
- [ ] Categoriza tu calendario por colores según el tipo de actividad o área.

> **Dato clave:** tu calendario es la bitácora real de tu trabajo diario — mantenlo actualizado.`,
      },
      {
        title: "🌴 Política de Vacaciones",
        matchTitle: "Política de Vacaciones",
        type: "TEXT",
        requirement: "OBLIGATORY",
        scope: "COMMON",
        body: `> **Dato clave:** puedes solicitar vacaciones una vez cumplido un (1) año laboral en Imagine Apps. La solicitud debe hacerse con mínimo un (1) mes de anticipación.

### Pasos para solicitar

- [ ] Habla con tu líder directo (CEO, CTO, Directora de Operaciones) o tu PM y propón fechas tentativas.
- [ ] Definan juntos las fechas exactas, asegurando que no se vean afectados entregables ni compromisos del equipo.
- [ ] Ingresa a Magi, entra al módulo de solicitudes y registra ahí tu solicitud de vacaciones con las fechas acordadas.
- [ ] Espera la aprobación de tu líder y de la Directora de Operaciones — la solicitud queda formalizada solo cuando ambas aprueban.

[Ir a Magi](https://magi.imagineapps.co/login)

### Importante

* Las vacaciones deben estar aprobadas y formalizadas antes de tomarlas; si necesitas cambiar fechas ya aprobadas, repite el proceso.
* Una vez aprobadas, actualiza tu calendario y tu estado en Gmail para el período que estarás ausente, y deja actualizado el documento de entrega de puesto.
* People lleva el registro y control de los días tomados por cada colaborador.`,
      },
      {
        title: "🩺 Política de Citas Médicas",
        matchTitle: "Política de Citas Médicas",
        type: "TEXT",
        requirement: "OBLIGATORY",
        scope: "COMMON",
        body: `Tu salud es una prioridad.

> **Dato clave:** puedes solicitar un permiso médico avisando con al menos una (1) semana de anticipación; si la cita surge de un día para otro, coordina directamente con tu líder. El tiempo de asistencia a la cita médica no se compensa.

### Pasos

- [ ] Escríbele a tu líder directo por Gmail indicando el día y el tiempo de ausencia.
- [ ] Acuerda con tu líder o PM cómo cubrir tus actividades para que no se vean afectados los compromisos del equipo.
- [ ] Agenda el espacio en tu Google Calendar, visible para todos, con el título "Permiso médico // [Tu nombre]".`,
      },
      {
        title: "🎂 Política de Cumpleaños",
        matchTitle: "Política de Cumpleaños",
        type: "TEXT",
        requirement: "OBLIGATORY",
        scope: "COMMON",
        body: `Todos los colaboradores tienen derecho a un (1) día libre remunerado por su cumpleaños. Puedes tomarlo el mismo día o dentro de los 15 días hábiles siguientes.

> **Dato clave:** solicítalo con al menos 30 días de antelación — necesita la aprobación de tu líder de área.

### Cómo solicitarlo

Envía un correo a tu supervisor con copia a People, con asunto "Solicitud permiso cumpleaños // [Tu nombre]", indicando tu fecha de cumpleaños y la fecha en la que tomarás el permiso.

> **Dato clave:** si tu cumpleaños cae en fin de semana, puedes tomar el día en cualquier día hábil dentro de los 15 días siguientes. Este permiso es de disfrute personal: no es acumulable ni transferible.`,
      },
    ],
  },
  {
    title: "🔄 Módulo 3: Ciclo de Vida del Proyecto",
    matchTitle: "Módulo 3: Ciclo de Vida del Proyecto",
    isBlocking: true,
    dependsOnTitle: "🧰 Módulo 2: Ecosistema de Herramientas y Bienestar",
    processes: [
      {
        title: "🤝 Kickoff Interno (Prekickoff)",
        matchTitle: "Kickoff Interno (Prekickoff)",
        objective: "Alinear al equipo interno sobre las condiciones, alcance y expectativas del proyecto antes del kickoff con el cliente.",
        context:
          "Inicia cuando se recibe la confirmación de cierre comercial (contrato firmado y anticipo recibido) y termina con la ejecución del kickoff interno y la alineación completa del equipo. Owner: PDM, en colaboración con el equipo comercial y el equipo asignado.",
        expectedResult:
          "Equipo alineado y asignado en Basecamp, presentación de kickoff lista para el cliente, listado de preguntas clave y definición preliminar de la arquitectura.",
        resources: ["Google Drive (carpeta de proyectos)", "Google Chat / Google Suite", "Basecamp", "Formato de Pre Kickoff"],
        scope: "COMMON",
        steps: [
          { title: "Recibir el proyecto", instruction: "Monitorear el canal de cierre comercial y tomar el caso cuando se comparta el contexto inicial." },
          { title: "Validar condiciones de arranque", instruction: "Confirmar que el contrato esté firmado, el anticipo recibido y el 'GO' de gerencia esté en regla." },
          { title: "Construir la base del proyecto", instruction: "Crear la carpeta del proyecto en Drive y solicitar a comercial el documento de planeación." },
          { title: "Habilitar el ecosistema de trabajo", instruction: "Crear el canal del proyecto en Google Suite y el espacio de trabajo en Basecamp." },
          {
            title: "Activar al equipo",
            instruction: "Enviar el mensaje de apertura con el documento de pre kickoff, la carpeta del proyecto y los accesos, agregando a todos los participantes del proyecto.",
          },
          { title: "Agendar el kickoff interno", instruction: "Programar la sesión asegurando que ocurra antes del kickoff con el cliente." },
          { title: "Ejecutar la alineación interna", instruction: "Realizar la sesión de kickoff interno resolviendo dudas técnicas y de alcance con los insumos previos." },
        ],
      },
      {
        title: "🎬 Kickoff del Proyecto con Cliente",
        matchTitle: "Kickoff del Proyecto con Cliente",
        objective: "Formalizar el inicio del proyecto alineando expectativas, tiempos y entregables con el cliente.",
        context:
          "Inicia una vez formalizado el contrato y finaliza con la aprobación del cronograma por parte del cliente y la habilitación de los canales de comunicación. Owner: PDM, junto al equipo de Imagine y los stakeholders del cliente.",
        expectedResult: "Cronograma aprobado en la herramienta de gestión, acta de inicio aceptada y canal de comunicación activo con todos los involucrados.",
        resources: ["Basecamp", "Google Chat", "Figma"],
        scope: "COMMON",
        steps: [
          { title: "Presentar al equipo multidisciplinario", instruction: "Definir roles y quién será el punto de contacto principal para el cliente." },
          { title: "Contextualizar el negocio", instruction: "Escuchar la trayectoria de la empresa y sus cuellos de botella actuales." },
          { title: "Definir el alcance técnico", instruction: "Desglosar el proyecto en etapas claras." },
          { title: "Establecer hitos y cronograma", instruction: "Fijar fechas de inicio y entrega final, aclarando qué se considera un hito cumplido." },
          { title: "Acordar el protocolo de aprobación", instruction: "Establecer tiempos de respuesta máximos (ej. 3 días hábiles) para evitar bloqueos." },
          { title: "Identificar riesgos y mitigaciones", instruction: "Mapear posibles retrasos por falta de información o limitaciones técnicas de terceros." },
          { title: "Centralizar la comunicación", instruction: "Definir la herramienta oficial (Basecamp o Google Chat) para evitar dispersión de información." },
          { title: "Agendar seguimientos recurrentes", instruction: "Fijar un día y hora fija a la semana para revisar avances." },
          { title: "Solicitar insumos inmediatos", instruction: "Pedir accesos a repositorios, bases de datos históricas o archivos maestros de operación." },
        ],
      },
      {
        title: "📝 Generación de Historias de Usuario (HUs)",
        matchTitle: "Generación de Historias de Usuario (HUs)",
        objective: "Crear historias de usuario claras y accionables para los requerimientos de producto.",
        context:
          "Inicia cuando el cliente o el equipo define una nueva funcionalidad y termina cuando la HU está registrada en Basecamp como parte del plan de trabajo. Owner: PDM en colaboración con el Tech Lead.",
        expectedResult: "Historia de usuario con criterios de aceptación medibles, registrada y priorizada en Basecamp.",
        resources: ["Gimena (User Story Writer, Agents Hub)", "Figma"],
        scope: "COMMON",
        steps: [
          { title: "Preparar el contexto", instruction: "Revisar la visión del cliente y tener a mano los diseños de Figma." },
          { title: "Invocar a Gimena", instruction: "Abrir Agents Hub, elegir el proyecto e iniciar una conversación dándole contexto del proyecto y la arquitectura." },
          { title: "Redactar la historia", instruction: "Usar el formato 'Como [rol], quiero [acción], para [beneficio]'." },
          { title: "Definir criterios de aceptación", instruction: "Establecer criterios medibles (ej. 'el botón debe cambiar a verde al hacer clic')." },
          { title: "Validar viabilidad con el Tech Lead", instruction: "Reunirse para confirmar que la HU es técnicamente viable antes de continuar." },
          { title: "Registrar en Basecamp", instruction: "Cargar la HU, etiquetarla correctamente y asignarle su nivel de prioridad." },
        ],
      },
      {
        title: "🎯 Definición de Hitos",
        matchTitle: "Definición de Hitos",
        objective: "Establecer los momentos clave de entrega para medir el progreso real del proyecto.",
        context:
          "Inicia como borrador durante el Kickoff y se define formalmente durante la planeación, con el alcance inicial y el contrato como insumos. Owner: PDM, con el equipo de desarrollo y el cliente como colaboradores.",
        expectedResult: "Plan de hitos con fechas y dependencias aprobado por el cliente.",
        resources: ["Basecamp", "Formato de Plan de Trabajo"],
        scope: "COMMON",
        steps: [
          { title: "Identificar entregables", instruction: "Definir las funcionalidades o módulos entregables del proyecto." },
          { title: "Asignar fechas estimadas", instruction: "Fijar la fecha de finalización de cada hito." },
          { title: "Mapear dependencias técnicas", instruction: "Identificar dependencias entre tareas para evitar bloqueos." },
          { title: "Validar con el cliente", instruction: "Presentar el plan de hitos para su aprobación final." },
        ],
      },
      {
        title: "📐 Construcción de Plan de Trabajo",
        matchTitle: "Construcción de Plan de Trabajo",
        objective: "Organizar, guiar y controlar hitos, tiempos y alcances durante todo el ciclo de vida del proyecto.",
        context:
          "Comienza en la reunión de Kickoff y nunca se cierra de forma definitiva — es un documento vivo, en constante revisión. Owner: PDM, con la colaboración de todo el equipo del proyecto.",
        expectedResult:
          "Cronograma definido, matriz de riesgos actualizada, registro de cambios, diagrama de Gantt, Basecamp estructurado e historias de usuario listas para desarrollo.",
        resources: ["Basecamp", "Google Drive", "Plantilla de Cronograma / Gantt"],
        scope: "COMMON",
        steps: [
          { title: "Revisar y documentar lo inicial", instruction: "Definir los hitos del proyecto e iniciar el desglose preliminar de tareas." },
          {
            title: "Construir el cronograma",
            instruction: "Crear la línea de tiempo con un Task Breakdown o Diagrama de Gantt, pensando el proyecto en retrospectiva desde la entrega hacia hoy.",
          },
          { title: "Crear las historias de usuario", instruction: "Construir las HU de cada tarea del cronograma con ayuda de Gimena." },
          { title: "Gestionar riesgos", instruction: "Documentar las dificultades identificadas en la Matriz de Riesgos y definir planes de mitigación." },
          {
            title: "Registrar cambios",
            instruction: "Dejar constancia de nuevas implementaciones o imprevistos que modifiquen fechas o alcances pactados en un registro de cambios.",
          },
          {
            title: "Consolidar el plan",
            instruction: "Completar el desglose de tareas en un máximo de dos semanas desde el inicio del proyecto, registrando las historias en Basecamp.",
          },
        ],
      },
      {
        title: "🚨 Levantamiento de Alertas (Triage / UCI)",
        matchTitle: "Levantamiento de Alertas (Triage / UCI)",
        objective: "Escalar riesgos de forma temprana antes de que se conviertan en problemas críticos.",
        context:
          "Inicia cuando se detecta un riesgo inminente (ej. el cliente no entrega información o el equipo se salta procesos) y termina con la confirmación de cierre de la alerta. Owner: PDM.",
        expectedResult: "Alerta documentada y resuelta, con mensaje de cierre confirmado en el canal correspondiente.",
        resources: ["Canal de Triage (Slack)", "Canal de UCI (Slack)"],
        scope: "COMMON",
        steps: [
          { title: "Identificar la situación", instruction: "Detectar qué está deteniendo el flujo: un retraso del cliente, un cambio de alcance o falta de respuesta de algún integrante." },
          { title: "Clasificar la severidad", instruction: "Definir si la situación es Baja, Media, Alta o Crítica." },
          { title: "Elegir el canal de escalamiento", instruction: "Usar el canal de Triage si es estable pero requiere revisión, o el canal de UCI si requiere atención inmediata." },
          { title: "Lanzar el mensaje", instruction: "Abrir un hilo con el título de la alerta, etiquetando a la gerencia implicada." },
          { title: "Describir y proponer", instruction: "Explicar el problema con claridad y agregar posibles soluciones o los recursos que hacen falta." },
          { title: "Hacer seguimiento", instruction: "Mantener el hilo activo hasta que la situación se resuelva." },
          { title: "Cerrar el ciclo", instruction: "Confirmar con un mensaje final que la alerta quedó cerrada." },
        ],
      },
      {
        title: "☀️ Daily",
        matchTitle: "Daily",
        objective: "Sincronizar al equipo diariamente sobre el progreso del Sprint y adaptar el plan de trabajo de forma colectiva.",
        context:
          "Inicia a las 8:00 AM y dura máximo 15 minutos si es síncrona. Termina con un plan de acción adaptado para las próximas 24 horas. Facilitador: PDM.",
        expectedResult: "Hilo con el plan de trabajo adaptado y registro de bloqueos en gestión.",
        resources: ["Google Chat (hilos)", "Google Meet", "Basecamp (Sprint Backlog)"],
        scope: "COMMON",
        steps: [
          { title: "Responder al llamado del bot", instruction: "Sincronizarse a las 8:00 AM para que todo el equipo esté alineado desde el inicio de la jornada." },
          { title: "Compartir el progreso", instruction: "Cada persona comparte brevemente cómo su trabajo del día anterior aportó al Objetivo del Sprint." },
          { title: "Adaptar el plan", instruction: "Definir qué se hará hoy y ajustar el Sprint Backlog si es necesario." },
          {
            title: "Usar emojis de estado",
            instruction: "Marcar cada tarea con ✔️ Dev, ✅ Listo QA, ❌ Bloqueo o ⏩ En proceso para que el estado sea legible de un vistazo.",
          },
          { title: "Colaborar activamente", instruction: "Leer los reportes del equipo y ofrecer ayuda de inmediato si alguien tiene un bloqueo que puedes resolver." },
          { title: "Escalar bloqueos", instruction: "Si el obstáculo requiere gestión externa, el PDM lo escala para que el equipo siga fluyendo." },
        ],
      },
      {
        title: "📅 Weekly",
        matchTitle: "Weekly",
        objective: "Sincronizar de forma táctica el estado semanal de cada proyecto y permitir la reasignación oportuna de prioridades.",
        context:
          "Inicia los lunes con la creación del hilo semanal y tiene una actualización los jueves. Termina con la confirmación de recepción del líder de operaciones. Owner: PDM.",
        expectedResult: "Hilo estructurado en Google Chat con el mapeo semanal de objetivos y su estado de cumplimiento actualizado al jueves.",
        resources: ["Canal Centro de Operaciones (Google Chat)"],
        scope: "COMMON",
        steps: [
          {
            title: "Iniciar el hilo (lunes)",
            instruction: "Generar un nuevo hilo en el canal de Centro de Operaciones con el formato 'Semana [Número]; del [Día inicio] al [Día cierre] de [Mes] de [Año]'.",
          },
          { title: "Notificar al liderazgo", instruction: "Mencionar en el mensaje inicial a las líderes de operaciones para que estén al tanto desde el inicio." },
          { title: "Listar los objetivos por proyecto", instruction: "Responder al propio hilo listando cada proyecto activo y sus objetivos." },
          { title: "Marcar el estado con emojis", instruction: "Usar ✅ Finalizado, ⏩ En Progreso, ❌ Bloqueado o ☑️ Pendiente para cada objetivo." },
          { title: "Confirmar recepción", instruction: "Esperar la respuesta del líder de operaciones validando la información y definiendo pasos a seguir si hay bloqueos." },
          { title: "Actualizar el jueves", instruction: "Reenviar el mensaje con el formato actualizado mostrando el avance desde el lunes." },
        ],
      },
    ],
  },
  {
    title: "🧭 Módulo 4: Tu Rol en Imagine Apps",
    matchTitle: "Módulo 4: Tu Rol en Imagine Apps",
    isBlocking: true,
    dependsOnTitle: "🔄 Módulo 3: Ciclo de Vida del Proyecto",
    processes: [
      // --- Operaciones (rol PDM) ---
      {
        title: "🗒️ Actas de Reunión",
        matchTitle: "Actas de Reunión",
        objective: "Documentar decisiones y compromisos de cada reunión para que queden registrados y sean accionables.",
        context: "Inicia al terminar una reunión y debe compartirse dentro de las 24 horas siguientes. Owner: PDM.",
        expectedResult: "Documento de acta formateado y enviado por correo a los participantes.",
        resources: ["Agents Hub (Acta IA)"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Cargar el contenido", instruction: "Abrir Agents Hub, seleccionar el proyecto y crear una nueva conversación de Actas IA." },
          { title: "Generar el acta", instruction: "Cargar el documento generado por Gemini, indicando idioma y agenda, y generar el acta." },
          { title: "Revisar y refinar", instruction: "Revisar el acta generada y ajustarla donde haga falta." },
          { title: "Compartir el acta", instruction: "Exportar el archivo y compartirlo con los participantes por correo dentro de las 24 horas siguientes a la reunión." },
        ],
      },
      {
        title: "⚠️ Matriz de Riesgo",
        matchTitle: "Matriz de Riesgo",
        objective: "Identificar, priorizar y gestionar los riesgos del proyecto, asegurando su seguimiento y escalamiento oportuno.",
        context: "Los riesgos se documentan en una matriz con probabilidad e impacto para priorizarlos. Owner: PDM, apoyado en el líder técnico si aplica.",
        expectedResult: "Matriz de riesgos actualizada, con riesgos críticos escalados y acciones de mitigación en curso.",
        resources: ["Matriz de Riesgos (Google Sheets)"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          {
            title: "Listar los riesgos potenciales",
            instruction: "Identificar riesgos técnicos, operativos, de comunicación, de cliente y de habilidades del equipo a partir del seguimiento, QA y feedback.",
          },
          { title: "Registrar cada riesgo", instruction: "Completar ID, descripción, categoría, probabilidad, impacto, causa raíz, estrategia, acciones, responsable y estado." },
          { title: "Evaluar probabilidad e impacto", instruction: "Asignar valores de 1 a 5 a cada uno según el contexto del proyecto." },
          { title: "Calcular el nivel del riesgo", instruction: "Multiplicar probabilidad por impacto para priorizar entre alto, medio y bajo." },
          {
            title: "Definir estrategia de mitigación",
            instruction: "Establecer acciones concretas, responsables y medidas preventivas o correctivas para los riesgos relevantes.",
          },
          { title: "Escalar riesgos críticos", instruction: "Si el puntaje supera 12 o impacta entregas, demos o al cliente, notificarlo en los hilos de Triage/UCI." },
          { title: "Hacer seguimiento semanal", instruction: "Actualizar el estado y ajustar las acciones, validando si el riesgo se mantiene, escala o se cierra." },
          { title: "Cerrar o mitigar", instruction: "Marcar como mitigado o cerrado cuando el riesgo esté controlado o resuelto." },
        ],
      },
      {
        title: "🔍 360º (Operación 360)",
        matchTitle: "360º (Operación 360)",
        objective: "Evaluar de forma integral la salud operativa de los proyectos para detectar problemas y potenciar los aciertos.",
        context: "Sesión semanal que requiere que ya se haya hecho el reporte de Project Status. Owner: PDM.",
        expectedResult: "Alertas y estrategias de mitigación registradas para cada riesgo identificado en la sesión.",
        resources: ["Agente Gabriela"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Programar la sesión", instruction: "Agendar la sesión 360 con todos los stakeholders del proyecto." },
          { title: "Consolidar el estado", instruction: "Antes de la reunión, revisar finanzas, tiempos de entrega y el clima del equipo de cada proyecto." },
          { title: "Enviar el reporte", instruction: "Enviar el status consolidado a todos los asistentes antes de las 11:00 AM." },
          { title: "Levantar alertas en la sesión", instruction: "Durante la reunión, enfocarse en identificar y exponer los problemas detectados." },
          { title: "Definir estrategias de mitigación", instruction: "Para cada alerta, acordar una acción inmediata: ajustar una fecha, sumar recursos, etc." },
        ],
      },
      {
        title: "📊 Project Status",
        matchTitle: "Project Status",
        objective: "Garantizar la transparencia y el seguimiento preciso de la salud de cada proyecto.",
        context:
          "Inicia todos los lunes a primera hora y termina con el envío del reporte antes del mediodía, con los avances de la semana anterior de cada líder de área. Owner: PDM.",
        expectedResult: "Reporte de status publicado en el canal de operaciones de Slack.",
        resources: ["Canal de Operaciones (Slack)", "Dashboard de Reporte de Status"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Elegir el proyecto a reportar", instruction: "Entrar al selector de proyectos y confirmar que estás en el correcto." },
          { title: "Marcar las fechas clave", instruction: "Definir la fecha de entrega del hito actual y cualquier fecha relevante adicional." },
          { title: "Diagnosticar la salud del proyecto", instruction: "Clasificar el estado como Estable, Alerta o Crítico." },
          { title: "Definir la probabilidad de éxito", instruction: "Marcar si la probabilidad de cumplimiento es Alta, Media o Baja." },
          { title: "Reunir los insights del equipo", instruction: "Hablar con Tech, QA, UX y PM y resumir en puntos clave qué lograron y en qué están trabajando." },
          { title: "Completar valor agregado y riesgos", instruction: "Registrar qué se le dio de extra al cliente y qué apoyo se necesita de otros equipos." },
          { title: "Enviar el reporte", instruction: "Publicarlo en el canal de operaciones antes del mediodía del lunes." },
        ],
      },
      {
        title: "⭐ NPS (Net Promoter Score)",
        matchTitle: "NPS (Net Promoter Score)",
        objective: "Medir y potenciar la satisfacción del cliente mediante feedback directo y accionable.",
        context:
          "Inicia semestralmente al cierre de un sprint y termina con la implementación de acciones de mejora basadas en el feedback. Owner: PDM y Dirección de Operaciones.",
        expectedResult: "Score actualizado en el dashboard de operaciones y, si aplica, plan de mejora presentado al equipo.",
        resources: ["Formato NPS", "Carpeta de registro"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Socializar la encuesta", instruction: "Explicarle al cliente que su opinión es clave para mejorar y que su sinceridad es lo más valioso." },
          { title: "Enviar la encuesta", instruction: "Enviar el link justo al cierre del sprint seleccionado." },
          { title: "Registrar la respuesta", instruction: "Guardar el puntaje y los comentarios escritos en el sistema de seguimiento." },
          { title: "Analizar los insights", instruction: "Identificar qué le duele y qué le gusta al cliente, buscando acciones concretas." },
          { title: "Compartir resultados con el equipo", instruction: "Comunicar los resultados a todo el equipo del proyecto." },
          { title: "Definir un plan de rescate si el NPS es menor a 8", instruction: "Reunirse con el equipo para definir acciones de mejora para el próximo semestre." },
        ],
      },
      {
        title: "💓 Pulso de Operaciones",
        matchTitle: "Pulso de Operaciones",
        objective: "Alinear la cultura operativa mediante la resolución de cuellos de botella y el escalamiento de innovaciones probadas.",
        context: "Sesión semanal de una hora, a partir del backlog de puntos de dolor o innovaciones detectadas la semana previa. Owner: PDMs.",
        expectedResult: "Actualización oficial de los procedimientos en la documentación y comunicación del cambio a toda la operación.",
        resources: ["Miro"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Programar la sesión semanal", instruction: "Agendar un espacio donde el equipo se sienta cómodo para compartir." },
          { title: "Elegir el tema de la semana", instruction: "Revisar el backlog y seleccionar una buena práctica, metodología o innovación a tratar." },
          { title: "Compartir contexto previo", instruction: "Enviar el tema y un breve contexto a los participantes un día antes." },
          { title: "Facilitar la sesión", instruction: "Abrir el espacio con Miro si hace falta visualizar ideas complejas." },
          { title: "Co-crear soluciones", instruction: "Generar una lluvia de comentarios y aportes para que la solución nazca del equipo." },
          { title: "Recopilar el feedback", instruction: "Capturar los puntos clave y actualizar la documentación de procedimientos." },
        ],
      },
      {
        title: "📈 Planes de Mejora",
        matchTitle: "Planes de Mejora",
        objective: "Transformar las oportunidades detectadas en fortalezas mediante un plan de acción claro y con seguimiento.",
        context:
          "Inicia cuando se identifican brechas de desempeño persistentes (~2 meses) y termina con una evaluación integral tras 4 semanas de seguimiento. Owner: líder directo, con participación activa de la persona colaboradora.",
        expectedResult: "Documento de Plan de Mejora firmado y actualizado con los resultados de los KPIs.",
        resources: ["Agente Ginna", "Matriz de Seguimiento"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Identificar fortalezas y retos", instruction: "Reconocer lo que la persona hace bien y señalar con claridad dónde están los baches." },
          {
            title: "Definir objetivos claros",
            instruction: "Establecer qué se quiere lograr, por ejemplo mejorar la autonomía o cumplir al 100% los compromisos del sprint.",
          },
          { title: "Diseñar acciones concretas", instruction: "Crear tareas específicas: sesiones 1:1, revisiones de calidad, ajustes en dailies." },
          { title: "Asignar responsables y plazos", instruction: "Cada acción debe tener un dueño y una fecha de cumplimiento." },
          { title: "Establecer KPIs", instruction: "Definir cómo se sabrá que se va por buen camino." },
          { title: "Acompañar semanalmente", instruction: "Programar revisiones para ajustar el plan según sea necesario." },
          { title: "Cerrar y evaluar", instruction: "Al cumplir las 4 semanas, revisar los indicadores y decidir si se cierra el plan o se continúa." },
        ],
      },
      {
        title: "🗣️ 1:1 (One on One)",
        matchTitle: "1:1 (One on One)",
        objective: "Crear un espacio seguro de alineación humana y operativa con compromisos bidireccionales.",
        context:
          "Una vez al mes, de forma obligatoria para cada reporte directo. Termina con la publicación del resumen en el canal '1:1// [Nombre]'. Owner: líder directo (CXO, líder de área, PDM).",
        expectedResult: "Resumen de tareas bidireccionales posteado en el canal dedicado, con los acuerdos de la sesión.",
        resources: ["Canal 1:1// [Nombre]", "Formato de preguntas de 3 fases"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Sincronización humana", instruction: "Validar salud mental, energía y balance vida-trabajo antes de hablar de temas de oficina." },
          { title: "Diagnóstico de operaciones", instruction: "Identificar fricciones en procesos y fallas de liderazgo o de información." },
          { title: "Ingeniería de crecimiento", instruction: "Conectar las tareas actuales con el plan de carrera y detectar oportunidades de automatización." },
          { title: "Definir compromisos bidireccionales", instruction: "Acordar qué debe cumplir el imaginer y qué debe hacer el líder para desbloquearlo." },
          { title: "Publicar el resumen", instruction: "Postear en el canal dedicado el estatus, las tareas del imaginer y las del líder." },
        ],
      },
      {
        title: "🎒 Onboarding de Proyecto",
        matchTitle: "Onboarding de Proyecto",
        objective: "Integrar a los nuevos miembros del equipo de un proyecto de forma efectiva.",
        context:
          "Inicia cuando People confirma la contratación y termina cuando la persona tiene autonomía total y objetivos claros para su primer mes. Owner: PDM.",
        expectedResult: "La persona cuenta con toda la información, accesos y metas del primer mes cargadas en su tablero.",
        resources: ["LearningHub", "Agente Gabriela"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Verificar el onboarding administrativo", instruction: "Confirmar que People ya haya entregado los accesos y el equipo básico." },
          { title: "Compartir la cultura", instruction: "Organizar un encuentro para transmitir los valores y el sentir del equipo." },
          {
            title: "Preparar los accesos",
            instruction: "Coordinar con el Tech Lead o la Gerencia de Experiencia los accesos a Basecamp, Google Chat, Bitbucket y Figma según el rol.",
          },
          { title: "Definir horarios y expectativas", instruction: "Explicar los horarios de las ceremonias y las expectativas de disponibilidad." },
          { title: "Presentar a la persona con el equipo", instruction: "Hacer un tour por los hitos y logros del proyecto si ya está en marcha." },
          { title: "Compartir el LearningHub", instruction: "Dar acceso a la guía de referencia del proyecto." },
          { title: "Definir metas de los primeros 30 días", instruction: "Fijar objetivos pequeños y alcanzables para generar confianza temprana." },
          { title: "Alinear técnicamente", instruction: "Coordinar con el Tech Lead la explicación de la arquitectura, el flujo de Git y el estándar de PRs." },
        ],
      },
      {
        title: "👋 Offboarding",
        matchTitle: "Offboarding",
        objective: "Asegurar un cierre operativo impecable y extraer insights honestos de la experiencia del talento que se va.",
        context:
          "Inicia tras la confirmación formal de la salida y termina días después, cuando People documenta los hallazgos de la entrevista de diagnóstico. Owner: líder directo (fase operativa) y equipo de People (fase diagnóstica).",
        expectedResult: "Checklist de Handoff aprobado y bitácora de salida documentada por People.",
        resources: ["Checklist de Handoff", "Guion de Entrevista Post-Salida"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Mapear los proyectos", instruction: "Revisar con la persona el estado exacto de cada tarea: entregado, en progreso o bloqueado." },
          { title: "Documentar el conocimiento informal", instruction: "Asegurar que toda la documentación de procesos quede en Drive." },
          { title: "Transferir la propiedad", instruction: "Pasar tableros, carpetas y repositorios al nuevo responsable." },
          { title: "Revocar accesos", instruction: "Quitar licencias (Figma, IAs, G-Suite) y validar la entrega de equipos físicos el último día." },
          { title: "Programar la entrevista de salida", instruction: "Agendarla días después de la salida, aclarando que el objetivo es escuchar su perspectiva honesta." },
          { title: "Realizar la entrevista", instruction: "Enfocarse en la seguridad psicológica del talento para obtener feedback real." },
          { title: "Sintetizar los hallazgos", instruction: "Procesar la transcripción y compartir los insights con la Dirección de Operaciones." },
        ],
      },
      {
        title: "📦 Entrega Parcial",
        matchTitle: "Entrega Parcial",
        objective: "Formalizar y aprobar las tareas completadas en un periodo específico.",
        context:
          "Inicia al finalizar un ciclo de entregas (ej. fin de mes) y termina con la confirmación de recepción del cliente por correo. Owner: PDM y el tomador de decisiones del cliente.",
        expectedResult: "Acta de Entrega Parcial enviada y confirmada por correo por el cliente.",
        resources: ["Agente Claude (extracción de Basecamp)", "Formato de Acta de Entrega Parcial"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Extraer la información de Basecamp", instruction: "Usar el comando indicado para traer el listado actualizado de tareas." },
          { title: "Organizar la información", instruction: "Pedirle a la IA que arme una tabla con ID, tarea, estado y fecha." },
          { title: "Completar el encabezado", instruction: "Incluir el nombre del proyecto, la fecha y los responsables de ambas partes." },
          { title: "Resumir el valor entregado", instruction: "Explicar brevemente qué busca confirmar y aprobar el documento." },
          { title: "Incluir la tabla de tareas", instruction: "Pegar el listado, marcando 'Approved' cada ítem que ya pasó los filtros de calidad." },
          { title: "Solicitar confirmación", instruction: "Enviar el documento y pedir una respuesta formal por correo." },
        ],
      },
      {
        title: "🏁 Entrega Final",
        matchTitle: "Entrega Final",
        objective: "Garantizar la recopilación y entrega organizada de toda la información esencial al cliente al finalizar el contrato.",
        context:
          "Inicia cuando todos los entregables están completos y termina con el recibido/aprobado formal del cliente. Requiere el paquete completo: código, diseños, QA y documentación técnica. Owner: PDM.",
        expectedResult: "Correo de cierre enviado, con el enlace al Google Site centralizado y la confirmación de aprobación del cliente.",
        resources: ["Google Sites (plantilla de entrega)", "Google Drive"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Crear el Google Site", instruction: "Copiar la plantilla oficial de entregas dentro de la carpeta del proyecto en Drive." },
          { title: "Centralizar el contenido", instruction: "Cargar los enlaces a repositorios, el diseño final en Figma, los reportes de QA y la documentación técnica." },
          { title: "Verificar accesos", instruction: "Confirmar que el cliente tenga permisos de lectura y descarga en todos los enlaces." },
          { title: "Enviar el correo de cierre", instruction: "Redactar el resumen ejecutivo con el listado de documentos y el enlace al Site." },
          { title: "Solicitar el recibido y aprobado", instruction: "Especificar el plazo estipulado para la respuesta antes de la extensión tácita." },
          { title: "Coordinar la reunión de cierre", instruction: "Presentar el Site al cliente y resolver dudas finales." },
        ],
      },
      {
        title: "🛡️ Manejo de Garantía",
        matchTitle: "Manejo de Garantía",
        objective: "Gestionar correcciones y mantenimientos post-entrega según los términos contractuales.",
        context:
          "Inicia tras la entrega final y termina cuando vence el periodo de garantía del contrato, a partir del reporte del cliente por el canal oficial. Owner: PDM / Equipo de Soporte.",
        expectedResult: "Tickets cerrados en Help Desk y registro de mantenimiento actualizado.",
        resources: ["Help Desk"],
        scope: "ROLE",
        roleKeys: ["PDM"],
        steps: [
          { title: "Recibir la solicitud", instruction: "Registrar el ajuste o error reportado a través del Help Desk." },
          { title: "Validar la garantía", instruction: "Confirmar que el reporte entra en el periodo y los términos de garantía del contrato." },
          { title: "Asignar al equipo técnico", instruction: "Derivar la tarea para su pronta resolución." },
          { title: "Notificar al cliente", instruction: "Avisar una vez el ajuste haya sido desplegado." },
        ],
      },
      // --- Compartido: PDM + Experiencia ---
      {
        title: "🔗 Empalme de Duplas",
        matchTitle: "Empalme de Duplas",
        objective: "Asegurar la continuidad operativa y la trazabilidad de los proyectos mediante el trabajo en dupla.",
        context:
          "Inicia cuando se define una dupla para un proyecto y termina cuando ambos integrantes tienen visibilidad total y autonomía operativa. Owner: Dirección de Operaciones; colaboradores: PDM y equipo de Experiencia.",
        expectedResult: "Documento de empalme completo, ambos miembros con accesos habilitados y acta de compromisos registrada.",
        resources: ["Formato de Duplas", "Repositorio de documentación del proyecto"],
        scope: "ROLE",
        roleKeys: ["PDM", "UX_UI_DESIGNER"],
        steps: [
          { title: "Sincronizar agendas", instruction: "Programar la sesión de empalme entre ambos integrantes de la dupla." },
          { title: "Revisar el contexto del proyecto", instruction: "Repasar juntos de dónde viene el cliente y hacia dónde va el proyecto." },
          { title: "Transferir el conocimiento técnico y funcional", instruction: "Explicar a detalle el estado del proyecto sin dejar nada afuera." },
          { title: "Revisar el estado actual", instruction: "Compartir qué tareas están en curso, qué bloquea y cuáles son los riesgos vigentes." },
          { title: "Validar accesos", instruction: "Confirmar que ambos tengan acceso a herramientas, repositorios y carpetas." },
          { title: "Documentar los acuerdos", instruction: "Registrar los puntos clave de la sesión en el formato de empalme." },
          { title: "Dar seguimiento", instruction: "Acompañar a la dupla en el tiempo para asegurar continuidad del ritmo de trabajo." },
        ],
      },
      // --- Experiencia (rol UX/UI) ---
      {
        title: "🎤 Design Interview (Kick Off)",
        matchTitle: "Design Interview (Kick Off)",
        objective: "Obtener insights clave del cliente para alinear objetivos, necesidades y expectativas del producto.",
        context: "Inicia después de recibir el brief inicial, normalmente durante el Kick-off. Owner: Diseñador UX/UI, colaboradores: cliente y PM.",
        expectedResult: "Tablero de FigJam con los insights documentados.",
        resources: ["FigJam (plantilla de preguntas estructuradas)"],
        scope: "ROLE",
        roleKeys: ["UX_UI_DESIGNER"],
        steps: [
          { title: "Preparar la plantilla", instruction: "Verificar que exista la carpeta del proyecto en Figma y traer la plantilla de preguntas al FigJam." },
          { title: "Abrir la sesión", instruction: "Compartir pantalla y registrar el nombre de las personas asistentes." },
          { title: "Indagar sobre el negocio", instruction: "Preguntar sobre el propósito y cómo se ve el éxito del producto en un año." },
          { title: "Explorar el look & feel", instruction: "Usar referentes y moodboards para identificar la personalidad visual que el cliente prefiere." },
          { title: "Cerrar con un resumen", instruction: "Confirmar con el cliente los puntos clave detectados durante la sesión." },
        ],
      },
      {
        title: "🗂️ Plan de Trabajo (Experiencia)",
        matchTitle: "Plan de Trabajo (Experiencia)",
        objective: "Definir la hoja de ruta del proyecto con tareas, responsables y tiempos.",
        context: "Inicia cuando se recibe el alcance del proyecto y termina cuando el plan está aprobado y compartido con el PM. Owner: Project Manager, colaboradores: Diseño y Cliente.",
        expectedResult: "Documento de plan de trabajo aprobado.",
        resources: ["Google Sheets (plantilla Imagine)", "Gabo (Planner)"],
        scope: "ROLE",
        roleKeys: ["UX_UI_DESIGNER"],
        steps: [
          {
            title: "Preparar la estructura de columnas",
            instruction: "Definir tarea, actividad principal, responsable, prioridad, owner, status, fechas y comentarios.",
          },
          {
            title: "Desglosar por fases",
            instruction:
              "Dividir el proyecto en Fase 0 (Kickoff e investigación), Fase 1 (UX/Sitemaps), Fase 2 (UI/Design System), Fase 3 (Desarrollo) y Fase 4 (Pruebas y lanzamiento).",
          },
          { title: "Definir tiempos realistas", instruction: "Asignar fechas con margen y verificar que el diseño termine antes de que empiece el desarrollo." },
          { title: "Aplicar el formato visual", instruction: "Usar colores para diferenciar disciplinas y activar filtros para que cualquiera encuentre sus tareas." },
        ],
      },
      {
        title: "🗺️ Sitemaps",
        matchTitle: "Sitemaps",
        objective: "Diagramar la navegación lógica de la persona usuaria dentro del sistema.",
        context: "Inicia al finalizar la definición de requerimientos. Owner: Diseñador UX/UI.",
        expectedResult: "Diagrama de flujos de navegación validado con el equipo interno y el cliente.",
        resources: ["FigJam"],
        scope: "ROLE",
        roleKeys: ["UX_UI_DESIGNER"],
        steps: [
          { title: "Crear las cards por sección", instruction: "Para cada pantalla principal, definir título, descripción y componentes necesarios." },
          { title: "Detallar con post-its", instruction: "Usar post-its azules para datos/columnas y amarillos para preguntas o dudas pendientes." },
          { title: "Marcar caminos de decisión", instruction: "Usar rombos para las decisiones del sistema, con conector verde para éxito y rojo para error." },
          { title: "Conectar las pantallas", instruction: "Trazar líneas que muestren el recorrido completo, asegurando que cada pantalla tenga entrada y salida." },
          { title: "Validar el flujo", instruction: "Revisarlo con el equipo interno y con el cliente, y ajustar según el feedback recibido." },
        ],
      },
      {
        title: "🎨 Lineamientos de Diseño",
        matchTitle: "Lineamientos de Diseño",
        objective:
          "Definir la UI del proyecto mediante dos propuestas sobre una pantalla crítica, minimizando reprocesos en el diseño masivo.",
        context:
          "Inicia tras la entrevista de lineamientos y la definición de la arquitectura de información. Termina con la elección de una propuesta o un mix aprobado por el cliente. Owner: Diseñador.",
        expectedResult: "Pantalla crítica aprobada en Figma, que sirve de base para el resto del sistema.",
        resources: ["Figma (variantes y estilos globales)", "Moodboards de referencia"],
        scope: "ROLE",
        roleKeys: ["UX_UI_DESIGNER"],
        steps: [
          { title: "Seleccionar la pantalla maestra", instruction: "Elegir la que resume la mayor cantidad de componentes y valor del producto." },
          { title: "Diseñar la Propuesta A", instruction: "Implementar una línea visual específica (ej. botones circulares, paleta vibrante)." },
          { title: "Diseñar la Propuesta B", instruction: "Implementar una línea visual contrastante (ej. botones cuadrados, paleta sobria)." },
          { title: "Presentar ambas opciones", instruction: "Exponer el porqué de cada decisión visual al cliente." },
          { title: "Capturar percepciones", instruction: "Identificar qué elementos generan mayor tracción emocional en el cliente." },
          { title: "Negociar el mix si aplica", instruction: "Definir qué componentes de cada propuesta se van a fusionar." },
          { title: "Ajustar la pantalla ganadora", instruction: "Refinarla para que sirva de plantilla base del UI Kit." },
        ],
      },
      {
        title: "🧩 Creación de UI Kit / Design System",
        matchTitle: "Creación de UI Kit / Design System",
        objective: "Estandarizar los componentes visuales del producto para garantizar consistencia.",
        context: "Inicia tras la aprobación de los lineamientos de diseño. Owner: Diseñador UX/UI.",
        expectedResult: "Design System completo en Figma, validado con el equipo de desarrollo.",
        resources: ["Figma"],
        scope: "ROLE",
        roleKeys: ["UX_UI_DESIGNER"],
        steps: [
          { title: "Definir estilos base", instruction: "Establecer colores y tipografía." },
          { title: "Crear variables", instruction: "Definir tamaños y colores como variables reutilizables." },
          { title: "Crear componentes reutilizables", instruction: "Construir los componentes UI base del sistema." },
          { title: "Definir estados", instruction: "Configurar hover, active y disabled para cada componente." },
          { title: "Organizar la librería", instruction: "Ordenar los componentes dentro de la librería de Figma." },
          { title: "Documentar el uso", instruction: "Explicar cómo y cuándo usar cada componente." },
          { title: "Validar con el equipo de desarrollo", instruction: "Revisar en conjunto que los componentes sean viables de implementar." },
        ],
      },
      {
        title: "🤲 Handoff al Equipo de Desarrollo",
        matchTitle: "Handoff al Equipo de Desarrollo",
        objective: "Entregar todas las especificaciones de diseño al equipo de desarrollo.",
        context: "Inicia al aprobarse los diseños finales de alta fidelidad. Owner: Diseñador UX/UI.",
        expectedResult: "Archivo de Figma listo para inspección, con assets exportados (o rama de código lista, si es vibecoding).",
        resources: ["Figma"],
        scope: "ROLE",
        roleKeys: ["UX_UI_DESIGNER"],
        steps: [
          { title: "Documentar los flujos", instruction: "Conectar las pantallas con líneas de flujo, sin asumir que el equipo de Dev sabe a dónde va cada botón." },
          { title: "Diseñar casos de éxito y error", instruction: "Conectar los estados de error y de éxito en el prototipo." },
          { title: "Dejar anotaciones técnicas", instruction: "Usar la herramienta de anotaciones de Figma para notas como comportamientos de scroll o transiciones." },
          {
            title: "Coordinar con Dev antes de codear (si aplica vibecoding)",
            instruction: "Alinear con un desarrollador la creación de la rama ux-ui/nombre-del-modulo antes de tocar código.",
          },
          {
            title: "Documentar cambios en Markdown (si aplica vibecoding)",
            instruction: "Generar un resumen de los cambios realizados y subirlo junto con el código.",
          },
        ],
      },
      {
        title: "📬 Entrega a Cliente (Diseño)",
        matchTitle: "Entrega a Cliente (Diseño)",
        objective: "Formalizar la entrega final de los archivos de diseño al cliente.",
        context: "Inicia al finalizar la fase de diseño del proyecto. Owner: Project Manager; colaboradores: Diseñador, Desarrollador(es), Cliente.",
        expectedResult: "Entrega aprobada, con accesos compartidos al cliente.",
        resources: ["Figma", "Google Drive"],
        scope: "ROLE",
        roleKeys: ["UX_UI_DESIGNER"],
        steps: [
          { title: "Preparar los entregables finales", instruction: "Descargar copias de todos los archivos trabajados en Figma." },
          {
            title: "Organizar accesos y archivos",
            instruction: "Subir todo a la carpeta 'Experiencia' del proyecto en Drive, incluyendo recursos, assets e íconos.",
          },
          { title: "Realizar la presentación final", instruction: "Explicar cómo está conformado el archivo y confirmar los links del prototipo." },
          { title: "Hacer seguimiento a la aprobación", instruction: "Estar al tanto del momento en que el proyecto quede cerrado y aprobado por el cliente." },
        ],
      },
      {
        title: "👀 Revisiones con el Cliente",
        matchTitle: "Revisiones con el Cliente",
        objective: "Alinear los avances del proyecto con el cliente y validar entregables para evitar desviaciones.",
        context:
          "Inicia en cada hito de revisión (prototipo, sitemap, UI). Termina cuando se recoge el feedback y se definen compromisos para la siguiente iteración. Owner: Project Manager; colaboradores: Diseñador, Desarrollador, Cliente.",
        expectedResult: "Feedback documentado, prototipo compartido y lista de compromisos definida para la siguiente iteración.",
        resources: ["Figma", "Basecamp", "Google Meet"],
        scope: "ROLE",
        roleKeys: ["UX_UI_DESIGNER"],
        steps: [
          { title: "Definir qué se va a revisar", instruction: "Acordar previamente el entregable objeto de la sesión." },
          { title: "Presentar la agenda", instruction: "Explicar el objetivo y alcance de la sesión al inicio." },
          { title: "Mostrar los entregables en vivo", instruction: "Navegar el prototipo funcional en Figma explicando el flujo y la lógica del diseño." },
          { title: "Recoger feedback", instruction: "Resolver dudas en tiempo real y documentar todos los comentarios recibidos, en vivo o por Basecamp." },
          { title: "Cerrar con un recap", instruction: "Resumir qué se dijo y qué cambia, definiendo compromisos y siguientes pasos." },
        ],
      },
      {
        title: "🔬 Revisiones con el Equipo Interno y de Experiencia",
        matchTitle: "Revisiones con el Equipo Interno y de Experiencia",
        objective: "Validar la calidad de los entregables antes de presentarlos al cliente, para reducir errores y retrabajo.",
        context:
          "Inicia mínimo un día antes de una revisión con cliente y termina al aplicar los ajustes del feedback interno. Owner: Diseñador UX/UI; colaboradores: equipo de Experiencia, PM, otros diseñadores.",
        expectedResult: "Prototipo validado internamente, con el feedback resuelto y listo para presentación al cliente.",
        resources: ["Figma", "Chat interno (Slack)"],
        scope: "ROLE",
        roleKeys: ["UX_UI_DESIGNER"],
        steps: [
          { title: "Preparar el link actualizado", instruction: "Tener listo el archivo de Figma con la última versión." },
          {
            title: "Redactar la solicitud de revisión",
            instruction: "Incluir nombre del proyecto, fecha de revisión con cliente, contexto, qué se entrega y requerimientos específicos.",
          },
          { title: "Enviar al canal de revisiones internas", instruction: "Compartirlo con al menos 24 horas de anticipación, mencionando a todo el equipo." },
          { title: "Recibir y priorizar el feedback", instruction: "Analizar los comentarios recibidos en Figma o en el chat." },
          { title: "Aplicar los ajustes", instruction: "Realizar los cambios necesarios y validar que se hayan aplicado correctamente." },
          { title: "Confirmar la versión final", instruction: "Dejarla lista para la presentación al cliente." },
        ],
      },
      {
        title: "🧪 QA de Prototipo",
        matchTitle: "QA de Prototipo",
        objective: "Detectar y corregir errores en el prototipo antes de las validaciones internas o con cliente.",
        context:
          "Inicia antes de compartir el prototipo a revisión interna o cliente y termina cuando cumple los criterios de calidad definidos. Owner: Diseñador UX/UI; colaboradores: equipo de Experiencia, PM.",
        expectedResult: "Prototipo funcional, sin errores críticos, listo para revisión interna o de cliente.",
        resources: ["Figma", "Checklist de QA"],
        scope: "ROLE",
        roleKeys: ["UX_UI_DESIGNER"],
        steps: [
          { title: "Validar que esté actualizado", instruction: "Confirmar que se está revisando la última versión del prototipo." },
          { title: "Revisar la navegación completa", instruction: "Recorrer el flujo de inicio a fin, verificando que no haya pantallas rotas o sin conexión." },
          { title: "Validar interacciones y consistencia", instruction: "Revisar clicks, hovers, transiciones y consistencia con el design system." },
          { title: "Revisar textos y jerarquía visual", instruction: "Verificar ortografía, claridad, espaciados, tamaños y contraste." },
          { title: "Revisar casos borde", instruction: "Verificar estados de error, inputs vacíos y estados vacíos." },
          { title: "Revisar organización del archivo", instruction: "Verificar nombres y organización de frames, eliminando pantallas duplicadas." },
          { title: "Hacer una revisión final simulando un usuario real", instruction: "Confirmar accesos y permisos del prototipo antes de compartirlo." },
        ],
      },
    ],
  },
];
