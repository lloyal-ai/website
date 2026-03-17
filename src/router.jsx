import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import Layout from './components/Layout';
import Home from './pages/Home';
// import Careers from './pages/Careers';

// Create a root route
const rootRoute = createRootRoute({
  component: Layout,
});

// Create the index route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

// Create the careers route
// const careersRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/careers',
//   component: Careers,
// });

// Create the route tree
const routeTree = rootRoute.addChildren([indexRoute]);

// Create the router
export const router = createRouter({ routeTree });
