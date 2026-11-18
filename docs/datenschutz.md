# Datenschutzerklärung (Entwurf)

Entwurf für Velunor. Noch nicht veröffentlicht und noch nicht rechtlich geprüft. Nichts aus diesem Text ist bei einem Store eingereicht.

Dieselbe Erklärung liegt als Web-Seite unter `datenschutz.html` (GitHub Pages des Spiels: `https://2fast2hunter-ai.github.io/velunor/datenschutz.html`, sobald dieser Stand auf `main` liegt). In der App führt Optionen auf dieselbe Seite.

## Verantwortlicher

[VON FABIAN-NOEL AUSZUFÜLLEN]

Name, Anschrift und eine erreichbare Kontakt-E-Mail. Für eine App mit Konten im Store braucht es diese Adresse. Die zuständige Aufsichtsbehörde hängt vom Sitz ab und bleibt ebenfalls [VON FABIAN-NOEL AUSZUFÜLLEN].

Vor der Veröffentlichung: diesen Text rechtlich prüfen lassen. [rechtlich prüfen lassen]

## Auftragsverarbeitung

Die Datenbank und die Anmeldung laufen bei Supabase, Projekt `https://psbouhfgvsygadihwtdk.supabase.co`, im Code als Hosting in Frankfurt (EU) bezeichnet. Vor dem Start den Auftragsverarbeitungsvertrag (DPA) von Supabase prüfen und annehmen. [VON FABIAN-NOEL AUSZUFÜLLEN]

Checkliste, nichts davon ist hier erledigt:

- DPA von Supabase lesen und annehmen.
- Verantwortlichen und Kontakt oben einsetzen.
- Redirect-URL der Web-Löschseite in der Supabase-Auth prüfen, falls der E-Mail-Link nicht zurückführt.
- Diesen Entwurf rechtlich prüfen lassen.

## Was Velunor nicht tut

Keine Käufe. Truhen und das Glücksrad nutzen Gold und Marken aus dem Spiel, nicht Echtgeld. Keine Werbung, kein Tracking über Apps hinweg, keine Analyse-SDKs von Dritten, keine Weitergabe zu Werbezwecken. Die eigene Spielstatistik gibt es nur mit Einwilligung.

## Verarbeitete Daten

Die folgenden Punkte entsprechen dem aktuellen Code. Was nur geplant ist, ist als Annahme markiert.

- **Konto-ID.** Beim Spiel mit Netz legt Supabase Auth ein anonymes Konto an. Die ID ist die Nutzer-ID dieses Kontos.
- **E-Mail, optional.** Nur wenn das Konto in den Optionen verknüpft wird (Anmeldelink). Ohne Verknüpfung bleibt das Konto anonym. Chat schreiben verlangt eine bestätigte E-Mail; das Konto selbst nicht.
- **Spielername.** Name und vierstellige Kennung. Angemeldete Spieler können den Anzeigenamen lesen (Freunde, Tausch, Arena, Gilde, Chat).
- **Freundschaftscode.** Acht Zeichen, sichtbar für Leute, denen du ihn gibst.
- **Spielstand.** Der JSON-Spielstand, darunter Monster, Team, Fortschritt, Gold und Marken. Auf dem Server in `saves`, zusätzlich das Register `monsters_owned` (Art, Stufe, Seltenheit, Schimmer, Herkunft Truhe, Splitter, Ei, Rad oder Tausch).
- **Geräte-Kennung für den Abgleich.** Eine zufällige ID auf dem Gerät (`velunor_device_id`), in der Speicherzeile als `device_id`. Sie unterscheidet zwei Geräte desselben Kontos. Es ist keine Werbe-ID des Geräts.
- **Freunde, Geschenke, Koop, Arena, Gilde.** Anfragen, Freundschaften, Geschenke, Koop-Gruppen, Arena-Profil und -Protokoll, Gildenmitgliedschaft und Gildenbeiträge, soweit du sie nutzt.
- **Tausch.** Offene Angebote hängen am Konto und fallen mit ihm weg. Abgeschlossene Tauschzeilen bleiben: beide Konto-IDs, Art, Seltenheit, Stufe. Die Tabelle hat keinen Lösch-Verweis auf das Konto. Namen stehen dort nicht.
- **Chat.** Nachrichten in Gilde und Direktnachricht, höchstens 200 Zeichen, mit Anzeigenamen. Ungekennzeichnete Nachrichten liegen 30 Tage (`purge_after`), gemeldete 90 Tage ab dem Senden. Ein Stundenjob (`velunor-chat-purge`) löscht sie. Beim Löschen des Kontos wird der Absender geleert und die Anzeige zu „gelöschtes Konto“; der Text bleibt bis zu dieser Frist.
- **Chat-Alter.** Die App fragt das Geburtsjahr nur auf dem Gerät und schickt ausschließlich ja oder nein für „13 oder älter“ (`chat_flags.adult`). Das Geburtsjahr wird nicht gespeichert. Ein Körper mit `year` oder `birth` lehnt der Server ab.
- **Meldungen und Sperren.** Grund, Zielname, bei Chat der Nachrichtenausschnitt. Beim Löschen des Kontos wird die Melder-ID geleert. Die Zeile trägt `purge_after` von 90 Tagen. Ein Löschjob für Meldungszeilen ist nicht eingebaut, anders als beim Chat. Entscheidungen der Moderation können die Meldungs-ID behalten. Sperren auf dem eigenen Konto fallen mit dem Konto weg.
- **Spielstatistik, nur mit Einwilligung.** Erst nach „Ja“ in der Abfrage oder in den Optionen. „Nein“ verwirft die lokale Warteschlange und sendet nichts. Ereignisse: `session_start`, `tutorial_step`, `tab_open`, `stage_clear`, `stage_fail`, `guardian_win`, `guardian_fail`, `lootbox_open`, `shard_drop`, `star_up`. Eigenschaften ohne E-Mail, Name, Konto-ID, Geräte-ID und IP. Die Zeilen hängen an der Konto-ID und werden mit dem Konto gelöscht. Eine eigene Löschung nach 13 Monaten ist nicht eingebaut. [ANNAHME]
- **IP-Adresse.** Die Spieltabelle speichert keine IP. Supabase kann Verbindungsdaten in seinen Protokollen haben. Die Frist dafür steht im DPA. [VON FABIAN-NOEL AUSZUFÜLLEN]

