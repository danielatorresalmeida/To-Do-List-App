import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const cacheDir = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "vite", "to-do-list-app")
  : "node_modules/.vite";

export default defineConfig({
  base: "/To-Do-List-App/",
  cacheDir,
  plugins: [react()],
});
