import { test, expect, type Page } from "@playwright/test";
async function setup(p: Page) {
  await p.goto("/");
  await p.getByRole("button", { name: "Start / resume" }).click();
  await p.getByRole("button", { name: "Next phase / bell" }).click();
}
async function pair(p: Page) {
  await p.getByRole("button", { name: "Use labeled fixture" }).click();
  await p.getByLabel("Speaking floor").selectOption("b");
  await p.getByRole("button", { name: "Use labeled fixture" }).click();
  await p.getByRole("button", { name: "Next phase / bell" }).click();
}
test("full bout twice, private export, replay and one-screen screenshot", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await pair(page);
  await page.getByLabel("Approved fictional note").fill("PRIVATE_CANARY");
  await page.getByRole("button", { name: "Inspect excerpt → coach" }).click();
  await expect(
    page.getByText("LOCAL RULES · REHEARSAL", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose edited reply" }).click();
  await page.screenshot({
    path: "output/playwright/corner-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next phase / bell" }).click();
  await pair(page);
  await pair(page);
  await expect(
    page.getByRole("button", { name: "BEEF SQUASHED", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Jules acknowledges" }).click();
  await page.getByRole("button", { name: "Rowan acknowledges" }).click();
  await page
    .getByRole("button", { name: "BEEF SQUASHED", exact: true })
    .click();
  const saved = await page.evaluate(() =>
    localStorage.getItem("agentic-beef-public-v1"),
  );
  expect(saved).not.toContain("PRIVATE_CANARY");
  expect(saved).toContain("BEEF SQUASHED");
  await page.screenshot({
    path: "output/playwright/ending-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Replay public log" }).click();
  await expect(
    page.getByRole("button", { name: "Exit replay / reset" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Exit replay / reset" }).click();
  await expect(page.getByLabel("Approved fictional note")).toHaveValue("");
  await page.getByRole("button", { name: "Start / resume" }).click();
  await page.getByRole("button", { name: "Next phase / bell" }).click();
  await pair(page);
  await page.getByRole("button", { name: "Next phase / bell" }).click();
  await pair(page);
  await pair(page);
  await page.getByRole("button", { name: "SPLIT BEEF", exact: true }).click();
  expect(errors).toEqual([]);
});
test("slow inference leaves sound, clock and cancel responsive; stale reply rejected", async ({
  page,
}) => {
  await page.route("**/api/coach", async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route
      .fulfill({
        json: {
          mode: "MOCK",
          card: {
            opponent: "late",
            weakness: "late",
            refs: ["L1"],
            reply: "STALE_REPLY",
            caution: "late",
            plan: "late",
          },
        },
      })
      .catch(() => {});
  });
  await setup(page);
  await pair(page);
  await page.getByRole("button", { name: "Enable local audio" }).click();
  await page.getByRole("button", { name: "Inspect excerpt → coach" }).click();
  await page.getByRole("button", { name: "Stop all local sound" }).click();
  await expect(page.getByRole("alert")).toContainText("Local effects stopped");
  await page.getByRole("button", { name: "Next phase / bell" }).click();
  await page.waitForTimeout(2200);
  await expect(page.getByText("STALE_REPLY")).toHaveCount(0);
});
test("keyboard, mobile and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Stop all local sound" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowDown");
  await page.screenshot({
    path: "output/playwright/mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("unconfigured local inference shows explicit failure and recovers", async ({
  page,
}) => {
  await setup(page);
  await pair(page);
  await page.getByLabel("Inference", { exact: true }).selectOption("model");
  await page.getByRole("button", { name: "Inspect excerpt → coach" }).click();
  await expect(page.getByRole("alert")).toContainText("No local model");
  await page.getByLabel("Inference", { exact: true }).selectOption("rules");
  await page.getByRole("button", { name: "Inspect excerpt → coach" }).click();
  await expect(
    page.getByText("LOCAL RULES · REHEARSAL", { exact: true }),
  ).toBeVisible();
});
test("recover an interrupted round as a logged pause", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Use labeled fixture" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Start / resume" }),
  ).toBeVisible();
  const log = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("agentic-beef-public-v1")!),
  );
  expect(log.at(-1).payload).toMatchObject({ type: "pause", paused: true });
});
test("HTTP boundary rejects missing origin, oversized and non-JSON requests", async ({
  request,
}) => {
  const a = await request.post("/api/coach", { data: { mode: "rules" } });
  expect(a.status()).toBe(403);
  const b = await request.post("/api/coach", {
    headers: {
      Origin: "http://127.0.0.1:4173",
      "Content-Type": "application/json",
    },
    data: "x".repeat(20001),
  });
  expect(b.status()).toBe(400);
  const c = await request.post("/api/coach", {
    headers: {
      Origin: "https://untrusted.invalid",
      "Content-Type": "application/json",
    },
    data: "{}",
  });
  expect(c.status()).toBe(403);
});

