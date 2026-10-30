/**
 * Importa el onboarding técnico de la CTO como "💻 Cómo Construimos los
 * Proyectos", una fase propia del rol Developer (ver MIGRATIONS.md #11 de "Migraciones de
 * contenido"). El contenido sale de scripts/data/tech-onboarding.json,
 * extraído de su sitio estático (HTML exportado de Notion) y convertido a
 * Markdown: cada lección es un proceso y cada sección de la lección, un
 * paso; sus 4 quizzes se unen en un solo quiz que cierra la fase.
 *
 * Todo lleva scope ROLE de Developer: para PDM y UX/UI la fase entera se
 * omite del recorrido (ver loadStageBundles en progress.service.ts).
 *
 * Idempotente: crea solo lo que falta (rol, fase, contenidos, procesos y
 * pasos se buscan por nombre/título) y publica lo que esté en borrador. Lo
 * que ya existe NO se pisa — si alguien lo editó desde el panel, se respeta.
 *
 * Uso:
 *   node --env-file=.env.local --import tsx ./scripts/import-tech-onboarding.ts --as=tu.correo@imagineapps.co          (solo muestra el plan)
 *   node --env-file=.env.local --import tsx ./scripts/import-tech-onboarding.ts --as=tu.correo@imagineapps.co --apply  (escribe)
 * `--as` es quien queda como responsable en la auditoría (ver scripts/lib/script-actor.ts).
 * OJO: .env.local apunta a la base que tenga configurada — hoy es el mismo
 * Atlas de producción. Todo pasa por los services reales (auditoría incluida).
 */
import { readFileSync } from "fs";
import path from "path";
import type { ObjectId } from "mongodb";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as roleRepository from "../src/server/repositories/role.repository";
import * as routeRepository from "../src/server/repositories/route.repository";
import * as stageRepository from "../src/server/repositories/stage.repository";
import * as contentRepository from "../src/server/repositories/content.repository";
import * as processRepository from "../src/server/repositories/process.repository";
import * as stepRepository from "../src/server/repositories/step.repository";
import * as roleService from "../src/server/services/role.service";
import * as stageService from "../src/server/services/stage.service";
import * as contentService from "../src/server/services/content.service";
import * as processService from "../src/server/services/process.service";
import * as stepService from "../src/server/services/step.service";
import { parseQuizQuestions, splitFactGrid } from "../src/lib/content-display";
import type { ContentDisplayFormat } from "../src/types/enums";
import type { RequestIdentity } from "../src/server/auth/session";
import { findScriptActorAdmin } from "./lib/script-actor";

// Mismo estilo que "UX/UI Designer" (cargo, neutro en género). Antes era
// "Desarrollo": nombraba un área, no a la persona. Su `key` interna puede
// seguir siendo DESARROLLO en bases donde se creó con ese nombre.
const ROLE_LABEL = "Developer";
// Continúa la historia del módulo anterior ("Tu Rol en los Proyectos").
const STAGE_TITLE = "💻 Cómo Construimos los Proyectos";
// Debe coincidir con TECH_STAGE_KEY en src/lib/phase-groups.ts (pestañas).
// La key se genera del título al crear (y nunca cambia): por eso la fase se
// crea con este título base y después se renombra a STAGE_TITLE.
const STAGE_KEY = "onboarding_tecnico";
const STAGE_KEY_SEED_TITLE = "Onboarding Técnico";
// La fase técnica se desbloquea al terminar "Tu Rol en los Proyectos".
const PREVIOUS_STAGE_KEY = "modulo_4_tu_rol_en_imagine_apps";

type Lesson = {
  id: string;
  title: string;
  desc: string | null;
  kind: "lesson" | "pending";
  keys: string[];
  source: string | null;
  sections: { title: string; markdown: string }[];
};
type TechData = {
  modules: { n: number; title: string; items: Lesson[] }[];
  extra: Lesson[];
  quizzes: { title: string; questions: { q: string; options: string[]; answer: number; why: string }[] }[];
};

