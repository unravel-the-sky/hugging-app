/**
 * The app's display name, wherever it's shown to someone.
 *
 * Not the same thing as the identifiers that happen to share the wording:
 * `app.json`'s `slug`, the Firebase project id and the npm package name are
 * infrastructure and must not follow a rename. `app.json`'s `name` is the
 * name of the installed binary and Expo reads it before any of this, so that
 * one still has to be changed by hand alongside this.
 */
export const APP_NAME = "Huggers";

export const ARM_WIDTH = 140;
export const FANCY_ARM_WIDTH = 100;
export const ARM_HEIGHT = 20;
export const LEFT_SHOULDER_OFFSET = 15;
export const RIGHT_SHOULDER_OFFSET = 16;
export const BUTTON_SIZE = 96;

export const MAIN_COLOR = "#FF9C6B";
export const STROKE_COLOR = "#E08A5F";
export const HAIR_COLOR = "#7F440D";
export const DARK_HAIR_COLOR = "#2D2D2D";
export const DARK_FACIAL_HAIR = "#323232";

/**
 * The hosted legal pages and the support address.
 *
 * These live here rather than next to the sign-in screen because App Review
 * wants them reachable from inside the app too, not only before signing in
 * (5.1.1(i) for the privacy policy, 1.2 for a way to reach a human). The
 * sign-in screen and the account sheet both read them from here.
 */
export const TERMS_URL =
  "https://doc-hosting.flycricket.io/hugger-terms-of-use/7a654a94-4d94-4a47-8dff-120ab2f6d2e8/terms";
export const PRIVACY_URL =
  "https://doc-hosting.flycricket.io/hugger-privacy-policy/f20fe71c-72a2-460d-8414-11fdc17fc168/privacy";
export const SUPPORT_EMAIL = "sekdemir@gmail.com";
