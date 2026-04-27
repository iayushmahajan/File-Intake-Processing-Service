export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b1220",
        surface: "#111827",
        surfaceSoft: "#172033",
        borderSoft: "#243041",
        textMain: "#e5eefc",
        textMuted: "#94a3b8",
        accent: "#3b82f6",
        accentSoft: "#60a5fa",
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      boxShadow: {
        panel: "0 10px 30px rgba(0, 0, 0, 0.25)",
        glow: "0 0 0 1px rgba(96, 165, 250, 0.15), 0 12px 40px rgba(59, 130, 246, 0.08)",
      },
    },
  },
  plugins: [],
};