import { FileQuestion } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks';

export default function NotFoundPage() {
  const navigate = useNavigate();
  usePageTitle('404 Not Found');

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <FileQuestion className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">404</h1>
        <p className="mt-2 text-sm text-gray-600">The page you're looking for doesn't exist.</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-6 inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Back to Dashboard
        </button>
      </div>
    </section>
  );
}
