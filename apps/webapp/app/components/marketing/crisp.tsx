import { useEffect } from "react";
import { config } from "~/config/shelf.config";
import { useUserData } from "~/hooks/use-user-data";
import { resolveUserDisplayName } from "~/utils/user";
import type { HTMLButtonProps } from "../shared/button";
import { Button } from "../shared/button";

/**
 * Crisp is a SaaS support widget and is deliberately disabled for the internal
 * Casla Assets deployment. Dynamic import keeps its SDK out of the main bundle
 * for normal Casla users.
 */
export function useCrisp() {
  const user = useUserData();

  useEffect(() => {
    if (config.internalMode || !window.env.CRISP_WEBSITE_ID) return;

    let cancelled = false;
    void import("crisp-sdk-web").then(({ Crisp }) => {
      if (cancelled) return;
      Crisp.configure(window.env.CRISP_WEBSITE_ID, { autoload: false });
      if (!user) return;
      Crisp.user.setEmail(user.email);
      Crisp.user.setNickname(
        `${resolveUserDisplayName(user)} (${user.username}) `
      );
    });

    return () => {
      cancelled = true;
    };
  }, [user]);
}

export const CrispButton = (props: Omit<HTMLButtonProps, "type">) => (
  <Button
    {...props}
    onClick={() => {
      if (config.internalMode) return;
      void import("crisp-sdk-web").then(({ Crisp }) => Crisp.chat.open());
    }}
    type="button"
  >
    {props.children}
  </Button>
);
