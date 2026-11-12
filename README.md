# Velunor

Browser idle adventure. TypeScript and Vite. The step-1 loop is a landscape Fang-Abenteuer: three starters, a 20-step road, 1-on-1 auto battles, and a Bannsiegel catch after every wild KO. Monsters, type art, Grünmark battle plates, and the seal effect live in `public/assets` (see `public/assets/LICENSES.md`).

The new save key is `velunor_v2`. An existing `velunor.save.v1` profile is read once: every specimen is kept (level 1–4 rise to 5) and the old key stays in place. City, gacha, the 5-monster lineup, arena, and ads are not mounted; their code is still in the repo.

Region 1 data is `data/regions.json`: chapters 1–8 and the Hoher Rat. Weather changes every UTC hour and is the same for everyone. Wild shimmer is 1 in 4,000, doubled when that region's codex is complete. The shop sells EP crystals and seven fruits; fruits last one hour, including offline. The hort keeps monsters for species EP and can lay an egg every two hours. Achievements grant gold, a title, and a frame for the player card. After the third crest the Glücksrad spends game gold for Glücksmarken. Regions 2–5 open with each council seal. In a new region only monsters caught there can fight. The three rarity 8–9 species live in the Himmelsthron special zone. Options cover tempo, language, screen effects, a power-save blackout, and a save code. At level 25 and 50 a monster awakens. A dev build opened with `?debug=1` can jump the clock for the offline check.

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
