# Архитектура Helpix Bot

Диаграммы C4 отражают текущую реализацию и хранятся в формате PlantUML:

- [Context](c4/context.puml) — пользователи и внешние системы.
- [Container](c4/container.puml) — Edge Functions и база данных.
- [Component](c4/component.puml) — компоненты функции `telegram-webhook`.

Диаграммы используют [C4-PlantUML из стандартной библиотеки PlantUML](https://github.com/plantuml/plantuml-stdlib#c4-library-c4-plantuml), поэтому дополнительные файлы библиотеки в репозитории не нужны.

Потребитель API обозначает любое приложение, которое вызывает функции `clients` и `messages`; отдельного интерфейса оператора в репозитории нет. Таблицы `clients` и `messages`, ограничения и триггер обновления `clients.last_message_at` определены в миграции `supabase/migrations/20260919160802_create_clients_and_messages.sql`.

Функция `clients` использует сценарий `application/list-all-pages.ts` и адаптер `client-reader.ts`. Функция `messages` использует сценарий `application/list-client-messages.ts`: проверяет параметры и возвращает одну страницу переписки выбранного клиента. Адаптер `message-reader.ts` фильтрует записи по клиенту и курсору; зависимости собираются в `infrastructure/message-dependencies.ts`.

Сообщения сортируются по `sent_at DESC, id DESC`. Курсор содержит ID клиента, время и ID последнего возвращённого сообщения. Следующая страница выбирает более старые записи, включая сообщения с тем же временем и меньшим ID. Индекс для этой выборки задан в миграции `supabase/migrations/20261005120000_add_messages_history_index.sql`.
