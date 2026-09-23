import { z } from "zod";
export const Side = z.enum(["a", "b"]);
export type Side = z.infer<typeof Side>;
export const phases = [
  "walkout",
  "round1",
  "corners",
  "round2",
  "steel",
  "ending",
] as const;
export type Phase = (typeof phases)[number];
export const Origin = z.enum([
  "participant",
  "producer",
  "model",
  "fixture",
  "replay",
]);
const text = z.string().trim().min(1).max(600);
export const ActionSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("advance") }),
  z.strictObject({ type: z.literal("floor"), side: Side }),
  z.strictObject({ type: z.literal("line"), side: Side, text }),
  z.strictObject({
    type: z.literal("pause"),
    paused: z.boolean(),
    elapsed: z.number().min(0).max(86400000),
  }),
  z.strictObject({
    type: z.literal("cue"),
    side: Side,
    cue: z.enum(["rebuttal", "receipt", "steelman", "concession"]),
    refs: z.array(z.string()).min(1).max(8),
  }),
  z.strictObject({ type: z.literal("steel"), side: Side, text }),
  z.strictObject({ type: z.literal("correction"), side: Side, text }),
  z.strictObject({
    type: z.literal("summary"),
    agreement: text,
    unresolved: text,
  }),
  z.strictObject({ type: z.literal("ack"), side: Side }),
  z
    .strictObject({
      type: z.literal("finish"),
      outcome: z.enum(["BEEF SQUASHED", "SPLIT BEEF", "STILL BEEF", "STOPPED"]),
    })
    .strict(),
]);
export type Action = z.infer<typeof ActionSchema>;
export const EventSchema = z
  .object({
    id: z.string().min(1).max(100),
    matchId: z.string().min(1).max(100),
    sequence: z.number().int().positive(),
    timestamp: z.string().datetime(),
    round: z.enum(phases),
    actor: z.enum(["a", "b", "operator"]),
    origin: Origin,
    refs: z.array(z.string()).max(8),
    payload: ActionSchema,
  })
  .strict();
