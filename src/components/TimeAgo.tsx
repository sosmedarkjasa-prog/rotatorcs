import { useHydrated } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

/** Relative/absolute times render only after hydration so server and browser time zones never mismatch. */
export function TimeAgo({ date, prefix = "" }: { date: string | null | undefined; prefix?: string }) {
  const hydrated = useHydrated();
  if (!date || !hydrated) return <span>&nbsp;</span>;
  return (
    <span title={format(new Date(date), "d MMM yyyy HH:mm:ss", { locale: localeId })}>
      {prefix}
      {formatDistanceToNow(new Date(date), { addSuffix: true, locale: localeId })}
    </span>
  );
}

export function DateTime({ date }: { date: string | null | undefined }) {
  const hydrated = useHydrated();
  if (!date || !hydrated) return <span>&nbsp;</span>;
  return <span>{format(new Date(date), "d MMM yyyy, HH:mm:ss", { locale: localeId })}</span>;
}
