import { test, expect, type Page } from '@playwright/test';
import type { Article, ArticleInput } from '../src/entities/article';
import { mockRealtime } from './helpers/realtime';

const TEST_ARTICLES: Article[] = [
  {
    id: 2,
    title: 'Восстановление доступа',
    content: 'Откройте настройки.\n\n  Проверьте адрес почты.',
    created_at: '2026-10-13T12:00:00Z',
    updated_at: '2026-10-13T12:00:00Z',
  },
  {
    id: 1,
    title: 'Подключение к VPN',
    content: 'Перезапустите клиент VPN.',
    created_at: '2026-10-12T12:00:00Z',
    updated_at: '2026-10-12T12:00:00Z',
  },
];

async function mockArticles(page: Page) {
  await mockRealtime(page);
  const state = {
    rows: TEST_ARTICLES.map((article) => ({ ...article })),
    requests: [] as { method: string; id: string | null; body?: ArticleInput }[],
    listStatus: 200,
    detailStatus: 200,
    saveStatus: 200,
    deleteStatus: 204,
    beforeSave: null as (() => Promise<void>) | null,
  };
  await page.route('**/functions/v1/**', async (route) => {
    const req = route.request();
    const headers = { 'Access-Control-Allow-Origin': '*' };
    if (req.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
      });
      return;
    }
    const url = new URL(req.url());
    if (!url.pathname.endsWith('/articles')) {
      await route.fulfill({ headers, json: [] });
      return;
    }
    expect(req.headers().apikey).toBe('public-test-key');
    const method = req.method();
    const id = url.searchParams.get('id');
    const body =
      method === 'POST' || method === 'PUT' ? (req.postDataJSON() as ArticleInput) : undefined;
    state.requests.push({ method, id, body });
    const article = state.rows.find((row) => row.id === Number(id));
    if (method === 'GET' && id === null) {
      const rows = state.rows
        .toSorted((a, b) => b.id - a.id)
        .map((row) => ({
          id: row.id,
          title: row.title,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));
      await route.fulfill({ status: state.listStatus, headers, json: rows });
    } else if (method === 'GET') {
      await route.fulfill({
        status: article ? state.detailStatus : 404,
        headers,
        json: article ?? { error: 'Article not found' },
      });
    } else if (method === 'POST' || method === 'PUT') {
      if (state.beforeSave) await state.beforeSave();
      if (state.saveStatus !== 200) {
        await route.fulfill({
          status: state.saveStatus,
          headers,
          json: { error: 'Unable to save' },
        });
        return;
      }
      expect(req.headers()['content-type']).toContain('application/json');
      expect(Object.keys(body!).sort()).toEqual(['content', 'title']);
      if (method === 'PUT' && !article) {
        await route.fulfill({ status: 404, headers, json: { error: 'Article not found' } });
        return;
      }
      const saved: Article = {
        id: method === 'POST' ? 3 : article!.id,
        ...body!,
        created_at: article?.created_at ?? '2026-10-13T13:00:00Z',
        updated_at: '2026-10-13T13:00:00Z',
      };
      state.rows = [saved, ...state.rows.filter((row) => row.id !== saved.id)];
      await route.fulfill({ status: method === 'POST' ? 201 : 200, headers, json: saved });
    } else if (method === 'DELETE') {
      if (state.deleteStatus !== 204) {
        await route.fulfill({
          status: state.deleteStatus,
          headers,
          json: { error: 'Unable to delete' },
        });
        return;
      }
      state.rows = state.rows.filter((row) => row.id !== Number(id));
      await route.fulfill({ status: 204, headers });
    } else {
      await route.fulfill({ status: 405, headers });
    }
  });
  return state;
}

test('navigates from support to articles and supports reading, direct links and browser back', async ({
  page,
}) => {
  await mockArticles(page);
  await page.goto('/clients');
  await page
    .getByRole('navigation', { name: 'Разделы' })
    .getByRole('link', { name: 'База знаний' })
    .click();
  await expect(page).toHaveURL(/\/articles$/);
  const links = page.getByRole('navigation', { name: 'Список статей' }).getByRole('link');
  await expect(links).toHaveCount(2);
  await expect(links.first()).toContainText('Восстановление доступа');
  await page.screenshot({ path: 'test-results/articles-desktop.png' });
  await links.first().click();
  await expect(page).toHaveURL(/\/articles\/2$/);
  await expect(
    page.getByRole('heading', { name: 'Восстановление доступа', exact: true }),
  ).toBeVisible();
  await expect(page.locator('article')).toContainText(TEST_ARTICLES[0].content);
  await page.reload();
  await expect(page.locator('article')).toContainText(TEST_ARTICLES[0].content);
  await page.goBack();
  await expect(page).toHaveURL(/\/articles$/);
});

