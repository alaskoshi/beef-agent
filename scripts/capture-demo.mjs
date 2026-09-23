import { chromium } from "playwright";
import { writeFile, rename } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: {
    dir: "artifacts/raw-video",
    size: { width: 1440, height: 900 },
  },
});
const page = await context.newPage();
const errors = [];
const responses = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", async (r) => {
  if (r.url().endsWith("/api/coach")) responses.push(await r.json());
});
await page.goto("http://127.0.0.1:4173");
const start = Date.now();
const at = async (n) => {
  const left = n * 1000 - (Date.now() - start);
  if (left > 0) await page.waitForTimeout(left);
};
const click = (name) => page.getByRole("button", { name, exact: true }).click();
const floor = (side) => page.getByLabel("Speaking floor").selectOption(side);
await click("Start / resume");
await page.getByLabel("Inference", { exact: true }).selectOption("bedrock");
await at(12);
await click("Enable local audio");
await click("Walkout sting");
await at(13.5);
await floor("b");
await click("Walkout sting");
await at(15);
await click("Next phase / bell");
await at(16);
await click("Use labeled fixture");
await at(33);
await floor("b");
await click("Use labeled fixture");
await at(50);
await click("Next phase / bell");
await click("Inspect excerpt → coach");
await page
  .getByText("LIVE MODEL · BEDROCK NOVA PRO", { exact: true })
  .waitFor({ timeout: 15000 });
console.log(
  "Fresh Bedrock card received at",
  ((Date.now() - start) / 1000).toFixed(1),
  "seconds",
);
await at(67);
await page.screenshot({ path: "artifacts/demo-screenshot.png" });
await at(75);
await page
  .getByLabel("Your reply", { exact: true })
  .fill(
    "I accept the demo moved. R2 explains the timing, but R3 still leaves my name out. Can we correct the credit today?",
  );
await click("Choose edited reply");
await at(81);
await click("Next phase / bell");
await at(83);
await page
  .getByLabel("Public line", { exact: true })
  .fill(
    "I accept the demo moved. R2 explains the timing, but R3 still leaves my name out. Can we correct the credit today?",
  );
await click("Add public line");
await at(99);
await click("receipt");
await at(106);
await floor("b");
await click("Use labeled fixture");
await at(119);
await click("concession");
await at(126);
await click("Next phase / bell");
await at(135);
await click("Use labeled fixture");
await at(146);
await floor("b");
await click("Use labeled fixture");
await at(153);
await click("steelman");
await at(157);
await click("Next phase / bell");
await click("Confirm summary");
await at(169);
await click("Jules acknowledges");
await click("Rowan acknowledges");
await click("SPLIT BEEF");
await at(180);
const log = await page.evaluate(() =>
  localStorage.getItem("agentic-beef-public-v1"),
);
await writeFile("artifacts/demo-public-events.json", log);
await writeFile(
  "artifacts/capture-receipt.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      duration: 180,
      viewport: { width: 1440, height: 900 },
      errors,
      synthetic: true,
      coachingResponses: responses,
    },
    null,
    2,
  ),
);
const video = page.video();
await context.close();
await rename(await video.path(), "artifacts/demo-screen.webm");
await browser.close();
console.log("180-second screen capture saved; errors:", errors.length);
