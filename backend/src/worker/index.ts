import "dotenv/config";
import { prisma } from "../infra/prisma.js";
import { expirePending, processOutbox } from "./jobs.js";

let shuttingDown = false;
async function run() {
  if (shuttingDown) return;
  await expirePending();
  await processOutbox();
}
async function loop() {
  while (!shuttingDown) {
    try {
      await run();
    } catch (error) {
      console.error(
        "Background processing failed",
        error instanceof Error ? error.message : "Unknown",
      );
    }
    await Bun.sleep(20_000);
  }
}
process.on("SIGTERM", () => {
  shuttingDown = true;
});
process.on("SIGINT", () => {
  shuttingDown = true;
});
await loop();
await prisma.$disconnect();
