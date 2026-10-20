import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { NotFoundPage } from '@/pages/not-found';
import { SupportWorkspacePage } from '@/pages/support-workspace';
import { ArticlesPage } from '@/pages/articles';
import { ArticlePage } from '@/pages/article';
import { ArticleEditorPage } from '@/pages/article-editor';
import { LoginPage, validateLoginSearch } from '@/pages/login';
import { AuthenticatedLayout } from './AuthenticatedLayout';

const rootRoute = createRootRoute({
  notFoundComponent: NotFoundPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: validateLoginSearch,
  component: LoginPage,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  component: AuthenticatedLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/clients' });
  },
});

const clientsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/clients',
  component: SupportWorkspacePage,
});

const conversationRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/clients/$clientId',
  beforeLoad: ({ params }) => {
    if (!/^[1-9]\d*$/.test(params.clientId) || !Number.isSafeInteger(Number(params.clientId))) {
      throw redirect({ to: '/clients' });
    }
  },
  component: SupportWorkspacePage,
});

const articlesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/articles',
  component: ArticlesPage,
});

const newArticleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/articles/new',
  component: ArticleEditorPage,
});

function validateArticleRoute({ params }: { params: { articleId: string } }) {
  if (!/^[1-9]\d*$/.test(params.articleId) || !Number.isSafeInteger(Number(params.articleId))) {
    throw redirect({ to: '/articles' });
  }
}

const articleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/articles/$articleId',
  beforeLoad: validateArticleRoute,
  component: ArticlePage,
});

const editArticleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/articles/$articleId/edit',
  beforeLoad: validateArticleRoute,
  component: ArticleEditorPage,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    loginRoute,
    authenticatedRoute.addChildren([
      indexRoute,
      clientsRoute,
      conversationRoute,
      articlesRoute,
      newArticleRoute,
      articleRoute,
      editArticleRoute,
    ]),
  ]),
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
