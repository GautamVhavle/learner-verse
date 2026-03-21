/**
 * Syncs the user's font-size preference from the server to the root HTML element.
 */
import { useEffect } from "react";
import { useUserQuery } from "@/hooks/useUser";

/** Syncs server-side font_size preference to the <html> element class. */
export function FontSizeSync() {
  const { data: user } = useUserQuery();

  useEffect(() => {
    if (!user) return;
    const html = document.documentElement;
    html.classList.remove("font-large", "font-xl");
    if (user.font_size === "large") html.classList.add("font-large");
    else if (user.font_size === "xl") html.classList.add("font-xl");
  }, [user?.font_size]);

  return null;
}
