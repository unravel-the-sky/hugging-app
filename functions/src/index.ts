/**
 * The deployment surface. Firebase discovers functions by the names this
 * module exports, so every trigger and callable has to be re-exported here —
 * the implementations live in `triggers/`, `callables/` and `lib/`.
 *
 * Renaming an export renames the deployed function, which deletes the old one
 * and creates a new one. Keep these names stable.
 */

// Side-effect import: initialises the Admin SDK and the global options before
// any function module runs.
import "./firebase";

export { blockUser, getBlockedUsers, unblockUser } from "./callables/blocks";
export {
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "./callables/friends";
export { reportContent } from "./callables/reports";
export { deleteAccount, searchUsers } from "./callables/users";

export { onFriendshipRequestCreated } from "./triggers/friendships";
export {
  onHugRoomDeleted,
  onHugRoomInvite,
  onInviteStatusChanged,
} from "./triggers/hugRooms";
export { onHugBack, onHugCreated } from "./triggers/hugs";
export { onReportCreated } from "./triggers/reports";
