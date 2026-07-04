interface AppHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, action }: AppHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-slate-100">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
}