test("corner pose stays inside arena; participant can edit the model reply", async ({
  page,
}) => {
  await setup(page);
  await pair(page);
  await page.getByRole("button", { name: "Inspect excerpt → coach" }).click();
  await page
    .getByLabel("Your reply", { exact: true })
    .fill("I accept the timing changed. Please correct my credit today.");
  await page.getByRole("button", { name: "Choose edited reply" }).click();
  const bounds = await page
    .locator("svg.mech")
    .first()
    .evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      ringHeight: el.closest(".ring")!.getBoundingClientRect().height,
    }));
  expect(bounds.height).toBeLessThanOrEqual(bounds.ringHeight);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= 900),
  ).toBeTruthy();
});

test("producer choreography, sound controls, export and completed replay", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Enable local audio" }).click();
  await page.getByRole("button", { name: "Walkout sting" }).click();
  await page.getByRole("slider", { name: "Master", exact: true }).fill("0.2");
  await page.getByRole("slider", { name: "Effects", exact: true }).fill("0.2");
  await page.getByRole("button", { name: "Use labeled fixture" }).click();
  await page.getByRole("button", { name: "rebuttal", exact: true }).click();
  await expect(
    page.getByText(/Producer interpretation: rebuttal/),
  ).toBeVisible();
  await expect(page.locator(".mech.pose-strike")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Mute local FX", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Enable local audio", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause bout", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Next phase / bell" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Stop bout", exact: true }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export public log" }).click();
  expect((await dl).suggestedFilename()).toMatch(/^beef-.*\.json$/);
  await page.getByRole("button", { name: "Replay public log" }).click();
  await expect(
    page.getByRole("heading", { name: "STOPPED", exact: true }),
  ).toBeVisible({ timeout: 12000 });
  await expect(
    page.getByRole("button", { name: "Next phase / bell" }),
  ).toBeDisabled();
});

test("replay uses recorded summary and excludes volatile coaching", async ({
  page,
}) => {
  await setup(page);
  await pair(page);
  await page.getByLabel("Approved fictional note").fill("PRIVATE_CANARY");
  await page.getByRole("button", { name: "Inspect excerpt → coach" }).click();
  await expect(page.getByLabel("Your reply", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next phase / bell" }).click();
  await pair(page);
  await pair(page);
  await page
    .getByLabel("Agreement", { exact: true })
    .fill("A custom public agreement.");
  await page.getByRole("button", { name: "Confirm summary" }).click();
  await page.getByRole("button", { name: "SPLIT BEEF", exact: true }).click();
  await page.getByRole("button", { name: "Reset rehearsal" }).click();
  await page.getByRole("button", { name: "Replay public log" }).click();
  await expect(page.getByLabel("Agreement", { exact: true })).toHaveValue(
    "A custom public agreement.",
    { timeout: 15000 },
  );
  await expect(page.getByLabel("Approved fictional note")).toHaveValue("");
  await expect(page.getByLabel("Your reply", { exact: true })).toHaveCount(0);
});
