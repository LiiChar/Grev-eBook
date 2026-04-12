# Анализ проекта Grev

## Общая информация

| Параметр | Значение |
|----------|----------|
| **Название** | Grev |
| **Версия** | 0.1.0 |
| **Тип** | Десктопное приложение для чтения электронных книг (e-book reader) |
| **Стек** | Tauri v2 + SolidJS + TypeScript + Rust |
| **Стили** | Tailwind CSS v4 (glassmorphism-дизайн) |
| **Дата анализа** | 12 апреля 2026 |

---

## 1. Архитектура проекта

### 1.1 Структура слоёв (Feature-Sliced Design-подобный подход)

```
src/                          ← Frontend (SolidJS)
├── pages/                    ← Маршрутизируемые страницы
│   ├── library/LibraryPage.tsx
│   ├── book/[id]/Book.tsx
│   ├── book/[id]/read/BookRead.tsx (1412 строк — самый большой файл)
│   ├── bookmarks/BookmarksPage.tsx
│   └── settings/SettingsPage.tsx
├── widgets/                  ← Крупные блоки
│   ├── book/                 ← Виджеты книг (Book, Books, BookView, Progress)
│   └── layout/               ← Layout-виджеты (AppLayout, Layout, Header, Footer, Sidebar, Breadcrumble)
├── components/               ← Переиспользуемые компоненты
│   ├── book/                 ← Карточки, списки, главы, читалка
│   ├── layout/               ← AddMenu, Search, ThemeSelector
│   └── reader/               ← SettingSidebar, TOCSidebar
├── shared/                   ← Общие модули
│   ├── api/                  ← Tauri invoke-функции (book, bookmarks, notes, reader)
│   ├── types/                ← TypeScript-типы (book, note, router)
│   ├── stores/               ← SolidJS stores (readerStore, settingsStore, toastStore)
│   ├── ui/                   ← Базовые UI-компоненты (10 файлов)
│   ├── utils/                ← Утилиты (10 файлов)
│   └── hooks/                ← Кастомные хуки (useClickOutside)
├── assets/                   ← Шрифты, логотип, стили
├── Router.tsx                ← HashRouter с маршрутами
├── index.tsx                 ← Точка входа
└── index.css                 ← Глобальные стили, дизайн-токены

src-tauri/                    ← Backend (Rust/Tauri)
├── src/
│   ├── main.rs               ← Точка входа (отключает консоль на Windows)
│   ├── lib.rs                ← Ядро инициализации Tauri
│   ├── state/                ← AppState и хранилища (book, bookmark, note, reader, setting)
│   ├── commands/             ← Tauri-команды (book.rs, reader.rs)
│   └── core/                 ← Доменная модель
│       ├── book/             ← Модели Book, Chapter, BookMeta
│       ├── formats/          ← Система загрузки: TXT, EPUB, FB2, HTML, Markdown, PDF, DOCX
│       ├── reader/           ← Модели читалки (position, session, bookmarks, notes)
│       ├── storage/          ← Persist-слой для Tauri Store
│       └── utils/            ← Утилиты (file, text)
├── capabilities/default.json ← Политики безопасности Tauri v2
├── tauri.conf.json           ← Конфигурация Tauri
├── Cargo.toml                ← Манифест Rust
└── bin/                      ← Бинарные зависимости (pdfium.dll, poppler/)
```

### 1.2 Общее количество файлов

| Категория | Количество |
|-----------|------------|
| Frontend (.ts/.tsx) | ~55 |
| Backend (.rs) | ~30 |
| Конфигурация | ~10 |
| **Итого** | **~95** |

---

## 2. Frontend-архитектура

### 2.1 Роутинг

Hash-based роутинг через `@solidjs/router`:

| Маршрут | Компонент | Описание |
|---------|-----------|----------|
| `/` | `LibraryPage` | Библиотека книг (сетка/список) |
| `/book/:id` | `BookDetailPage` | Детали книги (обложка, метаданные, содержание) |
| `/book/:id/read` | `ReaderPage` | Читалка (основной функционал) |
| `/bookmarks` | `BookmarksPage` | Закладки и заметки |
| `/settings` | `SettingsPage` | Настройки приложения |
| `*404` | inline | Страница не найдена |

### 2.2 State Management

#### SolidJS Stores (клиентские)

