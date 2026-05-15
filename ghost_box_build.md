# Ghost Box MK3 — Claude Code Build Instructions

## Overview

Build a single-file browser-based instrument called **Ghost Box MK3**. It simulates an FM radio spirit box by synthesizing static and formant-based voice fragments using the Web Audio API. No external audio files, no radio streams — everything is generated in-browser.

The output is a single `index.html` file. No build tools, no dependencies, no npm. Pure HTML + CSS + vanilla JS.

---

## What it does

- Generates continuous pink/white noise bursts, hard-cut at a user-controlled sweep rate
- Occasionally inserts a "voice fragment" — whisper noise shaped by two animated formant filters (F1 + F2) mimicking vowel transitions
- Displays a waveform visualizer and a fake FM frequency readout
- Controls: sweep rate, bandpass filter center frequency, volume, forward/reverse direction

---

## File structure

```
ghost_box/
└── index.html
```

Single file. All CSS and JS inline.

---

## Visual design

- Background: `#0a0a0a` (near black)
- Primary accent: `#c8ff00` (acid green) — used for waveform, knob values, play button active state
- Secondary accent: `#ff3300` (red-orange) — used for frequency display, sweep progress bar, direction button
- Frequency display background: `#1a0000`
- Fonts: `Share Tech Mono` (body/controls) and `Krona One` (title) — load both from Google Fonts
- No gradients, no shadows, flat surfaces throughout

### Layout (top to bottom)

1. Header row — title left, frequency display right
2. Waveform canvas (72px tall, `#111` background)
3. Sweep progress bar (1px, red-orange fill)
4. Controls row — three columns: Sweep Rate / Filter / Volume
5. Transport row — Play button, Direction button, status text

---

## Audio architecture

```
Noise source(s)
     │
  [HP filter]         ← shapes noise color per segment
     │
  [Segment gain]      ← hard envelope per cut (6ms attack, 12ms release)
     │
[Global bandpass]     ← user-controlled filter, Q randomized per segment
     │
  [Master gain]       ← volume control
     │
   [Analyser]         ← feeds waveform visualizer
     │
 Destination
```

Voice fragments insert an additional parallel path:

```
White noise source
     │
  [HP filter 80Hz]
     ├──→ [Bandpass F1]  Q 4–9,  freq animates vowelA.f1 → vowelB.f1
     └──→ [Bandpass F2]  Q 5–12, freq animates vowelA.f2 → vowelB.f2
           │                │
        [F1 gain]        [F2 gain]
              └────┬────┘
              [Mix gain]
                   │
            [Segment gain]   ← same segment gain as static path
```

Consonant burst (50% chance per voice fragment):

```
White noise (40ms)
     │
[HP filter 2000–5000Hz random]
     │
  [gain 0.1–0.25]
     │
[Segment gain]
```

---

## Segment engine

Each "segment" represents one channel cut. On every cut:

1. Stop and disconnect all nodes from the previous segment
2. Create a new `segmentGain` node with envelope:
   - `linearRampToValueAtTime(1, now + 0.006)` — 6ms attack
   - `linearRampToValueAtTime(0, now + dwell)` — release at end of dwell
3. Generate a pink/brown noise buffer for the full dwell duration and connect through a highpass (random 200–800Hz) into `segmentGain`
4. Roll `Math.random() < 0.12` — if true, add a voice fragment (see below)
5. Randomize `globalBandpass.frequency` by ±200Hz around the user's filter value
6. Randomize `globalBandpass.Q` between 0.5–1.5
7. Advance `freqPos` by ±0.2 MHz (direction-dependent), wrap at band edges
8. Update frequency display and sweep progress bar
9. Schedule `setTimeout(playSegment, dwellMs)` for next cut

### Pink noise generation (per segment)

Use Paul Kellet's pink noise approximation — three-pole IIR on white noise:

