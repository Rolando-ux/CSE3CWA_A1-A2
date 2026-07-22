export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        {title}
      </h1>
      <p className="mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
        This page has not been built yet.
      </p>
    </div>
  );
}