const data = JSON.parse(readFileSync(path.join(__dirname, "data/tech-onboarding.json"), "utf8")) as TechData;

// Emoji + título de cada proceso (mismo estilo que el resto del recorrido).
// Los títulos sin emoji son los que matchea phase-groups.ts y pending-content.ts.
const PROCESS_TITLES: Record<string, string> = {
  "antes-de-empezar": "🧳 Antes de empezar",
  readme: "📖 Bienvenida, README y setup",
  "tech-arquitectura": "🗺️ Mapa técnico y reglas de oro",
  "repo-ia": "🤖 Repositorio de IA · Claude Code",
  gitflow: "🐙 Flujo de trabajo con Gitflow",
  lineamientos: "🧭 Lineamientos clave y habilidades blandas",
  layout: "📐 Análisis de layouts",
  contrato: "🚥 Contrato de servicios REST",
  bd: "🗄️ Diseño de base de datos con IA",
  documentacion: "📝 Documentación técnica del proyecto",
  infra: "💰 Infraestructura y costeo AWS",
  hus: "📎 Documentación de historias de usuario",
  "forma-de-trabajo": "👥 Cómo trabaja el equipo",
  grabacion: "🎬 Grabación de entregables",
  "team-review": "🔍 Team review de infraestructura",
  "primeras-entregas": "🚀 Tus primeras entregas",
  arquitectura: "🏛️ Estándar de arquitectura",
  sonarqube: "🧪 Calidad de código con SonarQube",
  multiidioma: "🌐 Multiidioma (i18n)",
  handoff: "🤝 Handoff técnico",
  ausencias: "🌴 Traspaso por vacaciones o ausencias",
  seguridad: "🔐 Seguridad",
  monitoreo: "📈 Monitoreo con Grafana y Prometheus",
  autonomia: "🌱 Autonomía y consolidación",
  deploy: "🚢 Despliegue a producción",
  tiendas: "📲 Publicación en tiendas móviles",
  estimaciones: "🧮 Estimaciones de proyecto",
  "tecnicas-de-estimacion": "🃏 Técnicas de estimación",
};

// El material complementario no trae descripción en el JSON: es la de su
// tarjeta en el index.html original.
const EXTRA_OBJECTIVES: Record<string, string> = {
  estimaciones: "Preguntas para preparar un proyecto nuevo: tipo de producto, stack, presupuesto, equipo y backlog.",
  "tecnicas-de-estimacion": "Planning Poker, T-Shirt, Story Points, WBS y PERT, explicadas en videos.",
};

// Muchas guías enlazan a páginas de Notion del equipo técnico: el acceso se
// pide desde el primer día, no cuando ya frena una tarea.
const NOTION_ACCESS_NOTE =
  "> **Accesos:** varias guías enlazan a Notion y a Google Drive del equipo técnico. Si al abrirlas te pide permiso, solicita el acceso desde tu primer día a tu Tech Buddy o a tu líder técnico, para que no te frene más adelante.";

// Puente con el módulo anterior, no una segunda bienvenida: el dev ya pasó
// por la cultura, su día a día y cómo vive un proyecto.
const WELCOME_TITLE = "🧭 De Cómo Vive un Proyecto a Cómo lo Construimos";
const WELCOME_BODY = `Ya conoces la cultura de Imagine Apps, tu día a día y cómo vive un proyecto de punta a punta: cómo arranca con el cliente, quién lo lidera y a qué ritmo avanza. Ahora viene tu parte: **cómo lo construimos**.

Esta es tu ruta en el equipo técnico: cómo configurar tu entorno, qué hacer antes de escribir la primera línea de un proyecto, los estándares del día a día y lo que exige un paso a producción.

> **Dato clave:** recorre las pestañas en orden, porque cada una se apoya en la anterior. Si una guía no te queda clara, pregúntale a tu Tech Buddy antes de seguir.

${NOTION_ACCESS_NOTE}

**Así está organizada esta fase:**

1. **Primeros pasos:** tu entorno listo y las reglas claras (accesos, README, herramientas de IA, Gitflow y los no negociables).
2. **Procesos previos:** lo que se hace antes de escribir código (layouts, contratos de API, base de datos, documentación e infraestructura).
3. **Operación diaria:** cómo se trabaja todos los días (arquitectura, calidad, handoff, seguridad y monitoreo).
4. **Producción:** lo que exige un despliegue y la publicación en tiendas móviles.

Además, en **Material complementario** tienes las guías de estimación, para cuando te toque preventa o planeación. Al final, un quiz corto confirma lo esencial: necesitas acertar al menos 4 de 5 preguntas.`;

