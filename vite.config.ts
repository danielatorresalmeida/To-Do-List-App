import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/To-Do-List-App/",
  plugins: [react()],
});
