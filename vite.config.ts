import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  // Explicitly define environment variables for production builds
  define: {
    // Force enable Excel upload in production if not explicitly disabled
    'import.meta.env.VITE_ENABLE_EXCEL_UPLOAD': JSON.stringify(
      process.env.VITE_ENABLE_EXCEL_UPLOAD || 'true'
    ),
    'import.meta.env.VITE_ENVIRONMENT': JSON.stringify(
      process.env.VITE_ENVIRONMENT || 'production'
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        // Simple file naming without manual chunking
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      },
      // Ensure React is treated as external dependency properly
      external: [],
    },
    // Optimize bundle size
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: false, // Disable to speed up build
    chunkSizeWarningLimit: 1000, // Increase limit since we're not chunking
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-hook-form',
      '@tanstack/react-query',
      '@tanstack/react-table',
      'wouter',
      'zod',
      'clsx',
      'tailwind-merge',
      'recharts',
      'lucide-react'
    ],
    exclude: [
      // Large dependencies that should be loaded dynamically
      '@replit/vite-plugin-cartographer'
    ],
    // Force React to be included in pre-bundling
    force: true
  },
});
