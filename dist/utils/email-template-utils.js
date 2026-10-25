"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveReminderTemplate = exports.getReminderTemplate = exports.renderTemplate = exports.DEFAULT_REMINDER_TEMPLATES = exports.TEMPLATE_PLACEHOLDERS = void 0;
const EmailTemplate_1 = require("../models/EmailTemplate");
/**
 * Placeholders that are replaced per recipient when a reminder mailing is sent.
 */
exports.TEMPLATE_PLACEHOLDERS = [
    "firstName",
    "lastName",
    "scoreName",
    "scoreIds",
];
/**
 * Built-in texts, used until an admin saves an own version and available as
 * "reset" on the reminder pages.
 */
exports.DEFAULT_REMINDER_TEMPLATES = {
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
function renderTemplate(template, context) {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => Object.prototype.hasOwnProperty.call(context, key) ? context[key] : match);
}
exports.renderTemplate = renderTemplate;
/**
 * Returns the stored template or, if none has been saved yet, the built-in text.
 */
function getReminderTemplate(key) {
    return __awaiter(this, void 0, void 0, function* () {
        const stored = yield EmailTemplate_1.EmailTemplate.findOne({ key }).lean();
        if (stored && stored.subject && stored.html) {
            return { subject: stored.subject, html: stored.html };
        }
        return exports.DEFAULT_REMINDER_TEMPLATES[key];
    });
}
exports.getReminderTemplate = getReminderTemplate;
function saveReminderTemplate(key, template, updatedBy) {
    return __awaiter(this, void 0, void 0, function* () {
        yield EmailTemplate_1.EmailTemplate.updateOne({ key }, {
            $set: {
                subject: template.subject,
                html: template.html,
                updatedAt: new Date(),
                updatedBy,
            },
        }, { upsert: true });
    });
}
exports.saveReminderTemplate = saveReminderTemplate;
