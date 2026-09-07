import { getDb } from "../src/server/db/client";
import * as tenantRepository from "../src/server/repositories/tenant.repository";

async function main() {
  const tenant = await tenantRepository.findBySlug("imagine-apps");
  if (!tenant) throw new Error("tenant not found");
  const db = await getDb();

  const items = await db
    .collection("content_items")
    .find({ tenantId: tenant._id, title: { $regex: /pol[ií]tica de (vacaciones|citas|cumplea)/i } })
    .toArray();

  for (const item of items) {
    console.log("=== " + item.title + " (" + item._id + ") ===");
    console.log(item.body);
    console.log("\n---\n");
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