| Store | Файл | Назначение |
|-------|------|------------|
| `readerStore` | `shared/stores/readerStore.ts` | Текущая книга, книги, главы, currentIndex |
| `settingsStore` | `shared/stores/settingsStore.ts` | Тема, размер шрифта, межстрочный интервал, ширина колонки, UI-настройки |
| `toastStore` | `shared/stores/toastStore.ts` | Toast-уведомления (success, error, warning) |

#### Tauri Store (персистентное хранилище на стороне Rust)

Хранит: книги, настройки, сессии чтения, закладки, заметки. Сериализация в `store.json`.

### 2.3 Управление состоянием читалки

**Сигналы (createSignal) в ReaderPage**: book, isLoading, showControls, showToc, showSettings, isFullscreen, bookmarks, notes, viewMode, nodeEditing

**Computed-значения (createMemo)**: sortedChapters, currentChapter, hasMultipleChapters, progress

### 2.4 Ключевые компоненты

#### ReaderPage (BookRead.tsx) — 1412 строк

Самый сложный файл. Содержит:
- Загрузку и отображение книги
- Два режима просмотра: "Свиток" (scroll) и "Главы" (chapters)
- Систему заметок: выделение текста → popup-редактор с color picker
- Добавление закладок с текстовым превью
- Автосохранение позиции (debounce на scroll)
- Автоскрытие панелей (таймер 1200ms, реагирует на скролл/мышь)
- Полноэкранный режим
- Горячие клавиши (закомментированы)
- TOC Sidebar (оглавление)
- SettingSidebar (настройки шрифта)

### 2.5 Поддерживаемые темы

4 темы оформления: **light**, **dark**, **sepia**, **night**

Реализованы через CSS-классы на `<html>` и CSS custom properties (@theme в index.css).

### 2.6 API-слой (взаимодействие с Tauri)

| API | Файл | Основные функции |
|-----|------|-----------------|
| Book | `shared/api/book.ts` | `openBook(path)`, `getBooks()` |
| Bookmarks | `shared/api/bookmarks.ts` | CRUD закладок |
| Notes | `shared/api/notes.ts` | CRUD заметок |
| Reader | `shared/api/reader.ts` | Сессии чтения, позиция, настройки |

---

## 3. Backend-архитектура (Rust/Tauri)

### 3.1 AppState (глобальное состояние)

```rust
AppState {
    book: BookStore,           // Vec<Book> — библиотека
    setting: SettingStore,     // настройки (тема, шрифт, UI)
    reader: ReaderState,       // сессии чтения (HashMap<String, ReadingSession>)
    bookmarks: BookmarkStore,  // Vec<Bookmark>
    notes: NoteStore,          // Vec<Note>
}
```

Управляется через `Arc<Mutex<AppState>>` и Tauri state management.

### 3.2 Tauri-команды

#### Команды книг (`commands/book.rs`)

| Команда | Описание |
|---------|----------|
| `add_books` | Добавить папку с книгами |
| `add_book` | Добавить один файл |
| `open_book` | Открыть книгу с загрузкой глав |
| `get_books` | Получить список книг |
| `get_book` | Получить одну книгу |
| `clear_store` | Очистить всё |

#### Команды читалки (`commands/reader.rs`)

| Команда | Описание |
|---------|----------|
| `get_reader_state` | Получить состояние читалки |
| `set_current_book` | Установить текущую книгу |
| `save_reading_position` | Сохранить позицию |
| `get_reading_position` | Получить позицию |
| `add_bookmark` / `get_bookmarks` / `delete_bookmark` | CRUD закладок |
| `add_note` / `update_note` / `delete_note` / `get_notes` | CRUD заметок |
| `get_settings` / `update_settings` | Настройки |

### 3.3 Система загрузки форматов

**Трейт `BookSource`**:
```rust
trait BookSource {
    fn can_load(path: &str) -> bool;  // Проверка по расширению
    fn load(path: &str, load_chapters: bool) -> Result<Book>;
    fn decode_text(bytes: &[u8]) -> String;  // Автоопределение кодировки
}
```

**Фабрика загрузчиков** (7 штук):

