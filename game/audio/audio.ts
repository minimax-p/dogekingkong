// All sound is synthesized with the Web Audio API: no audio files.
//
//   sfx ─┐
//        ├─ focus low-pass ─ master volume ─ speakers
//   music┘   (20 kHz → 1 kHz in slow motion)
//
// Slow motion also bends pitch: world sounds play at up to 0.55× and the
// music's tempo and pitch drop to 0.6×, like a tape slowing down.
import type { Settings } from "@/game/flow/save";
import type { GameEvent, World } from "@/game/world/types";
import { makeMusic, type Music } from "@/game/audio/music";
import { noiseBurst, tone, type Sfx } from "@/game/audio/synth";

export type Audio = {
    music: (track: number) => void;
    setMusicOn: (on: boolean) => void;
    apply: (s: Settings) => void;
    events: (events: GameEvent[], w: World, replay: boolean) => void;
    setFocus: (focus: number, dead: boolean) => void;
    setMuffle: (amount: number) => void;
    tapeStop: () => void;
    tapePlay: () => void;
    rewind: () => void;
    sting: (name: string) => void;
    blip: (who: string) => void;
    resume: () => void;
    suspend: () => void;
    close: () => void;
};



const makeNoise = (ctx: AudioContext) => {
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < d.length; i++) {
        seed = (seed * 16807) % 2147483647;
        d[i] = (seed / 2147483647) * 2 - 1;
    }
    return b;
};

// A short, dark room for the reverb send
const makeImpulse = (ctx: AudioContext, seconds: number, decay: number) => {
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c);
        let seed = 99 + c;
        for (let i = 0; i < len; i++) {
            seed = (seed * 16807) % 2147483647;
            d[i] = ((seed / 2147483647) * 2 - 1) * Math.pow(1 - i / len, decay);
        }
    }
    return b;
};

// ---- Sound effects. `r` is the playback rate (slow motion bends pitch)

type Recipe = (s: Sfx, t: number, r: number, dest: AudioNode, v: number) => void;

