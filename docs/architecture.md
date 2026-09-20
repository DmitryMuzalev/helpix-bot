# Архитектура Helpix Bot

Диаграммы C4 отражают текущую реализацию и хранятся в формате PlantUML:

- [Context](c4/context.puml) — пользователи и внешние системы.
- [Container](c4/container.puml) — Edge Functions и база данных.
- [Component](c4/component.puml) — компоненты функции `telegram-webhook`.

Диаграммы используют [C4-PlantUML из стандартной библиотеки PlantUML](https://github.com/plantuml/plantuml-stdlib#c4-library-c4-plantuml), поэтому дополнительные файлы библиотеки в репозитории не нужны.

Потребитель API обозначает любое приложение, которое вызывает функции `clients` и `messages`; отдельного интерфейса оператора в репозитории нет. Таблицы `clients` и `messages`, ограничения и триггер обновления `clients.last_message_at` определены в миграции `supabase/migrations/20260919160802_create_clients_and_messages.sql`.

Функции `clients` и `messages` используют общий сценарий `application/list-all-pages.ts` и отдельные адаптеры чтения `client-reader.ts` и `message-reader.ts`.