test('validates a new article locally, saves it and updates the cached list after editing', async ({
  page,
}) => {
  const state = await mockArticles(page);
  state.rows = [];
  await page.goto('/articles');
  await expect(page.getByRole('heading', { name: 'Пока нет статей' })).toBeVisible();
  await page.getByRole('link', { name: 'Создать статью' }).click();
  await expect(page).toHaveURL(/\/articles\/new$/);
  await page.getByRole('textbox', { name: 'Заголовок', exact: true }).fill('   ');
  await page.getByRole('textbox', { name: 'Текст статьи', exact: true }).fill(' \n\t');
  await page.getByRole('button', { name: 'Сохранить статью' }).click();
  await expect(page.getByText('Введите заголовок статьи.')).toBeVisible();
  await expect(page.getByText('Введите текст статьи.')).toBeVisible();
  expect(state.requests.filter((req) => req.method === 'POST')).toHaveLength(0);
  const content = '\n  Первый шаг\n\nВторой шаг\n<script>window.articleExecuted = true</script>';
  await page.getByRole('textbox', { name: 'Заголовок', exact: true }).fill('  Новая инструкция  ');
  await page.getByRole('textbox', { name: 'Текст статьи', exact: true }).fill(content);
  await page.getByRole('button', { name: 'Сохранить статью' }).click();
  await expect(page).toHaveURL(/\/articles\/3$/);
  await expect(page.getByRole('heading', { name: 'Новая инструкция', exact: true })).toBeVisible();
  expect(state.requests.find((req) => req.method === 'POST')?.body).toEqual({
    title: 'Новая инструкция',
    content,
  });
  await expect(page.locator('article')).toContainText(
    '<script>window.articleExecuted = true</script>',
  );
  await expect(page.locator('article script')).toHaveCount(0);
  await page.getByRole('link', { name: 'К статьям', exact: true }).click();
  await page.getByRole('link', { name: /Новая инструкция/ }).click();
  await page.getByRole('link', { name: 'Редактировать' }).click();
  await expect(page.getByRole('textbox', { name: 'Текст статьи', exact: true })).toHaveValue(
    content,
  );
  await page
    .getByRole('textbox', { name: 'Заголовок', exact: true })
    .fill('Исправленная инструкция');
  await page.getByRole('textbox', { name: 'Текст статьи', exact: true }).fill('Исправленный текст');
  await page.getByRole('button', { name: 'Сохранить статью' }).click();
  await expect(
    page.getByRole('heading', { name: 'Исправленная инструкция', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'К статьям', exact: true }).click();
  await expect(page.getByRole('link', { name: /Исправленная инструкция/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Новая инструкция/ })).toHaveCount(0);
});

test('keeps draft text after save errors and prevents a second submission while saving', async ({
  page,
}) => {
  const state = await mockArticles(page);
  state.saveStatus = 403;
  await page.goto('/articles/2/edit');
  await page.getByRole('textbox', { name: 'Заголовок', exact: true }).fill('Черновик');
  await page
    .getByRole('textbox', { name: 'Текст статьи', exact: true })
    .fill('Несохранённый текст');
  await page.getByRole('button', { name: 'Сохранить статью' }).click();
  await expect(page.getByRole('alert')).toContainText('Нет доступа к данным');
  await expect(page.getByRole('textbox', { name: 'Заголовок', exact: true })).toHaveValue(
    'Черновик',
  );
  await expect(page.getByRole('textbox', { name: 'Текст статьи', exact: true })).toHaveValue(
    'Несохранённый текст',
  );
  state.saveStatus = 200;
  let releaseSave = () => {};
  state.beforeSave = () =>
    new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
  await page.getByRole('button', { name: 'Сохранить статью' }).click();
  await expect(page.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Отмена', exact: true })).toBeDisabled();
  await expect.poll(() => state.requests.filter((req) => req.method === 'PUT').length).toBe(2);
  releaseSave();
  await expect(page).toHaveURL(/\/articles\/2$/);
  await expect(page.getByRole('heading', { name: 'Черновик', exact: true })).toBeVisible();
  expect(state.requests.filter((req) => req.method === 'PUT')).toHaveLength(2);
});

test('requires deletion confirmation, keeps the dialog on errors and removes the article after retry', async ({
  page,
}) => {
  const state = await mockArticles(page);
  await page.goto('/articles');
  await page.getByRole('link', { name: /Восстановление доступа/ }).click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Восстановление доступа');
  await expect(dialog.getByRole('button', { name: 'Отмена' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Отмена' }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.requests.filter((req) => req.method === 'DELETE')).toHaveLength(0);
  state.deleteStatus = 403;
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await dialog.getByRole('button', { name: 'Удалить статью', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Нет доступа к данным');
  await expect(page).toHaveURL(/\/articles\/2$/);
  state.deleteStatus = 204;
  await dialog.getByRole('button', { name: 'Удалить статью', exact: true }).click();
  await expect(page).toHaveURL(/\/articles$/);
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Восстановление доступа/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Подключение к VPN/ })).toBeVisible();
  await page.goto('/articles/2');
  await expect(page.getByRole('heading', { name: 'Статья не найдена' })).toBeVisible();
});

test('retries failed reads and handles missing articles and invalid IDs', async ({ page }) => {
  const state = await mockArticles(page);
  state.listStatus = 403;
  await page.goto('/articles');
  await expect(page.getByRole('heading', { name: 'Статьи не загрузились' })).toBeVisible();
  state.listStatus = 200;
  await page.getByRole('button', { name: 'Попробовать снова' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Список статей' }).getByRole('link'),
  ).toHaveCount(2);
  state.detailStatus = 403;
  await page.getByRole('link', { name: /Восстановление доступа/ }).click();
  await expect(page.getByRole('heading', { name: 'Статья не загрузилась' })).toBeVisible();
  state.detailStatus = 200;
  await page.getByRole('button', { name: 'Попробовать снова' }).click();
  await expect(
    page.getByRole('heading', { name: 'Восстановление доступа', exact: true }),
  ).toBeVisible();
  await page.goto('/articles/999');
  await expect(page.getByRole('heading', { name: 'Статья не найдена' })).toBeVisible();
  await page.goto('/articles/999/edit');
  await expect(page.getByRole('heading', { name: 'Статья не найдена' })).toBeVisible();
  for (const path of ['/articles/abc', '/articles/0/edit', '/articles/9007199254740992']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/articles$/);
  }
});

test('cancels creation and editing without changing stored data', async ({ page }) => {
  const state = await mockArticles(page);
  await page.goto('/articles/new');
  await page.getByRole('textbox', { name: 'Заголовок', exact: true }).fill('Не сохранять');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page).toHaveURL(/\/articles$/);
  await page.goto('/articles/2/edit');
  await page.getByRole('textbox', { name: 'Заголовок', exact: true }).fill('Не сохранять');
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Восстановление доступа', exact: true }),
  ).toBeVisible();
  expect(state.requests.every((req) => req.method === 'GET')).toBe(true);
});

test('preserves an editing draft when a background read fails', async ({ page }) => {
  const state = await mockArticles(page);
  await page.clock.install();
  await page.goto('/articles/2/edit');
  await page.getByRole('textbox', { name: 'Заголовок', exact: true }).fill('Черновик заголовка');
  await page.getByRole('textbox', { name: 'Текст статьи', exact: true }).fill('Черновик текста');
  state.detailStatus = 403;
  await page.clock.fastForward(20_000);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));
  });
  await expect(page.getByRole('status')).toContainText('Введённый текст сохранён в форме');
  await expect(page.getByRole('textbox', { name: 'Заголовок', exact: true })).toHaveValue(
    'Черновик заголовка',
  );
  await expect(page.getByRole('textbox', { name: 'Текст статьи', exact: true })).toHaveValue(
    'Черновик текста',
  );
});

test('shows long article text, editor and confirmation on mobile without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mockArticles(page);
  state.rows[0].title = 'Очень длинный заголовок '.repeat(8);
  state.rows[0].content = `${'a'.repeat(300)}\n\n  Отступ сохранён`;
  await page.goto('/articles/2');
  await expect(page.locator('article')).toContainText(state.rows[0].content);
  const headingBox = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect(headingBox!.width).toBeGreaterThanOrEqual(250);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/articles-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  const box = await page.getByRole('alertdialog').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Отмена' }).click();
  await page.getByRole('link', { name: 'Редактировать' }).click();
  await expect(page.getByRole('textbox', { name: 'Текст статьи', exact: true })).toHaveValue(
    state.rows[0].content,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