| Формат | Файл | Описание |
|--------|------|----------|
| TXT | `formats/txt/txt.rs` | UTF-8 → Windows-1251 fallback |
| EPUB | `formats/epub/epub.rs` | zip → container.xml → OPF → XHTML главы |
| FB2 | `formats/fb2/fb2.rs` | XML-парсинг, поддержка .zip |
| HTML | `formats/html/html.rs` | Одна глава, UTF-8 с fallback |
| Markdown | `formats/markdown/markdown.rs` | pulldown-cmark → HTML |
| PDF | `formats/pdf/pdf.rs` (~838 строк) | pdfium-render: извлечение текста/изображений, классификация блоков |
| PDF (альт.) | `formats/pdf/pdftohtml.rs` (~800 строк) | poppler pdftohtml.exe: парсинг CSS, позиционирование |
| DOCX | `formats/docx/docx.rs` | docx-rust + zip: параграфы, таблицы, изображения |

### 3.4 Персистентность

**Файл**: `core/storage/mod.rs`

- `STORE_PATH = "store.json"`
- `SCHEMA_VERSION = 1`
- Миграция v0 → v1: нормализация ключей (`book` → `books`, `setting` → `settings`)
- Каждая мутация состояния немедленно сохраняется через `persist()`

### 3.5 Модели данных

#### Book
```rust
Book { id, meta: BookMeta, chapters: Vec<Chapter> }
BookMeta { title, author, language, cover, path }
Chapter { id, title, html, order }
```

#### ReadingPosition
```rust
ReadingPosition { chapter_id, anchor_text, before, after }
```

#### Bookmark
```rust
Bookmark { id, book_path, position, preview, kind, created_at }
```

#### Note
```rust
Note { id, preview, book_path, range: TextRange, text, highlight, highlight_color, created_at, updated_at }
```

---

## 4. Дизайн-система

### 4.1 UI-компоненты

| Компонент | Файл | Описание |
|-----------|------|----------|
| Button | `shared/ui/Button.tsx` | primary/secondary/ghost, sm/md/lg/icon |
| GlassButton | `shared/ui/GlassButton.tsx` | Glassmorphism-кнопка |
| GlassPanel | `shared/ui/GlassPanel.tsx` | Glassmorphism-контейнер |
| Icon | `shared/ui/Icon.tsx` | ~25 SVG-иконок (Heroicons-стиль) |
| Loader | `shared/ui/Loader.tsx` | BookLoader (анимация page-flip) |
| Modal | `shared/ui/Modal.tsx` | Модальное окно |
| Select | `shared/ui/Select.tsx` | Dropdown |
| Toaster | `shared/ui/Toaster.tsx` | Toast-уведомления |
| ToggleSwitch | `shared/ui/ToggleSwitch.tsx` | Toggle/checkbox |
| Hotkey | `shared/ui/Hotkey.tsx` | Отображение горячей клавиши |

### 4.2 Дизайн-токены (CSS custom properties)

Реализованы в `index.css` через `@theme`:
- Цвета: `--background`, `--foreground`, `--primary`, `--border`, `--surface`, и т.д.
- Шрифты: `--font-reader` (Literata), `--font-ui` (Inter), `--font-mono`
- Reader: `--reader-font-size`, `--reader-line-height`, `--reader-max-width`, `--reader-font-family`
- Glassmorphism: backdrop-blur, прозрачность, границы

### 4.3 Шрифты

| Шрифт | Назначение | Формат |
|-------|------------|--------|
| Literata Variable (200-900) | Текст чтения | TTF |
| Inter Variable (100-900) | UI-элементы | TTF |

---

## 5. Ключевые особенности приложения

### 5.1 Читалка

1. **Два режима просмотра**: "Свиток" (непрерывный скролл всех глав) и "Главы" (постраничная навигация)
2. **Система заметок**: выделение текста → wrap в `<mark>` с цветом → popup-редактор с color picker и текстовым полем
3. **Закладки**: сохранение позиции чтения с текстовым превью
4. **Автосохранение позиции**: debounce на scroll-событии с `getReadingAnchor` / `saveReadingPosition`
5. **Автоскрытие панелей**: таймер 1200ms, реагирует на скролл вверх, движение мыши к краю экрана
6. **Полноэкранный режим**: Fullscreen API браузера
7. **Настройки**: размер шрифта (12-32px), межстрочный интервал (1.2-2.5), ширина колонки (400-1200px)

### 5.2 Библиотека

- Сетка/список книг с обложками и прогрессом чтения
- Импорт книг (папка/файл) через Tauri dialog
- Поиск по библиотеке

### 5.3 Закладки и заметки

- Страница с табами "Закладки" / "Заметки"
- Фильтрация по книге, группировка по книгам
- Навигация к месту в книге по клику

---

## 6. Зависимости

