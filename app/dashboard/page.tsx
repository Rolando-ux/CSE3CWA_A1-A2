import DashboardView from "../components/dashboard/DashboardView";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          How the activity builder is being used, how many Wordle and Word
          Search activities have been generated, and whether the system is
          healthy.
        </p>
      </div>

      <DashboardView />
    </div>
  );
}
