import { test, expect, type Page } from '@playwright/test';
import type { Client } from '../src/entities/client';
import type { SupportMessage } from '../src/entities/message';
import { mockRealtime } from './helpers/realtime';
import { seedSession } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await seedSession(page);
});

const TEST_CLIENTS: Client[] = [
  ['Анна', 'Смирнова', 'anna_smirnova'],
  ['Михаил', 'Волков', 'mikhail_v'],
  ['Екатерина', 'Иванова', 'kate_ivanova'],
  ['Дмитрий', 'Петров', 'dmitry_p'],
  ['Алексей', 'Кузнецов', 'alex_k'],
  ['Ольга', 'Соколова', 'olga_s'],
].map(([firstName, lastName, username], index) => ({
  id: index + 1,
  telegram_user_id: 100 + index,
  telegram_chat_id: 100 + index,
  first_name: firstName,
  last_name: lastName,
  username,
  created_at: '2026-10-01T09:00:00Z',
  last_message_at: new Date(Date.UTC(2026, 9, 5, 10, 50 - index * 10)).toISOString(),
}));

function makeMessage(id: number, clientId = 1): SupportMessage {
  const texts = [
    'Здравствуйте! Не получается подключиться к рабочему VPN. После ввода пароля появляется ошибка соединения.',
    'Спасибо! Ваше сообщение получено. Специалист технической поддержки свяжется с вами.',
    'Попробовала перезагрузить компьютер, но проблема осталась. Интернет и остальные приложения работают.',
    'Обращение сохранено. Мы проверим настройки подключения и вернёмся с ответом.',
    'Вчера всё работало. Ошибка появилась сегодня утром, когда начала работать из дома.',
    'Спасибо за подробности! Передали информацию специалисту технической поддержки.',
  ];
  return {
    id,
    client_id: clientId,
    sender: id % 2 ? 'client' : 'bot',
    message_text: `${texts[(id - 1) % texts.length]} [${id}]`,
    sent_at: new Date(Date.UTC(2026, 9, 5, 9, id)).toISOString(),
  };
}

async function mockApi(page: Page) {
  const state = {
    realtime: await mockRealtime(page),
    clients: TEST_CLIENTS.map((client) => ({ ...client })),
    rows: [
      ...Array.from({ length: 65 }, (_, index) => makeMessage(index + 1)),
      makeMessage(101, 2),
    ],
    requests: [] as URL[],
    clientStatus: 200,
    messageStatus: 200,
    historyStatus: 200,
    beforeHistoryResponse: null as (() => Promise<void>) | null,
    beforeMessageResponse: null as (() => Promise<void>) | null,
  };
  await page.route('**/functions/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
      });
      return;
    }
    state.requests.push(url);
    expect(route.request().headers().apikey).toBe('public-test-key');
    if (url.pathname.endsWith('/clients')) {
      await route.fulfill({
        status: state.clientStatus,
        headers: { 'Access-Control-Allow-Origin': '*' },
        json: state.clients,
      });
      return;
    }
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.has('offset')).toBe(false);
    const clientId = Number(url.searchParams.get('client_id'));
    const cursor = url.searchParams.get('cursor');
    if (cursor && state.beforeHistoryResponse) await state.beforeHistoryResponse();
    const status = cursor ? state.historyStatus : state.messageStatus;
    const beforeId = cursor ? Number(cursor.replace('before-', '')) : Infinity;
    const matching = state.rows
      .filter((row) => row.client_id === clientId && row.id < beforeId)
      .toSorted((a, b) => b.id - a.id);
    const items = matching.slice(0, 20);
    if (!cursor && state.beforeMessageResponse) await state.beforeMessageResponse();
    await route.fulfill({
      status,
      headers: { 'Access-Control-Allow-Origin': '*' },
      json: { items, nextCursor: matching.length > 20 ? `before-${items.at(-1)!.id}` : null },
    });
  });
  return state;
}

async function openConversation(page: Page) {
  await page.goto('/clients/1');
  await expect(page.locator('[data-message-id="65"]')).toBeInViewport();
  await page.evaluate(() => document.fonts.ready);
}

