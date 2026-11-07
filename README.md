# score-rent

## What this app is about

In my spare time I'm enthousiastic choral singer in a choir located in Nuremberg, Germany.
Within this choir I'm responsible for managing the scores the choir needs for it's rehearsals and concerts.

A challenge is the managing of rental scores. i.e. scores which must, once a concert is over, collected from the choir singers, and returned to the score dealer, who in turn returns them to the publishing company.

Traditionally this has been the workflow:

- I receive a certain number (say 120) copies of the choral score from our score dealer
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
  - vocal group (soprano, alto, tenor, bass)
  - member state (choir member, guest, student)
  - we build a human readable user id from user's first and last name
  - once signed up, the user must confirm the e-mail by confirming a link in a-mail sent after signup
  - once the e-mail address is confirmed. the user receives another e-mail containing a QR code with his user id
  - the user QR code is used to speed up the score checkout process
  - obligatory functions for 'forgotten password' and "resend confirmation link"

## User login

- only function for normal users are viewing a list of 'their' checkout records

## Score checkout

Because not all users will accept to use the QR code (some even might not have an e-mail adress), we must also still support the checkout by checkout sheet.

- authorize the choral singer either
  - by scanning 'his' QR code. The QR code contains a JWT (Json Web Token) so that the contained user id cannot be tampered.
  - by scanning the QR code of a traditional checkout sheet the user has to fill out. The QR code contains a checkout id
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

## E-mail delivery and mass mailings

Application e-mails, including reminder and mass-mailing messages, are stored in a MongoDB-backed queue before delivery. The AWS deployment has two Lambda functions: the API Lambda handles web requests, while a separate `emailQueueWorker` Lambda sends queued e-mails. When mail is queued, the API starts the worker asynchronously; it does not wait for delivery to finish. This prevents larger mailings from being cut short when an API Lambda invocation times out.

- The worker sends priority messages first, then processes older messages before newer ones.
- Processing is limited by `EMAIL_BATCH_SIZE` (default `5`), `EMAIL_LIMIT_HOUR` (default `20`), and `EMAIL_LIMIT_DAY` (default `100`). These limits apply to successfully delivered messages.
- The worker waits briefly between messages. Failed deliveries are retried up to three times; messages that still fail are marked failed.
- When a batch finishes, the worker starts another run if more messages can be sent immediately, or schedules a later run when the sending quota or a message's scheduled time requires a wait. It continues this way until there are no eligible messages, without requiring another API request. The worker has its own longer Lambda timeout and single-instance concurrency limit.
- Locally, the queue is checked once a minute while the app is running. Set `EMAIL_QUEUE_MODE=log` to exercise the queue without sending messages; messages are logged and recorded as dry runs.
- Administrators can inspect pending, sent, and failed messages, rate-limit usage, and the next available sending window at `/admin/email-queue-stats`.
- Every mass mailing (early reminder, return reminder) requires a **campaign** name, entered on the page that triggers the mailing. It is stored with each queued message, is shown in the verbose and failed lists of the queue stats page, and is indexed so that a mailing can be evaluated later, e.g. `db.emailqueues.find({ campaign: "orff-2026-return", status: "failed" })`.

### Reminder mailings

The early-reminder and return-reminder pages let an administrator select a score and then show, before anything is sent, the list of copies that would be reminded, the number of e-mails and borrowers, and a warning if a test recipient is configured.

One e-mail is sent **per checked-out copy**, so a borrower who has several copies of the same score receives one reminder for each of them, each naming its own score number.

The subject and body of both reminder mails are editable on the page itself and are stored in the `emailtemplates` collection (one document per reminder type). If no document exists yet, the built-in German default text is used, so no migration is needed.

- The text may contain the placeholders `{{firstName}}`, `{{lastName}}`, `{{scoreName}}` and `{{scoreId}}` (the score number of the copy the mail is about), which are replaced per recipient. Unknown placeholders are left in place so that typos remain visible.
- The preview renders the subject and body with the data of the first entry in the list; the body is shown in a sandboxed frame because it is HTML.
- The text is saved automatically when the mailing is started, so the stored template always matches what was sent last.
- A **Reset** button restores the built-in default text in the form; it is persisted on the next send.

### Testing e-mail delivery

