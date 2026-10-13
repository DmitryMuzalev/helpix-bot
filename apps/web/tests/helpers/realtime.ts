import type { Page, WebSocketRoute } from '@playwright/test';

interface RealtimeFilter {
  id: number;
  event: string;
  schema: string;
  table: string;
  filter?: string;
}

interface RealtimeSubscription {
  socket: WebSocketRoute;
  topic: string;
  joinRef: string | null;
  filters: RealtimeFilter[];
}

export async function mockRealtime(page: Page) {
  const subscriptions = new Map<string, RealtimeSubscription>();
  let joinCount = 0;

  await page.routeWebSocket('**/realtime/v1/websocket**', (socket) => {
    socket.onMessage((raw) => {
      const [joinRef, ref, topic, event, payload] = JSON.parse(String(raw)) as [
        string | null,
        string | null,
        string,
        string,
        { config?: { postgres_changes: RealtimeFilter[] } },
      ];
      let response = {};
      if (event === 'phx_join') {
        const filters = (payload.config?.postgres_changes ?? []).map((filter, index) => ({
          ...filter,
          id: index + 1,
        }));
        subscriptions.set(topic, { socket, topic, joinRef, filters });
        joinCount += 1;
        response = { postgres_changes: filters };
      } else if (event === 'phx_leave') {
        subscriptions.delete(topic);
      } else if (event !== 'heartbeat') {
        return;
      }
      socket.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response }]));
    });
    socket.onClose(() => {
      for (const [topic, subscription] of subscriptions) {
        if (subscription.socket === socket) subscriptions.delete(topic);
      }
    });
  });

  return {
    subscriptions,
    get joinCount() {
      return joinCount;
    },
    emitChange(table: string, record: object, eventType = 'INSERT') {
      const row = record as Record<string, unknown>;
      for (const { socket, topic, joinRef, filters } of subscriptions.values()) {
        const ids = filters
          .filter(
            (filter) =>
              filter.table === table &&
              (filter.event === '*' || filter.event === eventType) &&
              (!filter.filter || filter.filter === `client_id=eq.${row.client_id}`),
          )
          .map((filter) => filter.id);
        if (ids.length === 0) continue;
        socket.send(
          JSON.stringify([
            joinRef,
            null,
            topic,
            'postgres_changes',
            {
              ids,
              data: {
                schema: 'public',
                table,
                type: eventType,
                commit_timestamp: new Date().toISOString(),
                columns: Object.entries(row).map(([name, value]) => ({
                  name,
                  type: typeof value === 'number' ? 'int8' : 'text',
                })),
                record: row,
                old_record: {},
                errors: [],
              },
            },
          ]),
        );
      }
    },
    disconnect() {
      const sockets = new Set(
        [...subscriptions.values()].map((subscription) => subscription.socket),
      );
      subscriptions.clear();
      for (const socket of sockets) socket.close({ code: 1012, reason: 'Test reconnect' });
    },
  };
}