const R: Record<string, Recipe> = {
    slash: (s, t, r, d) => {
        noiseBurst(s, t, "bandpass", 900, 5200, { a: 0.012, d: 0.13, peak: 0.55 }, d, r, 1.4);
        tone(s, t + 0.01 / r, "sine", 2600, 1900, { a: 0.004, d: 0.16, peak: 0.07 }, d, r);
        tone(s, t, "triangle", 220, 90, { a: 0.004, d: 0.08, peak: 0.12 }, d, r);
    },
    deflect: (s, t, r, d) => {
        tone(s, t, "sine", 3100, 3000, { d: 0.45, peak: 0.28 }, d, r);
        tone(s, t, "sine", 4730, 4600, { d: 0.3, peak: 0.16 }, d, r);
        tone(s, t, "square", 1800, 900, { d: 0.04, peak: 0.08 }, d, r);
        noiseBurst(s, t, "highpass", 3000, 3000, { d: 0.05, peak: 0.4 }, d, r);
        noiseBurst(s, t, "bandpass", 2400, 2400, { d: 0.35, peak: 0.12 }, s.verb, r, 3);
    },
    kill: (s, t, r, d) => {
        tone(s, t, "sine", 160, 38, { d: 0.22, peak: 0.9 }, d, r);
        noiseBurst(s, t, "lowpass", 2400, 300, { d: 0.16, peak: 0.7 }, d, r);
        tone(s, t, "sawtooth", 620, 70, { d: 0.12, peak: 0.12 }, d, r);
        noiseBurst(s, t + 0.03 / r, "bandpass", 5000, 1500, { d: 0.25, peak: 0.12 }, d, r, 4);
        noiseBurst(s, t, "bandpass", 700, 700, { d: 0.4, peak: 0.15 }, s.verb, r);
    },
    shot: (s, t, r, d, v) => {
        noiseBurst(s, t, "highpass", 900, 300, { d: 0.09, peak: 0.55 * v }, d, r);
        tone(s, t, "sine", 210, 55, { d: 0.1, peak: 0.6 * v }, d, r);
        tone(s, t, "square", 1400, 300, { d: 0.02, peak: 0.08 * v }, d, r);
        noiseBurst(s, t, "lowpass", 1500, 400, { d: 0.35, peak: 0.2 * v }, s.verb, r);
    },
    shotgun: (s, t, r, d, v) => {
        noiseBurst(s, t, "lowpass", 3500, 250, { d: 0.22, peak: 0.8 * v }, d, r);
        tone(s, t, "sine", 170, 40, { d: 0.18, peak: 0.8 * v }, d, r);
        noiseBurst(s, t, "lowpass", 1200, 300, { d: 0.5, peak: 0.25 * v }, s.verb, r);
    },
    step: (s, t, r, d) => {
        noiseBurst(s, t, "bandpass", 1600 + Math.random() * 600, 900, { d: 0.025, peak: 0.08 }, d, r, 2);
    },
    jump: (s, t, r, d) => {
        noiseBurst(s, t, "bandpass", 500, 1600, { a: 0.01, d: 0.08, peak: 0.12 }, d, r);
        tone(s, t, "triangle", 300, 520, { d: 0.05, peak: 0.05 }, d, r);
    },
    walljump: (s, t, r, d) => {
        noiseBurst(s, t, "bandpass", 700, 2200, { a: 0.005, d: 0.1, peak: 0.16 }, d, r);
        tone(s, t, "sine", 180, 90, { d: 0.05, peak: 0.25 }, d, r);
    },
    land: (s, t, r, d, v) => {
        tone(s, t, "sine", 110, 50, { d: 0.07, peak: 0.25 * Math.min(1, v / 5) }, d, r);
        noiseBurst(s, t, "lowpass", 900, 300, { d: 0.05, peak: 0.12 }, d, r);
    },
    roll: (s, t, r, d) => {
        noiseBurst(s, t, "bandpass", 400, 1400, { a: 0.03, d: 0.2, peak: 0.22 }, d, r, 0.8);
    },
    door: (s, t, r, d) => {
        noiseBurst(s, t, "lowpass", 700, 200, { d: 0.18, peak: 0.9 }, d, r);
        tone(s, t, "sine", 95, 45, { d: 0.2, peak: 0.8 }, d, r);
        noiseBurst(s, t, "highpass", 4000, 2000, { d: 0.06, peak: 0.3 }, d, r);
        noiseBurst(s, t, "lowpass", 900, 300, { d: 0.5, peak: 0.25 }, s.verb, r);
    },
    throw: (s, t, r, d) => {
        noiseBurst(s, t, "bandpass", 600, 2500, { a: 0.02, d: 0.12, peak: 0.25 }, d, r, 1.2);
    },
    pickup: (s, t, r, d, v) => {
        if (v === 2) {
            // The intel file
            [660, 880, 1320].forEach((f, i) => tone(s, t + i * 0.07, "square", f, f, { d: 0.09, peak: 0.07 }, d, 1));
            return;
        }
        tone(s, t, "square", 700, 700, { d: 0.04, peak: 0.06 }, d, r);
        tone(s, t + 0.05, "square", 1050, 1050, { d: 0.05, peak: 0.06 }, d, r);
    },
    break: (s, t, r, d) => {
        for (let i = 0; i < 5; i++) tone(s, t + i * 0.012, "sine", 2200 + Math.random() * 3800, 1800, { d: 0.12, peak: 0.08 }, d, r);
        noiseBurst(s, t, "highpass", 3000, 3000, { d: 0.12, peak: 0.3 }, d, r);
    },
    alert: (s, t, r, d, v) => {
        if (!v) return;
        tone(s, t, "square", 1150, 1150, { d: 0.05, peak: 0.07 }, d, r);
        tone(s, t + 0.06 / r, "square", 1720, 1720, { d: 0.08, peak: 0.07 }, d, r);
    },
    clang: (s, t, r, d) => {
        [820, 1270, 2130, 3390].forEach((f, i) => tone(s, t, "sine", f, f * 0.98, { d: 0.5 - i * 0.08, peak: 0.16 }, d, r));
        noiseBurst(s, t, "highpass", 2500, 2500, { d: 0.05, peak: 0.4 }, d, r);
    },
    punch: (s, t, r, d) => {
        noiseBurst(s, t, "bandpass", 300, 900, { a: 0.02, d: 0.1, peak: 0.25 }, d, r);
    },
    sentry: (s, t, r, d) => {
        for (let i = 0; i < 3; i++) tone(s, t + i * 0.14, "square", i % 2 ? 820 : 1040, i % 2 ? 820 : 1040, { d: 0.1, peak: 0.08 }, d, r);
    },
    ricochet: (s, t, r, d) => {
        tone(s, t, "sine", 2700, 1300, { d: 0.12, peak: 0.05 }, d, r);
    },
    focusOn: (s, t, _r, d) => {
        tone(s, t, "sine", 700, 140, { a: 0.01, d: 0.4, peak: 0.25 }, d, 1);
        noiseBurst(s, t, "lowpass", 3000, 200, { a: 0.1, d: 0.35, peak: 0.3 }, d, 1);
        tone(s, t, "sine", 55, 40, { a: 0.05, d: 0.6, peak: 0.35 }, d, 1);
    },
    focusOff: (s, t, _r, d) => {
        tone(s, t, "sine", 160, 620, { a: 0.01, d: 0.2, peak: 0.18 }, d, 1);
        noiseBurst(s, t, "bandpass", 300, 2800, { a: 0.05, d: 0.15, peak: 0.2 }, d, 1);
    },
    focusEmpty: (s, t, _r, d) => {
        tone(s, t, "square", 110, 100, { d: 0.14, peak: 0.08 }, d, 1);
    },
    death: (s, t, _r, d) => {
        tone(s, t, "sine", 90, 30, { d: 1.2, peak: 0.9 }, d, 1);
        noiseBurst(s, t, "lowpass", 1200, 80, { d: 1.2, peak: 0.5 }, d, 1);
        tone(s, t + 0.35, "sine", 60, 50, { a: 0.02, d: 0.25, peak: 0.6 }, d, 1);
        tone(s, t + 0.62, "sine", 60, 50, { a: 0.02, d: 0.25, peak: 0.45 }, d, 1);
    },
    laser: (s, t, r, d) => {
        tone(s, t, "sawtooth", 1400, 200, { d: 0.12, peak: 0.1 }, d, r);
    },
};

