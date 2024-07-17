# AWS

## AWS Elastic Beanstalk

Nach meinem Verständnis kann Cyclic nur AWS Elastic Beanstalk (EB) verwendet haben für sein Auto-Deployment.
Jedenfalls ist EB der einzige AWS service wo ich erkennen könnte, dass man da einfach seine bestehende nodejs app einfach einfach deployen kann ohne manuellen Konfigurationsaufwand.

Auf Youtube findet man Tutorials die zeigen wie man eine Beanstalk Application in der AWS Management Konsole einrichtet. Nur verwendeten die bisher alle die dort angebotene AWS Beispiel App und keine eigene.

Man kann eine eigene App hochladen, aber bisher ist mir nicht klar, wie man das Upload Paket richtig erstellt.

Bei der Recherche bin ich dann gestoßen auf https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/nodejs-quickstart.html.
Nach einer Installationsorgie, die hier startet: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html und installiert:
- pyenv
- Python 3.11 (3.12 nicht unterstützt)
- virtualenv
- eb-cli

habe ich dann versuche die hier beschriebene https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/nodejs-quickstart.html Beispiel App auf EB zum Laufen zu bringen

Ich kann "eb init -p node.js nodejs-tutorial --region us-east-2" erfolgreich ausführen. Da werden dann aws-access-id und aws-secret-key abgefragt. Die muss ich mir erst noch besorgen.