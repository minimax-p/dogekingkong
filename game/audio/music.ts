// A small synthwave step sequencer: drums, bass, pads and an arpeggio, one
// track per floor. Tempo and pitch follow a rate, so slow motion sounds like
// a tape slowing down. Each floor can later swap in a real recording.
import { noiseBurst, tone, type Sfx } from "@/game/audio/synth";

export type Music = {
    play: (track: number) => void;
    setRate: (r: number) => void;
    tapeStop: () => void;
    tapeStart: () => void;
    stop: () => void;
};

// Chords as semitones above the key's root (natural minor)
const C = {
    i: [0, 3, 7],
    iv: [5, 8, 12],
    v: [7, 10, 14],
    V: [7, 11, 14],
    III: [3, 7, 10],
    VI: [8, 12, 15],
    VII: [10, 14, 17],
    bII: [1, 5, 8],
};

type Track = {
    bpm: number;
    root: number; // MIDI note of the key (bass octave)
    chords: number[][]; // one per bar
    kick: string;
    snare: string;
    hat: string; // x closed, o open
    bass: string; // 0-2 chord tones, o = root an octave up
    arp: string; // 0-3 chord tones (3 = root an octave up)
    cutoff: number;
    pad: boolean;
};

export const TRACKS: Track[] = [
    // 0 · Lobby
    { bpm: 100, root: 33, chords: [C.i, C.VI, C.III, C.VII], kick: "x.......x.......", snare: "....x.......x...", hat: "..x...x...x...x.", bass: "0...0.0.0...0.0.", arp: "0.1.2.1.3.2.1.2.", cutoff: 900, pad: true },
    // 1 · Seismic
    { bpm: 112, root: 38, chords: [C.i, C.VI, C.iv, C.V], kick: "x..x..x.x..x..x.", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "0.00.00.0.00.00.", arp: "0121012101210121", cutoff: 1100, pad: true },
    // 2 · Command
    { bpm: 118, root: 40, chords: [C.i, C.VI, C.III, C.VII], kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", bass: "0000000000000000", arp: "0.2.1.3.0.2.1.3.", cutoff: 1300, pad: true },
    // 3 · Box Office (the power's out)
    { bpm: 96, root: 42, chords: [C.i, C.iv, C.VI, C.V], kick: "x.....x...x.....", snare: "....x.......x..x", hat: "x...x...x...x...", bass: "0.....0...0.....", arp: "3.2.1.0.3.2.1.0.", cutoff: 600, pad: true },
    // 4 · 04:00 AM
    { bpm: 124, root: 36, chords: [C.i, C.VI, C.III, C.VII], kick: "x...x...x...x...", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", bass: "0.0o0.0o0.0o0.0o", arp: "0123321001233210", cutoff: 1500, pad: false },
    // 5 · Local Host
    { bpm: 108, root: 43, chords: [C.i, C.v, C.VI, C.iv], kick: "x..x......x.....", snare: "....x.......x...", hat: "x.xx.x.xx.x.x.xx", bass: "0...0..0..0.0...", arp: "0.0.3.2.0.0.3.1.", cutoff: 1000, pad: true },
    // 6 · After Hours
    { bpm: 128, root: 35, chords: [C.i, C.VI, C.III, C.VII], kick: "x...x...x...x...", snare: "....x.......x...", hat: "..o...o...o...o.", bass: "0.0.o.0.0.0.o.0.", arp: "0.1.2.3.2.1.0.1.", cutoff: 1600, pad: true },
    // 7 · Penthouse
    { bpm: 140, root: 40, chords: [C.i, C.bII, C.i, C.VII], kick: "x...x...x...x.x.", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx", bass: "0000000000000000", arp: "0123012301230123", cutoff: 1800, pad: true },
    // 8 · Title and credits
    { bpm: 84, root: 33, chords: [C.i, C.VI, C.III, C.VII], kick: "................", snare: "................", hat: "................", bass: "0...............", arp: "0...1...2...1...", cutoff: 700, pad: true },
];

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export const makeMusic = (ctx: AudioContext, out: AudioNode, sfx: Sfx): Music => {
    const bus = ctx.createGain();
    bus.connect(out);
    const drums = ctx.createGain();
    drums.gain.value = 0.9;
    drums.connect(bus);
    const drumSfx: Sfx = { ...sfx, out: drums };

    // Arp delay (dotted eighth), with a darkening feedback loop
    const delay = ctx.createDelay(2);
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const fbLp = ctx.createBiquadFilter();
    fbLp.type = "lowpass";
    fbLp.frequency.value = 2200;
    delay.connect(fbLp).connect(fb).connect(delay);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    delay.connect(wet).connect(bus);

    let track = -1;
    let rate = 1;
    let target = 1;
    let step = 0;
    let bar = 0;
    let next = 0;
    let stopped = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const T = () => TRACKS[Math.max(0, track)];

    const synth = (t: number, f: number, dur: number, kind: "bass" | "pad" | "arp", tr: Track) => {
        if (kind === "bass") {
            const o = ctx.createOscillator();
            o.type = "sawtooth";
            o.frequency.value = f;
            const lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.Q.value = 6;
            lp.frequency.setValueAtTime(tr.cutoff * 1.8, t);
            lp.frequency.exponentialRampToValueAtTime(tr.cutoff * 0.35, t + dur);
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.32, t + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(lp).connect(g).connect(bus);
            o.start(t);
            o.stop(t + dur + 0.05);
        } else if (kind === "pad") {
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.3);
            g.gain.setValueAtTime(0.05, t + dur * 0.7);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.1);
            const lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 1400;
            lp.connect(g).connect(bus);
            for (const d of [-7, 0, 7]) {
                const o = ctx.createOscillator();
                o.type = "sawtooth";
                o.frequency.value = f;
                o.detune.value = d;
                o.connect(lp);
                o.start(t);
                o.stop(t + dur * 1.15);
            }
        } else {
            const o = ctx.createOscillator();
            o.type = "square";
            o.frequency.value = f;
            const lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 2600;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.06, t + 0.004);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(lp).connect(g);
            g.connect(bus);
            g.connect(delay);
            o.start(t);
            o.stop(t + dur + 0.05);
        }
    };

    const playStep = (t: number) => {
        const tr = T();
        const chord = tr.chords[bar % tr.chords.length];
        const s16 = 60 / tr.bpm / 4 / rate;
        const p = rate; // pitch follows tempo, like tape
        const k = tr.kick[step];
        const sn = tr.snare[step];
        const h = tr.hat[step];
        if (k === "x") tone(drumSfx, t, "sine", 150, 42, { d: 0.32, peak: 0.95 }, drums, p);
        if (sn === "x") {
            noiseBurst(drumSfx, t, "bandpass", 1900, 1400, { d: 0.16, peak: 0.45 }, drums, p, 0.8);
            tone(drumSfx, t, "triangle", 210, 160, { d: 0.08, peak: 0.25 }, drums, p);
            noiseBurst(drumSfx, t, "bandpass", 1800, 1200, { d: 0.35, peak: 0.25 }, sfx.verb, p);
        }
        if (h === "x") noiseBurst(drumSfx, t, "highpass", 8000, 8000, { d: 0.03, peak: step % 4 === 2 ? 0.12 : 0.07 }, drums, p);
        if (h === "o") noiseBurst(drumSfx, t, "highpass", 7000, 7000, { d: 0.14, peak: 0.1 }, drums, p);

        const b = tr.bass[step];
        if (b !== ".") {
            const n = b === "o" ? tr.root + chord[0] + 12 : tr.root + chord[Number(b)];
            synth(t, midi(n) * p, s16 * 1.8, "bass", tr);
        }
        const a = tr.arp[step];
        if (a !== ".") {
            const idx = Number(a);
            const n = tr.root + 24 + (idx === 3 ? chord[0] + 12 : chord[idx]);
            synth(t, midi(n) * p, s16 * 1.5, "arp", tr);
        }
        if (tr.pad && step === 0) {
            for (const c of chord) synth(t, midi(tr.root + 12 + c) * p, s16 * 16, "pad", tr);
        }
    };

    const schedule = () => {
        if (stopped || track < 0) return;
        // Glide the rate toward its target
        rate += (target - rate) * 0.25;
        while (next < ctx.currentTime + 0.12) {
            if (rate > 0.08) playStep(next);
            const s16 = 60 / T().bpm / 4 / Math.max(0.1, rate);
            next += s16;
            step = (step + 1) % 16;
            if (step === 0) bar++;
        }
        delay.delayTime.setTargetAtTime(Math.min(1.9, (60 / T().bpm) * 0.75 / Math.max(0.3, rate)), ctx.currentTime, 0.05);
    };

    const start = () => {
        if (!timer) timer = setInterval(schedule, 25);
    };

    return {
        play: (i) => {
            if (i === track && !stopped) return;
            track = i;
            step = 0;
            bar = 0;
            next = ctx.currentTime + 0.08;
            stopped = false;
            bus.gain.cancelScheduledValues(ctx.currentTime);
            bus.gain.setValueAtTime(1, ctx.currentTime);
            start();
        },
        setRate: (r) => {
            target = r;
        },
        tapeStop: () => {
            target = 0.05;
            bus.gain.setTargetAtTime(0, ctx.currentTime + 0.3, 0.15);
            setTimeout(() => {
                if (target <= 0.05) stopped = true;
            }, 900);
        },
        tapeStart: () => {
            target = 1;
            rate = 0.4;
            if (stopped) {
                stopped = false;
                next = ctx.currentTime + 0.05;
            }
            bus.gain.cancelScheduledValues(ctx.currentTime);
            bus.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
        },
        stop: () => {
            stopped = true;
            if (timer) clearInterval(timer);
            timer = null;
        },
    };
};
