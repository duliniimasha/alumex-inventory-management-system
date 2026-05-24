import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  path: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
}

export default function PageHeader({ title, subtitle, actions, breadcrumbs = [] }: PageHeaderProps) {
  const trail: Breadcrumb[] = [{ label: 'Home', path: '/' }, ...breadcrumbs];

  return (
    <header className="border-b border-gray-200 pb-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;

          return (
            <div key={`${crumb.label}-${crumb.path}`} className="flex items-center gap-2">
              {isLast ? (
                <span className="font-medium text-gray-600">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="transition-colors hover:text-amber-700">
                  {crumb.label}
                </Link>
              )}

              {!isLast ? <ChevronRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" /> : null}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
        </div>

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}