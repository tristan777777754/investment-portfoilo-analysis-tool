import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function getPackageChunkName(id) {
  const [, modulePath] = id.split("node_modules/");
  if (!modulePath) return null;

  const segments = modulePath.split("/");
  const packageName = segments[0].startsWith("@")
    ? `${segments[0]}/${segments[1]}`
    : segments[0];

  return `vendor-${packageName.replace(/[\\/]/g, "-")}`;
}

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          return getPackageChunkName(id);
        }
      }
    }
  },
  server: {
    port: 5173
  }
});
