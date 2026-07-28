import ThemeToggle from "../components/ThemeToggle";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        Settings
      </h1>
      <p className="mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
        Choose how the builder looks. Your preference is saved in a cookie
        and remembered the next time you visit.
      </p>

      <div className="mt-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <ThemeToggle />
      </div>
    </div>
  );
}
