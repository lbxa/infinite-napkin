import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
} from '@tanstack/react-router';

// Import route components
import { Dashboard } from './components/Dashboard';
import { DocumentEditorPage } from './pages/DocumentEditorPage';
import { SettingsPage } from './pages/SettingsPage';

// Root route
const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// Index route (dashboard)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
});

// Document editor route
const docRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/doc/$id',
  component: DocumentEditorPage,
});

// Settings route
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

// Build route tree
const routeTree = rootRoute.addChildren([indexRoute, docRoute, settingsRoute]);

// Create and export the router
export const router = createRouter({ routeTree });

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