async function visibleAnchor(page: Page) {
  return page.getByRole('region', { name: 'Переписка', exact: true }).evaluate((viewport) => {
    const top = viewport.getBoundingClientRect().top;
    const element = Array.from(viewport.querySelectorAll<HTMLElement>('[data-message-id]')).find(
      (item) => item.getBoundingClientRect().bottom > top,
    );
    if (!element) throw new Error('No visible message');
    return { id: element.dataset.messageId, offset: element.getBoundingClientRect().top - top };
  });
}

test('lists and searches clients, opens a routed conversation with the latest messages below', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page.getByRole('heading', { name: 'Начнём с переписки' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Список клиентов' }).getByRole('link'),
  ).toHaveCount(6);
  await page.getByRole('textbox', { name: 'Поиск клиентов' }).fill('@anna');
  await expect(
    page.getByRole('navigation', { name: 'Список клиентов' }).getByRole('link'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Очистить поиск' }).click();
  await page.getByRole('link', { name: /Анна Смирнова/ }).click();
  await expect(page).toHaveURL(/\/clients\/1$/);
  await expect(page.getByRole('heading', { name: 'Анна Смирнова', exact: true })).toBeVisible();
  await expect(page.locator('[data-message-id="65"]')).toBeInViewport();
  await expect(page.locator('[data-message-id]')).toHaveCount(20);
  const ids = await page
    .locator('[data-message-id]')
    .evaluateAll((elements) => elements.map((e) => Number(e.getAttribute('data-message-id'))));
  expect(ids).toEqual(Array.from({ length: 20 }, (_, index) => index + 46));
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('400 14px "Manrope Variable"'))).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain(
    'Manrope Variable',
  );
  await page.screenshot({ path: 'test-results/helpix-desktop.png' });
});

test('loads older pages upwards without moving the visible message or duplicating history', async ({
  page,
}) => {
  const state = await mockApi(page);
  await openConversation(page);
  let releaseHistory = () => {};
  state.beforeHistoryResponse = () =>
    new Promise<void>((resolve) => {
      releaseHistory = resolve;
    });
  const viewport = page.getByRole('region', { name: 'Переписка', exact: true });
  await viewport.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect
    .poll(() => state.requests.filter((url) => url.searchParams.has('cursor')).length)
    .toBe(1);
  const before = await visibleAnchor(page);
  state.beforeHistoryResponse = null;
  releaseHistory();
  await expect(page.locator('[data-message-id]')).toHaveCount(40);
  // Older messages can fill the previously empty space above the first message.
  // Verify the same message stays in place, rather than which message is now first visible.
  const afterOffset = await page.locator(`[data-message-id="${before.id}"]`).evaluate((element) => {
    const viewport = element.closest('[role="region"]')!;
    return element.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
  });
  expect(Math.abs(afterOffset - before.offset)).toBeLessThan(2);
  await viewport.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(page.locator('[data-message-id]')).toHaveCount(60);
  await viewport.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(page.locator('[data-message-id]')).toHaveCount(65);
  await expect(page.getByText('Начало переписки', { exact: true })).toBeVisible();
  const ids = await page
    .locator('[data-message-id]')
    .evaluateAll((elements) => elements.map((e) => Number(e.getAttribute('data-message-id'))));
  expect(ids).toEqual(Array.from({ length: 65 }, (_, index) => index + 1));
  expect(
    state.requests
      .filter((url) => url.searchParams.has('cursor'))
      .map((url) => url.searchParams.get('cursor')),
  ).toEqual(['before-46', 'before-26', 'before-6']);
});

