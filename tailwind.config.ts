import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C2430",
        steel: "#5C6878",
        mist: "#97A1AE",
        fog: "#EEF1F4",
        line: "#DCE1E7",
        teal: { DEFAULT: "#00A19B", deep: "#007C78", wash: "#E1F4F2" },
        amber: { DEFAULT: "#B86E00", wash: "#FBF0DD" },
        rose: { DEFAULT: "#C8402F", wash: "#FBE6E2" },
      },
      fontFamily: {
        sans: ["'Pretendard Variable'", "Pretendard", "system-ui", "sans-serif"],
      },
      maxWidth: { page: "1120px" },
    },
  },
  plugins: [],
};
export default config;