const TRAINING_BODY = `Grabaciones de las sesiones Tech Shared del equipo técnico, más los cursos oficiales de Claude que recomienda el equipo.

- **[Go: introducción al lenguaje](https://drive.google.com/file/d/1ElBxayfJTHWeDmAEvpyeO2I5pmGMOzBE/view?usp=sharing)** (Tech Shared): Sesión grabada sobre los fundamentos de Go.
- **[IA con Python: reconocimiento facial](https://drive.google.com/file/d/1hKRlmd4TuqVMycP-3bvoQCCcFs2iAqzk/view?usp=sharing)** (Tech Shared): Sesión grabada sobre reconocimiento facial con Python.
- **[Flutter BLoC](https://drive.google.com/file/d/1xhB_HFkPSXHUG81evBZLoIL3qAdF-8PK/view?usp=sharing)** (Tech Shared): Sesión grabada sobre el patrón BLoC en Flutter.
- **[Redux en Angular](https://drive.google.com/file/d/16ikBAVnittV1UBY19uU5fPbYg6UKBWVR/view?usp=sharing)** (Tech Shared): Sesión grabada sobre Redux en Angular.
- **[Claude Academy](https://academy.claude.com/es/all)** (Curso externo): Cursos oficiales para sacarle provecho a Claude y Claude Code.`;

// Intro de rol en "Tu Rol en los Proyectos", junto a las de PDM y UX/UI
// (mismo formato: quién eres en el proyecto, a quién recurrir, qué grupos ves).
const ROLE_INTRO_TITLE = "Tu rol como Developer";
const ROLE_INTRO_BODY = `Como **Developer** conviertes ideas en producto real: lo que el PDM acuerda con el cliente y lo que UX/UI diseña cobra vida en tu código. Y aquí no vienes solo a cumplir tareas: vienes a crecer. Cada proyecto es una oportunidad para aprender algo nuevo, proponer mejores soluciones y ganar autonomía, con un equipo técnico que te acompaña en cada paso.

> **Dato clave:** en Imagine Apps nadie crece en solitario. Si un reto te toma más de 30 minutos sin avanzar, pide ayuda: preguntar a tiempo también es hacer bien tu trabajo.

Para accesos y enlaces internos (repositorios, ambientes, Notion del equipo técnico), apóyate en tu **Tech Buddy** o en tu **líder técnico**.

A continuación vas a encontrar los momentos del proyecto que compartes con todo el equipo, organizados en 2 grupos comunes: **Inicio del proyecto** y **Ritmo operativo**. Ahí vas a ver sobre todo lo que hacen PDM y UX/UI: conocerlo te ayuda a entender de dónde vienen las historias de usuario que vas a construir y en qué momentos te toca participar. Tu parte técnica llega en el siguiente módulo, **Cómo Construimos los Proyectos**.`;