test('keeps a reader in place on realtime updates and scrolls to new messages only at the bottom', async ({
  page,
}) => {
  const state = await mockApi(page);
  await openConversation(page);
  const viewport = page.getByRole('region', { name: 'Переписка', exact: true });
  await viewport.evaluate((element) => {
    element.scrollTop = 450;
  });
  await expect(page.getByRole('button', { name: 'К последним сообщениям' })).toBeVisible();
  const before = await visibleAnchor(page);
  state.rows.push(makeMessage(66));
  state.realtime.emitChange('messages', makeMessage(66));
  await expect(page.locator('[data-message-id="66"]')).toBeVisible();
  const after = await visibleAnchor(page);
  expect(after.id).toBe(before.id);
  expect(Math.abs(after.offset - before.offset)).toBeLessThan(2);
  await page.getByRole('button', { name: 'К последним сообщениям' }).click();
  await expect(page.locator('[data-message-id="66"]')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'К последним сообщениям' })).toHaveCount(0);
  state.rows.push(makeMessage(67));
  state.realtime.emitChange('messages', makeMessage(67));
  await expect(page.locator('[data-message-id="67"]')).toBeInViewport();
});

test('separates conversations and handles empty, missing and invalid clients', async ({ page }) => {
  await mockApi(page);
  await openConversation(page);
  await page.getByRole('link', { name: /Михаил Волков/ }).click();
  await expect(page).toHaveURL(/\/clients\/2$/);
  await expect(page.locator('[data-message-id="101"]')).toBeInViewport();
  const bottomGap = await page.locator('[data-message-id="101"]').evaluate((element) => {
    const viewport = element.closest('[role="region"]')!;
    return viewport.getBoundingClientRect().bottom - element.getBoundingClientRect().bottom;
  });
  expect(bottomGap).toBeLessThanOrEqual(24);
  await expect(page.locator('[data-message-id="65"]')).toHaveCount(0);
  await page.getByRole('link', { name: /Екатерина Иванова/ }).click();
  await expect(page.getByRole('heading', { name: 'Пока нет сообщений' })).toBeVisible();
  await page.goto('/clients/999');
  await expect(page.getByRole('heading', { name: 'Клиент не найден' }).last()).toBeVisible();
  await page.goto('/clients/abc');
  await expect(page).toHaveURL(/\/clients$/);
  await page.goto('/unknown');
  await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
});

test('shows request errors and successfully retries clients and message history', async ({
  page,
}) => {
  const state = await mockApi(page);
  state.clientStatus = 403;
  await page.goto('/clients');
  await expect(page.getByRole('heading', { name: 'Клиенты не загрузились' })).toBeVisible();
  state.clientStatus = 200;
  await page.getByRole('button', { name: 'Попробовать снова' }).click();
  await expect(page.getByRole('link', { name: /Анна Смирнова/ })).toBeVisible();
  state.messageStatus = 403;
  await page.getByRole('link', { name: /Анна Смирнова/ }).click();
  await expect(page.getByRole('heading', { name: 'Переписка не загрузилась' })).toBeVisible();
  state.messageStatus = 200;
  await page.getByRole('button', { name: 'Попробовать снова' }).click();
  await expect(page.locator('[data-message-id="65"]')).toBeInViewport();
  state.historyStatus = 403;
  await page.getByRole('region', { name: 'Переписка', exact: true }).evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(
    page.getByRole('button', { name: 'Не удалось загрузить историю. Повторить' }),
  ).toBeVisible();
  await expect(page.locator('[data-message-id]')).toHaveCount(20);
  state.historyStatus = 200;
  await page.getByRole('button', { name: 'Не удалось загрузить историю. Повторить' }).click();
  await expect(page.locator('[data-message-id]')).toHaveCount(40);
});

test('works on mobile, supports direct links and browser back without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page);
  await page.goto('/clients');
  await page.getByRole('link', { name: /Анна Смирнова/ }).click();
  await expect(page.locator('[data-message-id="65"]')).toBeInViewport();
  await expect(page.getByRole('complementary', { name: 'Клиенты' })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/helpix-mobile.png' });
  await page.getByRole('link', { name: 'Назад к клиентам' }).click();
  await expect(page).toHaveURL(/\/clients$/);
  await expect(page.getByRole('complementary', { name: 'Клиенты' })).toBeVisible();
  await page.getByRole('link', { name: /Михаил Волков/ }).click();
  await page.reload();
  await expect(page.locator('[data-message-id="101"]')).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/\/clients$/);
});

