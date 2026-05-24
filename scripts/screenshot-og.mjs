import { spawn } from "node:child_process";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const IS_VERCEL = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const PORT = process.env.OG_PORT ? Number(process.env.OG_PORT) : 4321;
const URL = `http://127.0.0.1:${PORT}`;
const OUTPUTS = [
  resolve(process.cwd(), "dist/og.png"),
  resolve(process.cwd(), "public/og.png"),
];

for (const out of OUTPUTS) mkdirSync(dirname(out), { recursive: true });

async function waitFor(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server at ${url} did not respond within ${timeoutMs}ms`);
}

if (!existsSync(resolve(process.cwd(), "dist"))) {
  console.error("dist/ does not exist — run `astro build` first.");
  process.exit(1);
}

let playwright, launchOpts;
if (IS_VERCEL) {
  console.log("Detected Vercel environment, using @sparticuz/chromium…");
  const { default: chromium } = await import("@sparticuz/chromium");
  playwright = await import("playwright-core");
  launchOpts = {
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  };
} else {
  playwright = await import("playwright");
  launchOpts = { headless: true };
}

console.log(`Starting preview server on port ${PORT}…`);
const server = spawn("npx", ["astro", "preview", "--port", String(PORT), "--host", "127.0.0.1"], {
  stdio: ["ignore", "inherit", "inherit"],
});

let exitCode = 0;
try {
  await waitFor(URL);
  await new Promise((r) => setTimeout(r, 1000));

  console.log("Launching browser…");
  const browser = await playwright.chromium.launch(launchOpts);
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });

  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(2200);

  const buffer = await page.screenshot({ type: "png" });
  for (const out of OUTPUTS) {
    writeFileSync(out, buffer);
    console.log(`Screenshot saved: ${out}`);
  }
  await browser.close();
} catch (err) {
  console.error(err);
  exitCode = 1;
} finally {
  server.kill();
  await new Promise((r) => setTimeout(r, 200));
  process.exit(exitCode);
}
