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
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'react-router': ['wouter'],
          'ui-vendor': [
            '@tanstack/react-query',
            '@tanstack/react-table',
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          'chart-vendor': [
            'recharts',
            'lucide-react'
          ],
          'utility-vendor': [
            'clsx',
            'tailwind-merge',
            'date-fns'
          ],
          // Feature chunks
          'auth-features': [
            './client/src/hooks/useAuth',
            './client/src/pages/login'
          ],
          'dashboard-features': [
            './client/src/pages/dashboard'
          ],
          'forms-features': [
            './client/src/components/order-form',
            './client/src/components/vendor-form',
            './client/src/components/item-form'
          ],
          'excel-features': [
            './client/src/components/excel-upload-with-validation',
            './client/src/components/excel-automation-wizard'
          ]
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.\w+$/, '') || 'chunk'
            : 'chunk';
          return `assets/js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Optimize bundle size
    minify: 'esbuild',
    target: 'es2020',
    cssCodeSplit: true,
    reportCompressedSize: false, // Faster builds
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
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
    ]
  },
});
