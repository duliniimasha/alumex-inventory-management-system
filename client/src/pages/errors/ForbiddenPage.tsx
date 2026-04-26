import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">403 &mdash; Access Denied</h1>
        <p className="mt-3 text-slate-600">You don't have permission to view this page.</p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 hover:text-slate-900"
        >
          Go back
        </button>
      </section>
    </main>
  );
}
