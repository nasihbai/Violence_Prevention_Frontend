import type { Severity, IncidentStatus } from "@/types/alerts";

/**
 * Single source of truth for severity / status badge styling.
 *
 * Token-based (warning/success/destructive/muted map to the Planix palette in
 * both light and dark), so badges stay legible across themes. Pass the returned
 * string to a <Badge :class="..."> — it merges over the Badge variant.
 */

const SEVERITY_BADGE: Record<Severity, string> = {
  low: "bg-muted text-muted-foreground border border-border hover:bg-muted",
  medium:
    "bg-warning/15 text-warning border border-warning/30 hover:bg-warning/15",
  high:
    "bg-accent/15 text-accent-strong border border-accent/30 hover:bg-accent/15",
  critical:
    "bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive/20",
};

const STATUS_BADGE: Record<IncidentStatus, string> = {
  open: "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/15",
  investigating:
    "bg-warning/15 text-warning border border-warning/30 hover:bg-warning/15",
  resolved:
    "bg-success/15 text-success border border-success/30 hover:bg-success/15",
  false_positive:
    "bg-muted text-muted-foreground border border-border hover:bg-muted",
};

export function severityBadgeClass(severity: Severity): string {
  return SEVERITY_BADGE[severity];
}

export function statusBadgeClass(status: IncidentStatus): string {
  return STATUS_BADGE[status];
}
