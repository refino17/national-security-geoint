/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 30px rgba(16, 185, 129, 0.18)",
        card: "0 20px 60px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        "ops-gradient":
          "radial-gradient(circle at top left, rgba(16,185,129,0.18), transparent 35%), radial-gradient(circle at top right, rgba(59,130,246,0.14), transparent 35%)",
      },
    },
  },
  plugins: [],
}