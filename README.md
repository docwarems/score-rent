# score-rent

## TODOs

### General

- sign QR codes
- format timestamps
- replace home page by menu?
- responsive side bar?
- toggle e-mails with informational purpose

### User registration

- forgotten password function
- sing group, member state

### Checkout

- send e-mail

### Checkin

- send e-mail

### Checkouts

- signatures from db

#### Administration

- show checkout
- show/filter users
- save score state - not only at checkout

## Create Etiketten

How to create Etiketten im Seriendruck mit Word
Based on this tutorial: https://qr1.at/help/article/etiketten-druck-fuer-serien-qr-codes#beginnen-sie-mit-dem-serien-druck

### Word Etikettenvorlage erstellen

- leeres Dokument erstellen
- Sendungen / Etiketten

Im Folgenden wollen wir pro Etikett einen QRCode und den QRCode Text erstellen

- im Feld Adresse nicht als einen Zeilenumbruch machen damit wir zwei Zeilen erhalten
- Optionen: Etikettenvorlage wählen, z.B. Microsoft, 30 pro Seite / OK
- Neues Dokument -> Etikett wird in Dokument übertragen; es erscheint eine Seitenvorschau mit vielen Etiketten pro Seite
- diese Vorlage als Word Dokument abspeichern

TODO: an dieser Stelle müsste eine A4 Datei rauskommen. Das haben wir aktuell noch nicht

### Etiketten erstellen

- Sendungen / Seriendruck starten ... / Etiketten / abbrechen
- Empfänger auswählen / vorhandene Liste auswählen (CSV Datei mit Daten)

In diesem Fall haben wir eine CSV-Datei mit einer Headerzeile "id" und "qrcode" und darunter die Datenzeilen. Für qrcode wird die URL eines Online-Dienstes für QRCode Generierung eingetragen (liefert ein Bild)

- Cursor vor die erste Zeilenendemarkierung setzen
- STRG-F9 INCLUDEPICTURE
- STRG-F9 IF TRUE
- STRG-F9 MERGEFIELD qrcode
- Cursor vor die letzte geschweifte Klammer und "\d" eingeben

- Cursor vor die zweite Zeilenendemarkierung setzen
- STRG-F9 MERGEFIELD id

- Etiketten aktualisieren
- Vorschau Ergebnisse

Nun sollten die Platzhalter mit dem QRCode und dem QRCode Test gefüllt werden

### Druck

- Druck über Drucken oder Fertigstelle und Zusammenführen / Drücken führte zu PDF-Datei mit Fehlern
- Funktioniert hat Exportieren / Druck als XPS/PDF Datei
