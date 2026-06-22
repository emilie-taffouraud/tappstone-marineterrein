import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), "");
    var backendPort = env.PORT || "3000";
    var apiProxy = env.API_PROXY || "http://localhost:".concat(backendPort);
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
