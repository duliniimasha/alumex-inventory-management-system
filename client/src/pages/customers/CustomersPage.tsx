import { usePageTitle } from '../../hooks';

export default function CustomersPage() {
  usePageTitle('Customers');

  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-xl bg-white px-8 py-10 text-center shadow-sm">
        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          Coming soon
        </span>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Customers</h1>
        <p className="mt-2 text-sm text-gray-600">This section is under construction.</p>
      </div>
    </section>
  );
}
