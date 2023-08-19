# score-rent

## What this app is about

In my spare time I'm enthousiastic choral singer in a choir located in Nuremberg, Germany.
Within this choir I'm responsible for managing the scores the choir needs for it's rehearsals and concerts.

A challenge is the managing of rental scores. i.e. scores which must, once a concert is over, collected from the choir singers, and returned to the score dealer, who in turn returns them to the publishing company.

Traditionally this has been the workflow:

- I receive a certain number (say 120) copies of the coral score.
- these copies are hand written numbered by the publisher or by previous lenders (but the problem is: double numberings occur, and due to several numbering systems, you do not always know which number to use as the reference)
- the choir singers each fill out a checkout sheet by hand, providing their contact data. Also the score number was written on the sheet
- once the concert was over, the scores are collected in a box, and it is up to me the score manager to map scores and checkout sheets; due to the problems above the mapping is not easy and sometimes errors occur.
- also amongst the 120 rentals there's always a certain number of singers wo don't return their scores in time at first or second request to do so; so there's the need to remind them using the contact data (usually the email address) from the checkout sheet.

Because I'm professional web developer (previously Java fullstack, today nodejs backend), after a while there came up the wish to improve this manual process. These where the ideas:

- all scores get unique Id attached and we should able to be register it by smartphone scanning
- the unique Id shall be human readable and relate to a certain composer/work; that's why we chose QR code rather than barcode.
- before return to the dealer, the id must be removed from the score. So we need special kind of labels which can removed again
- the rental (checkout) process for a score should be 'digital', i.e.
  - scanning a user id
  - scanning a score id
  - store the relation (checkout) in a database with a unique checkout id
  - during checkout also some metadata must be collected; among these
    - an existing (hand written) number of the score (we call it 'external id')
    - current date
    - comment about the score state (e.g. full of previous user remarks)
    - a reference to another user if the checkout user acts on behalf of another user
- similar also the score return (checkin) should be 'digital', i.e.
  - scanning the score's QR code will
    - mark the score as 'not checked out' in the db
    - record some metadata, as
      - the date
      - the score state (if different from the checkout state)
      - send the choir singer an e-mail with a confirmation that 'his' score were de-registered.

## User registration

- mandatory are
  - e-mail address (which must be validated)
  - sing group (soprano, alto, tenor, bass)
  - member state (choir member, guest, student)
  - we build a human readable user if from user's first and last name
  - once signed up, the user must confirm the e-mail by confirming a link in a-mail sent after signup
  - once the e-mail address is confirmed. the user receives another e-mail containing a QR code with his user id
  - the user QR code is used to speed up the score checkout process
  - obligatory functions for 'forgotten password' and "resend conformation link"

## User login

- only function for normal users are viewing a list of 'his' checkout records

## Score checkout

Because not all users will accept to use their QR code (some even might not have a e-mail adress), we must also still support the checkout with checkout sheet.

- authorize the choral singer either
  - by scanning 'his' QR code. The QR code contains a JWT (Json Web Token) so that the contained user id cannot be tampered.
  - by scanning the QR code of a traditional checkout sheet the user has to fill out. The QR code contaims a checkout id
- scan the score
- optionally add some metadata (e.g. score state, date)
- confirm the checkout which will
  - store the checkout process in a database using a unique checkout id; for checkout by sheet, it's id is the checkout id
  - send the user an e-mail about the checkout process, optionally with some info how to care the score

## List checkouts

As a maintainer I need to get a view of all checkouts.

- filter checkouts by
  - composer/work
  - 'open' checkouts, i.e. scores not returned
  - user

## Score checkin

- scan the returned score which will
  - mark the checkout record as returned
  - log some metadata (e.g. date)

## TODOs

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

#### Druck

- Druck über Drucken oder Fertigstelle und Zusammenführen / Drücken führte zu PDF-Datei mit Fehlern
- Funktioniert hat Exportieren / Druck als XPS/PDF Datei

### Etiketten erstellen mit Avery-Zweckform Etikettenvorlagen

- https://www.avery-zweckform.com/etiketten/rechteckige-etiketten
- gewünschte Etiketten auswählen, z.B. "8"
- Link "Zu den Avery Online Vorlagen"
- Editor für gewählten Etikettentyp öffnet sich
- Textfelder auf die Vorlage ziehen ist selbsterklärend

#### Text mit Fortlaufende Nummern

z.B. für Text BRFS-AD-xxx

- klicke auf "Fortlaufende Nummer"
- Startwert 1
- Endwert 500
- Prefix BFRS-AD-
- Klick auf Schalter "Forlaufende Bummerierung" -> Textfeld wird in Vorlage eingefügt mit 1. Nummer

#### QR Code mit fortlaufender Nummer

- KLick auf "QR und Barcodes"
- Klick auf "Fügen Sie Barcode ein"
- Wie möchten Sie Ihre Daten anbieten: Tabelle oder fortlaufende Nummer
- Schritt 1 Daten vorbereiten
  - auswählen: "Zähler" -> Schalter mit Stift wird sichtbar
  - Klick auf Schalter m. Stift
  - Nummerierung definieren wie oben bei Text; Dialog m. "Bearbeiten" schließen
- Schritt 2 Barcodes erstellen
  - "QR Code" aus Liste auswählen
  - Codetyp "Text"
  - Stift-Schalter per Drag & Drop auf das Feld "Barcode Text eingeben" ziehen (etas unintuitiv) -> Der Text, z.B. "SN2" des Stift-Schalters erscheint nun ausgegraut im Feld "Barcode Text eingeben"
  - Klick "Fertigstellen" -> Dialog schließt sich; QR Code wird in Vorlage dargestellt

über "Vorschau und Drucken" überzeugt man sich dass die Seriennummerierung für Text und QR Code funktioniert

[Mongo DB](md/mongodb.md)
