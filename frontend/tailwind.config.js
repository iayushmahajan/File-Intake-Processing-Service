export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f4f5f7",
        surface: "#ffffff",
        surfaceSoft: "#f3f1fc",
        borderSoft: "#e1e4e8",
        textMain: "#292d32",
        textMuted: "#616873",
        accent: "#5330e8",
        accentSoft: "#4826cb",
        success: "#28734a",
        chartMint: "#a6dcb9",
        chartTeal: "#7ebdcc",
        chartPurple: "#8170cd",
        warning: "#925b0c",
        danger: "#b73545",
      },
      boxShadow: {
        panel:
          "0 1px 3px rgba(25, 32, 45, 0.07), 0 0 0 1px rgba(25, 32, 45, 0.02)",
        glow: "0 0 0 3px rgba(83, 48, 232, 0.12)",
      },
    },
  },
  plugins: [],
};
