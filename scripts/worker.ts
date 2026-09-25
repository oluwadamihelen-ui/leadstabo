// Background worker: sends due campaign steps, syncs replies/bounces over IMAP,
// advances warmups. Run alongside the web app with `npm run worker`. For serverless
// hosting, call POST /api/cron/tick on a schedule instead (see README).
import { processDueSends } from "@/lib/services/campaign-engine";
import { syncAllInboxes } from "@/lib/services/mailbox-sync";
import { advanceWarmups } from "@/lib/services/warmup";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 60_000);
const SYNC_EVERY = Number(process.env.WORKER_SYNC_EVERY ?? 3); // IMAP sync every N ticks
let running = false;
let ticks = 0;

async function tick() {
  if (running) return;
  running = true;
  const started = Date.now();
  try {
    const { sent, failures } = await processDueSends();
    const { advanced } = await advanceWarmups();
    const { replies, bounces } = ticks % SYNC_EVERY === 0 ? await syncAllInboxes() : { replies: 0, bounces: 0 };
    if (sent || failures || advanced || replies || bounces) {
      console.log(`[worker] sent=${sent} failed=${failures} replies=${replies} bounces=${bounces} warmups=${advanced} in ${Date.now() - started}ms`);
    }
  } catch (e) {
    console.error("[worker] tick failed", e);
  } finally {
    ticks++;
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
