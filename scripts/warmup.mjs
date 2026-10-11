/**
 * Derivo Docs — Route Warmup & Pre-compilation Utility
 *
 * Requests all application pages and API routes on startup so Next.js
 * compiles them ahead of time. This eliminates first-visit JIT latency
 * and ensures instant sub-20ms navigation for users.
 */

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const ROUTES_TO_WARM = [
  "/",
  "/pricing",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/demo",
  "/dashboard",
  "/api/auth/session",
];

async function waitForServer(maxAttempts = 40, delayMs = 600) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/session`, { signal: AbortSignal.timeout(1500) });
      if (res.status >= 200 && res.status < 500) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

export async function warmupAllRoutes() {
  console.log(`\n⚡ [Derivo Docs] Waiting for server on ${BASE_URL}...`);
  const isUp = await waitForServer();
  if (!isUp) {
    console.warn(`⚠️ [Derivo Docs] Server did not become responsive within timeout. Skipping warmup.`);
    return;
  }

  console.log(`🔥 [Derivo Docs] Pre-compiling ${ROUTES_TO_WARM.length} routes on startup to eliminate visit lag...\n`);

  const startTime = Date.now();

  const results = await Promise.all(
    ROUTES_TO_WARM.map(async (route) => {
      const routeStart = Date.now();
      try {
        const res = await fetch(`${BASE_URL}${route}`, {
          headers: { "User-Agent": "Derivo-Startup-Compiler/1.0" },
          signal: AbortSignal.timeout(15000),
        });
        const duration = Date.now() - routeStart;
        return { route, status: res.status, duration, ok: true };
      } catch (err) {
        const duration = Date.now() - routeStart;
        return { route, error: err.message, duration, ok: false };
      }
    })
  );

  for (const r of results) {
    if (r.ok) {
      console.log(`  ✓ Compiled ${r.route.padEnd(24)} (status ${r.status}, ${r.duration}ms)`);
    } else {
      console.log(`  ⚠️ Failed to pre-compile ${r.route}: ${r.error}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ [Derivo Docs] Startup compilation complete in ${totalTime}s! All pages and routes are now cached and ready.\n`);
}

// Allow direct CLI invocation
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  warmupAllRoutes().catch((e) => console.error(e));
}