export type PublicEvent = z.infer<typeof EventSchema>;
export type Line = { id: string; side: Side; text: string; phase: Phase };
export type Bout = {
  matchId: string;
  phase: Phase;
  floor: Side;
  paused: boolean;
  elapsed: number;
  lines: Line[];
  steel: Partial<Record<Side, string>>;
  corrections: Partial<Record<Side, string>>;
  ack: Record<Side, boolean>;
  agreement: string;
  unresolved: string;
  outcome: string | null;
  events: PublicEvent[];
};
export const receipts = [
  {
    id: "R1",
    text: "Thu 16:10 · Jules → Rowan: “Friday launch works. Credit me as interaction designer.”",
  },
  {
    id: "R2",
    text: "Fri 09:05 · Rowan → Jules: “Demo moved to 10:00. Shipping the build now; credit slide still in draft.”",
  },
  {
    id: "R3",
    text: "Fri 10:00 · Synthetic launch capture: Rowan named. Jules absent from the credit slide.",
  },
];
export const names: Record<Side, string> = { a: "Jules", b: "Rowan" };
export const positions: Record<Side, string> = {
  a: "Our shared project shipped without my design credit.",
  b: "I shipped early because the demo moved. The credit slide was unfinished.",
};
export const fixture: Record<string, Record<Side, string>> = {
  round1: {
    a: "You shipped our shared project without crediting me. You clearly think I did nothing.",
    b: "I never said you did nothing. The demo moved to ten. I shipped before the credit slide was ready.",
  },
  round2: {
    a: "I accept the demo moved. R2 explains the timing, but R3 still leaves my name out. Can we correct the credit today?",
    b: "Yes. Your design work belongs in the credits. I will add it today. We still need a shared sign-off rule.",
  },
  steel: {
    a: "You were meeting a changed deadline, not saying my work had no value.",
    b: "Your grievance is missing public credit, not that I shipped quickly.",
  },
};
export function initial(matchId: string = crypto.randomUUID()): Bout {
  return {
    matchId,
    phase: "walkout",
    floor: "a",
    paused: true,
    elapsed: 0,
    lines: [],
    steel: {},
    corrections: {},
    ack: { a: false, b: false },
    agreement: "Credit Jules for the interaction design today.",
    unresolved: "How should future releases receive shared sign-off?",
    outcome: null,
    events: [],
  };
}
export function apply(s: Bout, raw: PublicEvent): Bout {
  const e = EventSchema.parse(raw);
  if (s.events.some((x) => x.id === e.id)) return s;
  if (
    e.matchId !== s.matchId ||
    e.sequence !== s.events.length + 1 ||
    e.round !== s.phase
  )
    throw Error("Out-of-order or stale bout event.");
  if (e.origin === "model")
    throw Error("A model cannot control the public bout.");
  if (s.outcome) throw Error("This bout has ended. Reset to rehearse again.");
  const p = e.payload;
  let n = { ...s, events: [...s.events, e] };
  if (s.paused && !["pause", "finish", "summary", "ack"].includes(p.type))
    throw Error("Resume the bout first.");
  const lineRefs = new Set([
    ...s.lines.map((l) => l.id),
    ...receipts.map((r) => r.id),
  ]);
  if (e.refs.some((r) => !lineRefs.has(r)))
    throw Error("Unknown public reference.");
  if (p.type === "advance") {
    const i = phases.indexOf(s.phase);
    if (i === 5) throw Error("Choose an ending.");
    if (
      ["round1", "round2"].includes(s.phase) &&
      !(["a", "b"] as Side[]).every((side) =>
        s.lines.some((l) => l.phase === s.phase && l.side === side),
      )
    )
      throw Error("Give both speakers a line before the bell.");
    if (s.phase === "steel" && (!s.steel.a || !s.steel.b))
      throw Error("Both sides must restate the other position.");
    n = { ...n, phase: phases[i + 1], floor: "a", elapsed: 0 };
  } else if (p.type === "floor") n.floor = p.side;
  else if (p.type === "line") {
    if (!["round1", "round2"].includes(s.phase) || s.floor !== p.side)
      throw Error("Only the current speaker can add a round line.");
    n.lines = [
      ...s.lines,
      {
        id: `L${s.lines.length + 1}`,
        side: p.side,
        text: p.text,
        phase: s.phase,
      },
    ];
  } else if (p.type === "pause") {
    n.paused = p.paused;
    n.elapsed = p.elapsed;
  } else if (p.type === "cue") {
    if (e.origin !== "producer" && e.origin !== "fixture")
      throw Error("Choreography requires producer confirmation.");
    if (p.refs.some((r) => !lineRefs.has(r)))
      throw Error("Unknown cue reference.");
  } else if (p.type === "steel") {
    if (s.phase !== "steel" || s.steel[p.side])
      throw Error("One restatement per side in steel exchange.");
    n.steel = { ...s.steel, [p.side]: p.text };
  } else if (p.type === "correction") {
    if (
      s.phase !== "steel" ||
      s.corrections[p.side] ||
      !s.steel[p.side === "a" ? "b" : "a"]
    )
      throw Error("One correction after the other side restates you.");
    n.corrections = { ...s.corrections, [p.side]: p.text };
  } else if (p.type === "summary") {
    if (s.phase !== "ending") throw Error("Summary belongs at the ending.");
    n.agreement = p.agreement;
    n.unresolved = p.unresolved;
    n.ack = { a: false, b: false };
  } else if (p.type === "ack") {
    if (
      s.phase !== "ending" ||
      e.actor !== p.side ||
      !["participant", "fixture"].includes(e.origin)
    )
      throw Error("Each participant must acknowledge the ending.");
    n.ack = { ...s.ack, [p.side]: true };
  } else if (p.type === "finish") {
    if (p.outcome !== "STOPPED" && s.phase !== "ending")
      throw Error("Finish after steel exchange.");
    if (p.outcome === "BEEF SQUASHED" && (!s.ack.a || !s.ack.b))
      throw Error(
        "Both participants must explicitly acknowledge reconciliation.",
      );
    n.outcome = p.outcome;
    n.paused = true;
  }
  return n;
}
export function event(
  s: Bout,
  payload: Action,
  origin: PublicEvent["origin"] = "producer",
  id = crypto.randomUUID(),
): PublicEvent {
  return {
    id,
    matchId: s.matchId,
    sequence: s.events.length + 1,
    timestamp: new Date().toISOString(),
    round: s.phase,
    actor: "side" in payload ? payload.side : "operator",
    origin,
    refs: payload.type === "cue" ? payload.refs : [],
    payload: ActionSchema.parse(payload),
  };
}
export function replay(raw: unknown): Bout {
  const events = z.array(EventSchema).max(2000).parse(raw);
  if (!events.length) throw Error("No recorded events.");
  return events.reduce(apply, initial(events[0].matchId));
}
export function publicExport(s: Bout) {
  return JSON.stringify(s.events, null, 2);
}

export function recoverPublic(raw: unknown): Bout {
  const s = replay(raw);
  if (s.paused || s.outcome) return s;
  return apply(
    s,
    event(s, { type: "pause", paused: true, elapsed: s.elapsed }, "producer"),
  );
}
