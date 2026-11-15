import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type ActionResult = { ok: boolean };

/** Runs an admin server action with toasts, dashboard refresh, and expired-session handling. */
export function useRunAction() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async <T extends ActionResult>(
      key: string,
      task: () => Promise<T>,
      success?: string | ((result: T) => string),
    ): Promise<T | null> => {
      setPending(key);
      try {
        const result = await task();
        if (result.ok) {
          if (success) toast.success(typeof success === "function" ? success(result) : success);
          await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        } else {
          toast.error((result as { error?: string }).error ?? "Gagal menyimpan");
        }
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("UNAUTHORIZED")) {
          toast.error("Sesi admin habis. Silakan masuk lagi.");
          void navigate({ to: "/" });
        } else {
          toast.error("Terjadi kesalahan. Coba lagi.");
        }
        return null;
      } finally {
        setPending(null);
      }
    },
    [queryClient, navigate],
  );

  return { run, pending };
}
