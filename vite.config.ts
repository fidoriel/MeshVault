import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "tailwindcss";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    css: {
        postcss: {
            plugins: [tailwindcss],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./frontend"),
        },
    },
    build: {
        chunkSizeWarningLimit: 1024, // the 3d viewer stuff is huge
    },
});
