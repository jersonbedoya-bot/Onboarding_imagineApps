/**
 * Agrega un content item de quiz "🎉 Pon a Prueba lo que Aprendiste" al
 * final de cada uno de los 3 módulos vivos (tenant imagine-apps) —
 * retomado a pedido explícito del usuario (ver BACKLOG.md, "Contenido tipo
 * quiz"). Una tanda por módulo, no por proceso ni un quiz único al final
 * del recorrido — decisión explícita del usuario para no volverlo fricción.
 *
 * Tono: escenario cotidiano + una opción "metida de pata" que da un poco de
 * gracia + una opción correcta que resuelve una duda real de alguien nuevo
 * — no el simulador técnico "cuál es el procedimiento metodológico
 * correcto" de imagine-apps-onboarding/paso-1..3.html (evaluado y
 * descartado, ver phase-groups.ts). Español latinoamericano neutro (tú),
 * sin voseo — pedido explícito del usuario; el resto del contenido ya
 * publicado sigue en voseo por ahora (fix pendiente, tarea aparte).
 *
 * Las preguntas están basadas en contenido real ya publicado en cada
 * módulo (historia institucional, políticas de Módulo 2, los 4 procesos
 * COMMON — Kickoff Interno/Cliente, Daily, Weekly — del tercer módulo, los
 * únicos que ven ambos roles por igual) — verificado leyendo Atlas antes de
 * escribir esto, no inventado.
 *
 * A diferencia de migrate-*.ts, esto no mueve ni renombra nada existente:
 * crea content items nuevos vía content.service.createContentItem (mismo
 * código que usa el admin panel), sin riesgo de duplicado por upsert-por-
 * título como el que afectó a db:seed:content.
 *
 * Uso: igual que las migraciones (dry-run por defecto, --apply para
 * escribir de verdad).
 */
import { ObjectId } from "mongodb";
import { getDb } from "../src/server/db/client";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as contentService from "../src/server/services/content.service";
import type { RequestIdentity } from "../src/server/auth/session";

const APPLY = process.argv.includes("--apply");

const QUIZZES: { stageId: ObjectId; stageLabel: string; title: string; body: string }[] = [
  {
    stageId: new ObjectId("6a921f1ccd213bc39fca4648"), // 🚀 Quiénes Somos
    stageLabel: "🚀 Quiénes Somos",
    title: "🎉 Pon a Prueba lo que Aprendiste",
    body: `1. ¿En qué ciudad nació Imagine Apps en 2012?
- Medellín
- **Bogotá**
- Miami
Bogotá fue la cuna de todo esto — hoy la operación sigue ahí, con sede corporativa en Miami, EE.UU.

2. ¿Qué edad tenían Nicolás Rojas y David Lancheros cuando fundaron la empresa, sin un peso de capital externo?
- 25 años
- **17 años**
- 30 años
Todo empezó siendo adolescentes, apostando todo a talento y disciplina técnica — nada de inversionistas.

3. ¿Para qué evento mundial se lanzó MundiApp en 2014, la app que le dio a Imagine Apps su primera validación masiva?
- Los Juegos Olímpicos de Londres
- **El Mundial FIFA Brasil 2014**
- La Copa América
MundiApp llegó a 1 millón de usuarios en 50 países — la primera señal de que esto podía ser grande.

4. ¿Qué producto interno de IA nació en Imagine Apps en 2023 y hoy está en Forbes 30 Promesas de Negocios?
- Feat
- CasaLuker
- **Dapta**
Dapta empezó como automatización interna y hoy es una compañía propia, graduada del acelerador 500 Global.

5. ¿Cuál de estos NO es uno de los 5 valores que "no se nos olvidan"?
- Lab Mindset
- **Jerarquía por antigüedad**
- End-to-End Ownership
Los 5 valores reales son Empatía estratégica, Obsesión por el impacto, End-to-End Ownership, Lab Mindset e Inteligencia híbrida — jerarquía por antigüedad no es uno de ellos.`,
  },
  {
    stageId: new ObjectId("6a9221009fbd163bef274ab6"), // 🧭 Tu Día a Día en Imagine Apps
    stageLabel: "🧭 Tu Día a Día en Imagine Apps",
    title: "🎉 Pon a Prueba lo que Aprendiste (Tu Día a Día)",
    body: `1. Llevas 8 meses en Imagine Apps y ya sueñas con una playa la semana que viene.
- Compras los vuelos y avisas después — total, unos días no le hacen daño a nadie.
- **Esperas a cumplir tu primer año y pides las vacaciones con al menos 1 mes de anticipación.**
- Le pides a un compañero que te "preste" sus vacaciones ya ganadas.
Las vacaciones se habilitan al año de antigüedad, con mínimo 1 mes de aviso — y no son transferibles entre compañeros.

2. Te sale una cita con el dentista el viernes, justo en medio del sprint.
- No dices nada y faltas al daily — ya inventas algo después.
- **Le avisas a tu líder por Gmail y agendas el permiso en tu calendario para que el equipo lo vea.**
- Cancelas la cita — "en Imagine Apps no se permiten citas entre semana".
Avisa con al menos 1 semana si puedes (o directo con tu líder si es de un día para otro) y déjalo visible en tu calendario — el tiempo de la cita no se compensa.

3. Tu cumpleaños cae domingo este año. ¿Perdiste tu día libre?
- Sí, mala suerte — toca esperar al próximo cumpleaños.
- **No — puedes tomarlo cualquier día hábil dentro de los 15 días siguientes.**
- Lo cambias por dos días libres el año que viene, como puntos acumulados.
No es acumulable ni transferible, pero si cae en fin de semana tienes esas 2 semanas de margen para disfrutarlo.

4. Llevas 45 minutos atascado en un error sin avanzar nada.
- Sigues insistiendo solo hasta la madrugada para no "molestar" a nadie.
- **Pides ayuda: pasados los 30 minutos sin solución, tienes 5 personas del equipo listas para apoyarte.**
- Le escribes al cliente por WhatsApp personal a ver si él sabe resolverlo.
Es la regla de "Gente que resuelve" — 30 minutos es la señal para pedir ayuda, no para aguantar solo.

5. Estás por entrar a una reunión importante con un cliente.
- Te conectas justo al segundo que empieza, con la cámara apagada porque no diste tiempo a arreglarte.
- **Te conectas 5 minutos antes, con cámara prendida y la mejor actitud.**
- Mandas a un compañero a "cubrirte" en el chat mientras sigues en otra llamada.
Son los no negociables de reuniones — nada de dobles agendas ni cámaras apagadas.`,
  },
  {
    stageId: new ObjectId("6a922227475aba4412363724"), // 🔁 Tu Rol en los Proyectos
    stageLabel: "🔁 Tu Rol en los Proyectos",
    title: "🎉 Pon a Prueba lo que Aprendiste (Ritmo de Proyecto)",
    body: `1. Mañana es el kickoff con el cliente y tu equipo interno todavía no se alineó sobre el alcance ni la arquitectura.
- No importa, ya se resuelve improvisando frente al cliente.
- **Primero haces el kickoff interno: sin equipo alineado y presentación lista, no llegas al kickoff con el cliente.**
- Pospones el kickoff con el cliente sin avisarle por qué.
El Kickoff Interno es el paso obligatorio antes de sentarte con el cliente — deja al equipo alineado, la presentación lista y las preguntas clave resueltas.

2. Terminó el kickoff con el cliente, pero nadie definió por dónde se van a comunicar de ahora en adelante.
- Ya se resolverá solo cuando alguien mande el primer mensaje por el canal que sea.
- **Cierras el kickoff formalizando el cronograma aprobado y activando un canal de comunicación oficial con todos los involucrados.**
- Le das al cliente tu WhatsApp personal "por si necesita algo urgente".
El Kickoff con Cliente no termina hasta tener cronograma aprobado, acta aceptada y canal de comunicación activo — nada de canales informales de por medio.

3. El daily de tu equipo lleva 40 minutos y siguen debatiendo el approach técnico de una tarea.
- Sigues ahí participando hasta que se resuelva el debate.
- **Cortas ahí: el Daily dura máximo 15 minutos — ese debate se agenda aparte y sigues con el plan del día.**
- Te vas sin avisar porque ya dijiste tu parte.
El Daily es corto y sincrónico (máximo 15 minutos, arranca a las 8:00 AM) — sirve para sincronizar el plan de las próximas 24 horas, no para resolver debates largos.

4. Es jueves y todavía no actualizaste el hilo semanal de tu proyecto.
- Lo dejas para la próxima semana, ya se entenderá que estuviste ocupado.
- **Lo actualizas hoy mismo — el Weekly se actualiza los jueves para que el líder de operaciones pueda confirmarlo.**
- Le pides a un compañero que invente el estado de tu proyecto para no quedar mal.
El hilo semanal nace el lunes y se actualiza el jueves — es lo que le da visibilidad real a operaciones sobre cómo va cada proyecto.`,
  },
];

