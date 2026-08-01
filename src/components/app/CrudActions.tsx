import { Archive, Pencil, Share2, Trash2 } from "lucide-react";

type CrudActionsProps = {
  onEdit?: () => void;
  onArchive?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  archiveLabel?: string;
  disabled?: boolean;
  className?: string;
};

const base =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-45";

export function CrudActions({
  onEdit,
  onArchive,
  onShare,
  onDelete,
  archiveLabel = "Archive",
  disabled = false,
  className = "",
}: CrudActionsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className={`${base} border-border bg-ivory/85 text-foreground hover:bg-white`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      )}
      {onArchive && (
        <button
          type="button"
          onClick={onArchive}
          disabled={disabled}
          className={`${base} border-olive/25 bg-olive/5 text-olive hover:bg-olive/10`}
        >
          <Archive className="h-3.5 w-3.5" />
          {archiveLabel}
        </button>
      )}
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          disabled={disabled}
          className={`${base} border-sky/30 bg-sky/10 text-foreground hover:bg-sky/15`}
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className={`${base} border-sky/40 bg-sky/10 text-sky hover:bg-sky/15`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      )}
    </div>
  );
}
