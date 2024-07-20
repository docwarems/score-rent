# AWS

## AWS Elastic Beanstalk

Nach meinem Verständnis kann Cyclic nur AWS Elastic Beanstalk (EB) verwendet haben für sein Auto-Deployment.
Jedenfalls ist EB der einzige AWS service wo ich erkennen könnte, dass man da einfach seine bestehende nodejs app einfach einfach deployen kann ohne manuellen Konfigurationsaufwand.

Auf Youtube findet man Tutorials die zeigen wie man eine Beanstalk Application in der AWS Management Konsole (MC) einrichtet. Nur verwendeten die bisher alle die dort angebotene AWS Beispiel App und keine eigene.

Man kann eine eigene App hochladen, aber bisher ist mir nicht klar, wie man das Upload Paket richtig erstellt.

Bei der Recherche bin ich dann gestoßen auf https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/nodejs-quickstart.html.
Nach einer Installationsorgie, die hier startet: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html und installiert:
- pyenv
- Python 3.11 (3.12 nicht unterstützt)
- virtualenv
- eb-cli

habe ich dann versuche die hier beschriebene https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/nodejs-quickstart.html Beispiel App auf EB zum Laufen zu bringen

```
eb init -p node.js nodejs-tutorial --region us-east-2
```

Danach werden Access Credentials abgefragt.
Ich habe in der MC einen Access Key erzeugt. Ich wurde darauf hingewiesen dass dies unter Sicherheitsaspekten nicht die beste Lösung ist - allerdings weiß ich bisher nicht wie Credentials mit angepasster Security erstelle.
Bei einem weiteren Versuch mit dieser score-rent App wurde ich dann nicht mehr nach Credentials gefragt. Das scheint also intern irgendo gecacht zu werden.

Mit den erstellten Credentials konnte ich mich anmelden und die Anwendung wurde erstellt.

```
eb create nodejs-env
```

Dies lädt nun die Anwendung hoch und das Log zeigt welche benötigten AWS Ressourcen erstellt werden. Nach einigen Minuten erscheint die URL unter welcher die Anwendung deployt wurde. Ich konnte sie im Browser erreichen.

Die Beanstalk application ist in der MC sichtbar nach Auswahl der Region wo deployt wurde, z.B. us-west-2.

```
eb terminate
```

Das hat die Anwendung wieder entfernt (Dauer wieder ein paar Minuten).

In MC / Beanstalk applications bleibt die Anwendung scheinbar weiter gelistet mit Environment Status "terminated".

Nach Auswahl der Application in der MC konnte ich diese dort löschen so dass sie aus der Liste entfernt wurde. Das (terminated) Environment wird jedoch weiter angezeigt.

### Versuch Deployment score-rent

Zunächst mal habe ich ganz blauäugig die App genauso mit den o.a. eb Befehlen deployt wie die Beispiel-App, obwohl natürlich Environment Settings fehlen.
Die eb Logmeldungen sahen nicht viel anders aus. Die Anwendung selber bringt unter der geloggteb URL einen ningx Fehler.
In der MC wird das Environment mit Health "severe" gelistet.

Das Auswahl des Environment in der Beansstalk Console wird eine Navigation Pane sichtbar. Dort kann man sich unter Logs die Logs downloaden.
Und wie erwartet steigt die Anwedndung aus weil die MongDB Umgebungsvariablen fehlen.

Unter "Configuration" hat man die Möglichkeit env Variablen zu definieren. 
Nachdem ich das gemacht hatte wurde geloggt dass die Änderungen angewendet wurden. Ich hatte dann erst Schwierigkeiten im Log aktuelle Meldungen zu finden. Allerdings kommen im Erfolgsfall ja weniger Logs ;-).
Jedenfalls fand ich dann "SMTP Server is ready to take your messages".

Irgendwann fiel mir auf dass nging eine Weiterleitung auf Port 8080 macht, während in score-rent der Express server fix auf 3000 gestartet ist.
Nachdem ich dann hierfür eine neue env var erzeugt hatte, änderte sich nach dem Deployment nichts.
Bis mir dann auffiel dass ich vor dem Deployment ja auch noch mit tsc nach JS kompilieren muss...

Nachdem nun auch app.js aktuell war, tat sich trotzdem nichts. Neu hinzugefügte Log Meldungen in app.js waren nicht sichtbar.
In der Beanstalk Console kann man die Application auswählen und dann mit Klick auf Source sich ein ZIP des Deployment herunterladen. Und da sieht man tatsächlich dass er weiterhin die app.js ohne die neue Express Port env var verwendet. Warum?

Als nächstes habe ich meiner Verzweiflung die Änderungen committet und neu deployt. Und das hat tatsächlich den Unterschied gemacht.

#### Health check

Die Anwendung erhielt den Health status "Severe". Ursache sind 302 (redirect) health check Responses wo 2xx erwartet wurden. Vermutlich haben diese 302 responses damit zu tun dass ich noch kein Server Zertifikat eingerichtet habe.

In MC / EC2 / Load Balancer / Target Groups / Health checks / Edit / Advanced habe ich den erwarteten Status code auf 302 geändert.

#### Stoppen der Anwendung

Unter MC / EC2 / Instances / Instance selektieren / Instance state habe ich die Instanz gestoppt und das Ergebnis auch im Browser geprüft.
Am nächsten lief die Instanz allerdings wieder.

#### HTTPS

Die Anwendung läuft aktuell mit HTTP. Auch wenn ich keine Domain gekauft habe, müsste ich sein selbst-signiertes Zertifikat einsetzen können.
Orientiert habe ich mich an dieser Beschreibung: https://docs.aws.amazon.com/de_de/elasticbeanstalk/latest/dg/configuring-https-ssl.html.
Ich habe getestet das openssl vorhanden ist.

```
openssl version 
```

```
eb ssh
```
Hier kam die Meldung: ERROR: This environment is not set up for SSH. Use "eb ssh --setup" to set up SSH for the environment.

```
eb ssh --setup
```
Damit habe ich dann offenbar SSH für die Instanz eingererichtet. Es wurde eine neue Instanz erstellt und danach funktionierte die App nach außen wie vorher

Dann habe ich wie hier beschrieben ein selbst-signiertes Zertifikat erstellt: https://docs.aws.amazon.com/de_de/elasticbeanstalk/latest/dg/configuring-https-ssl.html.

Und dann wie hier beschrieben hochgeladen: https://docs.aws.amazon.com/de_de/elasticbeanstalk/latest/dg/configuring-https-ssl-upload.html.
Dazu hatte ich zunächst per apt den AWS Client installiert und als Credentials den Beanstalk Access-Key verwendet.

Dann habe ich unter Beanstalk / Configure instance traffic and scaling / Load Balancer  einen HTTPS Listern hinzugeügt. Das eben hochgeladene Zertifikat wurde dort zur Auswahl angeboten. Danach das "apply" auf der ganzen Seite nicht vergessen!

Danach war die Apps per HTTPS erreichbar. Im Browser kam natürlich die Warnung wg. dem selbst-signierten Zertifkat.