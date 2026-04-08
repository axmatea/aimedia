# AI Media — Leads Sheet Setup (3 минуты)

Цель: завести Google Sheet в папке `AI Media Leads`, привязать к нему Apps Script-вебхук и вписать URL в Vercel. После этого форма сайта будет писать одновременно в Notion и в этот Sheet.

## 1. Создай таблицу

1. Открой папку: https://drive.google.com/drive/folders/1FG01i5aW6kR3iogqxBmOsq4Hr17EJSXv
2. `New → Google Sheets → Blank spreadsheet`
3. Назови: `AI Media — Inbound Leads`
4. Переименуй вкладку `Sheet1` → `Leads`
5. В первую строку вставь заголовки (по одному в столбец):

```
Timestamp	Name	Email	Phone	Project Type	Goal	Budget	Status	Source
```

## 2. Привяжи Apps Script

1. В той же таблице: `Extensions → Apps Script`
2. Удали весь дефолтный `function myFunction() {}`
3. Вставь код ниже:

```javascript
// Sheet columns: Timestamp | Name | Email | Phone | Project Type | Goal | Budget | Source
function doPost(e) {
  try {
    const SHEET_NAME = 'Leads';
    const body = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME)
      || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    sheet.appendRow([
      body.timestamp || new Date().toISOString(),
      body.name || '',
      body.email || '',
      body.phone || '',
      body.projectType || '',
      body.goal || '',
      body.budget || '',
      body.source || 'Website',
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, service: 'AI Media Leads Webhook' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. `Deploy → New deployment → ⚙ → Web app`
   - Description: `AI Media Leads Webhook v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. `Deploy` → при первом деплое Google попросит авторизацию: разреши.
6. Скопируй `Web app URL` (длинный URL вида `https://script.google.com/macros/s/.../exec`)

## 3. Отправь URL обратно мне

Пришли в чат: `SHEETS_WEBHOOK_URL=<URL>`.

Я:
1. Обновлю переменную в Vercel
2. Задеплою продакшн
3. Закину тестовый лид
4. Проверю, что он появился и в Notion, и в Sheet

## Что уже готово в коде

- `app/api/booking/route.ts` — теперь делает dual-write: `Promise.allSettled` на Notion и Sheets webhook. Email всегда идёт, даже если одна из систем упала.
- Схема строки совпадает с заголовками таблицы.
