# beef-agent
## agentic.beef · Where’s the Beef Agent?

**The audio is the fight. The robots make it visible. The trainer helps the human come back better.**

A single-screen, single-operator rehearsal of a bounded audio disagreement. Two fictional speakers, their mech avatars, a host/hype performer, and input-dependent corner coaching. The principle: **Extract the signal. Suppress the spiral.**

### Start locally

Requires Node 22+ and npm. No account is needed for the honest rules rehearsal.

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:4173 (use this exact address). One persistent view; no navigation or setup wizard. Target presentation: **1440 × 900**. Narrow screens stack sections and scroll, which Yard #3 explicitly allows.

```bash
npm test
npm run build
npm start
# Browser acceptance tests: installed Google Chrome required; run a server first.
npm run test:ui
```

### Live model coaching

Bedrock use for fictional text has been authorized in the owner’s local sprint. It is **disabled by default** for other users. Choose **Live model · Bedrock** in the corner only after enabling it:

```bash
aws login --profile beef-demo --region us-east-1
BEEF_BEDROCK_ENABLED=1 AWS_PROFILE=beef-demo npm run dev
```

The adapter invokes Amazon Nova Pro through the AWS CLI using temporary credentials. No keys reach the browser. No IAM policies are created. Profile credentials need permission for the US Nova Pro inference profile. The app reserves 3 cents per attempt, up to 30 attempts ($0.90 reserved, below the sprint’s $1 ceiling), including early attempts. The immutable `.local/bedrock-attempt-*.json` slots survive crashes and reset. Do not delete these files to replenish the budget. Actual billing and credit eligibility are not verified by the app. Details: [inference scope](docs/INFERENCE_SCOPE.md).

Bedrock receives synthetic public lines and synthetic receipts only; background notes are rejected. No recordings or personal history are imported. A failed/invalid response is an error, never a disguised fallback. The operator may explicitly select **Local rules · rehearsal**, which is responsive deterministic code, **not AI inference**.

Optional local model: start an OpenAI-compatible model server at `127.0.0.1:1234`, set `LOCAL_MODEL` to its model ID, then select **Live model · local**. This path is implemented but no local model was available for end-to-end validation.

### Rehearse the complete bout

1. **Start / resume**; optionally **Enable local audio** and play each side’s walkout sting. Audio is off until that gesture.
2. **Next phase / bell** enters round one. Give Jules the floor, speak the line, then enter it manually or click **Use labeled fixture**. Give Rowan the floor and do the same. Both must be heard before advancing.
3. Enter corners. Choose the trainee and objective; request coaching. Read the sourced card, edit the reply, then choose or reject it. Nothing is posted automatically. The deliberately revealed fictional corner remains on screen.
4. Enter round two. The participant speaks their improved response; producer enters the approved words. A selected reply stays visible for reference. Producer-confirmed rhetorical cues animate the mechs; these are interpretations, never truth scores.
5. In steel exchange, each participant restates the other’s position. Each can give one correction; neither can indefinitely veto the transition.
6. At ending, state agreement and unresolved issue. Confirm edits before acknowledgments. **BEEF SQUASHED** requires both participants’ explicit acknowledgment. **SPLIT BEEF**, **STILL BEEF**, or **STOPPED** are legitimate outcomes.
7. Export the public log if wanted, reset, and rehearse again. **Replay public log** is a labeled, accelerated visual replay, without audio or fresh inference; reset exits replay.

Full cast, dialogue and timing: [DEMO_RUN_OF_SHOW.md](DEMO_RUN_OF_SHOW.md).

### What runs and what people do

| Function | Actual capability |
|---|---|
| Speakers and host/hype | LIVE HUMAN in the intended show; fictional scripted parts in the local recording |
| Trainer | LIVE MODEL via Bedrock; exact opponent quote pinned by code; schema/reference validation |
| Fallback | LOCAL RULES · REHEARSAL, explicitly selected, input-dependent but not a model |
| Transcript | Manual entry or SCRIPTED FIXTURE buttons; no speech recognition |
| Mechs / sound | PRODUCER-CUED, lightweight original SVG + Web Audio synthesis |
| Submitted video | SILENT CAPTIONED FICTIONAL REHEARSAL; recorded Bedrock coaching; not a real Space |
| X Spaces | Unverified; no connection or microphone control implemented |

Full details: [DEMO_DISCLOSURE.md](DEMO_DISCLOSURE.md), [AUDIO_ROUTING.md](AUDIO_ROUTING.md).

### Boundaries and reliability

The server binds loopback and requires matching Host/Origin for JSON coaching requests. This is a **single-user local trust boundary, not multi-user authentication**; another process on the machine can impersonate a local request. Do not expose it through a tunnel or deploy it as-is.

Private per-side notes and coaching stay in memory, outside the public event store and default export. This is context separation, not a secure private room. Only manually approved public text is persisted in localStorage. Reset clears notes and the current recovery log. A reload replays public events and records a safety pause; elapsed time recovers to the last five-second checkpoint. Private advice is intentionally lost on reload.

Model deadlines are bounded and stale results are discarded after cancellation, phase/side changes, pause or reset. The timer uses `performance.now()`. Public events include match/id/sequence/time/phase/actor/origin/references and validated public payloads. Replays preserve original event origins while displaying a replay label.

Model advice can still be wrong. Source-ID validation proves references exist, not that every sentence is entailed. Participants retain final choice. No winner, factual score, microphone mute, public posting or reconciliation is inferred by the model.

### Sprint evidence and submission

Original project code and artwork are released under the [MIT license](LICENSE). Third-party dependencies and generated narration retain their applicable terms. X Spaces integration is explicitly deferred for the hackathon submission. The app runs locally; this repository does not deploy a public inference server.

- [SPRINT_REPORT.md](SPRINT_REPORT.md): acceptance evidence and remaining limitations.
- [RUN.md](RUN.md): current state and next action.
- [docs/RULES.md](docs/RULES.md): official rules, time and discrepancies.
- [docs/SUBMISSION.md](docs/SUBMISSION.md): confirmed submission and public video.
- [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md): original assets and dependencies.
- `output/playwright/`: browser screenshots; `artifacts/`: local recordings, live synthetic coaching results and manifests.

[Hackyard entry](https://hackyard.tech/yards/yard-3/0281bf4d-9120-4c1d-b2e8-39b0aa32260a) and [submitted captioned video](https://github.com/alaskoshi/beef-agent/releases/download/hackyard-yard-3/agentic-beef-captioned.mp4) were published before the deadline. The submitted video is silent. A separate [voiced post-deadline update](https://github.com/alaskoshi/beef-agent/releases/tag/post-deadline-voices) adds three ElevenLabs voices. It is not the competition submission. No public inference server or X Spaces connection is deployed.
