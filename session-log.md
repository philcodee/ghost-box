# Ghost Box MK3 — Session Log
**Last updated:** 2026-05-15 (mobile fixes)

---

## What was built

### Panel 1 — Ghost Box MK3 (main scanner)
- Single-file browser instrument (`index.html`) — no build tools, no dependencies
- Web Audio API signal chain: pink noise → HP filter → segment gain → global bandpass → master gain → analyser → output
- Pink noise generated fresh per segment using Paul Kellet's 3-pole IIR approximation
- Voice fragments (12% chance per segment): dual formant bandpass filters (F1/F2) animating between random vowels from a table
- Consonant bursts (50% of voice fragments): high-HP white noise burst at segment start
- Segment engine: hard-cut at user-controlled sweep rate (100–2000ms), each cut randomizes global bandpass ±200Hz
- FM frequency display: fake dial 88.1–107.9 MHz, ±0.2 per cut, forward/reverse direction
- Waveform visualizer: time-domain canvas, requestAnimationFrame, acid green line
- Sweep progress bar: 1px red-orange fill, 40ms interval ticks
- Controls: Sweep Rate, Filter, Volume, Play/Stop, Fwd/Rev

### Panel 2 — Voice Inject
- Web Speech API TTS triggered manually via SPEAK button
- Two phrase sets:
  - **Twister** — spinner combos (body part + color), full sentences, fragments, cut-up mode
  - **Signal** — 30 spy/paranormal phrases ("Classified Static Speaks", "Havana Still Hums", etc.)
- Modes: spinner / sentences / fragments / signal / cut-up / mixed
- Controls: Mode, Voice (system voices dropdown), Pitch, Rate, Stutter, Dropout
- **Formant layer** (Web Audio, parallel to TTS):
  - White noise through F1/F2 bandpass pair, fires per-word via `onboundary` event
  - Vowel presets: AH / EH / IH / OH / EE / UH / AW
  - **Drift**: random walk on F1/F2 per word to simulate natural vowel variation
  - **Detune**: second noise path with F1/F2 shifted by N semitones (−12 to +12), creates harmony/chorus effect
  - Formant Vol slider

### Panel 3 — Twister Moves (WAV player)
- Loads 8 individual word WAV files: `left`, `right`, `hand`, `foot`, `red`, `blue`, `yellow`, `green`
- **SPIN** button: randomly picks one from each category and schedules them in gapless sequence using `ctx.currentTime` offsets (sample-accurate, no gaps)
- Displays composed phrase (e.g. "left foot yellow")
- FX chain: Gain boost → HP filter → LP filter → dry out + ring mod send
  - **Gain**: 1–8x boost (default 3x) to match levels
  - **Radio**: single slider narrows HP+LP simultaneously (80Hz/9kHz wide → 700Hz/2.3kHz tight walkie-talkie)
  - **Ring Mod**: carrier oscillator starts/stops with each WAV playback, frequency 1–2000Hz, wet mix control
  - **Detune**: second buffer source at ±50 cents offset, mixed at −3dB

---

## Mobile fixes (2026-05-15)
- **Root cause of silence on mobile**: iOS hardware mute/silent switch blocks Web Audio API output entirely; Speech Synthesis routes through a separate audio channel and ignores it. Confirmed via `ctx.state` debug overlay — context was `running` but beep test was silent.
- **AudioContext async unlock**: all audio-producing functions (`startScan`, `speakPhrase`, `loadWavs`, `scheduleSequence`, `playComposed`) made `async` and now properly `await ctx.resume()` before scheduling nodes. Previously `resume()` was fire-and-forget — nodes were scheduled while the context was still suspended.
- **iOS silent buffer unlock**: `unlockAudio()` now plays a 1-sample silent `BufferSourceNode` within the first user gesture (`touchstart`). On iOS, `resume()` alone changes the state string but doesn't open the audio hardware gate; playing a buffer does.
- **Visibility change handler**: `visibilitychange` listener re-resumes the context when the user returns from background, since iOS/Android suspend audio contexts when the page loses focus.
- **Voice inject default mode**: changed from `spinner` to `signal`.

---

## Technical notes
- Serve from local HTTP server (`python3 -m http.server 8080`) — WAV fetch and ES module imports require HTTP origin
- `speechSynthesis` runs outside Web Audio graph; cannot be gated or routed through Web Audio nodes (attempted, abandoned)
- Kokoro browser TTS attempted (ONNX/WebAssembly) — blocked by `file://` CORS on ES module import; abandoned
- `onboundary` for word-level formant timing: works in Chrome/Safari on macOS, not in Firefox
- Duplicate `const COLORS` declaration across voice and WAV sections caused full script failure — resolved by reusing shared constant

---

## Files
```
ghost-box/
├── index.html              — complete single-file instrument
├── ghost_box_build.md      — original build spec
├── ghost-box-voice         — source reference (p5.js Twister ghost spinner)
├── session-log.md          — this file
└── wav/
    └── twister-moves/
        ├── left.wav
        ├── right.wav
        ├── hand.wav
        ├── foot.wav
        ├── red.wav
        ├── blue.wav
        ├── yellow.wav
        └── green.wav
        (+ 16 pre-composed combined WAVs, currently unused)
```
