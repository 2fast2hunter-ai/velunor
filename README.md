# Velunor

Browser prototype of the monster-city gacha RPG. TypeScript, Phaser 3, and Vite. Monsters, buildings, rarity frames, icons, and the city, arena, and portal backgrounds live in `public/assets` (see `public/assets/LICENSES.md`). The save stays in `localStorage` under `velunor.save.v1`. An older `mstadt.save.v1` save is migrated once.

Design notes live in [`docs/konzept.md`](docs/konzept.md) and [`docs/gdd-prototyp.md`](docs/gdd-prototyp.md). Balance numbers live in [`data/`](data/).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173/

```bash
npm test
npm run build
npm run preview
```

The dev server uses the site root. The GitHub Pages build uses the `/velunor/` base path.

## Play on GitHub Pages

https://2fast2hunter-ai.github.io/velunor/

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs the tests, builds with that base path, and deploys `dist` on every push to `main`.

Pages has to be switched on once: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The URL above starts serving the game after that setting is on and the workflow on `main` succeeds.

Rewarded-ad buttons stay on screen and are disabled (`Gerade keine Werbung verfügbar`). This build has no ad SDK. Interstitials and banners are off for GitHub Pages.

## What the prototype includes

- City hub with Rathaus, Goldmine, and Trainingsgelände (upgrade, collect, train)
- 10 monsters, 4 active types, and all 10 rarity tiers
- Portal with published rates, pity counters, a 10-pull guarantee, and the free tutorial 10-pull
- Auto-battle for a lineup of up to 5 (Front / Hinten), 2 chapters × 10 stages, skip and speed
- Local save, including offline build and mine timers
- Reset from **Menü → Spielstand löschen**

Breeding is only the “Bald verfügbar” sign once the town hall reaches level 5. Final art comes later.
