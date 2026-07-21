/**
 * avatarPhoto.ts — photo avatar processing + upload
 *
 * Thumbnails are generated client-side on purpose: they exist the
 * instant the upload finishes, and cleanup is trivial because we know
 * exactly which two objects exist per photo.
 */

import { auth, db, storage } from "@/lib/firebaseConfig";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc } from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { Image } from "react-native";

const MAIN_SIZE = 512; // covers the largest render (~160pt @3x ≈ 480px)
const THUMB_SIZE = 96; // friend rows, hug timeline, small chips

export interface PreviousPhotoPaths {
  photoPath?: string;
  photoThumbPath?: string;
}

export interface PhotoAvatarResult {
  photoURL: string;
  photoThumbURL: string;
}

const getPixelSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject),
  );

/** Center-crop to square, resize, save as JPEG. Context API — same as media.tsx. */
async function centerSquareJpeg(uri: string, target: number, compress: number) {
  const { width, height } = await getPixelSize(uri);
  const side = Math.min(width, height);

  const context = ImageManipulator.ImageManipulator.manipulate(uri)
    .crop({
      originX: Math.round((width - side) / 2),
      originY: Math.round((height - side) / 2),
      width: side,
      height: side,
    })
    .resize({ width: target, height: target });

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return saved.uri;
}

export async function uploadJpeg(localUri: string, storagePath: string) {
  const blob = await (await fetch(localUri)).blob();
  const objectRef = ref(storage, storagePath);
  await uploadBytes(objectRef, blob, {
    contentType: "image/jpeg",
    // timestamped filenames never change content
    cacheControl: "public,max-age=31536000,immutable",
  });
  return getDownloadURL(objectRef);
}

/**
 * Core pipeline: takes an already-captured/picked image URI.
 * Call this from the avatar camera route's confirm step, or from
 * pickAvatarFromLibrary below.
 */
export async function saveAvatarPhoto(
  uri: string,
  previous?: PreviousPhotoPaths,
): Promise<PhotoAvatarResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  const [mainUri, thumbUri] = await Promise.all([
    centerSquareJpeg(uri, MAIN_SIZE, 0.8),
    centerSquareJpeg(uri, THUMB_SIZE, 0.7),
  ]);

  // New filename every upload → new download URL → expo-image cache
  // busts naturally, and the immutable cache header above stays correct.
  const ts = Date.now();
  const photoPath = `avatars/${uid}/${ts}.jpg`;
  const photoThumbPath = `avatars/${uid}/${ts}_thumb.jpg`;

  const [photoURL, photoThumbURL] = await Promise.all([
    uploadJpeg(mainUri, photoPath),
    uploadJpeg(thumbUri, photoThumbPath),
  ]);

  await updateDoc(doc(db, "users", uid), {
    avatar: "photo",
    photoURL,
    photoThumbURL,
    photoPath,
    photoThumbPath,
    photoUpdatedAt: ts,
  });

  // Replace = delete the old pair, best effort. Orphans are also caught
  // by the account-deletion function's prefix delete.
  for (const p of [previous?.photoPath, previous?.photoThumbPath]) {
    if (p) deleteObject(ref(storage, p)).catch(() => {});
  }

  return { photoURL, photoThumbURL };
}

/**
 * Library path: picker (with its native crop UI, matching your
 * take-pic.tsx pattern) → same pipeline. Returns null on cancel.
 */
export async function pickAvatarFromLibrary(
  previous?: PreviousPhotoPaths,
): Promise<PhotoAvatarResult | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1, // compress happens in the resize step
  });
  if (res.canceled || !res.assets[0]?.uri) return null;
  return saveAvatarPhoto(res.assets[0].uri, previous);
}
