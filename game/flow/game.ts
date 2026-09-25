// The runtime: a fixed-step loop, the screens between stages, and the bridge
// to the React overlay (through the store).
import { H, STEP_MS, W } from "@/game/engine/constants";
import { emptyInput, type Input } from "@/game/engine/input";
import { getAtlas } from "@/game/art/atlas";
import { makeAudio, type Audio } from "@/game/audio/audio";
import { makeBrowserInput, type BrowserInput } from "@/game/flow/browser-input";
import { makeRecorder, record, worldAt, type Recorder } from "@/game/flow/recorder";
import { loadSave, saveSave, type SaveData, type Settings } from "@/game/flow/save";
import { makeStore, type Store } from "@/game/flow/store";
import { makeLayers, renderWorld, type HudOpts } from "@/game/render/renderer";
import { makePost, type Post, type PostParams } from "@/game/render/post";
import type { FloorDef, Line, Script } from "@/game/story/types";
import { chestY } from "@/game/world/player";
import { parseStage, type Stage } from "@/game/world/stage";
import type { World } from "@/game/world/types";
import { createWorld, stepWorld } from "@/game/world/world";

export type Screen = "title" | "card" | "play" | "dead" | "rewind" | "clear" | "replay" | "dialogue" | "elevator" | "ending";

export type DialogueView = {
    who: Line["who"];
    text: string; // typed so far
    full: string;
    done: boolean;
    interrupt: { label: string } | null;
    choices: { label: string }[] | null;
    key: number;
};

export type UiState = {
    screen: Screen;
    paused: boolean;
    menu: null | "pause" | "dossier" | "settings" | "elevator";
    floor: number;
    stage: number;
    stageLabel: string;
    dialogue: DialogueView | null;
    toast: { text: string; key: number } | null;
    deathLine: string;
    deaths: number;
    skipOffer: boolean;
    settings: Settings;
    save: SaveData;
    audioReady: boolean;
    gl: boolean;
    replaySpeed: number;
};

export type GameHandle = {
    store: Store<UiState>;
    peek: () => { world: World; replay: World | null };
    input: BrowserInput;
    dispatch: (a: Action) => void;
    resize: (cssW: number, cssH: number, dpr: number, rect: { left: number; top: number; width: number; height: number }) => void;
    destroy: () => void;
};

export type Action =
    | { type: "start" }
    | { type: "pause" }
    | { type: "resume" }
    | { type: "menu"; menu: UiState["menu"] }
    | { type: "restart" }
    | { type: "skipStage" }
    | { type: "gotoFloor"; floor: number }
    | { type: "advance" } // dialogue: next line / finish typing
    | { type: "choose"; index: number }
    | { type: "interrupt" }
    | { type: "settings"; patch: Partial<Settings> }
    | { type: "replaySpeed"; speed: number }
    | { type: "skip" }; // skip a replay or a card

const DEATH_LINES: Record<string, string> = {
    bullet: "Nope. That won't work.",
    shotgun: "Nope. That won't work.",
    punch: "Nope. That won't work.",
    shield: "Nope. That won't work.",
    laser: "Nope. That won't work.",
    bug: "Nope. That won't work.",
    shuttle: "Nope. That won't work.",
    fall: "Nope. That won't work.",
    time: "Too slow. That won't work.",
};

