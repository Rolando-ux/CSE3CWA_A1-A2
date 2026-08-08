import { STUDENT_NAME, STUDENT_NUMBER } from "../nav-links";

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
        About
      </h1>

      <p className="mt-6 max-w-2xl text-zinc-600 dark:text-zinc-400">
        The Phoneme Activity Builder is a frontend tool for Speech Pathology
        teachers to create phoneme-based classroom activities. This is
        Assessment 1 of the project and is frontend only - it does not yet
        support a database or dynamic word-list management, both of which
        will be introduced in later assessments.
      </p>

      <div className="mt-6 max-w-2xl space-y-4 text-left text-zinc-600 dark:text-zinc-400">
        <p>
          <strong className="text-zinc-950 dark:text-zinc-50">Wordle</strong>{" "}
          - lets a teacher configure a single phoneme-based word, preview it
          as a playable Wordle-style guessing game with phoneme hints, and
          download it as a standalone HTML activity.
        </p>
        <p>
          <strong className="text-zinc-950 dark:text-zinc-50">
            Word Search
          </strong>{" "}
          - lets a teacher generate a word search from a small list of
          phoneme-based words and download it as a standalone HTML activity.
        </p>
      </div>

      <p className="mt-8 text-zinc-700 dark:text-zinc-300">{STUDENT_NAME}</p>
      <p className="text-zinc-700 dark:text-zinc-300">
        Student No. {STUDENT_NUMBER}
      </p>

      <div className="mt-6 w-full max-w-2xl">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Video walkthrough
        </h2>
        <video
          controls
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800"
        >
          <source src="/about-video.mp4" type="video/mp4" />
          Your browser does not support embedded video. The walkthrough file
          is included separately in the project submission.
        </video>
      </div>
    </div>
  );
}
