# Instagram Content Agent — Setup & Operations

Агент для органического роста Instagram-аккаунта AI MEDIA. Три контура:

1. **Референсы** — вы кидаете в Telegram-бота примеры контента (текст, ссылки,
   скриншоты). Claude разбирает каждый референс (хук, структура, тон) и
   складывает в библиотеку стиля.
2. **Контент** — команда `/generate` создаёт черновики постов на основе
   библиотеки и голоса бренда. Каждый черновик приходит в Telegram с кнопками
   ✅ Approve / ❌ Reject. Одобренные посты публикуются по расписанию (cron).
3. **Direct** — вебхук Meta принимает входящие сообщения, Claude отвечает в
   голосе бренда; лиды и сложные вопросы эскалируются вам в Telegram.

Автоматизация идёт **только через официальный Instagram Graph API** — никаких
неофициальных клиентов, масс-фолловинга и накруток (это прямой путь к бану).

## Architecture

```
Telegram (owner) ──▶ /api/telegram/webhook ──▶ reference library / drafts (Upstash Redis)
                                                    │
Vercel Cron ───────▶ /api/instagram/cron ──────────▶ Instagram Graph API (publish)
                                                    │
Instagram DM ──────▶ /api/instagram/webhook ──▶ Claude reply ──▶ Graph API (send DM)
                                                    └─▶ Telegram escalation
```

Код: `lib/instagram-agent/` (store, prompts, claude, instagram, telegram) +
три роута в `app/api/`.

## Prerequisites

1. **Instagram Business/Creator аккаунт**, привязанный к странице Facebook.
2. **Meta-приложение** на [developers.facebook.com](https://developers.facebook.com):
   - продукты: *Instagram* (API setup with Facebook login);
   - разрешения: `instagram_content_publish`, `instagram_manage_messages`
     (для ответов чужим пользователям потребуется App Review; в Dev Mode
     всё работает для админов/тестеров приложения — этого достаточно, чтобы
     запустить и отладить систему);
   - получите **долгоживущий access token** и **IG User ID** (Graph API
     Explorer → `me/accounts` → `instagram_business_account`).
3. **Telegram-бот** — создайте через [@BotFather](https://t.me/BotFather),
   сохраните токен.
4. **Upstash Redis** — бесплатная база на [upstash.com](https://upstash.com),
   нужны REST URL и REST TOKEN.
5. **Ключ Claude API** — [platform.claude.com](https://platform.claude.com).

## Setup

1. Заполните переменные из `.env.example` в Vercel → Project → Settings →
   Environment Variables (и в `.env.local` для локальной разработки).
2. Задеплойте проект.
3. **Telegram webhook:**
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://aimedia.global/api/telegram/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
   Отправьте боту `/start` — он ответит вашим chat id; впишите его в
   `TELEGRAM_OWNER_CHAT_ID` и передеплойте. После этого бот слушает только вас.
4. **Meta webhook:** в приложении Meta → Webhooks → Instagram → subscribe:
   - Callback URL: `https://aimedia.global/api/instagram/webhook`
   - Verify token: значение `IG_VERIFY_TOKEN`
   - Подписка на поле `messages`.
5. **Cron:** уже настроен в `vercel.json` (ежедневно 08:00 UTC). Меняйте
   `schedule` под свои слоты; на Vercel Hobby доступен только daily-запуск,
   на Pro — любая частота. `CRON_SECRET` в env включает защиту эндпоинта.

## Daily workflow

1. Кидаете референсы боту в любой момент — он подтверждает и показывает разбор.
2. `/generate 3` (или `/generate 2 про кейс с лидогенерацией`) — получаете
   черновики с кнопками.
3. Если у черновика нет картинки: отправьте фото с подписью `draft_<id>` —
   оно прикрепится.
4. ✅ Approve — пост встаёт в очередь; cron публикует по расписанию и
   присылает подтверждение.
5. Входящие DM обрабатываются сами; эскалации приходят в Telegram.

## Limits & honest notes

- **Instagram API**: до 50 публикаций в сутки; картинка должна быть доступна
  по публичному URL (Meta скачивает её сама).
- **Изображения из Telegram**: URL файла содержит токен бота. Для продакшена
  лучше перезаливать картинки в собственное хранилище (Vercel Blob / S3) —
  это следующий шаг развития.
- **v1 публикует одиночные изображения.** Карусели — расширение
  `publishImagePost` (создать несколько контейнеров + carousel container);
  Reels требуют готового видео по публичному URL.
- **24-часовое окно Direct**: бот может свободно отвечать в течение суток
  после последнего сообщения человека — для автоответов это ок, инициировать
  переписку первым нельзя.
- **Рост — от качества контента.** Агент даёт регулярность, мгновенные ответы
  и масштабирование удачных форматов; библиотека референсов — ядро качества,
  пополняйте её постоянно.

## Extending

- **Перезалив изображений**: `tgGetFileUrl` → скачивание → Vercel Blob → URL.
- **Карусели/Reels**: расширить `lib/instagram-agent/instagram.ts`.
- **Комментарии**: подписка на поле `comments` в том же вебхуке + разрешение
  `instagram_manage_comments`.
- **Аналитика**: Graph API insights → еженедельный отчёт в Telegram (второй
  cron) → скармливать агенту, чтобы он учился на своих результатах.
- **Автогенерация визуалов**: `imagePrompt` уже есть у каждого черновика —
  его можно отдавать в image-модель и прикреплять результат автоматически.
