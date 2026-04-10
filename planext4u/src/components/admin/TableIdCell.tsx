import { cn } from "@/lib/utils";
import { formatDisplayId } from "@/lib/format-display-id";

type Props = {
  value: string | null | undefined;
  className?: string;
};

/**
 * Compact ID for admin tables; hover shows full identifier.
 */
export function TableIdCell({ value, className }: Props) {
  if (value == null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  const display = formatDisplayId(value);
  return (
    <span
      className={cn(
        "font-mono text-xs tabular-nums text-muted-foreground tracking-tight",
        className,
      )}
      title={value}
    >
      {display}
    </span>
  );
}