// Las 4 infografías del sitio de la CTO, como contenido nativo: sus cifras
// clave son las tarjetas (FACT_GRID) y sus paneles van debajo. Cada una se
// muestra dentro de su pestaña (`contentMatches` en phase-groups.ts).
const AT_A_GLANCE: PlannedItem[] = [
  {
    title: "📊 Primeros pasos en una mirada",
    displayFormat: "FACT_GRID",
    body: `De los accesos del día 1 a tu primer flujo de ramas: lo que necesitas para empezar a trabajar con el estándar del equipo.

- **30 min:** máximo atascado sin pedir ayuda.
- **4:** no negociables del equipo.
- **10:** reglas de oro antes del PR.
- **8:** habilidades blandas.

### 🌳 Gitflow en una imagen

- \`feature\`: nace de \`develop\`.
- \`release\`: solo la crea el Tech Lead.
- \`hotfix\`: la única rama que nace de \`main\`.
- \`main\`: cada commit lleva tag de versión.

### 🧳 Antes de empezar

- Antes del día 1: correo, canal del equipo, equipo y licencias.
- Tech Buddy asignado y 1-a-1 de integración.
- MFA, gestor de contraseñas y VPN.
- Accesos a Git, CI/CD, ambientes y observabilidad con roles mínimos.
- Entorno local corriendo y pruebas en verde.

### 🔍 Antes de abrir un PR

1. Autorrevisión del código.
2. Tests unitarios nuevos y existentes en verde.
3. Prueba funcional como si fueras QA.
4. Sin código comentado, sin imports ni variables sin uso.
5. \`.env\` desde el inicio y errores estandarizados en inglés.

> **No se negocia:** regla de los 30 minutos · garantizo mi trabajo · Questions first · buenas prácticas en código.`,
  },
  {
    title: "📊 Procesos previos en una mirada",
    displayFormat: "FACT_GRID",
    body: `Cada proyecto arranca con el layout revisado, el contrato de servicios acordado, la base de datos modelada y la infraestructura costeada.

- **6:** códigos HTTP del contrato.
- **3:** pasos de una HU: INVEST, Given-When-Then y DoD.
- **30%:** ahorro apagando dev por horario.
- **1:** grabación por cada entrega.

### 📎 Anatomía de una HU

1. **INVEST:** independiente, negociable, valiosa, estimable, pequeña y testeable.
2. **Criterios Given-When-Then** con varios escenarios.
3. **Definition of Done:** código, tests, code review, CI y documentación.
4. **Post-desarrollo:** tiempo estimado vs. tiempo real.

### 💰 Infraestructura: dev vs. producción

| | Desarrollo | Producción |
| --- | --- | --- |
| **Cómputo** | EC2 (carga estable) | ECS Fargate (carga variable) |
| **Base de datos** | RDS db.t3.small | RDS db.t3.medium |
| **Costos** | Apagar por horario: hasta 30% | Costeo aprobado antes de desplegar |

### 🚥 El contrato de servicios

Endpoints, métodos HTTP, JSON con campos obligatorios y tipos, headers con auth Bearer y estos códigos de estado: \`200 OK\` · \`201 Created\` · \`400 Bad Request\` · \`401 Unauthorized\` · \`404 Not Found\` · \`500 Server Error\`.

> **No se negocia:** Questions first en el refinement · toda API documentada en Swagger · costeo aprobado antes del despliegue · cada entrega grabada y explicada.`,
  },
  {
    title: "📊 Operación diaria en una mirada",
    displayFormat: "FACT_GRID",
    body: `De tus primeras entregas a la autonomía, con arquitectura, calidad, handoff y seguridad como parte de cada entrega.

- **10:** criterios OWASP Top 10.
- **6:** métricas de SonarQube.
- **1 h:** checkpoint de handoff técnico.
- **7:** hitos hacia la autonomía.

### 🛡️ Escudo de seguridad

- Cumple OWASP Top 10.
- ORM o consultas parametrizadas: nada de SQL directo.
- JWT en todas las rutas salvo login, sin datos sensibles y con vigencia.
- \`.env\` cifrado o en secure files, fuera del repositorio.
- BD de producción restringida por IP.
- Nada sensible en \`localStorage\`.

### 🤝 Checkpoint de handoff

README claro · Swagger / OpenAPI · \`.env.example\` completo · errores centralizados · validación de DTOs · CORS sin \`*\` en producción · Dockerfile · CI/CD con tests y lint.

Y en SonarQube revisas: bugs, vulnerabilidades, code smells, coverage, duplicaciones y hotspots.

### 🌱 Camino a la autonomía

1. Good First Issue.
2. Primer PR con tu Tech Buddy.
3. Despliegue guiado a Dev o QA.
4. Pair programming con distintos compañeros.
5. Features con complejidad progresiva.
6. Code reviews a otros.
7. Check-in 360 y cierre del periodo de prueba.

> **No se negocia:** garantizo mi trabajo · nada de SQL directo · secretos nunca en el código · CORS sin \`*\` en producción.`,
  },
  {
    title: "📊 Producción en una mirada",
    displayFormat: "FACT_GRID",
    body: `Los requisitos que cualquier desarrollador cumple antes, durante y después de lanzar, y lo que cambia cuando el destino es una tienda móvil.

- **7:** pasos del plan de despliegue.
- **2:** backups antes de tocar producción.
- **512 px:** ícono para las tiendas.
- **0:** despliegues huérfanos.

### 🚢 Antes, durante y después

1. **Antes:** documenta qué HUs y dependencias incluye la versión.
2. **Antes:** backup de la BD y del compilado para hacer rollback.
3. **Durante:** sigue el paso a paso del README con el \`.env\` del ambiente.
4. **Durante:** QA con pruebas de continuidad.
5. **Después:** validación del cliente y monitoreo durante el día o la semana.

### 📲 Publicar en tiendas

| | Google Play | App Store |
| --- | --- | --- |
| **Cuenta** | USD 25, pago único | USD 99 al año |
| **Paquete** | AAB firmado con keystore | IPA con certificado y perfil |
| **Subida** | Play Console | Transporter |

Para ambas: política de privacidad, capturas, ícono de 512 px y pruebas en dispositivos reales.

> **No se negocia:** backup antes de desplegar · horario acordado con el cliente · validación final del cliente · monitoreo posterior.`,
  },
];

