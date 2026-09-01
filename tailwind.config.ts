import type { Config } from "tailwindcss";

export default {
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ht: {
          teal: "#2BA8A0",
          "teal-dark": "#1E7A74",
          orange: "#F26522",
          "orange-dark": "#C94E15",
          black: "#111111",
          gray: "#4A4A4A",
          light: "#F4F6F6",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