```js
let b0=0, b1=0, b2=0;
for (let i = 0; i < len; i++) {
  const w = Math.random() * 2 - 1;
  b0 = 0.99886*b0 + w*0.0555179;
  b1 = 0.99332*b1 + w*0.0750759;
  b2 = 0.96900*b2 + w*0.1538520;
  data[i] = (b0 + b1 + b2 + w*0.5362) * 0.11;
}
```

### Voice fragment generation

Vowel formant table (F1, F2 in Hz):

| Vowel | F1  | F2   |
|-------|-----|------|
| ah    | 800 | 1200 |
| eh    | 600 | 1800 |
| ih    | 400 | 2000 |
| oh    | 500 | 900  |
| uh    | 640 | 1200 |
| ee    | 300 | 2300 |
| aw    | 700 | 1000 |

Pick two random vowels (vowelA, vowelB). Animate F1 from `vowelA.f1` to `vowelB.f1` over 70% of dwell duration. Animate F2 from `vowelA.f2` to `vowelB.f2` over 60% of dwell. Use `linearRampToValueAtTime` for both.

Voice mix gain: `rand(0.3, 0.55)` — keep it under the static level.

---

## Controls

| Control | Element | Range | Default | Behavior |
|---|---|---|---|---|
| Sweep Rate | `input[type=range]` | 100–2000ms, step 50 | 800ms | Dwell duration per segment |
| Filter | `input[type=range]` | 400–3500Hz, step 50 | 1400Hz | Global bandpass center freq |
| Volume | `input[type=range]` | 0–100, step 1 | 70 | Master gain (divide by 100) |
| Play/Stop | `button` | — | — | Starts/stops scan loop |
| Fwd/Rev | `button` | — | FWD | Toggles `direction` between +1 / -1 |

On sweep rate change: do **not** restart the current segment mid-flight. Let the current segment finish, then the next `setTimeout` will use the new value naturally.

On filter change: `setTargetAtTime` with 0.05s time constant for smooth interpolation.

---

## Waveform visualizer

- `requestAnimationFrame` loop, only runs while scanning
- `analyser.getByteTimeDomainData(data)` — time domain, not frequency
- Draw waveform line in `rgba(200,255,0,0.8)`
- Draw center line in `rgba(255,51,0,0.15)`
- Fill background `#111` each frame
- Canvas sized to its CSS layout dimensions each frame via `canvas.width = canvas.offsetWidth`

---

## Sweep progress bar

1px tall div. On each segment start, reset width to 0% and run a `setInterval` at 40ms increments, advancing `elapsed / dwellMs * 100` until it reaches 100%. Clear the interval on next segment start.

---

## Frequency display

Fake FM dial. Starts at 88.1 MHz, steps ±0.2 per cut, wraps at 88.1–107.9. Display as `freqPos.toFixed(1)`. Show current sweep rate in ms above it: `FM   800ms`.

---

## State management

Keep these in module scope:

```js
let ctx, masterGain, analyser, globalBandpass;
let scanning = false;
let scanTimer = null;      // setTimeout handle
let dwellTimer = null;     // setInterval handle for progress bar
let direction = 1;         // +1 fwd, -1 rev
let freqPos = 88.1;
let activeNodes = [];      // all nodes created this segment, stopped on next cut
```

`stopActive()` iterates `activeNodes`, calls `.stop()` and `.disconnect()` wrapped in try/catch, then clears the array.

---

## AudioContext initialization

Do not create the AudioContext on page load — create it on first play button click (browser autoplay policy). After creation, call `ctx.resume()` if state is `'suspended'`.

---

## Known nuances

- `segmentGain` must be added to `activeNodes` and disconnected on cleanup, otherwise the graph accumulates stale gain nodes
- Noise buffers are created fresh each segment — do not cache them, as repeating buffers are audible
- Voice fragment probability (0.12) should stay low — the effect works because voice is rare and surprising
- The consonant burst fires at `now` (segment start), before the vowel body, to mimic consonant-vowel onset

---

## Deliverable

Single `index.html`. No external files. Should open directly in any modern browser without a server.
