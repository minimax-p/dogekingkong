// Building blocks for synthesized sounds: enveloped oscillators and noise.

export type Sfx = {
    ctx: AudioContext;
    out: AudioNode;
    noise: AudioBuffer;
    verb: AudioNode;
};

type Env = { a?: number; d: number; peak?: number; sustain?: number };

const envGain = (ctx: AudioContext, t: number, e: Env) => {
    const g = ctx.createGain();
    const a = e.a ?? 0.002;
    const peak = e.peak ?? 1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + e.d);
    return g;
};

export const tone = (
    s: Sfx,
    t: number,
    type: OscillatorType,
    f0: number,
    f1: number,
    e: Env,
    dest: AudioNode = s.out,
    rate = 1,
) => {
    const o = s.ctx.createOscillator();
    o.type = type;
    const dur = ((e.a ?? 0.002) + e.d) / rate;
    o.frequency.setValueAtTime(f0 * rate, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * rate), t + dur);
    const g = envGain(s.ctx, t, { ...e, a: (e.a ?? 0.002) / rate, d: e.d / rate });
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
    return g;
};

export const noiseBurst = (
    s: Sfx,
    t: number,
    filter: BiquadFilterType,
    f0: number,
    f1: number,
    e: Env,
    dest: AudioNode = s.out,
    rate = 1,
    q = 1,
) => {
    const src = s.ctx.createBufferSource();
    src.buffer = s.noise;
    src.playbackRate.value = rate;
    const f = s.ctx.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    const dur = ((e.a ?? 0.002) + e.d) / rate;
    f.frequency.setValueAtTime(f0 * rate, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * rate), t + dur);
    const g = envGain(s.ctx, t, { ...e, a: (e.a ?? 0.002) / rate, d: e.d / rate });
    src.connect(f).connect(g).connect(dest);
    const off = Math.random() * 0.5;
    src.start(t, off);
    src.stop(t + dur + 0.05);
    return g;
};

