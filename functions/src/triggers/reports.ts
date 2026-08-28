/* -------------------------------------------------------------------- */
/* Report notification                                                  */
/* -------------------------------------------------------------------- */

import { getStorage } from "firebase-admin/storage";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import fetch from "node-fetch";

/**
 * Where report emails go, and who they come from.
 *
 * Sent through Resend's HTTP API rather than the Firebase Trigger Email
 * extension: Firebase Extensions is deprecated and shuts down on
 * 2027-03-31, so a moderation path that has to outlive that date can't
 * depend on it.
 *
 * `REPORT_FROM_EMAIL` defaults to Resend's shared testing sender, which works
 * with no domain set up but only delivers to the address that owns the Resend
 * account. Point it at your own verified domain to send anywhere else.
 */
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const REPORT_EMAIL = defineString("REPORT_EMAIL");
const REPORT_FROM_EMAIL = defineString("REPORT_FROM_EMAIL", {
  default: "Hugger reports <onboarding@resend.dev>",
});

/** Report content is written by users, and this ends up in an HTML email. */
const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * A link to the reported photo that works from an inbox. Seven days is the
 * maximum a v4 signed URL allows, and is long enough to act well inside the
 * 24 hours App Review expects for egregious content.
 */
async function signedImageUrl(imagePath: string): Promise<string | null> {
  try {
    const [url] = await getStorage()
      .bucket()
      .file(imagePath)
      .getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
    return url;
  } catch (err) {
    console.error("Could not sign reported image", imagePath, err);
    return null;
  }
}

/**
 * Emails a new report to whoever moderates. The report document is already
 * safely written by the time this runs, so a failure here is logged and
 * swallowed: throwing would retry the send, not improve the record.
 */
export const onReportCreated = onDocumentCreated(
  { document: "reports/{reportId}", secrets: [RESEND_API_KEY] },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const to = REPORT_EMAIL.value();
    if (!to) {
      console.error("REPORT_EMAIL is unset — report email not sent");
      return;
    }

    const report = snap.data();
    const content = (report.content ?? null) as Record<string, any> | null;

    const imageUrl = content?.imagePath
      ? await signedImageUrl(content.imagePath as string)
      : null;

    const thread = Array.isArray(content?.hugBacks) ? content.hugBacks : [];

    const html = `
      <h2>New report: ${escapeHtml(report.reason)}</h2>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td><b>Report</b></td><td>${escapeHtml(event.params.reportId)}</td></tr>
        <tr><td><b>Reported</b></td><td>${escapeHtml(report.reportedName)} (${escapeHtml(report.reported)})</td></tr>
        <tr><td><b>Reporter</b></td><td>${escapeHtml(report.reporter)}</td></tr>
        <tr><td><b>Hug</b></td><td>${escapeHtml(report.hugId ?? "— reported the person, not a hug")}</td></tr>
      </table>

      ${
        report.note
          ? `<h3>What the reporter said</h3><p>${escapeHtml(report.note)}</p>`
          : ""
      }

      ${
        content
          ? `<h3>Reported hug</h3>
             <p><b>Note:</b> ${escapeHtml(content.note) || "<i>none</i>"}</p>
             ${
               imageUrl
                 ? `<p><b>Photo</b> (link expires in 7 days):<br>
                    <a href="${imageUrl}">${escapeHtml(content.imagePath)}</a><br>
                    <img src="${imageUrl}" style="max-width:320px" alt=""></p>`
                 : ""
             }
             ${
               thread.length
                 ? `<p><b>Thread:</b></p><ul>${thread
                     .map(
                       (t: any) =>
                         `<li>${escapeHtml(t.from)}: ${escapeHtml(t.note)}</li>`,
                     )
                     .join("")}</ul>`
                 : ""
             }`
          : "<p><i>No hug was attached to this report.</i></p>"
      }

      <hr>
      <p style="color:#666;font-size:12px">
        Act within 24 hours for anything egregious. Firestore →
        <code>reports/${escapeHtml(event.params.reportId)}</code> → set
        <code>status</code> to <code>actioned</code> or <code>dismissed</code>.
      </p>
    `;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: REPORT_FROM_EMAIL.value(),
          to,
          // The app dropped its reason picker, so nearly every report arrives
          // as "other" and the subject would carry no signal. What the
          // reporter wrote is the report — put a slice of it in the subject.
          subject: `[report] ${report.reportedName ?? report.reported} — ${
            report.note
              ? String(report.note).replace(/\s+/g, " ").slice(0, 60)
              : report.reason
          }`,
          html,
        }),
      });

      if (!res.ok) {
        console.error(
          "Resend rejected the report email",
          res.status,
          await res.text(),
        );
      }
    } catch (err) {
      // The report is stored either way; losing the email must not lose it.
      console.error("Could not send report email", err);
    }
  },
);