/** Los 4 quizzes de la CTO en uno solo, con el formato que lee parseQuizQuestions. */
function buildQuizBody(): string {
  const questions = data.quizzes.flatMap((quiz) => quiz.questions);
  return questions
    .map((question, i) => {
      const options = question.options.map((option, j) => (j === question.answer ? `- **${option}**` : `- ${option}`)).join("\n");
      return `${i + 1}. ${question.q}\n${options}\n${question.why}`;
    })
    .join("\n\n");
}

type PlannedItem = { title: string; body: string; displayFormat: ContentDisplayFormat; quizPassingScore?: number };

// Mismo patrón que "(Tu Día a Día)" / "(Ritmo de Proyecto)" de los otros módulos.
const QUIZ_TITLE = "🎉 Pon a Prueba lo que Aprendiste (Cómo Construimos)";

const CONTENT_ITEMS: PlannedItem[] = [
  { title: WELCOME_TITLE, body: WELCOME_BODY, displayFormat: "PROSE" },
  { title: "🎓 Centro de Capacitación", body: TRAINING_BODY, displayFormat: "FACT_GRID" },
  ...AT_A_GLANCE,
  // La CTO pide aprobar con 4 de 5 (los demás quizzes del recorrido solo piden responder).
  { title: QUIZ_TITLE, body: buildQuizBody(), displayFormat: "QUIZ", quizPassingScore: 4 },
];

type PlannedProcess = {
  title: string;
  objective: string;
  expectedResult: string;
  resources: string[];
  steps: { title: string; description: string }[];
};

function planProcesses(): PlannedProcess[] {
  const lessons = [...data.modules.flatMap((module) => module.items), ...data.extra];
  return lessons.map((lesson) => {
    const title = PROCESS_TITLES[lesson.id];
    if (!title) throw new Error(`Falta el título de proceso para la lección "${lesson.id}"`);
    const objective = lesson.desc ?? EXTRA_OBJECTIVES[lesson.id];
    if (!objective) throw new Error(`Falta la descripción de la lección "${lesson.id}"`);
    return {
      title,
      objective,
      expectedResult: lesson.keys.length > 0 ? `**Lo que no puede faltar:**\n\n${lesson.keys.map((key) => `- ${key}`).join("\n")}` : "",
      resources: lesson.source ? [`Guía original en Notion: ${lesson.source}`] : [],
      steps: lesson.sections.map((section) => ({ title: section.title, description: section.markdown })),
    };
  });
}