export const createGame = (display: HTMLCanvasElement, floors: FloorDef[], opts: { floor?: number; stage?: number; onAction?: (name: string) => void } = {}): GameHandle => {
    const save = loadSave();
    const store = makeStore<UiState>({
        screen: "title",
        paused: false,
        menu: null,
        floor: opts.floor ?? 0,
        stage: opts.stage ?? 0,
        stageLabel: "",
        dialogue: null,
        toast: null,
        deathLine: "",
        deaths: 0,
        skipOffer: false,
        settings: save.settings,
        save,
        audioReady: false,
        gl: true,
        replaySpeed: 1,
    });

    getAtlas();
    const { layers, canvases } = makeLayers();
    let post: Post = makePost(display);
    store.set({ gl: post.gl });
    const input = makeBrowserInput(display.parentElement ?? display);
    let audio: Audio | null = null;

    let stage: Stage = parseStage(floors[store.get().floor].stages[store.get().stage]);
    let world: World = newWorld();
    let rec: Recorder = makeRecorder();
    let replay: { world: World; i: number } | null = null;
    let screenT = 0; // real steps on the current screen
    let realT = 0;
    let script: { lines: Script; i: number; typed: number; then: () => void } | null = null;
    let lastInput: Input = emptyInput();

    function newWorld() {
        const s = store.get();
        return createWorld(stage, 1000 + s.floor * 10 + s.stage, { invincible: s.settings.recruiter });
    }

    const floor = () => floors[store.get().floor];

    const setScreen = (screen: Screen) => {
        screenT = 0;
        input.consumeAny(); // a key held from before doesn't count as a new press
        store.set({ screen });
    };

    const loadStage = (f: number, s: number) => {
        stage = parseStage(floors[f].stages[s]);
        store.set({ floor: f, stage: s, stageLabel: `${floors[f].num}-${s + 1}`, deaths: f === store.get().floor && s === store.get().stage ? store.get().deaths : 0, skipOffer: false });
        world = newWorld();
        rec = makeRecorder();
        replay = null;
        audio?.music(floors[f].music);
    };

    const beginFloor = (f: number) => {
        loadStage(f, 0);
        const fl = floors[f];
        const s = store.get();
        if (!s.save.floorsSeen.includes(fl.id)) {
            store.set({ save: { ...s.save, floorsSeen: [...s.save.floorsSeen, fl.id] } });
            saveSave(store.get().save);
        }
        setScreen("card");
    };

    const afterCard = () => {
        const fl = floor();
        if (fl.intro && store.get().stage === 0) runScript(fl.intro, () => setScreen("play"));
        else setScreen("play");
    };

    // ---- Dialogue
    const runScript = (lines: Script, then: () => void) => {
        script = { lines, i: 0, typed: 0, then };
        setScreen("dialogue");
        publishLine();
    };

    const publishLine = () => {
        if (!script) return;
        const line = script.lines[script.i];
        if (!line) {
            const then = script.then;
            script = null;
            store.set({ dialogue: null });
            then();
            return;
        }
        const n = Math.floor(script.typed);
        const done = n >= line.text.length;
        store.set({
            dialogue: {
                who: line.who,
                text: line.text.slice(0, n),
                full: line.text,
                done,
                interrupt: !done && line.interrupt ? { label: line.interrupt.label } : null,
                choices: done && line.choices ? line.choices.map((c) => ({ label: c.label })) : null,
                key: script.i,
            },
        });
    };

    const gotoLine = (id?: string, action?: string) => {
        if (!script) return;
        if (action) doAction(action);
        if (!script) return;
        if (id) {
            const idx = script.lines.findIndex((l) => l.id === id);
            script.i = idx >= 0 ? idx : script.lines.length;
        } else script.i++;
        script.typed = 0;
        publishLine();
    };

    const doAction = (name: string) => {
        if (name === "music") {
            ensureAudio();
            audio?.setMusicOn(true);
            updateSettings({ music: true });
        } else if (name === "nomusic") {
            updateSettings({ music: false });
            audio?.setMusicOn(false);
        } else if (name === "end" && script) {
            script.i = script.lines.length - 1;
        }
        opts.onAction?.(name);
    };

    const ensureAudio = () => {
        if (!audio) {
            try {
                audio = makeAudio(store.get().settings);
            } catch {
                return; // no Web Audio: play in silence
            }
            store.set({ audioReady: true });
            audio.music(store.get().screen === "title" ? 8 : floor().music);
        }
        audio.resume();
    };
    // Browsers only allow sound after a click or key press, so start it inside one
    const unlock = () => ensureAudio();
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    const updateSettings = (patch: Partial<Settings>) => {
        const s = store.get();
        const settings = { ...s.settings, ...patch };
        const save2 = { ...s.save, settings };
        store.set({ settings, save: save2 });
        saveSave(save2);
        audio?.apply(settings);
        if (patch.recruiter !== undefined) world.invincible = !!patch.recruiter;
    };

    // ---- Stage flow
    const restartStage = () => {
        world = newWorld();
        rec = makeRecorder();
        replay = null;
        setScreen("play");
    };

    const stageCleared = () => {
        const s = store.get();
        const fl = floor();
        const intel = world.flags.intel ? fl.dossier : null;
        const save2 = { ...s.save };
        if (intel && !save2.intel.includes(intel)) save2.intel = [...save2.intel, intel];
        const key = `${fl.id}-${s.stage}`;
        if (!save2.cleared.includes(key)) save2.cleared = [...save2.cleared, key];
        store.set({ save: save2 });
        saveSave(save2);
    };

    const nextStage = () => {
        const s = store.get();
        const fl = floor();
        if (s.stage + 1 < fl.stages.length) {
            loadStage(s.floor, s.stage + 1);
            setScreen("play");
            return;
        }
        // Floor done
        const save2 = { ...store.get().save };
        if (!save2.floorsDone.includes(fl.id)) save2.floorsDone = [...save2.floorsDone, fl.id];
        store.set({ save: save2 });
        saveSave(save2);
        const go = () => {
            if (s.floor + 1 < floors.length) beginFloor(s.floor + 1);
            else setScreen("ending");
        };
        if (fl.ride) {
            audio?.sting("ding");
            setScreen("elevator");
            runScript(fl.ride, go);
            store.set({ screen: "elevator" });
        } else go();
    };

    // ---- One real step
    const tick = () => {
        realT++;
        screenT++;
        const s = store.get();
        if (s.paused) return;
        const chest = { x: world.player.x, y: chestY(world.player) };
        const toWorld = (fx: number, fy: number) => ({ x: world.cam.x + fx * W, y: world.cam.y + fy * H });

        switch (s.screen) {
            case "title":
                if (input.consumeAny()) dispatch({ type: "start" });
                input.sample(toWorld, chest, world.player.face);
                break;
            case "card":
                input.sample(toWorld, chest, world.player.face);
                if (screenT > 150 || (screenT > 30 && input.consumeSkip())) afterCard();
                break;
            case "dialogue":
            case "elevator":
                input.sample(toWorld, chest, world.player.face);
                if (script) {
                    const line = script.lines[script.i];
                    if (line && script.typed < line.text.length) {
                        const before = Math.floor(script.typed);
                        script.typed += 1.1;
                        if (Math.floor(script.typed) !== before) {
                            publishLine();
                            if (before % 2 === 0) audio?.blip(line.who);
                        }
                    }
                }
                break;
            case "play": {
                const inp = input.sample(toWorld, chest, world.player.face);
                lastInput = inp;
                record(rec, world, inp);
                stepWorld(world, inp);
                audio?.events(world.events, world, false);
                for (const e of world.events) {
                    if (e.type === "pickup" && e.v === 2) toast(`FILE RECOVERED · ${floor().name}`);
                }
                audio?.setFocus(world.focus, world.dead);
                if (world.dead && world.deadT > 40) {
                    const d = s.deaths + 1;
                    store.set({ deathLine: DEATH_LINES[world.deathCause] ?? DEATH_LINES.bullet, deaths: d, skipOffer: d >= 3 });
                    setScreen("dead");
                    audio?.tapeStop();
                }
                if (world.won) {
                    setScreen("clear");
                    audio?.sting("clear");
                }
                break;
            }
            case "dead": {
                input.sample(toWorld, chest, world.player.face);
                stepWorld(world, emptyInput());
                if (screenT > 20 && input.consumeAny()) startRewind();
                break;
            }
            case "rewind":
                input.sample(toWorld, chest, world.player.face);
                if (screenT > REWIND_STEPS) {
                    restartStage();
                    audio?.tapePlay();
                }
                break;
            case "clear":
                input.sample(toWorld, chest, world.player.face);
                stepWorld(world, { ...emptyInput(), ax: lastInput.ax, ay: lastInput.ay });
                if (screenT > 80) {
                    stageCleared();
                    startReplay();
                }
                break;
            case "replay": {
                input.sample(toWorld, chest, world.player.face);
                if (!replay) break;
                if (screenT > 10 && input.consumeSkip()) {
                    endReplay();
                    break;
                }
                const speed = s.replaySpeed;
                for (let k = 0; k < speed && replay; k++) {
                    const inp = rec.tape[replay.i++];
                    if (!inp || replay.world.won) {
                        endReplay();
                        break;
                    }
                    stepWorld(replay.world, inp);
                    if (k === 0) audio?.events(replay.world.events, replay.world, true);
                }
                break;
            }
            case "ending":
                input.sample(toWorld, chest, world.player.face);
                break;
        }
    };

    const REWIND_STEPS = 80;

    const startRewind = () => {
        setScreen("rewind");
        audio?.rewind();
    };

    const startReplay = () => {
        replay = { world: createWorld(stage, world.seed, { invincible: world.invincible }), i: 0 };
        store.set({ replaySpeed: 1 });
        setScreen("replay");
        audio?.tapePlay();
    };

    const endReplay = () => {
        replay = null;
        nextStage();
    };

    let toastKey = 0;
    const toast = (text: string) => {
        store.set({ toast: { text, key: ++toastKey } });
    };

    let lastMuffle = -1;
    const updateAudioState = () => {
        if (!audio) return;
        const s = store.get();
        const m = s.paused ? 0.85 : s.screen === "dialogue" || s.screen === "elevator" ? 0.45 : s.screen === "replay" ? 0.3 : 0;
        if (m !== lastMuffle) {
            audio.setMuffle(m);
            lastMuffle = m;
        }
        if (s.screen !== "play") audio.setFocus(0, s.screen === "dead");
    };

    // ---- Drawing
    const draw = () => {
        const s = store.get();
        const reduced = s.settings.reduced;
        const fl = floor();
        let w = world;
        let mode: HudOpts["mode"] = "play";
        const P: PostParams = {
            time: realT / 60,
            focus: 0,
            ca: s.settings.crt ? 0.5 : 0,
            vhs: 0,
            rewind: 0,
            flash: 0,
            dark: 0,
            bloom: 0.9,
            scan: s.settings.crt ? 0.18 : 0,
            grain: s.settings.crt ? 0.035 : 0,
            reduced,
            death: 0,
        };
        let hud = true;
        let prompt: string | null = null;
        switch (s.screen) {
            case "play":
            case "clear":
                P.focus = world.focus;
                P.ca += world.ca + world.focus * 0.8;
                P.flash = Math.min(1, world.flash / 8);
                if (s.screen === "clear") {
                    P.focus = 0;
                    mode = "clear";
                }
                prompt = currentPrompt();
                break;
            case "dead":
                mode = "dead";
                P.death = Math.min(1, screenT / 25);
                P.ca += 1.5;
                break;
            case "rewind": {
                mode = "rewind";
                const n = rec.snaps.length;
                const k = Math.min(1, screenT / REWIND_STEPS);
                const eased = 1 - (1 - k) * (1 - k);
                const idx = Math.max(0, Math.round((n - 1) * (1 - eased)));
                if (n) w = worldAt(world, rec.snaps[idx]);
                P.vhs = 1;
                P.rewind = 1;
                P.ca = 2.5;
                P.death = Math.max(0, 0.6 - k);
                break;
            }
            case "replay":
                mode = "replay";
                if (replay) w = replay.world;
                P.vhs = 0.85;
                P.ca = 1.2;
                P.focus = replay ? replay.world.focus * 0.6 : 0;
                break;
            case "title":
            case "card":
            case "dialogue":
            case "elevator":
            case "ending":
                hud = false;
                P.dark = s.screen === "title" || s.screen === "ending" ? 0.55 : s.screen === "card" ? 0.35 : 0.3;
                P.vhs = s.screen === "title" ? 0.6 : 0;
                mode = "cutscene";
                break;
        }
        renderWorld(layers, w, {
            hud,
            prompt,
            mode,
            label: `${fl.num} · ${fl.name}`.toUpperCase(),
            clock: fl.clock ? clockAt(fl.clock, w.time) : undefined,
            reduced,
            t: realT,
        });
        post.render(canvases, P);
    };

    const currentPrompt = () => {
        const prompts = stage.def.prompts;
        if (!prompts) return null;
        const tx = world.player.x / 16;
        const p = prompts.find((q) => tx >= q.from && tx < q.to && (!q.once || !world.flags[q.once]));
        if (!p) return null;
        const touch = input.touch.active;
        const pad = input.usingGamepad();
        return adaptPrompt(p.text, touch, pad);
    };

    // ---- Loop
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
        const dt = Math.min(100, now - last);
        last = now;
        acc += dt;
        let n = 0;
        while (acc >= STEP_MS && n < 5) {
            tick();
            acc -= STEP_MS;
            n++;
        }
        if (n === 5) acc = 0;
        updateAudioState();
        draw();
        raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
        if (document.hidden && store.get().screen === "play") dispatch({ type: "pause" });
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ---- Actions from the overlay
    const dispatch = (a: Action) => {
        const s = store.get();
        switch (a.type) {
            case "start":
                ensureAudio();
                beginFloor(s.floor);
                break;
            case "pause":
                if (s.screen === "title") return;
                store.set({ paused: true, menu: "pause" });
                audio?.suspend();
                break;
            case "resume":
                store.set({ paused: false, menu: null });
                audio?.resume();
                last = performance.now();
                break;
            case "menu":
                store.set({ menu: a.menu, paused: a.menu !== null || s.paused });
                break;
            case "restart":
                store.set({ paused: false, menu: null });
                if (["play", "dead", "clear", "rewind"].includes(s.screen)) restartStage();
                break;
            case "skipStage":
                store.set({ paused: false, menu: null });
                stageCleared();
                nextStage();
                break;
            case "gotoFloor":
                store.set({ paused: false, menu: null });
                beginFloor(a.floor);
                break;
            case "advance":
                if (!script) {
                    if (s.screen === "card") afterCard();
                    break;
                }
                {
                    const line = script.lines[script.i];
                    if (!line) break;
                    if (script.typed < line.text.length) {
                        script.typed = line.text.length;
                        publishLine();
                    } else if (!line.choices) {
                        if (line.end) {
                            script.i = script.lines.length;
                            publishLine();
                        } else gotoLine(line.goto, line.action);
                    }
                }
                break;
            case "choose":
                if (script) {
                    const c = script.lines[script.i]?.choices?.[a.index];
                    if (c) gotoLine(c.goto, c.action);
                }
                break;
            case "interrupt":
                if (script) {
                    const it = script.lines[script.i]?.interrupt;
                    if (it) {
                        audio?.sting("interrupt");
                        gotoLine(it.goto, it.action);
                    }
                }
                break;
            case "settings":
                updateSettings(a.patch);
                break;
            case "replaySpeed":
                store.set({ replaySpeed: a.speed });
                break;
            case "skip":
                if (s.screen === "replay") endReplay();
                else if (s.screen === "card") afterCard();
                else if (s.screen === "dead") startRewind();
                break;
        }
    };

    return {
        store,
        input,
        dispatch,
        peek: () => ({ world, replay: replay?.world ?? null }),
        resize: (cssW, cssH, dpr, rect) => {
            const scale = Math.min(dpr, 2560 / Math.max(1, cssW));
            display.width = Math.max(W, Math.round(cssW * scale));
            display.height = Math.max(H, Math.round(cssH * scale));
            post.resize(display.width, display.height);
            input.setRect(rect);
        },
        destroy: () => {
            cancelAnimationFrame(raf);
            input.destroy();
            audio?.close();
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pointerdown", unlock, true);
            window.removeEventListener("keydown", unlock, true);
            post = { render: () => {}, resize: () => {}, gl: false };
        },
    };
};

