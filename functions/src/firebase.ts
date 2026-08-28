/**
 * The one place the Admin SDK is initialised and the global function options
 * are set. Every other module reaches Firestore through the `db` exported
 * here, which guarantees `initializeApp()` has run before anything uses it.
 */

import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

export const db = admin.firestore();
