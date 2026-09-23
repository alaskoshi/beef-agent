import { execFile } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  openSync,
  closeSync,
} from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  validateCard,
  selectEvidence,
  type TrainerInput,
} from "../src/trainer";
import { systemPrompt } from "./coach";
const exec = promisify(execFile);
// Fixed model/region; <=20 KB input, 650 output tokens. Reserve $0.03 per attempt,
// deliberately above Nova Pro list token cost. No retries, max 30 attempts ($0.90 reserve).
export function reserveAttempt(directory = resolve(".local")) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  let legacy = 0;
  try {
    legacy = JSON.parse(
      readFileSync(resolve(directory, "bedrock-budget.json"), "utf8"),
    ).attempts;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT")
      throw Error("Budget ledger unreadable; refusing inference.");
  }
  if (!Number.isInteger(legacy) || legacy < 0 || legacy > 30)
    throw Error("Invalid budget ledger.");
  // Each immutable slot is itself the reservation. A crash burns a slot rather
  // than stranding a lock or making a paid attempt disappear. Existing slots
  // are never deleted on reset, restart, failure, cancellation or timeout.
  for (let i = 1; i <= 30; i++) {
    try {
      const fd = openSync(
        resolve(directory, `bedrock-attempt-${i}.json`),
        "wx",
        0o600,
      );
      try {
        writeFileSync(
          fd,
          JSON.stringify({
            attempt: i,
            reservedUSD: 0.03,
            at: new Date().toISOString(),
            migrated: i <= legacy,
          }),
        );
      } finally {
        closeSync(fd);
      }
      if (i > legacy) return i;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
  throw Error("Sprint inference budget exhausted.");
}
export async function bedrock(input: TrainerInput, signal?: AbortSignal) {
  if (process.env.BEEF_BEDROCK_ENABLED !== "1")
    throw Error(
      "Bedrock is disabled. Start with BEEF_BEDROCK_ENABLED=1 after local AWS login.",
    );
  if (input.background)
    throw Error(
      "Bedrock demo accepts no private background notes. Clear the note or use local coaching.",
    );
  const permitted = { ...input, evidence: selectEvidence(input) };
  const context = {
    traineeSide: input.side,
    traineePosition: input.position,
    objective: input.objective,
    traineeStatements: input.lines.filter((l) => l.side === input.side),
    opponentStatements: input.lines.filter((l) => l.side !== input.side),
    permittedReceipts: permitted.evidence,
  };
  const descriptions = {
    weakness:
      "One possible misunderstanding in the TRAINEE response. No invented motives.",
    reply:
      "One suggested first-person reply spoken by the TRAINEE to the opponent.",
    caution: "One uncertainty or evidence limitation.",
    plan: "One short actionable next-round plan.",
  };
  const properties = {
    ...Object.fromEntries(
      Object.entries(descriptions).map(([key, description]) => [
        key,
        { type: "string", description },
      ]),
    ),
    refs: {
      type: "array",
      items: { type: "string" },
      description:
        "One to three supplied line or receipt IDs supporting the advice.",
    },
  };
  const payload = {
    modelId: "us.amazon.nova-pro-v1:0",
    system: [
      {
        text:
          systemPrompt +
          " The app separately displays the exact opponent quotation. Do not generate an opponent summary; return only the five tool fields. Use return_corner to provide advice data, never public actions.",
      },
    ],
    messages: [{ role: "user", content: [{ text: JSON.stringify(context) }] }],
    inferenceConfig: { maxTokens: 650, temperature: 0.2 },
    toolConfig: {
      toolChoice: { tool: { name: "return_corner" } },
      tools: [
        {
          toolSpec: {
            name: "return_corner",
            description:
              "Return a grounded, short coaching card for the trainee.",
            inputSchema: {
              json: {
                type: "object",
                properties,
                required: Object.keys(properties),
              },
            },
          },
        },
      ],
    },
  };
  if (Buffer.byteLength(JSON.stringify(payload)) > 20000)
    throw Error("Inference payload too large.");
  reserveAttempt();
  const { stdout } = await exec(
    "aws",
    [
      "bedrock-runtime",
      "converse",
      "--profile",
      process.env.AWS_PROFILE || "beef-demo",
      "--region",
      "us-east-1",
      "--cli-input-json",
      JSON.stringify(payload),
      "--output",
      "json",
      "--no-cli-pager",
      "--cli-connect-timeout",
      "3",
      "--cli-read-timeout",
      "12",
    ],
    {
      timeout: 13000,
      maxBuffer: 100000,
      signal,
      env: { ...process.env, AWS_MAX_ATTEMPTS: "1" },
    },
  ).catch((e) => {
    const code =
      String(e.stderr || "").match(/\((\w+(?:Exception|Error))\)/)?.[1] ||
      "timeout or connection";
    throw Error(`Bedrock failed: ${code}. No fallback substituted.`);
  });
  const result = JSON.parse(stdout);
  const tool = result.output?.message?.content?.find(
    (c: { toolUse?: { name: string } }) => c.toolUse?.name === "return_corner",
  )?.toolUse;
  if (!tool) throw Error("Model did not return a structured corner card.");
  const opponent = input.lines.filter((l) => l.side !== input.side).at(-1);
  const card = validateCard(
    {
      ...tool.input,
      opponent: opponent
        ? `${opponent.id}: ${opponent.text}`
        : "Insufficient excerpt: no opponent statement supplied.",
    },
    permitted,
  );
  return {
    mode: "LIVE MODEL · BEDROCK NOVA PRO",
    card,
    selected: permitted.evidence.map((r) => r.id),
    usage: result.usage,
  };
}