- **Dry run (`EMAIL_QUEUE_MODE=log`)**: only effective when running locally (ignored in Lambda). The queue is processed as usual, but nothing is sent and the SMTP connection is not verified at startup. Each message is logged (`[EMAIL DRY RUN]`) and stored as `sent` with `dryRun: true`. Dry-run messages don't count against the hourly/daily limits and are shown separately on the queue stats page.
- **Test recipient (`EMAIL_TEST_RECIPIENT`)**: if set, the early-reminder, return-reminder, checkout and checkin confirmation e-mails are sent to this address instead of the real borrowers. It can be set per stage (e.g. `EMAIL_TEST_RECIPIENT_dev`); in the deployed Lambdas it comes from the environment, locally from `.env`. **Make sure it is unset in production**, otherwise real users won't receive their e-mails.
- **Test e-mail**: on all stages except `prod`, the admin home page offers a "Send test e-mail" button (`/admin/test-email`). It queues a message to `EMAIL_TEST_RECIPIENT` and redirects to the queue stats page, so the complete queue/worker path can be verified.
- **Queue stats** (`/admin/email-queue-stats`): shows counts, rate-limit usage, the next sending window and the dry-run count; `?verbose=1` lists pending messages and `?showFailed=1` lists failed ones.
- **Playwright**: e2e test users don't trigger checkout/checkin confirmation e-mails.
- **Rate limits for testing**: lower `EMAIL_BATCH_SIZE`, `EMAIL_LIMIT_HOUR` and `EMAIL_LIMIT_DAY` to exercise batching and the scheduled resume without sending many messages.

## TODO:

- mit einem Leihzettel können mehrere Ausleihen erzeugt werden
- Notenstatus per Scannen von Score Id ermitteln
- User bearbeiten aus User Liste: Registrierungsdatum

## Development

[Development](docs/development.md)

## Etiketten erstellen

### Mit Word Vorlage

`Diese Variante ist nicht mehr in Verwendung. Stattdessen siehe unten bei Avery-Zweckform Vorlagen`

How to create Etiketten im Seriendruck mit Word
Based on this tutorial: https://qr1.at/help/article/etiketten-druck-fuer-serien-qr-codes#beginnen-sie-mit-dem-serien-druck

#### Word Etikettenvorlage erstellen

- leeres Dokument erstellen
- Sendungen / Etiketten

Im Folgenden wollen wir pro Etikett einen QRCode und den QRCode Text erstellen

- im Feld Adresse nicht als einen Zeilenumbruch machen damit wir zwei Zeilen erhalten
- Optionen: Etikettenvorlage wählen, z.B. Microsoft, 30 pro Seite / OK
- Neues Dokument -> Etikett wird in Dokument übertragen; es erscheint eine Seitenvorschau mit vielen Etiketten pro Seite
- diese Vorlage als Word Dokument abspeichern

TODO: an dieser Stelle müsste eine A4 Datei rauskommen. Das haben wir aktuell noch nicht

#### Etiketten erstellen

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

### Mit Avery-Zweckform Etikettenvorlagen

#### Bestehende Vorlage verwenden

Die passende Seite zum Hochladen der eigenen Vorlage zu finden ist etwas mühsam. Zunächst muss man über eine Vorlagennummer navigieren und hat von da aus die Möglichkeit eine gespeicherte Vorlage hochzuladen. Die Seitenstruktur scheint sich auch laufend zu ändern.

- https://www.avery-zweckform.com
- Link "Vorlagen"
- in Suchfeld "Produktnummer oder Softwarecode" eingeben (siehe unten "Vorlagen" für Nummer) und "Start"
- Link "Kostenlos online starten"
- Registrierung mit "Kein Interesse" überspringen -> wir sollten auf einer Seite landen wo der Tab "2 - Design auswählen" selektiert ist.
- Ausrichtung wählen passend zur Vorlage (z.B. Querformat für Leihzettel)
- "Datei hochladen": siehe unten "Vorlagen" -> wir sehen die Vorschau
- Wechsel auf Tab "3 - Anpassen": Hier könnten wir nun die Vorlage anpassen (z.B. QRCode und Nummerierung). Siehe unten bei "Neue Vorlage erstellen"
- Wechsel auf Tab "4 - Vorschau und Drucken"; hier sollten wir die A4 Vorschau sehen; es sollten so viele Seiten verfügbar sein dass der definierte Nummernbereich abgedeckt ist.

