import { EmailTemplate } from "../models/EmailTemplate";

export type ReminderTemplateKey = "early-reminder" | "return-reminder";

export interface ReminderTemplate {
  subject: string;
  html: string;
}

/**
 * Placeholders that are replaced per recipient when a reminder mailing is sent.
 */
export const TEMPLATE_PLACEHOLDERS = [
  "firstName",
  "lastName",
  "scoreName",
  "scoreIds",
];

/**
 * Built-in texts, used until an admin saves an own version and available as
 * "reset" on the reminder pages.
 */
export const DEFAULT_REMINDER_TEMPLATES: Record<
  ReminderTemplateKey,
  ReminderTemplate
> = {
  "early-reminder": {
    subject: `Benötigst du die Leihnoten "{{scoreName}}" vom Hans-Sachs-Chor noch?`,
    html: `
Liebe(r) {{firstName}} {{lastName}},
<p>
Du hast die Noten "{{scoreName}}" mit Nummer {{scoreIds}} vom Hans-Sachs-Chor ausgeliehen.
<p>
Falls Du die Chorproben nicht bis zum Konzert weiterführst, bitte ich Dich, die Noten möglichst bald zurückzugeben, 
damit andere Chormitglieder sie nutzen können, und damit es nach dem Konzert keine Verzögerung bei der Rückgabe der Noten an den Verlag gibt.
<p>
Du kannst auf diese E-Mail antworten um die Rückgabe mit mir abzustimmen!
<p>
Vielen Dank für Deine Kooperation!
<p>
Michael S. (Hans-Sachs-Chor Notenwart)
`,
  },
  "return-reminder": {
    subject: `Rückgabe der Noten "{{scoreName}}" nach dem Konzert`,
    html: `
Liebe(r) {{firstName}} {{lastName}},
<p>
Du hast die Noten "{{scoreName}}" mit HSC-Nummer {{scoreIds}} vom Hans-Sachs-Chor ausgeliehen.
<p>
Nun ist das Konzert vorbei - wir hoffen, es hat Dir Freude bereitet!
<p>
Bitte gib die Noten zeitnah zurück, damit wir sie an den Verlag zurücksenden können.<br>
Bitte radiere vorher Deine Eintragungen aus.
<p>
Du kannst auf diese E-Mail antworten!
<p>
Vielen Dank!
<p>
Michael S. (Hans-Sachs-Chor Notenwart)
`,
  },
};

/**
 * Replace {{placeholder}} occurrences. Unknown placeholders are kept verbatim so
 * that a typo stays visible in the preview instead of silently producing a gap.
 */
export function renderTemplate(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(context, key) ? context[key] : match
  );
}

/**
 * Returns the stored template or, if none has been saved yet, the built-in text.
 */
export async function getReminderTemplate(
  key: ReminderTemplateKey
): Promise<ReminderTemplate> {
  const stored = await EmailTemplate.findOne({ key }).lean();

  if (stored && stored.subject && stored.html) {
    return { subject: stored.subject, html: stored.html };
  }

  return DEFAULT_REMINDER_TEMPLATES[key];
}

export async function saveReminderTemplate(
  key: ReminderTemplateKey,
  template: ReminderTemplate,
  updatedBy?: string
): Promise<void> {
  await EmailTemplate.updateOne(
    { key },
    {
      $set: {
        subject: template.subject,
        html: template.html,
        updatedAt: new Date(),
        updatedBy,
      },
    },
    { upsert: true }
  );
}
