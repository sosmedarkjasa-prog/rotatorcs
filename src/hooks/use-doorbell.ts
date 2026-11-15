import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/**
 * Listens for the data-free "something changed" ping from the database and calls onRing.
 * Data is always re-fetched through the protected server, never sent over this channel.
 */
export function useDoorbell(onRing: () => void) {
  const [live, setLive] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("wa-rotator-doorbell")
      .on("broadcast", { event: "changed" }, () => {
        clearTimeout(timer);
        timer = setTimeout(onRing, 250);
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // onRing is expected to be stable (wrap in useCallback)
  }, [onRing]);

  return live;
}
