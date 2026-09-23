import { z } from "zod";
import { Side } from "./domain";
const bounded = z.string().trim().min(1).max(700);
export const InputSchema = z
  .object({
    side: Side,
    position: bounded,
    objective: z.enum(["clarify", "question", "concede"]),
    lines: z
      .array(
        z.object({ id: z.string().regex(/^L\d+$/), side: Side, text: bounded }),
      )
      .min(1)
      .max(20),
    evidence: z
      .array(z.object({ id: z.string().regex(/^R\d+$/), text: bounded }))
      .max(5),
    background: z.string().max(1000),
  })
  .strict();
export type TrainerInput = z.infer<typeof InputSchema>;
export const CardSchema = z
  .object({
    opponent: bounded,
    weakness: bounded,
    refs: z.array(z.string()).min(1).max(6),
    reply: bounded,
    caution: bounded,
    plan: bounded,
  })
  .strict();
export type Card = z.infer<typeof CardSchema>;
export function selectEvidence(input: TrainerInput) {
  const words = new Set(
    (input.position + " " + input.lines.map((l) => l.text).join(" "))
      .toLowerCase()
      .match(/[a-z]{4,}/g),
  );
  return input.evidence
    .map((r) => ({
      r,
      score: (r.text.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) =>
        words.has(w),
      ).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.r);
}
export function validateCard(raw: unknown, input: TrainerInput): Card {
  const card = CardSchema.parse(raw);
  const allowed = new Set([
    ...input.lines.map((l) => l.id),
    ...selectEvidence(input).map((r) => r.id),
  ]);
  if (card.refs.some((r) => !allowed.has(r)))
    throw Error("Trainer cited an unavailable source.");
  const inline =
    Object.values(card)
      .filter((v) => typeof v === "string")
      .join(" ")
      .match(/\b[LR]\d+\b/g) || [];
  if (inline.some((r) => !allowed.has(r)))
    throw Error("Trainer text cited an unavailable source.");
  return card;
}
// Deterministic rehearsal aid. It is responsive, but it is NOT a language model.
export function localRules(raw: unknown): Card {
  const input = InputSchema.parse(raw);
  const opponent = input.lines.filter((l) => l.side !== input.side).at(-1);
  const own = input.lines.filter((l) => l.side === input.side).at(-1);
  const evidence = selectEvidence(input);
  const claim = opponent?.text || "No opponent statement is present.";
  const topic = /deadline|moved|ten|early|timing/i.test(claim)
    ? "timing"
    : /credit|name|design/i.test(claim)
      ? "credit"
      : "the stated claim";
  const conceded = /\b(accept|agree|yes|you are right|acknowledge)\b/i.test(
    claim,
  );
  const strawman = /clearly think|you think|you always|you never/i.test(
    own?.text || "",
  );
  const repeated =
    input.lines.filter((l) => l.side === input.side && l.text === own?.text)
      .length > 1;
  const ref = evidence[0]?.id;
  const question =
    topic === "timing"
      ? "I accept the timing changed. Can we separate that from the missing credit?"
      : topic === "credit"
        ? "What exact credit correction would resolve this part?"
        : `When you say “${claim.slice(0, 110)}”, what change are you asking for?`;
  return validateCard(
    {
      opponent: opponent ? `${opponent.id}: ${claim}` : claim,
      weakness: !opponent
        ? "The excerpt is insufficient to identify their argument."
        : strawman
          ? "Possible strawman: your response attributes a belief their words do not establish."
          : conceded
            ? "They offered a concession. Acknowledge it before repeating your grievance."
            : repeated
              ? "You repeated this line. Clarify what remains unanswered; repetition alone is not a fault."
              : `Separate your own position from their point about ${topic}.`,
      refs: [
        ...(opponent ? [opponent.id] : [input.lines[0].id]),
        ...(ref ? [ref] : []),
      ],
      reply: !opponent
        ? "Could you state your position in one sentence?"
        : input.objective === "concede"
          ? `I can acknowledge your point about ${topic}. Here is what remains unresolved.`
          : question,
      caution:
        "Limited excerpt; no motive or factual verdict established. Receipts are synthetic and may be incomplete.",
      plan: ref
        ? `Ask one question. Check ${ref} together. Pause for the answer.`
        : "Ask one question, then listen. Request a receipt if needed.",
    },
    input,
  );
}