/** Los create* de los services devuelven `T | null`: acá un null es un error real. */
function created<T>(doc: T, what: string): NonNullable<T> {
  if (!doc) throw new Error(`No se pudo crear ${what}`);
  return doc as NonNullable<T>;
}

/** Falla antes de escribir nada si algún formato especial no calza con su parser. */
function assertFormats() {
  const expected = data.quizzes.reduce((sum, q) => sum + q.questions.length, 0);
  for (const item of CONTENT_ITEMS) {
    if (item.displayFormat === "QUIZ") {
      const quiz = parseQuizQuestions(item.body);
      if (!quiz || quiz.length !== expected) throw new Error(`El quiz no parsea completo (${quiz?.length ?? 0}/${expected})`);
    }
    if (item.displayFormat === "FACT_GRID") {
      const grid = splitFactGrid(item.body);
      if (!grid || grid.items.length < 4) throw new Error(`"${item.title}" no calza con FACT_GRID`);
    }
  }
}

async function run() {
  const apply = process.argv.includes("--apply");
  console.log(apply ? "== APLICANDO ==" : "== PLAN (sin escribir; usa --apply para aplicar) ==");
  assertFormats();
  const processes = planProcesses();

  const tenant = await tenantRepository.findBySlug("imagine-apps");
  if (!tenant) throw new Error("tenant imagine-apps no encontrado");
  const adminDoc = await findScriptActorAdmin(tenant._id);
  if (!adminDoc) throw new Error("no hay un admin activo para atribuir la auditoría");
  const admin: RequestIdentity = { userId: adminDoc._id, tenantId: tenant._id, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null };

  // ── Rol
  const roles = await roleRepository.listByTenant(tenant._id, { includeInactive: true });
  let role = roles.find((r) => r.label === ROLE_LABEL) ?? null;
  console.log(role ? `Rol "${ROLE_LABEL}": ya existe` : `Rol "${ROLE_LABEL}": se crea`);
  if (!role && apply) role = await roleService.createRole(admin, { label: ROLE_LABEL });

  // ── Fase
  const route = await routeRepository.findByTenant(tenant._id);
  if (!route) throw new Error("el tenant no tiene ruta de onboarding");
  const stages = await stageRepository.listByRoute(tenant._id, route._id);
  const previous = stages.find((s) => s.key === PREVIOUS_STAGE_KEY);
  if (!previous) throw new Error(`no se encontró la fase previa (${PREVIOUS_STAGE_KEY})`);
  let stage = stages.find((s) => s.key === STAGE_KEY) ?? null;
  console.log(stage ? `Fase "${STAGE_TITLE}": ya existe (${stage.status})` : `Fase "${STAGE_TITLE}": se crea, depende de "${previous.title}"`);
  if (!stage && apply) {
    stage = created(
      await stageService.createStage(admin, { title: STAGE_KEY_SEED_TITLE, dependsOnStageId: previous._id, isBlocking: true }),
      "la fase",
    );
    if (stage.key !== STAGE_KEY) throw new Error(`la key generada (${stage.key}) no coincide con phase-groups.ts (${STAGE_KEY})`);
    stage = created(await stageService.updateStage(admin, stage._id, { title: STAGE_TITLE }), "el título de la fase");
  }
  if (stage && apply && stage.status === "DRAFT") await stageService.publishStage(admin, stage._id);

  if (!apply || !role || !stage) {
    const stepCount = processes.reduce((sum, p) => sum + p.steps.length, 0);
    console.log(`Contenidos: ${CONTENT_ITEMS.length} · Procesos: ${processes.length} · Pasos: ${stepCount}`);
    if (!apply) console.log("(el detalle por proceso se resuelve al aplicar, una vez existen el rol y la fase)");
    return;
  }
  const roleIds: ObjectId[] = [role._id];

  // ── Intro de rol en la fase anterior (junto a "Tu rol como PDM/UX-UI")
  const previousItems = await contentRepository.listByStage(tenant._id, previous._id);
  let intro = previousItems.find((it) => it.title === ROLE_INTRO_TITLE) ?? null;
  if (!intro) {
    // Va después de las intros de rol existentes, antes de cualquier otro contenido.
    const roleIntros = previousItems.filter((it) => it.title.startsWith("Tu rol como"));
    intro = created(
      await contentService.createContentItem(admin, {
        stageId: previous._id,
        type: "TEXT",
        scope: "ROLE",
        roleIds,
        title: ROLE_INTRO_TITLE,
        body: ROLE_INTRO_BODY,
        requirement: "INFORMATIONAL",
        displayFormat: "PROSE",
        order: Math.max(0, ...roleIntros.map((it) => it.order)) + 1,
      }),
      ROLE_INTRO_TITLE,
    );
    console.log(`+ contenido en "${previous.title}": ${ROLE_INTRO_TITLE}`);
  } else {
    console.log(`= contenido ya existe en "${previous.title}": ${ROLE_INTRO_TITLE}`);
  }
  if (intro.status === "DRAFT") await contentService.publishContentItem(admin, intro._id);

  // ── Contenidos (bienvenida, capacitación, quiz)
  const existingItems = await contentRepository.listByStage(tenant._id, stage._id);
  for (const [i, planned] of CONTENT_ITEMS.entries()) {
    let item = existingItems.find((it) => it.title === planned.title) ?? null;
    if (!item) {
      item = created(
        await contentService.createContentItem(admin, {
          stageId: stage._id,
          type: "TEXT",
          scope: "ROLE",
          roleIds,
          title: planned.title,
          body: planned.body,
          requirement: "INFORMATIONAL",
          displayFormat: planned.displayFormat,
          quizPassingScore: planned.quizPassingScore ?? null,
          order: i + 1,
        }),
        planned.title,
      );
      console.log(`+ contenido: ${planned.title}`);
    } else {
      console.log(`= contenido ya existe: ${planned.title}`);
    }
    if (item.status === "DRAFT") await contentService.publishContentItem(admin, item._id);
  }

  // ── Procesos y pasos
  const existingProcesses = await processRepository.listByStage(tenant._id, stage._id);
  for (const [i, planned] of processes.entries()) {
    let proc = existingProcesses.find((p) => p.title === planned.title) ?? null;
    if (!proc) {
      proc = created(
        await processService.createProcess(admin, {
          stageId: stage._id,
          scope: "ROLE",
          roleIds,
          title: planned.title,
          objective: planned.objective,
          context: "",
          expectedResult: planned.expectedResult,
          resources: planned.resources,
          order: i + 1,
        }),
        planned.title,
      );
    }
    if (proc.status === "DRAFT") await processService.publishProcess(admin, proc._id);

    const existingSteps = await stepRepository.listByProcess(tenant._id, proc._id);
    let newSteps = 0;
    for (const [j, step] of planned.steps.entries()) {
      let doc = existingSteps.find((s) => s.title === step.title) ?? null;
      if (!doc) {
        doc = created(
          await stepService.createStep(admin, {
            processId: proc._id,
            title: step.title,
            description: step.description,
            instruction: "",
            resources: [],
            links: [],
            completionCriteria: "",
            order: j + 1,
          }),
          `el paso "${step.title}"`,
        );
        newSteps++;
      }
      if (doc.status === "DRAFT") await stepService.publishStep(admin, doc._id);
    }
    console.log(`${newSteps > 0 ? "+" : "="} ${planned.title} — pasos nuevos: ${newSteps}/${planned.steps.length}`);
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
