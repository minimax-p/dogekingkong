# DogeKing Tower: game plan

A secret, playable version of the portfolio at `/tower`. The room at `/` stays the main site.
This plan comes before any code. It fixes the scope, the feel targets, the art list and the
build order.

## 1. What it is

You play **the Headhunter**, hired to find a candidate nobody can pin down: **DogeKing**
(Minh Pham), last seen in the penthouse of his tower. Every floor is one part of the résumé,
played as a Katana Zero-style stage. The last floor is the original hand-drawn room, now his
lair. The boss fight ends in a conversation, and the reward is his contact details.

- **Where:** `/tower`, reached from a small hidden elevator button in the room (and a link on
  the phone layout). The game code loads only on that page, so the main site stays as light
  as it is now.
- **Screens:** landscape only. A phone held upright gets a "turn your phone sideways" screen,
  and the game pauses until it's rotated. Desktop, laptop, tablet and landscape phones all
  play.
- **Length:** 8 floors, 14 stages plus a boss, about 15–20 minutes for a first run. After
  3 deaths on one stage, the game offers a skip, so any recruiter can reach the end.

## 2. The Katana Zero loop, rebuilt

Every rule below comes from Katana Zero. The art, names, dialogue and code are original.

| Rule | How it works here |
| --- | --- |
| One hit kills | Enemies die to a single slash. So do you. |
| Aimed slash | Left click slashes toward the cursor, in any direction (360°). On the ground it lunges forward; in the air the first slash launches you toward the cursor, and later ones give less lift until you land. |
| Deflect | Slashing a bullet sends it back along your aim, and it kills whatever it hits. |
| Slow time | Hold Shift. An 11-cell battery drains while it's on and refills when it's off. |
| Dodge roll | Press S while running. You're invulnerable for most of the roll and pass through bullets and enemies. |
| Walls | Slide down walls and wall-jump off them. Jumping back and forth climbs a shaft. |
| Platforms | Thin platforms can be jumped up through; press S to drop down. |
| Doors | Run or slash into a closed door to kick it open. Anyone right behind it is knocked out. |
| Throwables | Right click picks up a mug, duck, keyboard, dumbbell or boba cup. Right click again throws it at the cursor, and it kills on hit. |
| Timer | Each stage has a time bar. If it runs out, you die. |
| Exit | When the room is clear, a `GO →` arrow points to the exit. |
| Death | Freeze, then "Nope. That won't work." Any key plays a VHS rewind back to the stage start. |
| Clear | "Yeah. That should work." The game then plays back your whole run as a VHS tape; you can skip it or speed it up. |
| Impact | Hit-stop on every kill and deflect, screen shake, bodies thrown along the slash, and splatter that stays on walls and floors. The enemies are robots, so the splatter is dark oil with neon sparks, not blood. |
| HUD | A top bar with the battery on the left, the timer in the middle and the held item on the right. |
| Story | Chapter cards, typed dialogue between stages, and red **interrupt** options that cut a speaker off mid-line. |
| Camera | It leans toward the cursor so you can see where you're aiming. |

### The slow-motion fix

The prototype felt flat because everything was slow to begin with, so slowing it down changed
little. The fix has two parts:

1. **Make real time fast.** Bullets cross the screen in under a second, and enemies react in
   about 0.3 s. Without slow motion, dodging is a gamble.
2. **Make slow motion slow.** The world drops to 0.2× speed. You drop to 0.45×, so you move
   more than twice as fast as everything else.

| | Prototype | New |
| --- | --- | --- |
| Your run speed | 72 px/s (4.4 s to cross the screen) | 204 px/s (2.4 s) |
| Enemy speed | 24–45 px/s | 150–215 px/s |
| Bullets | none | 540 px/s (shotgun 480, turrets 600) |
| World in slow motion | 0.3× | **0.2×** |
| You in slow motion | 0.3× | **0.45×** |
| How it kicks in | 0.25 s tween | 0.1 s snap in, 0.13 s ease out |
| Sound | none | Everything muffles (low-pass 20 kHz → 1 kHz). Music tempo and pitch drop to 0.6×, like a tape slowing. A whoosh going in and a spin-up coming out. |
| Look | CSS saturate filter | The world is drawn in two layers. The background loses color and cools, while you, enemies and bullets stay neon. You leave afterimages, bullets leave long trails, color fringing strengthens and the vignette closes in. |

Hit-stop: 5 frames on a kill, 4 on a deflect, 3 on a door kick, 14 on your own death.

### Movement numbers

These are starting values at 60 steps a second. They'll be tuned by play.

