// Sound: filled in by the audio milestone. The game calls these hooks.
import type { Settings } from "@/game/flow/save";
import type { GameEvent, World } from "@/game/world/types";

export type Audio = {
    music: (track: number) => void;
    setMusicOn: (on: boolean) => void;
    apply: (s: Settings) => void;
    events: (events: GameEvent[], w: World, replay: boolean) => void;
    setFocus: (focus: number, dead: boolean) => void;
    tapeStop: () => void;
    tapePlay: () => void;
    rewind: () => void;
    sting: (name: string) => void;
    blip: (who: string) => void;
    resume: () => void;
    suspend: () => void;
    close: () => void;
};

export const makeAudio = (s: Settings): Audio => {
    void s;
    const noop = () => {};
    return {
        music: noop,
        setMusicOn: noop,
        apply: noop,
        events: noop,
        setFocus: noop,
        tapeStop: noop,
        tapePlay: noop,
        rewind: noop,
        sting: noop,
        blip: noop,
        resume: noop,
        suspend: noop,
        close: noop,
    };
};

