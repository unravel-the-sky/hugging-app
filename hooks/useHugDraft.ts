import { create } from "zustand";

type HugDraftState = {
  note: string;
  photoUri: string | null;
  setNote: (note: string) => void;
  setPhotoUri: (uri: string | null) => void;
  reset: () => void;
};

export const useHugDraft = create<HugDraftState>((set) => ({
  note: "",
  photoUri: null,
  setNote: (note) => set({ note }),
  setPhotoUri: (photoUri) => set({ photoUri }),
  reset: () => set({ note: "", photoUri: null }),
}));