| | Value |
| --- | --- |
| Run | top speed 3.4 px/step, reached in 6 frames, stops in 4 |
| Jump | 3 tiles high; letting go early cuts it short; 6 frames of coyote time and jump buffer |
| Fall | gravity 0.32, top speed 7 |
| Wall | slide at 1.6; wall jump pushes 3.6 out and 5.2 up |
| Roll | 20 frames at 4.6 → 3 px/step, invulnerable on frames 2–16 |
| Slash | active on frames 2–7, 22-frame cooldown, 30 px reach, 140° arc |
| Slow-motion battery | 6 s of real time when full, refills in 6 s |

## 3. Enemies

The enemies are DogeKing's security: robots in suits with Shiba-mask faces, plus software
pests that escaped the test wall.

| Enemy | Behavior | Answer | First floor |
| --- | --- | --- | --- |
| **Bouncer** | Runs at you; a punch after a 0.27 s wind-up | Slash first, or roll through | G |
| **Guard** | Pistol. Aims for 0.4 s, with a glint just before firing | Deflect it, or close the gap | G |
| **Enforcer** | Shotgun, 5 pellets, short range | Deflect the spread in slow motion | 2 |
| **Firewall** | Riot shield blocks slashes and bullets from the front, then shield-bashes | Hit from behind, throw something to stun it, or kick a door into it | 2 |
| **Sentry** | Ceiling turret, woken by laser tripwires; fires a 3-round burst | Avoid the wire, or deflect the burst | 1 |
| **Laser gate** | Switches on and off on a cycle, flickering before it turns on | Time it; roll | 1 |
| **Bug** | Small and fast; lunges when close | Slash it; hard to deflect around | 4 |
| **Drone** | Flies and shoots from above | Air slash, or deflect | 5 |
| **Launcher** | Shuttlecock machine lobbing arcs | Smash the shuttles back | 6 |

Enemy states: patrol → spot you (they look where they face, with line of sight, or hear a
kill nearby) → `!` → attack. Bodies stay where they fall.

**Boss, DogeKing (penthouse):** three phases. You land one hit per phase, and after each he
escapes to the next.

1. **Code review:** he dashes across the room with telegraphed slashes, then throws `{ }` bracket
   spreads that you can deflect.
2. **Deploy:** bugs rain from the vents while lasers sweep the room.
3. **Guitar solo:** power chords send shockwaves along the floor (jump them), and the amps fire
   notes on the beat (deflect them back at him).

His mask cracks, the dialogue starts, and the ending follows.

## 4. The floors

Each floor has a chapter card (in English, plus Vietnamese: TẦNG 04), a line from DogeKing over
the PA, two stages, and one **file** to pick up that adds that job to the Dossier. Role, company
and dates come from `lib/content.ts`, so they stay in sync with the main site.

| Floor | Résumé | Stages | New in this floor | Set piece |
| --- | --- | --- | --- | --- |
| **G · Lobby** | Who you are | 1. Reception 2. Security desk | movement, slash, door kick, deflect, slow time, throwing (taught by doing, with short prompts) | The contract call; putting on headphones turns music on; a floor directory lists every job; a "known weapons" board lists the skills |
| **1 · Seismic** | NASA full-stack, 2022 | 1. Sensor lab 2. Vault | laser gates, tripwires, sentries | The floor trembles and lamps swing; monitors trace live magnetometer lines; the vault door is an OTP keypad that types its code once the room is clear |
| **2 · Command** | NASA team lead, 2023 | 1. Standup 2. Launch | enforcers, firewalls, a wall-jump shaft | Six crew holograms at six desks each say a line as you pass; a wall calendar tears off five weeks; the big screen morphs a Figma wireframe into the shipped app |
| **3 · Box Office** | Ticketingbox, 2024–25 | 1. Turnstiles 2. Legacy | darkness, and a scanner beam from your visor that follows your aim; crumbling platforms | The power is out, but the turnstiles still validate tickets because the database works offline; the collapsed Ionic system is the stage 2 wreckage |
| **4 · 04:00 AM** | Stealth intern, 2025 | 1. 3:59 2. The suite | bugs; sentries fire on the clock's tick | At 4:00 the 8×8 wall of screens runs 87 tests, three go red and their bugs break out; on clear, the report email flies off before the team arrives |
| **5 · Local Host** | Stealth, 2025–now | 1. Racks 2. Context window | drones; cooling vents that lift you; code blocks that the agent types into platforms | The signal icon goes dark (no uplink); a terminal chatbot talks to you with interruptible streamed replies; a ghost of your last attempt replays beside you ("the agent learns") |
| **6 · After Hours** | Life outside work | 1. Court 2. Stage and boba | launchers and shuttle smashes; dumbbells and boba cups to throw | Badminton court, the indie band playing on stage with lights on the beat, a boba counter, the clarinet |
| **R · Penthouse** | Contact | Boss | everything | The hand-drawn room from `/`, pixelated, at night with the skyline behind; unmasking; the email, LinkedIn, GitHub and résumé; credits listing the skills as cast and crew; a door back to the room |

