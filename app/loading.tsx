export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 pt-6" aria-busy="true">
      <div className="h-8 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
