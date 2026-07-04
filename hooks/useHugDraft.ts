import { create } from "zustand";

type HugDraftState = {
  note: string;
  photoUri: string | undefined;
  toName: string;
  to: string;
  setTo: (id: string) => void;
  setToName: (toName: string) => void;
  setNote: (note: string) => void;
  setPhotoUri: (uri: string | undefined) => void;
  reset: () => void;
};

export const useHugDraft = create<HugDraftState>((set) => ({
  note: "",
  photoUri: undefined,
  to: "",
  toName: "",
  setTo: (to) => set({ to }),
  setToName: (toName) => set({ toName }),
  setNote: (note) => set({ note }),
  setPhotoUri: (photoUri) => set({ photoUri }),
  reset: () => set({ note: "", photoUri: undefined }),
}));