async function main() {
  console.log(APPLY ? "*** MODO APLICAR — esto escribe en Atlas ***" : "Dry-run (no escribe nada) — pasá --apply para ejecutar de verdad.");

  const tenant = await tenantRepository.findBySlug("imagine-apps");
  if (!tenant) throw new Error("tenant not found");
  const db = await getDb();

  const admin = APPLY
    ? await db.collection("users").findOne({ tenantId: tenant._id, platformRole: "ADMIN", status: "ACTIVE" })
    : null;
  if (APPLY && !admin) throw new Error("no admin activo encontrado para atribuir el audit log");
  const actingAdmin: RequestIdentity | null = admin
    ? { userId: admin._id, tenantId: tenant._id, status: "ACTIVE", platformRole: "ADMIN", functionalRoleId: null }
    : null;

  for (const quiz of QUIZZES) {
    const stage = await db.collection("onboarding_stages").findOne({ _id: quiz.stageId, tenantId: tenant._id });
    if (!stage) {
      console.log(`⚠ Etapa "${quiz.stageLabel}" no encontrada con ese _id — la pudieron haber movido/renombrado. Saltando.`);
      continue;
    }

    const existing = await db.collection("content_items").findOne({ tenantId: tenant._id, stageId: quiz.stageId, title: quiz.title });
    if (existing) {
      console.log(`= "${quiz.title}" ya existe (${existing._id}) en "${stage.title}" — no se crea un duplicado.`);
      continue;
    }

    console.log(`\n--- Etapa: "${stage.title}" (${stage._id}) ---`);
    console.log(`Título nuevo: "${quiz.title}"`);
    console.log(quiz.body);

    if (!APPLY || !actingAdmin) continue;

    const item = await contentService.createContentItem(actingAdmin, {
      stageId: quiz.stageId,
      type: "TEXT",
      scope: "COMMON",
      roleIds: [],
      title: quiz.title,
      body: quiz.body,
      requirement: "INFORMATIONAL",
    });
    await contentService.publishContentItem(actingAdmin, item._id);
    console.log(`✓ Creado y publicado (${item._id})`);
  }

  console.log(APPLY ? "\nListo — aplicado." : "\nDry-run completo — revisá el plan arriba. Nada fue escrito.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