// "3:59:40" plus game time, for the tape's on-screen clock
const clockAt = (start: string, seconds: number) => {
    const [h, m, sec] = start.split(":").map(Number);
    const total = h * 3600 + m * 60 + sec + Math.floor(seconds);
    const hh = Math.floor(total / 3600) % 24;
    const mm = Math.floor(total / 60) % 60;
    const ss = total % 60;
    const ampm = hh < 12 ? "AM" : "PM";
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${ampm} ${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

// Prompts are written for keyboard and mouse; swap in touch or pad wording
const adaptPrompt = (text: string, touch: boolean, pad: boolean) => {
    if (touch) {
        return text
            .replace("[SHIFT]", "[SLOW]")
            .replace("[CLICK]", "[TAP]")
            .replace("[RIGHT CLICK]", "[THROW]")
            .replace("[W]", "[STICK UP]")
            .replace("[S]", "[STICK DOWN]")
            .replace("[A/D]", "[STICK]");
    }
    if (pad) {
        return text
            .replace("[SHIFT]", "[RT]")
            .replace("[CLICK]", "[X]")
            .replace("[RIGHT CLICK]", "[Y]")
            .replace("[W]", "[A]")
            .replace("[S]", "[B]")
            .replace("[A/D]", "[STICK]");
    }
    return text;
};
