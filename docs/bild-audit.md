# Bild-Audit

Stand vor dem weichen Look. Jede Zeile ist eine Stelle ohne eigenes Bild. Der Pfad liegt schon im Code (`src/adventure/uiArt.ts`, Ausnahme: Truhen im Lager nutzen die vorhandenen Shop-Grafiken, Werkstatt-Zeilen das Monsterportrait). Dateien unter `public/assets/`. Platzhalter sind 128×128, transparent, runde Scheibe. Später nur die Datei tauschen.

| Ort | Element | Datei | Größe | Motiv |
| --- | --- | --- | --- | --- |
| Abenteuer, Kopf | Kodex-Zähler | `ui/codex_count.png` | 128×128 | Aufgeschlagenes Buch mit kleiner Zahl |
| Abenteuer, Kopf | Uhrzeit und Tageszeit | `ui/clock.png` | 128×128 | Runde Uhr, halb Tag halb Nacht |
| Abenteuer | Kapitelzeile | `ui/chapter.png` | 128×128 | Wegmarke mit Wimpel |
| Abenteuer | Aufklapp-Pfeil der Karte | `ui/chevron.png` | 128×128 | Weiches Chevron |
| Abenteuer | Wächter herausfordern | `ui/challenge.png` | 128×128 | Schild mit Stern |
| Abenteuer, Tempo | ×1, ×2, ×3 | `ui/speed_1.png`, `ui/speed_2.png`, `ui/speed_3.png` | 128×128 | Ein, zwei, drei Bögen |
| Abenteuer, Teamleiste | Leerer Platz | `ui/slot_empty.png` | 128×128 | Leerer runder Rahmen |
| Abenteuer | Kampfprotokoll | `ui/log.png` | 128×128 | Schriftrolle |
| Abenteuer | Griff „Spuren hier“ | `ui/traces.png` | 128×128 | Pfotenabdruck |
| Abenteuer, Schublade | Aktive Früchte | `ui/fruit_buff.png` | 128×128 | Leuchtende Frucht |
| Karte | Regionswahl | `ui/region.png` | 128×128 | Insel-Umriss |
| Karte | Kapitelzeile | `ui/chapter_mark.png` | 128×128 | Wappen-Umriss |
| Team | Nach vorn, nach hinten | `ui/team_forward.png`, `ui/team_back.png` | 128×128 | Pfeil hoch, Pfeil runter |
| Team | Ins PC, ins Team | `ui/team_to_pc.png`, `ui/team_to_team.png` | 128×128 | Kiste, Gruppe |
| Team | Karte | `ui/team_card.png` | 128×128 | Spielerkarte |
| Team, Kodex | Filterleiste | `ui/filter.png` | 128×128 | Trichter |
| Team | Sortierrichtung | `ui/sort.png` | 128×128 | Pfeile auf und ab |
| Kodex | Regionsbalken | `ui/region_bar.png` | 128×128 | Kleine Landschaft plus Balken |
| Laden | Info auf der Karte | `ui/info.png` | 128×128 | Kreis mit i |
| Laden | Reiter Truhen, Stärkung, Marken | `ui/tab_chests.png`, `ui/tab_boost.png`, `ui/tab_marks.png` | 128×128 | Truhe, Kristall, Klee |
| Laden | Lager-Hinweis | `ui/storage.png` | 128×128 | Offene Kiste |
| Laden, Stärkung | Früchte ohne Zeichnung | `ui/fruit_neugier.png`, `ui/fruit_glanz.png`, `ui/fruit_lern.png`, `ui/fruit_muenz.png` | 256×256 | Neugier, Glanz, Lernen, Münze |
| Aktivitäten | Hort, Truhen, Rad | `ui/act_hort.png`, `ui/act_chests.png`, `ui/act_wheel.png` | 128×128 | Nest, Truhe, Rad |
| Truhen-Lager | Vier Truhen | vorhandene `shop/chest_*.webp` | 256×256 | Schon gezeichnet, nur eingebunden |
| Truhen-Lager | Wegtruhe | `ui/road_chest.png` | 128×128 | Truhe am Weg |
| Truhen-Lager | Staub und Werkstatt | `ui/dust.png` | 128×128 | Glitzernder Staub |
| Truhen-Lager | Werkstatt-Zeile | `monsters/{id}_256.png` | 256×256 | Vorhandenes Portrait, nur eingebunden |
| Hort | Ei | `ui/egg.png` | 128×128 | Gesprenkeltes Ei |
| Hort | Hin, her, Platz kaufen | `ui/hort_in.png`, `ui/hort_out.png`, `ui/hort_buy.png` | 128×128 | Pfeil ins Nest, aus dem Nest, Plus |
| Glücksrad | Drehen | `ui/spin.png` | 128×128 | Drehender Pfeil |
| Mehr | Laden, Erfolge, Optionen, Anleitung | `ui/nav_shop.png`, `ui/nav_achievements.png`, `ui/nav_options.png`, `ui/nav_guide.png` | 128×128 | Laden, Medaille, Regler, Buch |
| Erfolge | Jede Zielzeile | `ui/achieve.png` | 128×128 | Medaille, leer oder gefüllt |
| Erfolge | Titel und Rahmen | `ui/equip_title.png`, `ui/equip_frame.png` | 128×128 | Band, Bilderrahmen |
| Optionen | Sprache, Tempo, Schrift, Strom, Schleife | `ui/lang.png`, `ui/speed_1.png`, `ui/opt_font.png`, `ui/opt_power.png`, `ui/opt_loop.png` | 128×128 | Sprechblase, Bogen, Aa, Mond, Kreispfeil |
| Optionen | Schalter | `ui/opt_auto.png`, `ui/opt_card.png`, `ui/opt_shake.png`, `ui/opt_flash.png`, `ui/opt_motion.png`, `ui/opt_swipe.png`, `ui/opt_haptic.png`, `ui/opt_battery.png` | 128×128 | Wechsel, Karte, Wackeln, Blitz, Ruhe, Wischen, Vibration, Akku |
| Optionen | Kopieren, Import, Neu | `ui/copy.png`, `ui/import.png`, `ui/reset.png` | 128×128 | Zwei Blätter, Pfeil hinein, Neustart |
| Anleitung | Titel und jeder Absatz | `ui/guide.png` | 128×128 | Offenes Buch |
| Dialoge | Schließen und Abbrechen | `ui/close.png` | 128×128 | Weiches Kreuz |

Wetter, Wegknoten und Glücksrad-Symbole bleiben vorerst die vorhandenen Strichzeichnungen. Monster, Truhen im Laden, Kristalle, Gold und Marken haben schon Bilder.
