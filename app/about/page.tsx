import { STUDENT_NAME, STUDENT_NUMBER } from "../nav-links";

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        About
      </h1>
      <p className="mt-4 text-zinc-700 dark:text-zinc-300">{STUDENT_NAME}</p>
      <p className="text-zinc-700 dark:text-zinc-300">
        Student No. {STUDENT_NUMBER}
      </p>
      <p className="mt-6 max-w-xl text-zinc-600 dark:text-zinc-400">
        A video walkthrough of this website will be embedded here.
      </p>
    </div>
  );
}
