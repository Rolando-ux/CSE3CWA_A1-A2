import { STUDENT_NAME, STUDENT_NUMBER } from "../nav-links";

export default function Footer() {
  const today = new Date().toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <footer className="border-t border-zinc-200 bg-white px-4 py-4 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400 sm:px-6">
      <p>
        &copy; {new Date().getFullYear()} {STUDENT_NAME}, Student No.{" "}
        {STUDENT_NUMBER} &mdash; {today}
      </p>
    </footer>
  );
}
