/**
 * Syncs the user's font-size preference from the server to the root HTML element.
 */
import { useEffect } from "react";
import { useUserQuery } from "@/hooks/useUser";

/** Syncs server-side font_size preference to the <html> element class. */
export function FontSizeSync() {
  const { data: user } = useUserQuery();
  const fontSize = user?.font_size;

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("font-large", "font-xl");
    if (fontSize === "large") html.classList.add("font-large");
    else if (fontSize === "xl") html.classList.add("font-xl");
  }, [fontSize]);

  return null;
}
