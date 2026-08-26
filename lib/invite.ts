import { Share } from "react-native";

import { APP_NAME } from "@/constants";

/**
 * Where an invite points people. Empty until the app is actually listed — a
 * dead link in an invite is worse than no link, so the message just leaves it
 * out until there's something real to fill in here.
 */
const INVITE_LINK = "";

/**
 * Opens the system share sheet with an invite. Whatever the person picks —
 * Messages, WhatsApp, mail — is up to them; we only supply the text.
 *
 * The username matters: friends are found by username and nothing else, so an
 * invite without one lands someone in an app with no way to reach the person
 * who invited them.
 */
export async function shareInvite(username?: string): Promise<void> {
  // A share sheet carries plain text — SMS and iMessage have no bold to give
  // it. The username stands out by sitting alone on its own line instead,
  // which also keeps it exactly as typed: rendering it in the unicode bold
  // alphabet would look bold but paste into search as different characters
  // and match nobody.
  const message = [
    `i'm sending hugs on ${APP_NAME} 🤗`,
    username ? `\nadd me — my username is:\n${username}\n` : undefined,
    INVITE_LINK || undefined,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await Share.share({ message });
  } catch (err) {
    // A dismissed sheet resolves normally; this is a real failure to open it.
    console.error("Couldn't open the invite share sheet", err);
  }
}