**Between floors:** the elevator ride is the loading screen. The floor counter rolls while the
Client talks in your earpiece or DogeKing taunts you over the intercom, and you can interrupt
either one. The **elevator panel** is the level select for floors you've already cleared.

**Dossier:** open it from the pause menu. Every file you've found shows the full entry, with
all its points and links. Files you haven't found show their title and a "read it anyway"
button, so nothing is ever locked away from a recruiter.

## 5. Art

Every sprite is original and drawn in code at load, so there are no image files to manage.
The screen is 480×270 pixels, scaled up with crisp pixel edges. Tiles are 16 px, and
characters are about 30 px tall, about the same share of the screen as in Katana Zero.

**How the sprites are made:** each character is a pixel skeleton (head, torso, arms, legs,
weapon). The poses are keyframed by hand, drawn with pixel-precise limbs and shading, and then
given a 1-pixel dark outline. The details that need a hand-placed look, such as the visor,
the Shiba mask, the crown, guns, the shield and bugs, are small hand-drawn pixel grids. The
Headhunter's scarf and coat tails are simulated every frame, so they trail through dashes and
rolls. The sheets use the same layout as Aseprite exports, so drawn art can replace any sprite
later.

| Character | Animations (frames) |
| --- | --- |
| **Headhunter**: trench coat, cyan visor, long magenta scarf, a letter opener "for offer letters" | idle 8, run 10, run start 2 / stop 3, jump 3, fall 3, land 2, wall slide 2, wall flip 6, crouch 1, roll 7, slash 5, throw 3, door kick 4, hurt 2, dead 4, walk 8 (cutscenes) |
| **Security bots** (shared rig, four loadouts) | idle 6, walk 8, run 8, aim (arm follows you live), fire 2, punch 2+2, shield walk 8, block 2, hurt 2, dead 3 |
| **Bug, drone, sentry, launcher** | 2–4 each |
| **DogeKing**: hoodie, crown, Shiba mask, guitar | idle 8, run 10, dash slash 6, throw 3, guitar 4, hurt 3, unmask 6 |
| **Effects** | slash arc 5, muzzle flash 2, bullet streaks, sparks, oil splatter (8 decals), dust 4, door splinters, `!`, `GO →`, casings, afterimages |

**Environments:** a parallax night skyline through the windows, with rain and neon signs.
Each floor has its own tiles and props: lobby desk, monitors and magnetometer traces, desks
and calendar, turnstiles, the 8×8 test wall, server racks, the badminton net, amps and drum
kit, boba counter, and the elevator. Light pools blend on top of everything.

**Palette** (from the concept):

| Name | Hex | Used for |
| --- | --- | --- |
| Night | `#0C0A1A` | Sky and shadows |
| Wall | `#15122B` | Interiors |
| Line | `#2C2754` | Edges and UI rules |
| Paper | `#ECE8FF` | Text and highlights |
| Periwinkle | `#8C9EFF` | Neon |
| Hot | `#FF3D7F` | Danger, interrupts and the scarf |
| Cyan | `#54E3FF` | The visor and scanner beams |
| Pass | `#5CF2B8` | Passing tests, and nothing else |

**Post-processing (WebGL):**

- **Always on:**
  - crisp upscaling
  - a little bloom on bright neon
  - scanlines, grain and a vignette
- **During slow motion:** the color grade, per layer (see the fix above).
- **On impacts:** color fringing.
- **In replays and rewinds:** VHS tracking lines, color bleed, and the `PLAY ▶` / `◀◀ REW`
  on-screen text.
- **With reduced motion:** shake, flashes and noise all switch off. Flashes stay under three
  per second.

## 6. Sound

Everything is synthesized with the Web Audio API, so there are no audio files.

- **Sound effects:**
  - slashes, deflect pings, kills, gunshots and shotgun blasts
  - footsteps, jumps and rolls
  - door kicks and item breaks
  - laser hum
  - alert blips
  - slow motion going in and out
  - tape stop, rewind and play
  - typewriter ticks and the elevator ding
- **Music:** a synthwave track per floor (drums, bass, pads and an arpeggio) from a small
  step sequencer. Its tempo follows slow motion, and it cuts with a tape stop when you die.
- **Real music later:** each floor can point at an audio file instead. Your band's loops would
  drop in there, and slow motion bends them the same way.

## 7. Controls

| Action | Keyboard and mouse | Gamepad | Touch (landscape) |
| --- | --- | --- | --- |
| Move | A / D (or arrow keys) | left stick | a floating stick on the left half |
| Jump | W or Space | A | flick the stick up |
| Drop / roll | S (roll while running) | B or stick down | flick the stick down |
| Slash | left click, toward the cursor | X, aimed with the right stick | tap the right half, toward the tap |
| Pick up / throw | right click | Y | button |
| Slow time | hold Shift | right trigger | button (tap to toggle) |
| Pause | Esc | Start | button |
| Restart stage | R | Select | from the pause menu |

