/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        mist: "#EAECF0",
        surface: "#FCFCFD",
        accent: "#0B6E4F",
        accentSoft: "#D6F5EA",
        warning: "#B54708",
        slate: "#475467"
      },
      boxShadow: {
        panel: "0 18px 40px rgba(16, 24, 40, 0.08)"
      },
      fontFamily: {
        sans: ["'Avenir Next'", "Avenir", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

