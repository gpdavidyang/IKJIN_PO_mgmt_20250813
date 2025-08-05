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
        manualChunks: (id) => {
          // Core React ecosystem - keep together but separate
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-core';
          }
          
          // Router and state management
          if (id.includes('wouter') || id.includes('@tanstack/react-query')) {
            return 'state-router';
          }
          
          // UI component libraries
          if (id.includes('@tanstack/react-table') || 
              id.includes('react-hook-form') || 
              id.includes('@hookform/resolvers') ||
              id.includes('zod')) {
            return 'ui-forms';
          }
          
          // Charts and visualization (large libraries)
          if (id.includes('recharts') || id.includes('d3')) {
            return 'charts';
          }
          
          // Icons - separate due to size
          if (id.includes('lucide-react')) {
            return 'icons';
          }
          
          // Utilities - lightweight
          if (id.includes('clsx') || 
              id.includes('tailwind-merge') || 
              id.includes('date-fns')) {
            return 'utilities';
          }
          
          // Excel processing (large dependency)
          if (id.includes('xlsx') || 
              id.includes('exceljs') ||
              id.includes('excel-upload') ||
              id.includes('excel-automation')) {
            return 'excel-processing';
          }
          
          // Orders-related components (main feature)
          if (id.includes('/orders/') || 
              id.includes('enhanced-orders-table') ||
              id.includes('use-optimized-orders') ||
              id.includes('orders-professional')) {
            return 'orders-core';
          }
          
          // Dashboard components
          if (id.includes('/dashboard') || 
              id.includes('dashboard-widgets') ||
              id.includes('advanced-chart')) {
            return 'dashboard';
          }
          
          // Form components
          if (id.includes('order-form') || 
              id.includes('vendor-form') || 
              id.includes('item-form')) {
            return 'forms';
          }
          
          // Admin and management
          if (id.includes('/admin') || 
              id.includes('user-management') ||
              id.includes('category-management')) {
            return 'admin';
          }
          
          // Authentication
          if (id.includes('auth') || id.includes('login')) {
            return 'auth';
          }
          
          // Large node_modules packages
          if (id.includes('node_modules')) {
            // Split large packages separately
            if (id.includes('react-query')) return 'vendor-query';
            if (id.includes('react-table')) return 'vendor-table';
            if (id.includes('react-hook-form')) return 'vendor-forms';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('date-fns')) return 'vendor-dates';
            
            // Group smaller vendor packages
            return 'vendor-misc';
          }
          
          // Default chunk for remaining code
          return 'main';
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
    reportCompressedSize: true, // Enable for performance monitoring
    chunkSizeWarningLimit: 500, // Lower threshold to catch large chunks
    // Enable tree shaking
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false
    }
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