## 8. Tech: libraries that fit a game like this

This game gets **no game engine**. It uses a small purpose-built core written in TypeScript,
and GSAP, PixiJS and Phaser all stay out.

- **Why no engine:** Katana Zero's feel comes from custom physics, different time speeds for
  you and the world, hit-stop, and replays that play back exactly. Phaser's physics and scene
  system would get in the way of all of that. At 480×270, Canvas 2D draws a whole frame in
  about a millisecond, so PixiJS would add 300 KB for nothing. The whole game should come in
  under about 120 KB gzipped.
- **Drawing:** Canvas 2D at 480×270, in three layers (world, actors and HUD).
- **Post-processing:** one small hand-written WebGL2 shader. If WebGL isn't available, the game
  still runs with plain canvas scaling.
- **Sound:** Web Audio, directly. It gives the one master low-pass filter and the tempo control
  that slow motion needs. Howler can't do either well.
- **The simulation:** a fixed 60 Hz step with a seeded random number generator and no wall
  clock, so it's fully deterministic. That makes two features cheap:
  - **Replays** re-run the stage from its start with your recorded inputs.
  - **Rewinds** play back per-frame snapshots in reverse.
- **New dependencies:**
  - `@fontsource/vt323` for the on-screen text in dialogue and menus (the HUD uses a bitmap
    font built into the game).
  - `tsx` (development only) to run the simulation in Node for tests.
- **Next.js:** it hosts the page. `/tower` loads the game client-side only, and the text
  (dialogue, Dossier, menus) is real HTML over the canvas.
- **Tests (`npm run test:tower`):**
  - Determinism: the same inputs must produce the same result every time.
  - Every stage must be clearable: a simple bot with invincibility turned on has to clear it
    within its time limit, so no stage has an unreachable enemy or exit.
- **Browser checks:** Playwright screenshots for each floor, and a sprite-sheet debug view
  (`/tower?debug=sprites`) for checking the art frame by frame.

**Where the files go:**

```
app/tower/page.tsx          the route and its metadata
components/tower/           the React shell: canvas, dialogue, menus, Dossier, touch controls, rotate screen
game/engine/                game loop, input, time, tile physics, camera, rendering, WebGL post, audio, bitmap font
game/art/                   palette, pixel-grid and skeleton tools, sprite definitions, tiles, props, skyline, effects
game/world/                 player, enemies, bullets, items, doors, lasers, particles, splatter
game/story/                 floors (tied to lib/content.ts), stage maps, dialogue scripts, boss
game/flow/                  the screen sequence (title → floor → stage → replay → elevator), recorder, save
scripts/tower-test.ts       the tests
```

Stages are ASCII maps, so each one is readable and editable in the file:
`#` wall, `=` platform, `D` door, `P` player start, `X` exit, `b` bouncer, `g` guard, and so on.

## 9. Build order

Each step is committed and checked in the browser before the next starts.

1. **Core feel.** The game loop, input, tile physics, camera, the player's full moveset, slow
   motion with its grade and audio, hit-stop, and the HUD, in one gray test room. Checked
   against the numbers above.
2. **Combat loop.** Bouncers and guards, bullets and deflects, doors, throwables, death with
   rewind, and clear with replay. A graybox Lobby, playable from start to finish.
3. **Art pass.** The skeleton sprites for the Headhunter and the bots, the effects, the lobby
   tiles and props, the skyline, and the full post-processing.
4. **Sound.** Sound effects, the music sequencer, and the slow-motion audio.
5. **Floors 1–6.** The other enemy types and each floor's set piece, stage maps, props and
   files, plus the dialogue system with interrupts, the elevator, the chapter cards and the
   Dossier.
6. **Penthouse.** The boss, the unmasking, the ending with contact details, and the credits.
7. **Shell and polish.**
   - Pause, settings (volume, shake, effects, reduced motion) and saving.
   - The touch and gamepad controls, and the rotate screen.
   - The hidden link from the room.
   - The skip-after-3-deaths offer and the invincible "recruiter mode".
   - Tests, a performance check and the README.

## 10. Defaults I'm taking (say the word to change them)

- **Name:** it stays **DogeKing**, from your repo name and git author name.
- **Teammate quotes on Floor 2:** I'll write six lines from your résumé facts, marked as
  placeholders in one place so you can swap in real quotes.
- **Music:** synthesized placeholder tracks, with a slot for each floor ready for your band.
- **Gore:** robots leaking oil instead of blood.
- **Katana Zero's material:** none of it is copied. The death and clear lines are rewritten as
  "Nope. That won't work." and "Yeah. That should work."
