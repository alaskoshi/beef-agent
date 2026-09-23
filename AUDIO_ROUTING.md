# Audio routing: observed versus unverified

## Local show
Participant speech is performed live in the room (or separately on a specifically approved Space). This app does not capture a microphone. Manual excerpt entry supplies the trainer; microphone permission is never requested.

Producer gesture → Web Audio oscillators → browser-selected output. Audio enable is explicit, default levels are master35% × effects30% × envelope20%. Each cue stops any previous oscillators. Master/effects affect subsequent cues; Stop all local sound stops the currently sounding nodes immediately. Pause/stop/reset also stop effects. None of these controls mute X or a microphone.

Original palette: Jules walkout98/147/196Hz; Rowan123/164/246Hz; bell880/1320Hz; corner330/220Hz; impact65Hz; ending196/247/294Hz. Short envelopes leave space for speech. No recordings, songs, celebrity voices or licensed commercial samples.

Observed host inventory: BlackHole2ch, ParrotAudioPlugin and TVRemoteAudio drivers are installed. Presence is NOT a routing proof. No system audio devices, aggregate devices or virtual drivers were changed. Local browser controls were exercised in isolated Chrome. Human listening/subjective intelligibility acceptance remains outstanding.

## X boundary
X help says iOS/Android can host. Browser listening does not prove browser hosting or speaking. No Space URL, public stream, microphone API or metadata endpoint is assumed to be an audio transport. Hosting pages note that recordings become publicly replayable; no Space was created or recorded.

Desired, **unverified** signal path:
- Consenting participant microphones → approved mobile X host/speaker endpoints → Space.
- Producer effects → deliberately configured producer endpoint → Space, only after a separate listener confirms them.
- Monitor return → headphones with no speaker feedback.
- Private corner content → outside the public feed. Muting in X does not create a private coaching room.

Early feasibility result: local synthesis is available and virtual-audio drivers exist; public routing cannot be verified without an authorized session plus separate listener. **X integration unverified.** The full local show is the fallback.

If owner later authorizes a public rehearsal: preconfigure the mobile host and producer endpoint, use headphones, test speech then effects separately at a second listener, test stop/mute labels, obtain recording consent, and keep an observed listener receipt. Do not count this diagram as that receipt.

## Local recording
The prepared video uses offline macOS system speech voices for fictional dialogue, original generated effects and full captions. It is labeled PRERECORDED REPLAY / SYNTHETIC VOICES. It is a rehearsal artifact, not evidence of live performers, a natural hype performance or public X routing. Human delivery should replace the synthetic fallback before final owner acceptance.
