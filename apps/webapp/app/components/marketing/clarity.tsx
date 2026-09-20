import { useEffect } from "react";
import { config } from "~/config/shelf.config";

export const Clarity = () => {
  useEffect(() => {
    if (config.internalMode || !window.env.MICROSOFT_CLARITY_ID) return;

    void import("react-microsoft-clarity").then(({ clarity }) => {
      clarity.init(window.env.MICROSOFT_CLARITY_ID);
    });
  }, []);

  return null;
};
