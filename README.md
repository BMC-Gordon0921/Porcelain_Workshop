# Terra — Blue & White Porcelain Workshop

Playable prototype 04: a human sculptor making five simple blue-and-white porcelain pots in a cartoon 3D workshop.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5174. `npm run build` creates a production bundle; `npm run preview` serves it. `npm test` checks the station restrictions, clay deformation, painting, scoring, progression, resets, undo, and saved attempts.

## Controls and stations

Move with **WASD / arrow keys**. Stand near a station and **hold E for 0.65 seconds** to open its task. **Esc** saves your marks and returns to the room.

- **Clay & presets:** collect a full clump of white porcelain clay. Every design starts from the same unshaped clump. Fresh clay can only be collected here.
- **Rough shaping:** drag an outer edge inward to compress the clay, or outward to stretch it. The broad hand tool moves existing clay and its paint into a rough form; it cannot cut or paint.
- **Detail carving:** drag the chisel to remove clay. Only this station cuts.
- **Free painting:** choose porcelain white or cobalt blue and brush directly onto the surface. Only this station paints.
- **Porcelain kiln:** optional firing. It adds no similarity points.
- **Check & deliver:** submit your sculpture for its score and payment. Reviews only happen at this counter.

Visit the stations in any order and return as often as you like. Each station keeps its own tool. The work surface has no target outline or translucent guide: compare it by eye with the separate reference picture. Use the size slider or **[ / ]** to resize the tool; shaping always uses a broad hand. **Ctrl/Cmd Z** undoes this station's most recent stroke; **Ctrl/Cmd Shift Z** redoes it.

## Five easy decorations

1. **Blue-band pot:** a rounded white pot with one broad blue stripe.
2. **Twin-band vase:** a tall pot with two broad horizontal blue stripes.
3. **Three-dot jar:** a wide jar with three large blue dots.
4. **Blue-rim pot:** a tapered pot with a thick blue rim.
5. **Ribbon moon jar:** a round pot with two wide vertical blue ribbons.

There are no intricate floral patterns or tiny painted details.

## Passing and restarting

The review compares your actual shape and paint with the preset. Shape contributes 65% using silhouette intersection-over-union; paint contributes 35% using the average color F1 score. Missing clay, excess clay, and misplaced blue paint reduce the score.

**At least 90% passes**, earns coins, and unlocks the next pot. **Below 90% fails** and restarts that level; collect a new clump at the clay station to try again. The result panel keeps a picture of the failed submission and shows separate shape and paint percentages. Completing all five pots opens the collection screen.

Your current clay, level, attempt, and coins are saved in this browser tab. Undo history and an active kiln timer reset after a reload.

## Prototype scope

The room, human sculptor, customers, and carried pottery are real Three.js geometry. Editing operates on a 112 × 112 front surface which becomes the exact colored silhouette of the carried 3D relief. Shaping compresses or stretches broad bands of this surface; it is an approximate sculpting mechanic, not a volumetric clay simulation. The score evaluates the front shape and paint.

Original procedural models and art. Optional synthesized sound starts muted. Keyboard/mouse and touch input are supported.
