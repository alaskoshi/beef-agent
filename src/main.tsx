import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  apply,
  event,
  fixture,
  initial,
  names,
  phases,
  positions,
  publicExport,
  receipts,
  replay,
  recoverPublic,
  type Action,
  type Bout,
  type PublicEvent,
  type Side,
} from "./domain";
import { validateCard, type Card, type TrainerInput } from "./trainer";
import { sound } from "./audio";
import { Mech } from "./Mech";
import "./style.css";
const titles = {
  walkout: "THE SPACE IS THE RING.",
  round1: "STATE THE BEEF.",
  corners: "TAKE YOUR CORNER.",
  round2: "COME BACK BETTER.",
  steel: "NO STRAWMEN. ONLY STEEL.",
  ending: "WHAT CHANGED?",
};
const hype = {
  walkout: "Where’s the beef? Two voices. One ring. Let’s hear it.",
  round1: "Let them finish. Then answer the actual point.",
  corners: "Take your corner. Bring that point back clean.",
  round2: "Same beef. Better question. Let’s hear the difference.",
  steel: "Show them you heard it. Their strongest point, in your words.",
  ending: "Name what changed. Leave room for what didn’t.",
};
const storageKey = "agentic-beef-public-v1";
function recover() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      return recoverPublic(JSON.parse(raw));
    }
  } catch {
    /* corrupt recovery discarded, new bout */
  }
  return initial();
}
function App() {
  const [bout, setBout] = useState<Bout>(recover);
  const current = useRef(bout);
  current.current = bout;
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [side, setSide] = useState<Side>("a");
  const [objective, setObjective] =
    useState<TrainerInput["objective"]>("clarify");
  const [notes, setNotes] = useState<Record<Side, string>>({ a: "", b: "" });
  const [card, setCard] = useState<Card | null>(null);
  const [cardMode, setCardMode] = useState("");
  const [reply, setReply] = useState("");
  const [decision, setDecision] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("rules");
  const [audio, setAudio] = useState(false);
  const [master, setMaster] = useState(0.35);
  const [effects, setEffects] = useState(0.3);
  const [seconds, setSeconds] = useState(0);
  const [long, setLong] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [archive, setArchive] = useState<PublicEvent[] | null>(null);
  const [agreement, setAgreement] = useState(bout.agreement);
  const [unresolved, setUnresolved] = useState(bout.unresolved);
  const request = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const clock = useRef({ start: performance.now(), base: bout.elapsed });
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const duration = long
    ? 120
    : bout.phase === "walkout"
      ? 15
      : bout.phase === "corners"
        ? 30
        : 45;
  useEffect(() => {
    clock.current = { start: performance.now(), base: bout.elapsed };
  }, [bout.phase, bout.paused, bout.elapsed]);
  useEffect(() => {
    const t = setInterval(
      () =>
        setSeconds(
          Math.floor(
            (clock.current.base +
              (current.current.paused || replaying
                ? 0
                : performance.now() - clock.current.start)) /
              1000,
          ),
        ),
      100,
    );
    return () => clearInterval(t);
  }, [replaying]);
  useEffect(() => {
    const t = setInterval(() => {
      const s = current.current;
      if (!s.paused && !s.outcome && !replaying) {
        const elapsed =
          clock.current.base + performance.now() - clock.current.start;
        send({ type: "pause", paused: false, elapsed });
      }
    }, 5000);
    return () => clearInterval(t);
  }, [replaying]);
  useEffect(() => {
    if (bout.events.length && !replaying) {
      try {
        localStorage.setItem(storageKey, publicExport(bout));
      } catch {
        setError(
          "Recovery storage unavailable. Export this bout before closing.",
        );
      }
    }
  }, [bout, replaying]);
  useEffect(() => {
    epoch.current++;
    request.current?.abort();
    setBusy(false);
  }, [bout.matchId, bout.phase, side]);
  useEffect(() => {
    setCard(null);
    setReply("");
    setDecision("");
  }, [bout.matchId, side]);
  function send(action: Action, origin: PublicEvent["origin"] = "producer") {
    if (replaying) return false;
    try {
      const next = apply(
        current.current,
        event(current.current, action, origin),
      );
      current.current = next;
      setBout(next);
      if (action.type !== "pause") setError("");
      if (action.type === "advance")
        sound.cue(
          next.phase === "corners"
            ? "corners"
            : next.phase === "ending"
              ? "ending"
              : "bell",
        );
      if (action.type === "cue")
        sound.cue(action.cue === "rebuttal" ? "impact" : "bell");
      if (action.type === "finish") {
        request.current?.abort();
        epoch.current++;
        setBusy(false);
        sound.stop();
      }
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  function pause() {
    sound.stop();
    epoch.current++;
    request.current?.abort();
    setBusy(false);
    send({
      type: "pause",
      paused: !bout.paused,
      elapsed:
        clock.current.base +
        (bout.paused ? 0 : performance.now() - clock.current.start),
    });
  }
  function reset() {
    request.current?.abort();
    epoch.current++;
    sound.stop();
    if (replayTimer.current) clearInterval(replayTimer.current);
    setReplaying(false);
    setArchive(bout.events);
    const next = initial();
    current.current = next;
    setBout(next);
    setDraft("");
    setNotes({ a: "", b: "" });
    setCard(null);
    setError("");
    setAgreement(next.agreement);
    setUnresolved(next.unresolved);
    localStorage.removeItem(storageKey);
  }
  async function train() {
    const input: TrainerInput = {
      side,
      position: positions[side],
      objective,
      lines: bout.lines.slice(-12),
      evidence: receipts,
      background: notes[side],
    };
    const id = ++epoch.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setCard(null);
    setDecision("");
    setError("");
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(14000),
        ]),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Trainer failed");
      if (
        epoch.current !== id ||
        current.current.phase !== "corners" ||
        current.current.paused ||
        current.current.outcome
      )
        return;
      const validated = validateCard(data.card, input);
      setCard(validated);
      setCardMode(data.mode);
      setReply(validated.reply);
    } catch (e) {
      if (epoch.current === id)
        setError(
          controller.signal.aborted
            ? "Coaching cancelled."
            : (e as Error).message,
        );
    } finally {
      if (epoch.current === id) setBusy(false);
    }
  }
  function exportBout() {
    const url = URL.createObjectURL(
      new Blob([publicExport(bout)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `beef-${bout.matchId}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function startReplay() {
    const events = archive || bout.events;
    if (!events.length) return;
    setArchive(events);
    setCard(null);
    setReply("");
    setDecision("");
    setNotes({ a: "", b: "" });
    setReplaying(true);
    setReplayIndex(0);
    sound.stop();
    request.current?.abort();
    epoch.current++;
    setBusy(false);
    let i = 0;
    let s = initial(events[0].matchId);
    setBout(s);
    replayTimer.current = setInterval(() => {
      if (i >= events.length) {
        clearInterval(replayTimer.current!);
        return;
      }
      s = apply(s, events[i++]);
      current.current = s;
      setBout(s);
      setReplayIndex(i);
    }, 450);
  }
  const cue = bout.events.filter((e) => e.payload.type === "cue").at(-1);
  const [cuePulse, setCuePulse] = useState(false);
  useEffect(() => {
    setCuePulse(Boolean(cue));
    const t = setTimeout(() => setCuePulse(false), 900);
    return () => clearTimeout(t);
  }, [cue?.id]);
  const cueRecent = cuePulse;
  function pose(s: Side) {
    if (bout.outcome) return "respect";
    if (bout.paused) return "idle";
    if (bout.phase === "corners") return "corner";
    if (cueRecent && cue?.payload.type === "cue") {
      if (cue.payload.cue === "steelman") return "brace";
      if (cue.payload.cue === "concession" && cue.payload.side === s)
        return "respect";
      if (cue.payload.cue === "receipt") return "brace";
      if (cue.payload.cue === "rebuttal")
        return cue.payload.side === s ? "strike" : "recoil";
    }
    return bout.floor === s ? "speaking" : "idle";
  }
  const active = !bout.paused && !bout.outcome && !replaying;
  const lastLine = bout.lines.at(-1);
  const round =
    bout.phase === "round1"
      ? "01"
      : bout.phase === "round2"
        ? "02"
        : bout.phase === "corners"
          ? "½"
          : bout.phase === "steel"
            ? "03"
            : "00";
  return (
    <main>
      <header>
        <div className="brand">
          agentic<span>.beef</span>
        </div>
        <p>Where’s the Beef Agent?</p>
        <div className="connection">
          Local rehearsal <span>X integration unverified</span>
        </div>
        <button
          className="stop"
          onClick={() => {
            sound.stop();
            request.current?.abort();
            epoch.current++;
            setBusy(false);
            setError(
              "Local effects stopped. This does not mute X or participant microphones.",
            );
          }}
        >
          ■ Stop all local sound
        </button>
      </header>
      <section className="bout-heading">
        <div>
          <h1>{bout.outcome || titles[bout.phase]}</h1>
          <p>You shipped our shared project without crediting me.</p>
        </div>
        <div className="clock">
          <span>
            {bout.outcome
              ? "ENDED"
              : bout.paused
                ? "PAUSED"
                : seconds >= duration
                  ? "TIME · HAND OFF"
                  : "ROUND " + round}
          </span>
          <strong>
            {Math.max(0, duration - seconds)
              .toString()
              .padStart(2, "0")}
            <small> sec</small>
          </strong>
        </div>
      </section>
      <div className="stage-layout">
        <section className="arena" aria-label="Bout arena">
          <div className="phase-strip">
            {phases.map((p, i) => (
              <span
                key={p}
                aria-current={bout.phase === p ? "step" : undefined}
              >
                {i + 1}{" "}
                {p === "round1"
                  ? "Round one"
                  : p === "round2"
                    ? "Round two"
                    : p}
              </span>
            ))}
          </div>
          {bout.phase === "ending" && (
            <section className="ending" aria-label="Ending">
              <h2>{bout.outcome || "Choose what this became."}</h2>
              <label>
                Agreement
                <input
                  disabled={!!bout.outcome || replaying}
                  value={replaying ? bout.agreement : agreement}
                  maxLength={600}
                  onChange={(e) => setAgreement(e.target.value)}
                />
              </label>
              <label>
                Still disputed
                <input
                  disabled={!!bout.outcome || replaying}
                  value={replaying ? bout.unresolved : unresolved}
                  maxLength={600}
                  onChange={(e) => setUnresolved(e.target.value)}
                />
              </label>
              <button
                disabled={
                  !agreement.trim() ||
                  !unresolved.trim() ||
                  !!bout.outcome ||
                  replaying
                }
                onClick={() => send({ type: "summary", agreement, unresolved })}
              >
                Confirm summary
              </button>
              {(["a", "b"] as Side[]).map((s) => (
                <button
                  key={s}
                  disabled={
                    !!bout.outcome ||
                    bout.ack[s] ||
                    replaying ||
                    agreement !== bout.agreement ||
                    unresolved !== bout.unresolved
                  }
                  onClick={() => send({ type: "ack", side: s }, "participant")}
                >
                  {names[s]} {bout.ack[s] ? "acknowledged" : "acknowledges"}
                </button>
              ))}
              {(["BEEF SQUASHED", "SPLIT BEEF", "STILL BEEF"] as const).map(
                (o) => (
                  <button
                    key={o}
                    disabled={
                      !!bout.outcome ||
                      replaying ||
                      agreement !== bout.agreement ||
                      unresolved !== bout.unresolved ||
                      (o === "BEEF SQUASHED" && (!bout.ack.a || !bout.ack.b))
                    }
                    onClick={() => send({ type: "finish", outcome: o })}
                  >
                    {o}
                  </button>
                ),
              )}
              {bout.outcome && (
                <div className="finish-mechs">
                  <Mech side="a" pose="respect" />
                  <p>
                    The round ends here.
                    <br />
                    The next move is yours.
                  </p>
                  <Mech side="b" pose="respect" />
                </div>
              )}
            </section>
          )}
          <div
            className={`ring ${bout.phase === "ending" ? "ending-ring" : ""}`}
          >
            <div className="ring-rope rope-one" />
            <div className="ring-rope rope-two" />
            <div className="ring-floor" />
            {(["a", "b"] as Side[]).map((s) => (
              <div key={s} className={`fighter fighter-${s}`}>
                <div className="fighter-name">
                  <span>{s === "a" ? "RIVET / 01" : "FORGE / 02"}</span>
                  <h2>{names[s]}</h2>
                  <p>
                    {bout.outcome
                      ? "Finished"
                      : bout.phase === "corners"
                        ? "In corner"
                        : bout.floor === s && !bout.paused
                          ? "Has the floor"
                          : "Listening"}
                  </p>
                </div>
                <Mech side={s} pose={pose(s)} />
              </div>
            ))}
            <div className="versus">
              VS<span>VOICES, NOT VERDICTS</span>
            </div>
          </div>
          <div className="current-line" aria-live="polite">
            <span>
              {lastLine
                ? `${lastLine.id} · ${names[lastLine.side]} · ${bout.events.filter((e) => e.payload.type === "line").at(-1)?.origin === "fixture" ? "SCRIPTED FIXTURE" : "manual transcript"}`
                : "Host / hype cue · live human"}
            </span>
            <p>{lastLine?.text || hype[bout.phase]}</p>
          </div>
          <div className="hype">
            <b>ON THE MIC</b>
            <span>{hype[bout.phase]}</span>
          </div>
          <div className="cue-provenance">
            {cue?.payload.type === "cue"
              ? `Producer interpretation: ${cue.payload.cue} · ${cue.payload.refs.join(", ")} · no score or truth verdict`
              : "Choreography awaits producer confirmation. No automatic judging."}
          </div>
        </section>
        <aside className="corner" aria-label="Corner trainer">
          <div className="corner-head">
            <h2>In your corner.</h2>
            <select
              aria-label="Trainer side"
              value={side}
              onChange={(e) => setSide(e.target.value as Side)}
            >
              <option value="a">Jules</option>
              <option value="b">Rowan</option>
            </select>
          </div>
          <p className="privacy">
            Fictional corner revealed. Single operator; not a private room.
            Bedrock sends synthetic text only; no background notes.
          </p>
          <div className="trainer-options">
            <label>
              Coach objective
              <select
                value={objective}
                onChange={(e) => {
                  setObjective(e.target.value as TrainerInput["objective"]);
                  epoch.current++;
                  request.current?.abort();
                  setBusy(false);
                  setCard(null);
                }}
              >
                <option value="clarify">Clarify the real grievance</option>
                <option value="question">Ask a better question</option>
                <option value="concede">Acknowledge a concession</option>
              </select>
            </label>
            <label>
              Inference
              <select
                aria-label="Inference"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  epoch.current++;
                  request.current?.abort();
                  setBusy(false);
                  setCard(null);
                }}
              >
                <option value="rules">Local rules · rehearsal</option>
                <option value="model">Live model · local</option>
                <option value="bedrock">Live model · Bedrock</option>
              </select>
            </label>
          </div>
          <label className="notes">
            Approved fictional note
            <input
              maxLength={1000}
              value={notes[side]}
              onChange={(e) => {
                setNotes({ ...notes, [side]: e.target.value });
                epoch.current++;
                request.current?.abort();
                setBusy(false);
                setCard(null);
              }}
              placeholder="Optional; never in public exports"
            />
          </label>
          <button
            className="train"
            disabled={bout.phase !== "corners" || !active || busy}
            onClick={train}
          >
            {busy ? "Inspecting excerpt…" : "Inspect excerpt → coach"}
          </button>
          {busy && (
            <button
              onClick={() => {
                request.current?.abort();
                epoch.current++;
                setBusy(false);
                setError("Coaching cancelled.");
              }}
            >
              Cancel coaching
            </button>
          )}
          <div className="advice" aria-live="polite">
            {card ? (
              <>
                <span className="mode">{cardMode}</span>
                <p>
                  <b>They argued</b>
                  {card.opponent}
                </p>
                <p>
                  <b>One adjustment</b>
                  {card.weakness}
                </p>
                <small>References: {card.refs.join(" · ")}</small>
                <p>
                  <b>Next move</b>
                  {card.plan}
                </p>
                <small>{card.caution}</small>
                <label>
                  Your reply
                  <textarea
                    aria-label="Your reply"
                    value={reply}
                    maxLength={600}
                    onChange={(e) => setReply(e.target.value)}
                  />
                </label>
                <div className="button-row">
                  <button
                    disabled={!reply.trim()}
                    onClick={() =>
                      setDecision(
                        "Chosen privately. Read or copy this into your next public line when ready.",
                      )
                    }
                  >
                    Choose edited reply
                  </button>
                  <button
                    onClick={() => {
                      setDecision("Advice rejected. Your words, your choice.");
                      setReply("");
                    }}
                  >
                    Reject
                  </button>
                </div>
                <small role="status">{decision}</small>
              </>
            ) : (
              <div className="corner-empty">
                <span>
                  LISTEN.
                  <br />
                  RESET.
                  <br />
                  RETURN.
                </span>
                <p>
                  {bout.phase === "corners"
                    ? "Inspect the actual exchange. Find one useful correction."
                    : "Coaching opens between rounds, after both voices have been heard."}
                </p>
                <small>No advice is posted automatically.</small>
              </div>
            )}
          </div>
        </aside>
      </div>
      <section className="operator" aria-label="Producer desk">
        <div className="transport">
          <button
            className="go"
            disabled={Boolean(bout.outcome) || replaying}
            onClick={pause}
          >
            {bout.paused ? "Start / resume" : "Pause bout"}
          </button>
          <button
            disabled={!active || bout.phase === "ending"}
            onClick={() => send({ type: "advance" })}
          >
            Next phase / bell
          </button>
          <button
            disabled={!!bout.outcome || replaying}
            onClick={() => send({ type: "finish", outcome: "STOPPED" })}
          >
            Stop bout
          </button>
          <button onClick={reset}>
            {replaying ? "Exit replay / reset" : "Reset rehearsal"}
          </button>
          <label className="check">
            <input
              type="checkbox"
              checked={long}
              onChange={(e) => setLong(e.target.checked)}
            />
            Long rehearsal
          </label>
        </div>
        <div className="input-desk">
          <label>
            Speaking floor
            <select
              value={bout.floor}
              disabled={!active}
              onChange={(e) =>
                send({ type: "floor", side: e.target.value as Side })
              }
            >
              <option value="a">Jules</option>
              <option value="b">Rowan</option>
            </select>
          </label>
          <label className="line-input">
            {bout.phase === "steel"
              ? "Restatement / one correction"
              : "Manual transcript excerpt"}
            <input
              aria-label="Public line"
              value={draft}
              maxLength={600}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Enter only words approved for the public ring"
            />
          </label>
          <button
            disabled={
              !active ||
              !draft.trim() ||
              !["round1", "round2", "steel"].includes(bout.phase)
            }
            onClick={() => {
              if (
                send(
                  {
                    type: bout.phase === "steel" ? "steel" : "line",
                    side: bout.floor,
                    text: draft,
                  },
                  "participant",
                )
              )
                setDraft("");
            }}
          >
            Add public line
          </button>
          <button
            disabled={
              !active || !["round1", "round2", "steel"].includes(bout.phase)
            }
            onClick={() => {
              const text = fixture[bout.phase][bout.floor];
              send(
                {
                  type: bout.phase === "steel" ? "steel" : "line",
                  side: bout.floor,
                  text,
                },
                "fixture",
              );
            }}
          >
            Use labeled fixture
          </button>
          {bout.phase === "steel" && (
            <button
              disabled={!active || !draft.trim()}
              onClick={() => {
                if (
                  send(
                    { type: "correction", side: bout.floor, text: draft },
                    "participant",
                  )
                )
                  setDraft("");
              }}
            >
              One correction
            </button>
          )}
        </div>
        <div className="desk-bottom">
          <div className="choreography">
            <span>Producer confirms</span>
            {(["rebuttal", "receipt", "steelman", "concession"] as const).map(
              (c) => (
                <button
                  key={c}
                  disabled={!active || !lastLine}
                  onClick={() =>
                    send({
                      type: "cue",
                      cue: c,
                      side: bout.floor,
                      refs: [c === "receipt" ? "R2" : lastLine!.id],
                    })
                  }
                >
                  {c}
                </button>
              ),
            )}
          </div>
          <div className="audio">
            <button
              onClick={async () => {
                try {
                  if (audio) {
                    await sound.disable();
                    setAudio(false);
                  } else {
                    await sound.enable();
                    setAudio(true);
                  }
                } catch {
                  setError("Audio unavailable in this browser.");
                }
              }}
            >
              {audio ? "Mute local FX" : "Enable local audio"}
            </button>
            <button
              disabled={!audio}
              onClick={() => sound.cue("walkout", bout.floor)}
            >
              Walkout sting
            </button>
            <label>
              Master
              <input
                aria-label="Master"
                type="range"
                min="0"
                max="1"
                step=".05"
                value={master}
                onChange={(e) => {
                  setMaster(+e.target.value);
                  sound.master = +e.target.value;
                }}
              />
            </label>
            <label>
              Effects
              <input
                aria-label="Effects"
                type="range"
                min="0"
                max="1"
                step=".05"
                value={effects}
                onChange={(e) => {
                  setEffects(+e.target.value);
                  sound.effects = +e.target.value;
                }}
              />
            </label>
          </div>
        </div>
      </section>
      {bout.phase === "steel" && (
        <section className="steel-summary">
          {(["a", "b"] as Side[]).map((s) => (
            <p key={s}>
              <b>{names[s]} restates:</b>{" "}
              {bout.steel[s] || "Awaiting restatement."}{" "}
              {bout.corrections[s] && `Correction: ${bout.corrections[s]}`}
            </p>
          ))}
        </section>
      )}

      <section className="receipts" aria-label="Synthetic receipts">
        <b>SYNTHETIC RECEIPTS</b>
        {receipts.map((r) => (
          <p key={r.id}>
            <strong>{r.id}</strong> {r.text}
          </p>
        ))}
      </section>
      <footer>
        <span>
          LIVE HUMAN voices · PRODUCER-CUED stage · SCRIPTED FIXTURE buttons ·
          no automatic transcription
        </span>
        <div>
          <button
            disabled={!bout.events.length || replaying}
            onClick={exportBout}
          >
            Export public log
          </button>
          <button
            disabled={replaying || (!archive && !bout.events.length)}
            onClick={startReplay}
          >
            Replay public log
          </button>
          <span>
            {replaying
              ? `REPLAY ${replayIndex}/${archive?.length}`
              : `${bout.events.length} public events`}
          </span>
        </div>
      </footer>
      <p role="alert" className="error">
        {error || "Extract the signal. Suppress the spiral."}
      </p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
