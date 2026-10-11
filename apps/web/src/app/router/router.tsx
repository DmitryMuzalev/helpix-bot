import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { NotFoundPage } from '@/pages/not-found';
import { SupportWorkspacePage } from '@/pages/support-workspace';

const rootRoute = createRootRoute({
  notFoundComponent: NotFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/clients' });
  },
});

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients',
  component: SupportWorkspacePage,
});

const conversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/clients/$clientId',
  beforeLoad: ({ params }) => {
    if (!/^[1-9]\d*$/.test(params.clientId) || !Number.isSafeInteger(Number(params.clientId))) {
      throw redirect({ to: '/clients' });
    }
  },
  component: SupportWorkspacePage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute, clientsRoute, conversationRoute]),
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