test('does not poll idle data and updates the sidebar from realtime events', async ({ page }) => {
  await page.clock.install();
  const state = await mockApi(page);
  await openConversation(page);
  await expect.poll(() => state.realtime.subscriptions.size).toBe(1);
  await page.waitForLoadState('networkidle');
  const requestCount = state.requests.length;
  await page.clock.fastForward(60_000);
  // Allow any requests started by the advanced timers to reach the API mock.
  await page.waitForTimeout(300);
  expect(state.requests).toHaveLength(requestCount);

  state.clients[1].last_message_at = '2026-10-12T10:00:00Z';
  state.realtime.emitChange('clients', state.clients[1], 'UPDATE');
  const clientLinks = page.getByRole('navigation', { name: 'Список клиентов' }).getByRole('link');
  await expect(clientLinks.first()).toContainText('Михаил Волков');

  const newClient = { ...TEST_CLIENTS[0], id: 7, first_name: 'Ирина', last_name: 'Новикова' };
  state.clients.push(newClient);
  state.realtime.emitChange('clients', newClient);
  await expect(clientLinks).toHaveCount(7);
  await expect(page.getByRole('link', { name: /Ирина Новикова/ })).toBeVisible();
});

test('recovers missed messages after reconnecting and reports connection failures', async ({
  page,
}) => {
  const state = await mockApi(page);
  await openConversation(page);
  await expect.poll(() => state.realtime.subscriptions.size).toBe(1);
  const joinCount = state.realtime.joinCount;
  state.realtime.disconnect();
  await expect(page.getByText(/Автообновление недоступно/)).toBeVisible();
  state.rows.push(makeMessage(66));
  await expect.poll(() => state.realtime.joinCount).toBeGreaterThan(joinCount);
  await expect(page.locator('[data-message-id="66"]')).toBeInViewport();
  await expect(page.getByText(/Автообновление недоступно/)).toHaveCount(0);
});

test('replaces the conversation subscription and ignores events for another client', async ({
  page,
}) => {
  const state = await mockApi(page);
  await openConversation(page);
  await page.getByRole('link', { name: /Михаил Волков/ }).click();
  await expect(page.locator('[data-message-id="101"]')).toBeInViewport();
  await expect
    .poll(() =>
      [...state.realtime.subscriptions.values()].map(
        (subscription) =>
          subscription.filters.find((filter) => filter.table === 'messages')?.filter,
      ),
    )
    .toEqual(['client_id=eq.2']);
  await page.waitForLoadState('networkidle');
  const messageRequestCount = state.requests.filter((url) =>
    url.pathname.endsWith('/messages'),
  ).length;
  state.rows.push(makeMessage(66));
  state.realtime.emitChange('messages', makeMessage(66));
  await page.waitForTimeout(300);
  expect(state.requests.filter((url) => url.pathname.endsWith('/messages'))).toHaveLength(
    messageRequestCount,
  );

  state.rows.push(makeMessage(102, 2));
  state.realtime.emitChange('messages', makeMessage(102, 2));
  await expect(page.locator('[data-message-id="102"]')).toBeInViewport();
  await expect(page.locator('[data-message-id="66"]')).toHaveCount(0);
});

test('fetches again when another message arrives during an ongoing refresh', async ({ page }) => {
  const state = await mockApi(page);
  await openConversation(page);
  await expect.poll(() => state.realtime.subscriptions.size).toBe(1);
  await page.waitForLoadState('networkidle');
  let releaseResponse: (() => void) | null = null;
  state.beforeMessageResponse = () => {
    state.beforeMessageResponse = null;
    return new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
  };
  state.rows.push(makeMessage(66));
  state.realtime.emitChange('messages', makeMessage(66));
  await expect.poll(() => releaseResponse !== null).toBe(true);
  state.rows.push(makeMessage(67));
  state.realtime.emitChange('messages', makeMessage(67));
  releaseResponse!();
  await expect(page.locator('[data-message-id="67"]')).toBeInViewport();
  await expect(page.locator('[data-message-id]')).toHaveCount(20);
});