### 6.1 Frontend

| Пакет | Версия | Назначение |
|-------|--------|------------|
| solid-js | ^1.9.3 | Реактивный фреймворк |
| @solidjs/router | ^0.15.4 | Роутинг |
| @tauri-apps/api | ^2 | Tauri API |
| tailwindcss | ^4.1.18 | Стили |
| @tailwindcss/vite | ^4.1.18 | Vite-плагин Tailwind |
| @tailwindcss/typography | ^0.5.19 | Типографика |
| virtua | ^0.48.3 | Виртуализация списков |

### 6.2 Backend (Rust)

| Крат | Назначение |
|------|------------|
| tauri + plugins | Tauri v2, store, dialog, opener, log |
| serde + serde_json | Сериализация |
| pdfium-render | Нативный рендеринг PDF |
| pulldown-cmark | Markdown → HTML |
| kuchiki, quick-xml, xmltree, roxmltree | XML/HTML-парсинг |
| zip | Распаковка архивов (EPUB, FB2.zip, DOCX) |
| encoding_rs | Определение кодировок |
| docx-rust | Парсинг DOCX |
| lol_html, html-escape | Обработка HTML |
| tokio | Асинхронность |

---

## 7. Горячие клавиши

Реализация в коде **закомментирована** (строки ~244-275 в BookRead.tsx):
- ArrowRight/PageDown — следующая глава
- ArrowLeft/PageUp — предыдущая глава
- Escape — закрыть сайдбары/выйти из fullscreen
- KeyF — полный экран
- KeyT — оглавление
- KeyB — закладка

---

## 8. Бинарные зависимости

| Файл | Назначение |
|------|------------|
| `bin/pdfium.dll` | PDFium для pdfium-render (PDF) |
| `bin/poppler/` | Poppler утилиты (pdftohtml.exe, pdftotext.exe, pdfinfo.exe + DLL) |

---

## 9. Поддерживаемые форматы

| Формат | Расширения | Загрузчик |
|--------|------------|-----------|
| TXT | .txt | TxtLoader |
| EPUB | .epub | EpubLoader |
| FB2 | .fb2, .fb2.zip | Fb2Loader |
| HTML | .html, .htm | HtmlLoader |
| Markdown | .md, .markdown | MarkdownLoader |
| PDF | .pdf | PdfLoader (pdfium + poppler fallback) |
| DOCX | .docx | DocxLoader |

---

## 10. Конфигурация сборки

### 10.1 Vite

- Порт: 1420 (фиксированный для Tauri)
- Плагины: solid(), tailwindcss()
- HMR: ws://host:1421
- Ignored: src-tauri/**, public/**

### 10.2 TypeScript

- Target: ES2020
- JSX: preserve (solid-js)
- Strict mode: включён
- noUnusedLocals/Parameters: включены

### 10.3 Tauri

- Identifier: com.litav.grev
- Окно: 800x600, без декораций
- CSP: отключён

---

## 11. Структура БД (store.json)

```json
{
  "schema_version": 1,
  "books": [...],
  "settings": {
    "general": { "theme": "light" },
    "reader": { "font_family": "serif", "font_size": 18, "line_height": 1.6, "column_width": 720 },
    "hotkeys": {},
    "ui": { "auto_hide": true, "animations": true, "distraction_free": false }
  },
  "reader_state": {
    "current_book_path": "...",
    "last_session_book_path": "...",
    "sessions": { "path": { "position": {...}, "mode": "scroll", ... } }
  },
  "bookmarks": [...],
  "notes": [...]
}
```

---

## 12. Итоговая оценка

| Критерий | Оценка | Комментарий |
|----------|--------|-------------|
| Архитектура | ★★★☆☆ | Слоистая структура есть, но нарушена (см. файл ошибок) |
| Код-качество | ★★☆☆☆ | Один файл на 1412 строк, дублирование, закомментированный код |
| Производительность | ★★★☆☆ | Виртуализация есть, но не везде; debounce сохранение |
| Безопасность | ★★★☆☆ | CSP отключён, все команды разрешены |
| Документация | ★☆☆☆☆ | Минимальный README, нет комментариев в коде |
| Тестирование | ☆☆☆☆☆ | Тесты полностью отсутствуют |
| Поддерживаемость | ★★☆☆☆ | Высокая связанность, God Object ReaderPage |

---

*Файл сгенерирован автоматически на основе анализа 95 файлов проекта.*
