# Huggers 🫂

A small iOS/Android app for sending hugs to the people you love.

A hug is a little postcard: a photo you take (or pick), a note, a background
colour, and some hearts. You send it to a friend, they open it with an
animated reveal, and they can hug you back in a short thread. That's the
whole app.

## What it does

- **Send a hug** — snap or pick a photo, drop text on it in the postcard
  editor, choose a backdrop, and send it to a friend. Optionally keep a copy
  in your camera roll.
- **Open a hug** — incoming hugs are revealed with a 3D/Skia animation
  (arms, hearts, a face seal) and land in a timeline of everything you've
  sent and received.
- **Hug back** — reply to a hug with a few short notes, so each hug becomes a
  small back-and-forth thread.
- **Friends** — search people by username, send and accept friend requests,
  see per-friend stats and a memory lane of every hug you've exchanged, and
  block or remove people.
- **Your profile** — an avatar (drawn or a photo of you), hug stats, streaks
  and settings.
- Push notifications for new hugs, hug backs, friend requests and hug-room
  invites.

## Stack

- [Expo](https://expo.dev) (SDK 55) + React Native, Expo Router with file-based,
  typed routes and native tabs
- Firebase — Auth (Apple, Google, anonymous), Firestore for users/hugs/friends,
  Realtime Database for hug rooms, Storage for photos, and Cloud Functions
  (`functions/`) for notifications, friend requests, blocking, search and
  account deletion
- Skia, three.js / react-three-fiber and Reanimated for the hug animations
- Zustand for local drafts and client state

## Layout

| Path          | What's in it                                                         |
| ------------- | -------------------------------------------------------------------- |
| `app/`        | Screens and routes (`(tabs)/` is the main tab bar)                   |
| `components/` | UI — `hug/`, `postcard/`, `avatar/`, and the `squish/` design system |
| `hooks/`      | Data hooks over Firebase (hugs, friends, user, hug room)             |
| `lib/`        | Firebase config and the write/read logic per feature                 |
| `functions/`  | Firebase Cloud Functions                                             |

## Running it

The app uses native modules (camera, Apple sign-in, notifications, WebGPU), so
it needs a development build — Expo Go won't run it.

```bash
npm install
npx expo run:ios --device     # or: npx expo run:android
```

After the first native build, `npx expo start` is enough for day-to-day work.
Firebase config lives in `lib/firebaseConfig.ts` and `GoogleService-Info.plist`.
