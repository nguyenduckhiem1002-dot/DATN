import { lazy, Suspense, type ReactNode } from "react";

import { CommandPaletteButton } from "./command-palette-button";
import {
  CommandPaletteProvider as CommandPaletteProviderComponent,
  useCommandPalette,
  useCommandPaletteSafe,
} from "./command-palette-context";

const LazyCommandPalette = lazy(() =>
  import("./command-palette").then((module) => ({
    default: module.CommandPalette,
  }))
);

export { CommandPaletteButton, useCommandPalette, useCommandPaletteSafe };
export const CommandPaletteProvider = CommandPaletteProviderComponent;

/**
 * Public standalone export. Keeps the previous API while placing the heavy
 * Fuse/cmdk implementation behind a separate chunk.
 */
export function CommandPalette() {
  return (
    <Suspense fallback={<CommandPaletteLoading />}>
      <LazyCommandPalette />
    </Suspense>
  );
}

function CommandPaletteLoading() {
  return (
    <div
      className="fixed inset-0 z-[999] flex items-start justify-center bg-gray-900/20 pt-[18vh]"
      role="status"
      aria-live="polite"
    >
      <div className="rounded bg-white px-4 py-3 text-sm text-gray-600 shadow-lg">
        Đang mở tìm kiếm...
      </div>
    </div>
  );
}

function CommandPaletteWhenOpen() {
  const { open } = useCommandPalette();

  if (!open) {
    return null;
  }

  return <CommandPalette />;
}

export function CommandPaletteRoot({ children }: { children: ReactNode }) {
  return (
    <CommandPaletteProviderComponent>
      {children}
      <CommandPaletteWhenOpen />
    </CommandPaletteProviderComponent>
  );
}
