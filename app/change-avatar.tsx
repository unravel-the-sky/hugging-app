import AvatarPicker from "@/components/avatar/AvatarPicker";
import { router } from "expo-router";
import React from "react";

export default function ChangeAvatarRoute() {
  return (
    <AvatarPicker
      title="choose avatar"
      onSaved={() => router.back()}
      onOpenCamera={() => {
        router.back();
        router.push("/avatar-camera");
      }}
    />
  );
}
