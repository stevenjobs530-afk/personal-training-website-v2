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
    <section className="page-stack">
      <header className="page-heading">
        <div className="page-heading-copy">
          <p className="page-eyebrow">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