Lokal auf dem Gerät liegen außerdem Spielstand, Einwilligung, die Statistik-Warteschlange und die Supabase-Sitzung. Die Web-Fassung nutzt `localStorage`, die App-Hülle die Capacitor-Preferences.

## Zwecke

Spielbetrieb, Synchronisieren zwischen Geräten, Multiplayer (Freunde, Tausch, Arena, Gilde, Chat, Koop) und Schutz vor Betrug und Missbrauch (Abgleich des Spielstands, Namensfilter, Meldungen, Sperren).

## Rechtsgrundlagen

Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO, für den Spielbetrieb und die dafür nötigen Kontodaten. Berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO, für Betrugsschutz und Missbrauchsabwehr. Einwilligung, Art. 6 Abs. 1 lit. a DSGVO, nur für die Spielstatistik; Widerruf in den Optionen mit „Nein“, ohne Nachteil fürs Spiel. [rechtlich prüfen lassen]

## Empfänger

Supabase als Auftragsverarbeiter, Hosting in Frankfurt (EU). Der Web-Client liegt auf GitHub Pages (`https://2fast2hunter-ai.github.io/velunor/`). Keine Weitergabe zu Werbezwecken, keine Analyse-SDKs von Dritten.

## Speicherdauer

Bis zur Kontolöschung, mit diesen Ausnahmen:

- Chat wie oben, 30 Tage, gemeldete Nachrichten 90 Tage.
- Meldungen: Melder-ID sofort weg, die Zeile selbst ohne eingebauten Löschjob. Das Feld `purge_after` steht auf 90 Tagen.
- Abgeschlossene Tauschzeilen bleiben ohne Namen, mit den beiden Konto-IDs.
- Spielstatistik bis zur Kontolöschung. 13 Monate sind nicht automatisiert. [ANNAHME]
- Inaktive anonyme Konten nach 24 Monaten löschen ist nicht eingebaut. [ANNAHME]

## Rechte

Auskunft, Berichtigung, Löschung, Datenübertragbarkeit und Beschwerde bei der Aufsichtsbehörde. [VON FABIAN-NOEL AUSZUFÜLLEN] für die Behörde.

- **Löschung in der App.** Optionen, „Konto und Daten löschen“, zwei Bestätigungen. Die bestehende Funktion `delete-account` tritt aus der Gilde aus, anonymisiert den Chat, leert die Melder-ID, löscht Monster, Sperren, Namen, Profil, Spielstand und Statistik und entfernt danach das Auth-Konto. Anschließend kann ein neues anonymes Konto starten.
- **Löschung im Web.** `loeschen.html` ruft dieselbe Funktion auf. Es gibt keinen eigenen Konto-Code. Ein Freundschaftscode löscht kein Konto. Die Seite nutzt die Sitzung dieses Browsers oder einen Anmeldelink an die verknüpfte E-Mail.
- **Datenübertragbarkeit.** Optionen, „Speicherstand exportieren“, lädt den lokalen Spielstand als JSON (`velunor-spielstand.json`). Das ist der Spielstand, nicht der Chat und nicht die Meldungen.

## Kontakt für Auskunft

[VON FABIAN-NOEL AUSZUFÜLLEN]
