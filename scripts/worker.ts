// Background worker: sends due campaign steps, advances warmups, resets counters.
// Run alongside the web app with `npm run worker`. For serverless hosting, call
// POST /api/cron/tick on a schedule instead (see README).
import { processDueSends } from "@/lib/services/campaign-engine";
import { advanceWarmups } from "@/lib/services/warmup";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 60_000);
let running = false;

async function tick() {
  if (running) return;
  running = true;
  const started = Date.now();
  try {
    const [{ sent }, { advanced }] = await Promise.all([processDueSends(), advanceWarmups()]);
    if (sent || advanced) console.log(`[worker] sent=${sent} warmups=${advanced} in ${Date.now() - started}ms`);
  } catch (e) {
    console.error("[worker] tick failed", e);
  } finally {
    running = false;
  }
}

console.log(`[worker] started — polling every ${INTERVAL_MS / 1000}s`);
void tick();
const timer = setInterval(tick, INTERVAL_MS);

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    clearInterval(timer);
    console.log("[worker] stopped");
    process.exit(0);
  });
}
