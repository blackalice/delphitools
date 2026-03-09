"use client";

import * as React from "react";

export const VISUAL_EFFECTS_PLACEHOLDER_IMAGE_URL = "/pickles.jpg";
export const VISUAL_EFFECTS_PLACEHOLDER_IMAGE_NAME = "pickles";

type SharedVisualEffectImage = {
  sourceUrl: string;
  baseName: string;
  imageSize: {
    width: number;
    height: number;
  };
};

type VisualEffectsContextValue = {
  sharedImage: SharedVisualEffectImage;
  setSharedImage: (image: SharedVisualEffectImage) => void;
  resetSharedImage: () => void;
};

const PLACEHOLDER_IMAGE: SharedVisualEffectImage = {
  sourceUrl: VISUAL_EFFECTS_PLACEHOLDER_IMAGE_URL,
  baseName: VISUAL_EFFECTS_PLACEHOLDER_IMAGE_NAME,
  imageSize: {
    width: 0,
    height: 0,
  },
};

const VisualEffectsContext =
  React.createContext<VisualEffectsContextValue | null>(null);

export function VisualEffectsProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sharedImage, setSharedImageState] =
    React.useState<SharedVisualEffectImage>(PLACEHOLDER_IMAGE);

  const setSharedImage = React.useCallback((image: SharedVisualEffectImage) => {
    setSharedImageState(image);
  }, []);

  const resetSharedImage = React.useCallback(() => {
    setSharedImageState(PLACEHOLDER_IMAGE);
  }, []);

  return (
    <VisualEffectsContext.Provider
      value={{ sharedImage, setSharedImage, resetSharedImage }}
    >
      {children}
    </VisualEffectsContext.Provider>
  );
}

export function useVisualEffectsImage() {
  const context = React.useContext(VisualEffectsContext);

  if (!context) {
    throw new Error(
      "useVisualEffectsImage must be used within a VisualEffectsProvider."
    );
  }

  return context;
}
