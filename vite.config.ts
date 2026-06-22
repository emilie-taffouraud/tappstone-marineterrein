import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendPort = env.PORT || "3000";
  const apiProxy = env.API_PROXY || `http://localhost:${backendPort}`;

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: apiProxy,
          changeOrigin: true,
        },
      },
    },
  };
});
