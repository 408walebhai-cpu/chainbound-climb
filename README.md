# ⛓️ Chainbound Climb

An **original** 2D chained co-op climbing game for 2 players — inspired by the
hell-to-heaven chained-ascent idea popularised by games like *Chained Together* on Steam.
All code, art (Canvas-drawn), levels and the name here are original; no assets,
models, levels or proprietary content from any commercial game are used.

## ▶️ Play

**Host (TV / laptop):** open the GitHub Pages link (see repo About / Pages).
**Phones (controllers):** scan the QR code on the host screen, or open
`controller.html` and enter the 4-letter room code.

Or just play on one keyboard:
- **Player 1 (cyan):** `A` / `D` move, `W` jump, `S` pull/brace
- **Player 2 (pink):** `←` / `→` move, `↑` jump, `↓` pull/brace
- `R` restart

## 🎮 Modes
- **Level Mode** — climb ~72 hand-seeded platforms to the golden summit flag.
  Checkpoints every ~15 platforms: if you both fall far, you respawn there.
- **Endless Mode** — procedurally generated platforms forever. Score = metres
  climbed. Falling below the camera ends the run.

Mechanics: spring-style chain constraint with sag & tension (turns red when
taut), dangling-partner saves — stand firm and hold **PULL** to haul them up —
moving platforms, parallax ember-to-sky ascent (dark depths → bright heaven),
particles, screen shake, height meter, timer, WebAudio sound effects.

## 📱 How phones connect (hosting note)
GitHub Pages hosts **static files only** — it does not run a game server, and
GitHub Actions is just the deploy pipeline (`.github/workflows/pages.yml`
publishes this folder to Pages on every push).

Phone ↔ host uses **WebRTC data channels via the free public PeerJS broker**:
the host registers `chainbound-climb-<CODE>-host`, phones connect to it.
Fallbacks: a **BroadcastChannel same-device demo** (open `controller.html` in
another tab with the same code) and full **keyboard play** if the broker/CDN
is unreachable.

## 🗂️ Files
`index.html` host screen · `controller.html` phone controller · `game.js`
physics/chain/rendering · `controller.js` touch input · `style.css`

## 🛠️ Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
