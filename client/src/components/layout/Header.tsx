interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:border-amber-500 hover:text-amber-700"
          aria-label="Toggle sidebar"
        >
          <span className="text-xl leading-none">☰</span>
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Alumex IMS</p>
          <h1 className="text-base font-semibold text-slate-900">Dashboard</h1>
        </div>
      </div>
      <div className="text-sm text-slate-500">Welcome back</div>
    </div>
  );
}
