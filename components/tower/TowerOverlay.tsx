"use client";
// Everything drawn as HTML over the game: title, chapter cards, dialogue,
// death and clear lines, pause menu, settings, elevator and the Dossier.
import Link from "next/link";
import React, { useEffect, useState } from "react";
import type { Action, UiState } from "@/game/flow/game";
import type { FloorDef } from "@/game/story/types";
import Dossier from "@/components/tower/Dossier";

const SPEAKERS: Record<string, string> = {
    client: "The Client",
    doge: "DogeKing",
    headhunter: "You",
    chatbot: "local-bot",
    crew: "Crew",
    barista: "Barista",
    sign: "",
    system: "",
};

type Props = { ui: UiState; dispatch: (a: Action) => void; floors: FloorDef[] };

const TowerOverlay: React.FC<Props> = ({ ui, dispatch, floors }) => {
    const floor = floors[ui.floor];
    return (
        <div className="tw-overlay">
            {ui.screen === "title" && <Title dispatch={dispatch} />}
            {ui.screen === "card" && floor && <Card floor={floor} onSkip={() => dispatch({ type: "skip" })} />}
            {(ui.screen === "dialogue" || ui.screen === "elevator") && ui.dialogue && <DialogueBox ui={ui} dispatch={dispatch} floor={floor} floors={floors} />}
            {ui.screen === "dead" && (
                <div className="tw-center tw-dead" onClick={() => dispatch({ type: "skip" })}>
                    <p className="tw-dead-line">{ui.deathLine}</p>
                    <p className="tw-hint">Click or press any key to rewind</p>
                    {ui.skipOffer && (
                        <button
                            type="button"
                            className="tw-skip"
                            onClick={(e) => {
                                e.stopPropagation();
                                dispatch({ type: "skipStage" });
                            }}
                        >
                            Skip this stage — the target won&apos;t mind
                        </button>
                    )}
                </div>
            )}
            {ui.screen === "clear" && (
                <div className="tw-center">
                    <p className="tw-clear-line">Yeah. That should work.</p>
                </div>
            )}
            {ui.screen === "replay" && (
                <div className="tw-replay-hint">
                    <span>Hold → to fast-forward</span>
                    <button type="button" onClick={() => dispatch({ type: "skip" })}>
                        Skip ▶▶
                    </button>
                </div>
            )}
            {ui.screen === "play" && !ui.paused && (
                <button type="button" className="tw-pause-btn" aria-label="Pause" onClick={() => dispatch({ type: "pause" })}>
                    <span />
                    <span />
                </button>
            )}
            {ui.screen === "ending" && <Ending />}
            {ui.toast && <Toast key={ui.toast.key} text={ui.toast.text} />}
            {ui.paused && <Menu ui={ui} dispatch={dispatch} floors={floors} />}
        </div>
    );
};

const Title: React.FC<{ dispatch: Props["dispatch"] }> = ({ dispatch }) => (
    <div className="tw-title">
        <p className="tw-title-kicker">▶ PLAY · A secret level</p>
        <h1 className="tw-title-name">
            DogeKing
            <br />
            Tower
        </h1>
        <p className="tw-title-sub">You are the Headhunter. Your target is at the top.</p>
        <button type="button" className="tw-start" onClick={() => dispatch({ type: "start" })}>
            Press any key
        </button>
        <p className="tw-title-note">Headphones on. Flashing lights and screen shake; turn them down in Settings (Esc).</p>
        <Link className="tw-title-back" href="/">
            ← Back to the room
        </Link>
    </div>
);

const Card: React.FC<{ floor: FloorDef; onSkip: () => void }> = ({ floor, onSkip }) => (
    <div className="tw-card" onClick={onSkip}>
        <p className="tw-card-vi">{floor.vi}</p>
        <p className="tw-card-num">{floor.id === "R" ? "R" : floor.id === "G" ? "G" : floor.num}</p>
        <h2 className="tw-card-name">{floor.name}</h2>
        <p className="tw-card-sub">{floor.sub}</p>
    </div>
);

