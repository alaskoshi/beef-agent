# Sprint / acceptance report

Status: working local vertical slice; owner review of performance and external publication remain separate. No public X rehearsal, deployment, push, PR, media upload or hackathon submission occurred.

## What works
One-screen walkout → two speakers → corners → improved round → steel exchange → explicit ending. Typed ordered events, turn/transition guards, two-sided reconciliation, producer-confirmed mech cues, original restrained effects, private per-side in-memory coaching, manual public excerpts, local recovery and deterministic public-state replay. A live Bedrock trainer is integrated and exercised; a rules fallback is honestly labeled.

## Executed checks
- `npm run build`: TypeScript and Vite production build pass. Third-party Zod PURE-annotation warnings are non-fatal; no app build errors.
- `npm test`:15 tests pass (bout transitions, duplicates/stale order, floor, model authority, reference validation, correction limit, acknowledgments, private canary, input-responsive rules, injection as data, evidence selection, local-model failure, stopped state, logged recovery and crash-safe spending reservations).
- `npm run test:ui`:9 isolated Chrome tests pass at1440×900 and390×844, including two complete bouts without code changes, reset/replay, edit/choose, explicit model failure/recovery, mock delayed inference, local audio controls, cancel/stale result rejection, producer choreography, public export, keyboard focus, reduced motion, no horizontal mobile overflow and API origin/body limits.
- Live synthetic Bedrock checks: three final Nova Pro requests (timing, credit concession, opponent injection) return validated cards. Changed excerpts change advice. Exact opponent quotation is pinned from supplied text. No source IDs invented in accepted cards. Tool/schema failure is rejected, never a silent rules fallback. Results: `artifacts/live-coach.json`.
- Initial Micro trials were insufficient: speaker confusion, an invalid schema and a failed request. Replaced with Pro and structured tool arguments. Final result does not retroactively mark those trials passed.
- Fresh-context excerpt review: pass for the local demo after recovery, budget crash, strict parsing, path containment and cost-evidence fixes. Full independent source execution was not performed. See `docs/REVIEW.md`.
- `git diff --check`: no whitespace errors.

## Acceptance matrix
| # | Requirement | Evidence / limit |
|---|---|---|
|1|Fresh startup|Fresh `npm ci --ignore-scripts --offline` succeeded, followed by production build/start; exact README commands documented; no deployment dependency.|
|2|One screen|One route; target desktop ring/desk fits; corner advice scrolls in place. Smaller screens scroll as official rules allow.|
|3|Both speakers/corners/finish|Two complete automated rehearsals and state tests.|
|4|Changed excerpt changes live advice|Three saved real Bedrock responses.|
|5|Grounded references|Every accepted card is schema/reference validated; IDs exist. Semantic correctness still needs participant judgment.|
|6|Injection cannot change authority|Live hostile opponent text plus strict schema and model-origin public-action rejection; no model tool executes public actions. Not a universal prompt-injection guarantee.|
|7|Private notes excluded|Canary absent from default public log; Bedrock rejects background notes; no personal history imported.|
|8|Slow/failed inference preserves controls|Mock delayed browser request while sound stop and phase controls work; stale response rejected. Real failed requests displayed errors.|
|9|Accurate mute labels|Enable/Mute local FX and Stop all local sound. Explicitly no microphone or X control.|
|10|Duplicates/stale responses|Event-id idempotence, sequence/phase rejection, request epochs, abort and timeout.|
|11|Event-driven mechs|Logged producer cue drives strike/recoil; corners/floor/outcome derive from bout state. No automatic truth scoring.|
|12|Two-sided reconciliation|Button and reducer guards; summary edits clear acknowledgment.|
|13|Keyboard/readability/reduced motion|Browser focus/edit controls, mobile overflow, reduced motion mode, desktop/mobile screenshots. Full screen-reader and human contrast/comfort acceptance remain unverified.|
|14|Reset/rehearse again|Two complete runs in same browser test without code edits.|
|15|Claimed X integration|None. X integration unverified; no listener evidence.|
|16|Staging disclosure|Fixture provenance visible; local media prominently labeled synthetic prerecorded rehearsal. Live-model card separately identified.|

## Media
A 180-second original fictional soundtrack was generated locally using installed system voices. Captions are `artifacts/demo.srt`. Local WAV has no clipping (peak−2.9dBFS; mean−23.5dBFS before final encode). No microphone, commercial recording, cloned performer, cloud TTS or public Space used.

First timed screen capture found mech pose/layout class collision and reply-label targeting defect. Both fixed; regression test added. Final video is exactly180.000 seconds, H.264/AAC,1440×1040 (1440×900 app plus caption band),7,250,672 bytes. Full decode completed without errors; frames at84 and173 seconds were visually inspected. Receipt: `artifacts/media-verification.json`. Human listening and live performer rehearsal remain an owner-review gate; machine checks do not establish natural hype delivery.

## Known limitations
Single operator only; local Host/Origin checks do not authenticate other local processes. Do not deploy/tunnel this server. Public events persist in browser localStorage; private notes/cards are volatile. Reload pauses at last five-second checkpoint. Replay is accelerated visual public-state replay without reproduced speech or new inference. Manual cues/time handoffs require an operator. No X stream, hosting, participant mute, ASR, crowd voting, autonomous hype or objective judging. Local-model adapter is implemented but unverified against an actual local model. Bedrock uses temporary AWS profile access and can expire; actual credit balance/billing is unverified. The local budget guard is a conservative estimate, not a provider-enforced guarantee.

## Artifacts and external state
Application and documents are in this repository. `artifacts/` contains local media/receipts; `output/playwright/` has test screenshots. Source and media manifests identify the local checkpoint. Submission writeup is422 characters. Public release still needs owner review, license choice and an exact approval packet for the chosen publication action. Prepared does not mean published or submitted.
