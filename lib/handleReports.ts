import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebaseConfig";

/**
 * Reporting is server-side for the same reason blocking is: the `reports`
 * collection is unreadable from the client, so the only way in is this
 * callable. Nobody can read back what was reported about them, or by whom.
 *
 * The reported content is snapshotted by the server at report time. That
 * matters because blocking purges every hug between the pair — see
 * `reportContent` in functions/src/index.ts. Report first, block second.
 */

/** Kept in lockstep with `REPORT_REASONS` in functions/src/index.ts. */
export const REPORT_REASONS = [
  "harassment",
  "sexual",
  "hate",
  "spam",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/** What each reason says on the sheet. */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: "Harassment or bullying",
  sexual: "Nudity or sexual content",
  hate: "Hate speech",
  spam: "Spam or a scam",
  other: "Something else",
};

export type ReportInput = {
  /** Who is being reported. */
  reportedId: string;
  /**
   * The hug this is about, when there is one. The server copies its contents
   * into the report, so a later block cannot erase what was reported.
   */
  hugId?: string;
  reason: ReportReason;
  /** Optional free text from the reporter, trimmed to 500 chars server-side. */
  note?: string;
};

const reportContentFn = httpsCallable(getFunctions(app), "reportContent");

/** Files a report. Throws so the UI can show the failure. */
export const reportContent = async (input: ReportInput): Promise<void> => {
  await reportContentFn(input);
};
