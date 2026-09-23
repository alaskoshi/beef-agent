export class SoundDesk {
  context: AudioContext | null = null;
  master = 0.35;
  effects = 0.3;
  nodes: OscillatorNode[] = [];
  enabled = false;
  async enable() {
    this.context ??= new AudioContext();
    await this.context.resume();
    this.enabled = true;
  }
  stop() {
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {
        /* already ended */
      }
    }
    this.nodes = [];
  }
  async disable() {
    this.stop();
    this.enabled = false;
    await this.context?.suspend();
  }
  cue(kind: string, side = "a") {
    if (!this.enabled || !this.context) return;
    this.stop();
    const ctx = this.context;
    const notes =
      kind === "walkout"
        ? side === "a"
          ? [98, 147, 196]
          : [123, 164, 246]
        : kind === "corners"
          ? [330, 220]
          : kind === "ending"
            ? [196, 247, 294]
            : kind === "impact"
              ? [65]
              : [880, 1320];
    notes.forEach((frequency, i) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.12;
      osc.type = kind === "impact" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(frequency, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(
        this.master * this.effects * 0.2,
        t + 0.015,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
      this.nodes.push(osc);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        this.nodes = this.nodes.filter((n) => n !== osc);
      };
    });
  }
}
export const sound = new SoundDesk();