Gespeicherte Projekte in "avery-label-templates"

- 3427-leihzettel.avery (2x4 zum Ausdruck auf A4 Normalpapier)
- 6251REV-Notenaufkleber.avery

#### Neue Vorlage erstellen

- https://www.avery-zweckform.com
- Link "Vorlagen und Software"
- Vorlage "3427" wählen (welche ist egal weil wir im nächsten Schritt ein gespeichertes Projekt öffnen) -> man landet auf der Seite "2 Design auswählen"
- Kachel oben links (Blanko Design) auswählen über "Dieses Design auswählen" -> Editor öffnet sich

Vorlagen

- Leihzettel: 3427 (2x4, A4)
- Aufkleber Noten: 6251REV (5\*7, ablösbare Etiketten, A4)

##### Text mit Fortlaufende Nummern

z.B. für Text BRFS-AD-xxx

- note that for existing templates, there's a edit function
- klicke auf "Fortlaufende Nummer"
- Startwert 1
- Endwert 500
- Prefix BRFS-AD-
- Klick auf Schalter "Fortlaufende Nummern" -> Textfeld wird in Vorlage eingefügt mit 1. Nummer
- Position und Größe anpassen wie gewünscht

##### QR Code mit fortlaufender Nummer

z.B. für Text BRFS-AD-xxx

- note that for existing templates, there's a edit function
- KLick auf "QR und Barcodes"
- Klick auf "Fügen Sie Barcode ein" bzw. "Barcode bearbeiten" bei bestehender Vorlage
- Wie möchten Sie Ihre Daten anbieten: Tabelle oder fortlaufende Nummer
- Schritt 1 Daten vorbereiten
  - auswählen: "Zähler" -> Schalter mit Stift wird sichtbar
  - Klick auf Stift
  - Nummerierung definieren wie oben bei Text; Dialog m. "Bearbeiten" schließen
- Schritt 2 Barcodes erstellen
  - "QR Code" aus Liste auswählen
  - Codetyp "Text"
  - Stift-Schalter per Drag & Drop auf das Feld "Barcode Text eingeben" ziehen (etas unintuitiv) -> Der Text, z.B. "SN2" des Stift-Schalters erscheint nun ausgegraut im Feld "Barcode Text eingeben"
  - Klick "Fertigstellen" -> Dialog schließt sich; QR Code wird in Vorlage dargestellt
- Position und Größe anpassen wie gewünscht
- Klick auf "Vorschau & Drucken" -> Vorschau der Druckbögen wird angezeigt
- Klick auf "Drucken" -> hier hat man die Möglichkeit sein Projekt zu speichern
- "Speichern"
- "Download editierbare Avery Zweckform Datei auf meinem Computer"
- nun wird eine PDF-Datei erzeugt die man herunterladen kann (ich hatte Probleme mit dem Drucken - der Drucker sprang nicht an - erst als ich die PDF-Datei heruntergeladen und lokal geöffnet habe, klappte der Druck)

über "Vorschau und Drucken" überzeugt man sich dass die Seriennummerierung für Text und QR Code funktioniert

### Druck Etikettenvorlagen

Etiketten müssen mit dem Einzeleinzug des Laserdruckers gedruckt werden, da sich die Etiketten sonst evtl. ablösen und die Trommel beschädigen könnten.

- Anleitung für Brother HL-L3210D https://www.brother.de/support/hl-l2310d/faqs/how-to-trouble-shooting/faq00000063_052
  - Klappen vorne und hinten öffnen
  - Drucker einschalten
  - Etikettenseite mit Druckseite oben in den manuellen Einzug einlegen bis sie etwas vom Drucker eingezogen wird
- PDF-Datei mit Etiketten wie oben erzeugt auswählen
- weitere Einstellungen / über Systemdialog drucken
- gewünschte Seitennummer auswählen
- Einstellungen -> Brother Einstellungen öffnen sich
- Papierquelle manuell
- manchmal bleiben die Jobs in der Drucker Queue hängen (ich bin dann Druck aus Browser nach Acrobat gewechselt)

[Mongo DB](docs/mongodb.md)
