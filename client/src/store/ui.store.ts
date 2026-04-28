import { create } from 'zustand';

type UiState = {
  isGlobalLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
};

export const useUiStore = create<UiState>((set) => {
  let loadingCount = 0;

  return {
    isGlobalLoading: false,
    startLoading: () => {
      loadingCount += 1;
      if (loadingCount === 1) {
        set({ isGlobalLoading: true });
      }
    },
    stopLoading: () => {
      loadingCount = Math.max(0, loadingCount - 1);
      if (loadingCount === 0) {
        set({ isGlobalLoading: false });
      }
    },
  };
});
