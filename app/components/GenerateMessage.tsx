export type GenerateMessageState = {
  kind: "success" | "error";
  text: string;
};

/**
 * Result of the last Generate attempt. Errors use role="alert" so screen
 * readers announce them straight away; success is a polite status update.
 */
export default function GenerateMessage({
  message,
}: {
  message: GenerateMessageState | null;
}) {
  if (!message) return null;

  const isError = message.kind === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={`max-w-xl text-center text-sm font-medium ${
        isError
          ? "text-red-700 dark:text-red-400"
          : "text-green-800 dark:text-green-400"
      }`}
    >
      {message.text}
    </p>
  );
}
