/**
 * Lazy route loading for code splitting and performance optimization
 * Reduces initial bundle size by loading components only when needed
 */

import { lazy } from "react";

// Main pages - loaded on demand
export const Dashboard = lazy(() => import("@/pages/dashboard"));
export const Orders = lazy(() => import("@/pages/orders-professional"));
export const CreateOrderStandard = lazy(() => import("@/pages/create-order-standard"));
export const CreateOrderExcel = lazy(() => import("@/pages/create-order-excel"));

// Management pages
export const Projects = lazy(() => import("@/pages/projects"));
export const Vendors = lazy(() => import("@/pages/vendors"));
export const Items = lazy(() => import("@/pages/items"));

// Report and analysis
export const Reports = lazy(() => import("@/pages/reports"));

// User management
export const UserManagement = lazy(() => import("@/pages/user-management"));
export const Profile = lazy(() => import("@/pages/profile"));

// System management
export const Admin = lazy(() => import("@/pages/admin"));

// Authentication
export const Login = lazy(() => import("@/pages/login"));

/**
 * Preload critical routes for better performance
 */
export function preloadCriticalRoutes() {
  // Preload dashboard and orders as they are most frequently accessed
  Dashboard;
  Orders;
}

/**
 * Route-based code splitting with prefetch
 */
export function prefetchRoute(routePath: string) {
  // Implement route prefetching logic here
  console.log("Prefetching route:", routePath);
}