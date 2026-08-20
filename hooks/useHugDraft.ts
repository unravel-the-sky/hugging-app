import { create } from "zustand";

type HugDraftState = {
  note: string;
  photoUri: string | undefined;
  /** hex picked from the postcard's own palette in the editor */
  backgroundColor: string | undefined;
  toName: string;
  to: string;
  setTo: (id: string) => void;
  setToName: (toName: string) => void;
  setNote: (note: string) => void;
  setPhotoUri: (uri: string | undefined) => void;
  setBackgroundColor: (hex: string | undefined) => void;
  reset: () => void;
  resetAll: () => void;
};

const initialState = {
  note: "",
  photoUri: undefined,
  backgroundColor: undefined,
  to: "",
  toName: "",
};

export const useHugDraft = create<HugDraftState>((set) => ({
  ...initialState,
  setTo: (to) => set({ to }),
  setToName: (toName) => set({ toName }),
  setNote: (note) => set({ note }),
  setPhotoUri: (photoUri) => set({ photoUri }),
  setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
  resetAll: () => set(initialState),
  reset: () =>
    set({ note: "", photoUri: undefined, backgroundColor: undefined }),
}));
