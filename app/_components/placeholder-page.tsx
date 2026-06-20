type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: PlaceholderPageProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          {eyebrow}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <h1 className="text-3xl font-bold leading-tight text-[var(--foreground)] sm:text-4xl">
              {title}
            </h1>
            <p className="text-base leading-7 text-[var(--muted)]">
              {description}
            </p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