const DialogueBox: React.FC<{ ui: UiState; dispatch: Props["dispatch"]; floor: FloorDef; floors: FloorDef[] }> = ({ ui, dispatch, floor, floors }) => {
    const d = ui.dialogue!;
    const name = SPEAKERS[d.who] ?? "";
    const next = floors[ui.floor + 1];
    return (
        <div className={`tw-dialogue ${ui.screen === "elevator" ? "is-elevator" : ""}`}>
            {ui.screen === "elevator" && (
                <div className="tw-elevator-readout" aria-hidden="true">
                    <span>{floor.id}</span>
                    <span className="tw-arrow">▲</span>
                    <span>{next?.id ?? "R"}</span>
                </div>
            )}
            <div className={`tw-box who-${d.who}`} onClick={() => dispatch({ type: "advance" })}>
                {name && <p className="tw-who">{name}</p>}
                <p className="tw-text" aria-live="polite">
                    {d.text}
                    {!d.done && <span className="tw-caret">▌</span>}
                </p>
                {d.done && !d.choices && <p className="tw-next">▼</p>}
            </div>
            {(d.interrupt || d.choices) && (
                <ul className="tw-choices">
                    {d.interrupt && (
                        <li>
                            <button type="button" className="tw-interrupt" onClick={() => dispatch({ type: "interrupt" })}>
                                <kbd>E</kbd> {d.interrupt.label}
                            </button>
                        </li>
                    )}
                    {d.choices?.map((c, i) => (
                        <li key={c.label}>
                            <button type="button" onClick={() => dispatch({ type: "choose", index: i })}>
                                <kbd>{i + 1}</kbd> {c.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const Toast: React.FC<{ text: string }> = ({ text }) => {
    const [on, setOn] = useState(true);
    useEffect(() => {
        const t = setTimeout(() => setOn(false), 2600);
        return () => clearTimeout(t);
    }, []);
    return on ? <div className="tw-toast">{text}</div> : null;
};

const Menu: React.FC<{ ui: UiState; dispatch: Props["dispatch"]; floors: FloorDef[] }> = ({ ui, dispatch, floors }) => {
    const menu = ui.menu ?? "pause";
    return (
        <div className="tw-menu" role="dialog" aria-modal="true" aria-label="Paused">
            {menu === "pause" && (
                <div className="tw-panel tw-pause">
                    <p className="tw-panel-kicker">❚❚ PAUSE</p>
                    <button type="button" autoFocus onClick={() => dispatch({ type: "resume" })}>
                        Resume
                    </button>
                    {ui.screen === "play" && (
                        <button type="button" onClick={() => dispatch({ type: "restart" })}>
                            Restart stage
                        </button>
                    )}
                    <button type="button" onClick={() => dispatch({ type: "menu", menu: "dossier" })}>
                        Dossier
                    </button>
                    <button type="button" onClick={() => dispatch({ type: "menu", menu: "elevator" })}>
                        Elevator
                    </button>
                    <button type="button" onClick={() => dispatch({ type: "menu", menu: "settings" })}>
                        Settings
                    </button>
                    {ui.screen === "play" && ui.deaths >= 1 && (
                        <button type="button" onClick={() => dispatch({ type: "skipStage" })}>
                            Skip this stage
                        </button>
                    )}
                    <Link href="/">Back to the room</Link>
                    <Controls />
                </div>
            )}
            {menu === "settings" && <SettingsPanel ui={ui} dispatch={dispatch} />}
            {menu === "elevator" && <ElevatorPanel ui={ui} dispatch={dispatch} floors={floors} />}
            {menu === "dossier" && <Dossier found={ui.save.intel} onClose={() => dispatch({ type: "menu", menu: "pause" })} />}
        </div>
    );
};

const Controls = () => (
    <dl className="tw-controls">
        <dt>A / D</dt>
        <dd>Run</dd>
        <dt>W · Space</dt>
        <dd>Jump · wall jump</dd>
        <dt>S</dt>
        <dd>Roll while running · drop</dd>
        <dt>Click</dt>
        <dd>Slash toward the cursor</dd>
        <dt>Right click</dt>
        <dd>Pick up · throw</dd>
        <dt>Shift</dt>
        <dd>Slow time</dd>
        <dt>R</dt>
        <dd>Restart stage</dd>
    </dl>
);

const SettingsPanel: React.FC<{ ui: UiState; dispatch: Props["dispatch"] }> = ({ ui, dispatch }) => {
    const s = ui.settings;
    const set = (patch: Partial<UiState["settings"]>) => dispatch({ type: "settings", patch });
    return (
        <div className="tw-panel">
            <p className="tw-panel-kicker">SETTINGS</p>
            <label className="tw-row">
                <span>Volume</span>
                <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => set({ volume: Number(e.target.value) })} />
            </label>
            <label className="tw-row">
                <span>Music</span>
                <input type="checkbox" checked={s.music} onChange={(e) => set({ music: e.target.checked })} />
            </label>
            <label className="tw-row">
                <span>CRT effects</span>
                <input type="checkbox" checked={s.crt} onChange={(e) => set({ crt: e.target.checked })} />
            </label>
            <label className="tw-row">
                <span>Reduce motion and flashes</span>
                <input type="checkbox" checked={s.reduced} onChange={(e) => set({ reduced: e.target.checked })} />
            </label>
            <label className="tw-row">
                <span>
                    Recruiter mode
                    <small>You can&apos;t die.</small>
                </span>
                <input type="checkbox" checked={s.recruiter} onChange={(e) => set({ recruiter: e.target.checked })} />
            </label>
            <button type="button" onClick={() => dispatch({ type: "menu", menu: "pause" })}>
                ← Back
            </button>
        </div>
    );
};

const ElevatorPanel: React.FC<{ ui: UiState; dispatch: Props["dispatch"]; floors: FloorDef[] }> = ({ ui, dispatch, floors }) => {
    const reached = (i: number) => i === 0 || ui.save.floorsDone.includes(floors[i - 1].id) || ui.save.floorsSeen.includes(floors[i].id);
    return (
        <div className="tw-panel tw-elevator">
            <p className="tw-panel-kicker">ELEVATOR</p>
            <ol className="tw-floors">
                {floors
                    .map((f, i) => ({ f, i }))
                    .reverse()
                    .map(({ f, i }) => (
                        <li key={f.id}>
                            <button type="button" disabled={!reached(i)} className={i === ui.floor ? "is-here" : ""} onClick={() => dispatch({ type: "gotoFloor", floor: i })}>
                                <span className="tw-floor-id">{f.id}</span>
                                <span className="tw-floor-name">{reached(i) ? f.name : "Sealed"}</span>
                                {ui.save.floorsDone.includes(f.id) && <span className="tw-floor-done">✓</span>}
                            </button>
                        </li>
                    ))}
            </ol>
            <button type="button" onClick={() => dispatch({ type: "menu", menu: "pause" })}>
                ← Back
            </button>
        </div>
    );
};

const Ending = () => (
    <div className="tw-title">
        <p className="tw-title-kicker">■ STOP</p>
        <h2 className="tw-title-name">Thanks for playing</h2>
        <Link className="tw-start" href="/">
            Back to the room
        </Link>
    </div>
);

export default TowerOverlay;
