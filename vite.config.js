import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // transformers.js loads its own WASM/worker runtime for ONNX Runtime Web;
  // it needs to be excluded from Vite's dependency pre-bundling and built
  // as a real ES module target, or the browser gets a broken bundle.
  optimizeDeps: {
    exclude: ["@huggingface/transformers"],
  },
  worker: {
    format: "es",
  },
  build: {
    target: "esnext",
  },
});
