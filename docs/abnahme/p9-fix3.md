---
datum: 2026-11-19
quelle: Live-Build main 0643971 (#101, Bundle index-BHu_Bc_o.js), 390x844 DPR3, raw_src/paket9/fix3.mjs
status: abgenommen
---
# Nachprüfung #101
- R1 Starter-Wertebalken: **ok**, gefüllt (starter.png).
- F1 Goldring: **ok**, kein verzerrter Stern (ring_gold_kodex.png, ring_gold_team.png).
- F2 Aktivitäten-Tabs / „In den Hort“ / „In den PC“: **ok, knapp**. Die Schrift ist jetzt 28 UI-px, also etwa 10 css-px (aktivitaeten.png, aktivitaeten_truhen.png). Optional: ui-kit.css:1472 und :1261 auf 32 px.
- Nebenbefund (niedrig): Der aktive Aktivitäten-Tab (`.primary`, z. B. „Hort“) ist nicht hervorgehoben, alle drei Tabs sind Holz. Vermutung: ui-kit.css:1466–1476 / :1565–1567 überschreiben den Tab-aktiv-Rahmen (:466/:1003).
