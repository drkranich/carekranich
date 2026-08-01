import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@tanstack")) return "vendor-tanstack";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
            if (id.includes("date-fns") || id.includes("react-day-picker")) return "vendor-calendar";
            if (id.includes("lucide-react")) return "vendor-icons";
          }
        },
      },
    },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
  ],
});
