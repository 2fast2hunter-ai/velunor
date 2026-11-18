# Release-Checkliste

Nur Fabian-Noel kann die Punkte unten entscheiden oder ausführen. Dieser Stand legt keine Store-Konten an, bezahlt nichts, signiert nichts und reicht nichts ein. Es wird auch kein Tag gesetzt und kein zweites Supabase-Projekt angelegt.

## Builds aus dem Tag

Die Action `.github/workflows/release.yml` startet nur bei einem Tag `v*` (zum Beispiel `v0.1.0`). Sie lädt drei Artefakte hoch:

- `velunor-debug-apk`: Android-Debug-APK. Der Runner signiert sie mit seinem eigenen Debug-Keystore. Das ist kein Play-Upload-Schlüssel und liegt nicht im Repo.
- `velunor-unsigned-aab`: Android App Bundle ohne Signierung. `release` hat kein `signingConfig`.
- `velunor-ios-simulator`: iOS-Build für den Simulator, `CODE_SIGNING_ALLOWED=NO`. Kein Zertifikat, kein Team.

Der Runner für iOS ist `macos-latest`. Das Repo ist öffentlich, dafür stellt GitHub die macOS-Minuten. [Preise vor Entscheidung prüfen], falls das Repo später privat wird.

Tag selbst setzen, wenn ein Build gewünscht ist:

```sh
git tag v0.1.0
git push origin v0.1.0
```

Den Tag nicht löschen und nicht überschreiben, wenn der Build schon als Referenz gilt.

Ohne die Variablen unten spricht der Build das bestehende Projekt in Frankfurt an: `https://psbouhfgvsygadihwtdk.supabase.co`.

## Test-Supabase, zweites Free-Projekt

In diesem Schritt wird kein Projekt angelegt. Der Client nimmt `VITE_SUPABASE_URL` und `VITE_SUPABASE_KEY`, beide gesetzt oder beide leer. Leer bleibt Frankfurt. Ein einzelner Wert bricht den Build ab. Der Service-Role-Schlüssel gehört nicht in die Variable und nicht ins Repo.

So legt Fabian-Noel das zweite Projekt selbst an:

1. Im Supabase-Dashboard ein neues Projekt auf dem Free-Tarif anlegen. Region Frankfurt wählen, wenn sie angeboten wird. Den Tarif wegen Pausieren und Limits vorher entscheiden. [ANNAHME]
2. Anonymous Sign-In einschalten, sonst bleibt das Spiel offline. E-Mail-Auth nur einschalten, wenn Verknüpfung und Chat getestet werden.
3. Die Migrationen aus `supabase/migrations` der Reihe nach im SQL-Editor ausführen. Die Edge Functions aus `supabase/functions` in dieses Projekt deployen. Beides passiert hier nicht.
4. Project URL und den publishable Key kopieren. Nicht den service_role Key.
5. Im GitHub-Repo unter Settings → Secrets and variables → Actions → Variables (nicht Secrets) eintragen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
6. Danach den Tag schieben. Die Action liest die Variablen. Sie legt keine Secrets an.
7. Redirect-URL für den Anmeldelink der Löschseite im neuen Projekt erlauben, sonst kommt der Link nicht an. [VON FABIAN-NOEL AUSZUFÜLLEN]

Die Seiten auf GitHub Pages (`datenschutz.html`, `loeschen.html`) bleiben am Frankfurt-Projekt. Nur der App-Build aus dem Tag folgt den Variablen.

## Store-Konten und Gebühren

- Google Play Developer, einmalig 25 $. [Preise vor Entscheidung prüfen]
- Apple Developer, 99 $ pro Jahr. [Preise vor Entscheidung prüfen]
- Nichts davon ist angelegt oder bezahlt.

## Signierung

- Android: Upload-Schlüssel und Play App Signing selbst erzeugen und außerhalb des Repos halten. `android/.gitignore` ignoriert `*.jks` und `*.keystore`. Die unsignierte AAB ist nicht einreichbar, bis sie signiert ist.
- iOS: Distribution-Zertifikat und Profile im Apple-Konto. Der Simulator-Build aus der Action ist dafür nicht verwendbar.
- Keine Schlüssel in GitHub Actions Secrets für diese Action hinterlegen. Sie liest keine Secrets.

## Anmeldung mit Google und Apple

Die Knöpfe in den Optionen sind absichtlich deaktiviert. Freischalten erst nach den Developer-Konten und einer eigenen Entscheidung. Hier ist nichts verdrahtet.

## Datenschutz, Schritt 20

In `docs/datenschutz.md` und `public/datenschutz.html` ausfüllen, bevor etwas öffentlich wird:

- Name, Anschrift, Kontakt-E-Mail. [VON FABIAN-NOEL AUSZUFÜLLEN]
- Zuständige Aufsichtsbehörde. [VON FABIAN-NOEL AUSZUFÜLLEN]
- Supabase-DPA lesen und annehmen. [VON FABIAN-NOEL AUSZUFÜLLEN]
- Den Entwurf rechtlich prüfen lassen. [rechtlich prüfen lassen]
- Annahmen, die der Code nicht umsetzt: Löschung der Statistik nach 13 Monaten, Löschung inaktiver anonymer Konten nach 24 Monaten.

Store-Texte und Grafiken bleiben Entwürfe unter `store/texte/` und `store/entwuerfe/`. Nicht hochladen, bis die Prüfung durch ist.

## Admin und Moderation

Die Tabelle `public.admins` hat keine Zeile. Einfügen geht nur im SQL-Editor des Projekts, nicht aus dem Spiel:

```sql
insert into public.admins (user_id)
values ('[EIGENE USER-ID AUS auth.users]');
```

[VON FABIAN-NOEL AUSZUFÜLLEN]

Der Agent sortiert Meldungen vor. Entscheiden tut Fabian-Noel über `admin-decide`. Die Reaktionszeit steht nicht im Code. [VON FABIAN-NOEL AUSZUFÜLLEN]

Das Chat-Mindestalter im Code ist 13. Das Geburtsjahr wird nicht gespeichert. Ob 13 rechtlich trägt, ist zu prüfen. [rechtlich prüfen lassen]

## Altersfreigabe und Einreichung

- Fragebogen-Entwurf: `store/texte/altersfreigabe.md`. Nicht abgeschickt. Die Spanne USK 6–12 / PEGI 7–12 / Apple 9+–12+ ist eine Annahme. Wenn das Glücksrad zu hoch liegt, kann es durch einen festen Marken-Laden ersetzt werden. [VON FABIAN-NOEL AUSZUFÜLLEN]
- Interne Testgruppe bei Play und TestFlight selbst anlegen, nachdem die Konten existieren.
- Einreichung selbst. Dieser Stand reicht nichts ein.

## Gerätetest

Die Action liefert die APK. Installieren und einmal mit zwei Test-Konten durchspielen, gegen die Test-Umgebung:

- Block A: Hochformat, Einzelspieler.
- Block O: Konto, Sync, Einwilligung, Löschen.
- Block MP: Freund werden, Tausch, Arena, Koop, Gilde, Chat und Melden.
- Block C: Datenschutzseite, Löschseite, Offline-Hinweis.

Ohne die Variablen träfe derselbe Lauf das Frankfurt-Projekt. Dafür die Variablen setzen, bevor der Tag entsteht.
