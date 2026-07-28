const THEME_INIT_SCRIPT = `
(function () {
  try {
    var match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
    var stored = match ? decodeURIComponent(match[1]) : null;
    var isDark =
      stored === "dark" ||
      (stored !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  } catch (e) {}
})();
`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