// Sounds that belong to the Headhunter bend less in slow motion than the world's
const PLAYER_SOUNDS = new Set(["slash", "jump", "walljump", "land", "roll", "step", "throw", "pickup", "deflect", "focusOn", "focusOff", "focusEmpty", "death"]);

export const makeAudio = (settings: Settings): Audio => {
    const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC({ latencyHint: "interactive" });
    const master = ctx.createGain();
    const focusLp = ctx.createBiquadFilter();
    focusLp.type = "lowpass";
    focusLp.frequency.value = 20000;
    focusLp.Q.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    focusLp.connect(comp).connect(master).connect(ctx.destination);
    const sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.8;
    sfxBus.connect(focusLp);
    const verb = ctx.createConvolver();
    verb.buffer = makeImpulse(ctx, 1.4, 3);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.35;
    verb.connect(verbGain).connect(focusLp);
    const musicBus = ctx.createGain();
    const muffle = ctx.createBiquadFilter();
    muffle.type = "lowpass";
    muffle.frequency.value = 20000;
    musicBus.connect(muffle).connect(focusLp);

    const sfx: Sfx = { ctx, out: sfxBus, noise: makeNoise(ctx), verb };
    const music: Music = makeMusic(ctx, musicBus, sfx);

    let focus = 0;
    let musicOn = settings.music;
    const apply = (s: Settings) => {
        master.gain.setTargetAtTime(s.volume * 0.9, ctx.currentTime, 0.05);
        musicOn = s.music;
        musicBus.gain.setTargetAtTime(musicOn ? 0.55 : 0, ctx.currentTime, 0.1);
    };
    apply(settings);

    const play = (name: string, x: number, w: World | null, v = 1) => {
        const recipe = R[name];
        if (!recipe || ctx.state !== "running") return;
        const t = ctx.currentTime + 0.005;
        const isPlayer = PLAYER_SOUNDS.has(name);
        const rate = isPlayer ? 1 - focus * 0.28 : 1 - focus * 0.45;
        // Pan and fade by distance from the camera's middle
        let dest: AudioNode = sfxBus;
        if (w && !isPlayer) {
            const cx = w.cam.x + 240;
            const dx = x - cx;
            const p = ctx.createStereoPanner();
            p.pan.value = Math.max(-0.8, Math.min(0.8, dx / 300));
            const g = ctx.createGain();
            g.gain.value = Math.max(0.2, 1 - Math.abs(dx) / 700);
            p.connect(g).connect(sfxBus);
            dest = p;
            setTimeout(() => {
                try {
                    p.disconnect();
                    g.disconnect();
                } catch {
                    // already gone
                }
            }, 3000);
        }
        recipe(sfx, t, rate, dest, v);
    };

    let blipT = 0;
    const PITCH: Record<string, number> = { client: 420, doge: 260, headhunter: 620, chatbot: 900, crew: 540, barista: 700, sign: 800, system: 800 };

    return {
        music: (track) => music.play(track),
        setMusicOn: (on) => {
            musicOn = on;
            musicBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.1);
        },
        apply,
        events: (events, w, replay) => {
            for (const e of events) {
                if (replay && (e.type === "focusOn" || e.type === "focusOff" || e.type === "focusEmpty")) continue;
                if (e.type === "step" && Math.random() < 0.15) continue;
                play(e.type, e.x, w, e.v ?? 1);
            }
        },
        setFocus: (f, dead) => {
            focus = f;
            const target = dead ? 700 : 20000 * Math.pow(1000 / 20000, f);
            focusLp.frequency.setTargetAtTime(target, ctx.currentTime, 0.03);
            music.setRate(dead ? 0.6 : 1 - f * 0.4);
        },
        setMuffle: (a) => {
            muffle.frequency.setTargetAtTime(20000 * Math.pow(600 / 20000, a), ctx.currentTime, 0.08);
        },
        tapeStop: () => {
            music.tapeStop();
            play("death", 0, null);
        },
        tapePlay: () => {
            music.tapeStart();
            tone(sfx, ctx.currentTime, "square", 180, 180, { d: 0.03, peak: 0.06 });
            noiseBurst(sfx, ctx.currentTime + 0.02, "bandpass", 300, 1200, { a: 0.05, d: 0.25, peak: 0.1 });
        },
        rewind: () => {
            const t = ctx.currentTime;
            // Tape squeal: chirps sliding around a fast warble
            for (let i = 0; i < 10; i++) tone(sfx, t + i * 0.12, "sine", 1800 + (i % 3) * 700, 2600 + (i % 2) * 900, { a: 0.01, d: 0.1, peak: 0.05 });
            noiseBurst(sfx, t, "bandpass", 2000, 5000, { a: 0.05, d: 1.2, peak: 0.12 }, sfx.out, 1, 2);
            music.setRate(1);
        },
        sting: (name) => {
            const t = ctx.currentTime;
            if (name === "clear") {
                [0, 4, 7, 12].forEach((st, i) => tone(sfx, t + i * 0.08, "square", 523.25 * Math.pow(2, st / 12), 523.25 * Math.pow(2, st / 12), { d: 0.18, peak: 0.06 }));
            } else if (name === "interrupt") {
                noiseBurst(sfx, t, "bandpass", 3000, 600, { d: 0.12, peak: 0.25 }, sfx.out, 1, 3);
                tone(sfx, t, "square", 160, 80, { d: 0.1, peak: 0.1 });
            } else if (name === "ding") {
                tone(sfx, t, "sine", 1318.5, 1318.5, { d: 1.2, peak: 0.18 });
                tone(sfx, t + 0.25, "sine", 1046.5, 1046.5, { d: 1.4, peak: 0.16 });
            }
        },
        blip: (who) => {
            const now = ctx.currentTime;
            if (now - blipT < 0.035) return;
            blipT = now;
            const f = (PITCH[who] ?? 600) * (0.95 + Math.random() * 0.1);
            tone(sfx, now, who === "chatbot" ? "square" : "triangle", f, f, { d: 0.03, peak: 0.05 });
        },
        resume: () => {
            if (ctx.state !== "running") void ctx.resume();
        },
        suspend: () => {
            void ctx.suspend();
        },
        close: () => {
            music.stop();
            void ctx.close();
        },
    };
};
