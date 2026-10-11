import type { PropsWithChildren, ReactNode } from "react";
import { cn } from "../../lib/utils";

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}>;

export function SectionCard({
  title,
  description,
  action,
  className,
  children,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-borderSoft bg-surface shadow-panel",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-borderSoft px-4 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-textMain">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-textMuted">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="px-4 py-5 sm:px-6">{children}</div>
    </section>
  );
}
