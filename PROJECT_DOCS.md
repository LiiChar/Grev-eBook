# 📖 Grev — Полная документация проекта

> Десктопное приложение для чтения электронных книг  
> Стек: **Tauri v2 + SolidJS + TypeScript + Rust**  
> Стили: **Tailwind CSS v4** (glassmorphism-дизайн)  
> Версия: **0.1.0**

---

## Оглавление

1. [Что такое Grev](#1-что-такое-grev)
2. [Архитектура на птичьем уровне](#2-архитектура-на-птичьем-уровне)
3. [Структура проекта](#3-структура-проекта)
4. [Как работает приложение (поток данных)](#4-как-работает-приложение-поток-данных)
5. [Frontend (SolidJS)](#5-frontend-solidjs)
6. [Backend (Rust/Tauri)](#6-backend-rusttauri)
7. [Система состояний (State Management)](#7-система-состояний-state-management)
8. [Читалка — главный компонент](#8-читалка--главный-компонент)
9. [Система заметок](#9-система-заметок)
10. [Система закладок](#10-система-закладок)
11. [Форматы книг и загрузчики](#11-форматы-книг-и-загрузчики)
12. [Персистентность (сохранение данных)](#12-персистентность-сохранение-данных)
13. [Кэширование глав](#13-кэширование-глав)
14. [Дизайн-система и темы](#14-дизайн-система-и-темы)
15. [Маршруты (Routing)](#15-маршруты-routing)
16. [Tauri-команды (IPC API)](#16-tauri-команды-ipc-api)
17. [Модели данных](#17-модели-данных)
18. [Горячие клавиши](#18-горячие-клавиши)
19. [Конфигурация сборки](#19-конфигурация-сборки)
20. [Бинарные зависимости](#20-бинарные-зависимости)
21. [Как запустить проект](#21-как-запустить-проект)
22. [Ключевые файлы с описанием](#22-ключевые-файлы-с-описанием)

---

## 1. Что такое Grev

**Grev** — это десктопное приложение для чтения электронных книг. Оно позволяет:

- **Импортировать книги** из файлов или папок (поддерживает 7 форматов)
- **Просматривать библиотеку** в виде сетки или списка с обложками и прогрессом
- **Читать книги** в двух режимах: «Свиток» (непрерывный скролл) и «Главы» (постраничная навигация)
- **Делать заметки** — выделяете текст → появляется popup с color picker и полем для текста
- **Ставить закладки** — сохраняют позицию чтения с текстовым превью
- **Настраивать читалку** — размер шрифта, межстрочный интервал, ширина колонки, шрифт
- **Переключать темы** — light / dark / sepia / night

Приложение работает **локально** — все данные хранятся в файле `store.json` на компьютере пользователя.

---

## 2. Архитектура на птичьем уровне

```
┌─────────────────────────────────────────────────────────────┐
│                    Десктопное окно (Tauri)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Frontend (SolidJS)                     │   │
│  │                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │  Pages   │  │  Hooks   │  │  Stores  │          │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │   │
│  │       │              │              │                │   │
│  │       └──────────────┴──────────────┘                │   │
│  │                      │                               │   │
│  │              Tauri invoke() ◄─────────────────────── │   │
│  └──────────────────────┼──────────────────────────────┘   │
│                         │ IPC                               │
│  ┌──────────────────────┼──────────────────────────────┐   │
│  │               Backend (Rust)        │                │   │
│  │                         │                            │   │
│  │  ┌──────────┐  ┌────────┴──────┐  ┌──────────────┐ │   │
│  │  │ Commands │  │   AppState    │  │   Formats    │ │   │
│  │  │  (Tauri) │◄─┤ (Arc<RwLock>) │  │  (loaders)   │ │   │
│  │  └──────────┘  └───────────────┘  └──────────────┘ │   │
│  │                         │                            │   │
│  │                  ┌──────┴──────┐                     │   │
│  │                  │ store.json  │  ┌──────────────┐  │   │
│  │                  │  (persist)  │  │ chapter cache│  │   │
│  │                  └─────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Главный принцип:** Frontend вызывает команды через `invoke()`, Rust выполняет работу, возвращает результат. Все мутации состояния сохраняются в `store.json`.

---

## 3. Структура проекта

```
Grev/
│
├── src/                              ← FRONTEND (SolidJS + TypeScript)
│   ├── index.tsx                     ← Точка входа: render(<App />)
│   ├── index.css                     ← Глобальные стили + дизайн-токены
│   ├── Router.tsx                    ← HashRouter с маршрутами
│   │
│   ├── pages/                        ← Маршрутизируемые страницы
│   │   ├── library/
│   │   │   └── LibraryPage.tsx       ← Библиотека (сетка/список книг)
│   │   ├── book/[id]/
│   │   │   ├── Book.tsx              ← Детали книги (обложка, метаданные)
│   │   │   └── read/
│   │   │       └── BookRead.tsx      ← 📖 ЧИТАЛКА (~344 строки, оркестратор)
│   │   ├── bookmarks/
│   │   │   └── BookmarksPage.tsx     ← Закладки и заметки (табы)
│   │   └── settings/
│   │       └── SettingsPage.tsx      ← Настройки приложения
│   │
│   ├── features/                     ← Доменная логика
│   │   ├── reader/
│   │   │   ├── hooks/                ← 7 хуков читалки:
│   │   │   │   ├── useBookLoader.ts      ← Загрузка книги + закладок + заметок
│   │   │   │   ├── useReadingPosition.ts ← Debounce сохранение позиции
│   │   │   │   ├── useNotesManager.ts    ← CRUD заметок, DOM-wrapping в <mark>
│   │   │   │   ├── useBookmarksManager.ts← Управление закладками
│   │   │   │   ├── useAutoHideControls.ts← Автоскрытие панелей (1200ms)
│   │   │   │   ├── useKeyboardShortcuts.ts← Горячие клавиши
│   │   │   │   └── useFullscreen.ts      ← Fullscreen API
│   │   │   ├── components/           ← 4 компонента читалки:
│   │   │   │   ├── ReaderContent.tsx     ← Рендеринг глав (scroll/chapters)
│   │   │   │   ├── ReaderToolbar.tsx     ← Тулбар (TOC, настройки, закладка)
│   │   │   │   ├── ReaderFooter.tsx      ← Навигация по главам
│   │   │   │   └── ReaderNotePopup.tsx   ← Popup редактора заметки
│   │   │   └── types/
│   │   │       └── readerTypes.ts    ← Типы NoteEditorState
│   │   ├── library/
│   │   │   └── components/
│   │   │       └── Skeleton.tsx      ← Скелетон загрузки библиотеки
│   │
│   ├── widgets/                      ← Крупные layout-блоки
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx         ← Корневой layout: Sidebar + main + Toaster
│   │   │   ├── Sidebar.tsx           ← Боковая навигация (сворачивается)
│   │   │   ├── MobileNav.tsx         ← Мобильная навигация
│   │   │   └── MobilePadding.tsx     ← Отступ для мобильных
│   │
│   ├── components/                   ← Переиспользуемые компоненты
│   │   ├── layout/
│   │   │   ├── AddMenu.tsx           ← Меню добавления книг
│   │   │   ├── Search.tsx            ← Поиск по библиотеке
│   │   │   └── ThemeSelector.tsx     ← Выбор темы
│   │   ├── book/                     ← Карточки книг, списки
│   │   └── reader/
│   │       ├── SettingSidebar.tsx    ← Сайдбар настроек читалки
│   │       └── TOCSidebar.tsx        ← Сайдбар оглавления
│   │
│   ├── shared/                       ← Общие модули (cross-cutting)
│   │   ├── api/                      ← Tauri invoke-обёртки
│   │   │   ├── book.ts               ← getBooks, openBook, addBooks, addBook
│   │   │   ├── bookmarks.ts          ← addBookmark, getBookmarks, deleteBookmark
│   │   │   ├── notes.ts              ← addNote, getNotes, updateNote, deleteNote
│   │   │   ├── reader.ts             ← saveReadingPosition, getReadingPosition
│   │   │   └── settings.ts           ← getSettings, updateSettings, типы
│   │   ├── stores/                   ← SolidJS stores (createStore)
│   │   │   ├── readerStore.ts        ← { books, chapters, currentIndex, bookId }
│   │   │   ├── settingsStore.ts      ← { general, reader, hotkeys, ui }
│   │   │   └── toastStore.ts         ← Toast-уведомления
│   │   ├── types/                    ← TypeScript-типы
│   │   │   ├── book.ts               ← Book, BookMeta, Chapter
│   │   │   ├── note.ts               ← Note, TextRange, TextLocation
│   │   │   └── router.ts             ← BookPageParams
│   │   ├── ui/                       ← UI-примитивы (10 файлов)
│   │   │   ├── Button.tsx, GlassButton.tsx, GlassPanel.tsx
│   │   │   ├── Icon.tsx (~25 SVG иконок)
│   │   │   ├── Loader.tsx (BookLoader с анимацией page-flip)
│   │   │   ├── Modal.tsx, Select.tsx, Toaster.tsx
│   │   │   ├── ToggleSwitch.tsx, Hotkey.tsx
│   │   ├── utils/                    ← Утилиты (10 файлов)
│   │   │   ├── anchor.ts             ← getReadingAnchor, scrollToAnchor
│   │   │   ├── chapter.ts            ← splitChapter
│   │   │   ├── color.ts              ← isHexLight
│   │   │   ├── common.ts             ← debounce
│   │   │   ├── file.ts               ← getFileExtension
│   │   │   ├── html.ts               ← stripHtml
│   │   │   ├── position.ts           ← Работа с позицией
│   │   │   ├── reader.ts             ← Утилиты читалки
│   │   │   ├── scroll.ts             ← scrollToTop
│   │   │   └── cn.ts                 ← Утилита классов
│   │   └── hooks/
│   │       └── useSelection.ts       ← Хук выделения текста (selectionchange)
│   │
│   └── assets/
│       ├── fonts/
│       │   ├── Literata-Variable.ttf  ← Шрифт для чтения
│       │   └── Inter-Variable.ttf     ← Шрифт для UI
│       ├── logo.png
│       └── styles/
│           └── reader.css             ← Стили читалки (.reader, .chapter)
│
├── src-tauri/                        ← BACKEND (Rust + Tauri)
│   ├── src/
│   │   ├── main.rs                   ← Точка входа (отключает консоль на Win)
│   │   ├── lib.rs                    ← Инициализация Tauri, регистрация команд
│   │   ├── state/
│   │   │   ├── mod.rs                ← AppState { book, setting, reader, bookmarks, notes }
│   │   │   ├── book.rs               ← BookStore (Vec<Book>)
│   │   │   ├── setting.rs            ← SettingStore
│   │   │   ├── reader.rs             ← ReaderState (HashMap сессий)
│   │   │   ├── bookmark.rs           ← BookmarkStore
│   │   │   └── note.rs               ← NoteStore
│   │   ├── commands/
│   │   │   ├── book.rs               ← Команды работы с книгами
│   │   │   └── reader.rs             ← Команды читалки (позиция, закладки, заметки, настройки)
│   │   └── core/
│   │       ├── book/
│   │       │   ├── mod.rs
│   │       │   └── model.rs          ← Book, BookMeta, Chapter
│   │       ├── reader/
│   │       │   ├── mod.rs
│   │       │   ├── position.rs       ← ReadingPosition, TextLocation
│   │       │   ├── session.rs        ← ReadingSession, ReaderMode
│   │       │   ├── bookmarks.rs      ← Bookmark, BookmarkKind
│   │       │   └── notes.rs          ← Note, TextRange
│   │       ├── formats/
│   │       │   ├── loader.rs         ← BookSource trait, фабрика, get_book(s)
│   │       │   ├── epub/epub.rs      ← EPUB-парсер (ZIP→OPF→XHTML)
│   │       │   ├── fb2/fb2.rs        ← FB2-парсер (XML, поддержка .zip)
│   │       │   ├── txt/txt.rs        ← TXT-парсер (UTF-8 + Windows-1251 fallback)
│   │       │   ├── html/html.rs      ← HTML-парсер (одна глава)
│   │       │   ├── markdown/markdown.rs ← Markdown→HTML (pulldown-cmark)
│   │       │   ├── pdf/
│   │       │   │   ├── pdf.rs        ← PDF через pdfium-render (~838 строк)
│   │       │   │   └── pdftohtml.rs  ← PDF через poppler pdftohtml (~800 строк)
│   │       │   └── docx/docx.rs      ← DOCX-парсер (docx-rust + zip)
│   │       ├── storage/
│   │       │   └── mod.rs            ← load_state, save_state, migrate, persist
│   │       ├── cache/
│   │       │   └── mod.rs            ← ChapterCache (disk-based, SHA256)
│   │       └── utils/
│   │           ├── file.rs           ← get_files_with_extension (рекурсия)
│   │           └── text.rs           ← нормализация текста
│   │
│   ├── capabilities/
│   │   └── default.json              ← Политики безопасности Tauri v2
│   ├── tauri.conf.json               ← Конфиг Tauri (окно, bundle, ресурсы)
│   ├── Cargo.toml                    ← Манифест Rust-зависимостей
│   ├── build.rs                      ← Build-скрипт
│   ├── icons/                        ← Иконки приложения
│   └── bin/
│       ├── pdfium.dll                ← PDFium (рендеринг PDF)
│       └── poppler/                  ← Poppler (pdftohtml.exe, DLL)
│
├── public/                           ← Статические файлы (шрифты, logo)
├── package.json                      ← Зависимости Node.js
├── vite.config.ts                    ← Конфиг Vite (порт 1420, solid, tailwind)
├── tailwind.config.js                ← Конфиг Tailwind
├── tsconfig.json                     ← Конфиг TypeScript
├── index.html                        ← HTML-шаблон
└── yarn.lock                         ← Lock-файл зависимостей
```

---

## 4. Как работает приложение (поток данных)

### 4.1 Запуск приложения

```
1. main.rs (Rust) → run() → инициализация Tauri
2. lib.rs → setup() → загрузка store.json → load_state() → миграция v0→v1
3. lib.rs → app.manage(Arc<RwLock<AppState>>) — глобальное состояние
4. lib.rs → ChapterCache::new() → prune(30 дней) — очистка кэша
5. Frontend: index.tsx → render(<Router />)
6. AppLayout onMount → loadSettings() → getSettings() из backend → applyTheme()
```

### 4.2 Импорт книг

```
User → AddMenu → @tauri-apps/plugin-dialog (open) → путь к файлу/папке
  → addBooks(path) / addBook(path) → invoke("add_books" / "add_book")
    → Rust: spawn_blocking → collect_book_paths → gBook() для каждого файла
    → format dispatch: BookSource::can_load() → BookSource::load()
    → Обновление state.book.books → persist(store.json)
    → Возврат Vec<Book> → setReader({ books }) → UI обновляется
```

### 4.3 Открытие книги (читалка)

```
User кликает на книгу → navigate(`/book/:id`) → BookDetailPage
  → User кликает "Читать" → navigate(`/book/:id/read`) → ReaderPage
    → useBookLoader.loadBook({ bookId })
      → openBook(path) → invoke("open_book")
        → Rust: gBook(path, chapters=true) → загрузка глав из файла
        → Обновление state.book.books[idx].chapters → persist
        → Возврат Book с главами
      → getBookmarks(book_path) → setBookmarks
      → getNotes(book_path) → setNotes
      → getReadingPosition(book_path) → restoredPosition
    → ReaderContent рендерит главы (scroll/chapters mode)
    → scrollToAnchor(restoredPosition) — восстановление позиции
```

### 4.4 Сохранение позиции чтения

```
User скроллит → onScroll → createScrollSaveHandler() (debounce 500ms)
  → getReadingAnchor(contentEl, chapterId)
    → TreeWalker → текст в центре экрана → ReadingPosition { anchor_text, before, after }
  → saveReadingPosition(bookPath, position, mode) → invoke("save_reading_position")
    → Rust: state.reader.sessions[bookPath].position = position → persist
```

### 4.5 Создание заметки

```
User выделяет текст → useSelection() → onSelect(range, selection)
  → handleAddNote({ contentEl, chapterId })
    → findTextOffset() → getTextOffsetsInRoot() → TextRange { start, end }
    → wrapRangeWithMarks(range, noteId, color) — оборачивает в <mark data-note="...">
    → setNodeEditing({ visible: true, position: {x, y}, ... })
      → ReaderNotePopup появляется с color picker + textarea
    → User пишет текст → createNote({ bookPath })
      → addNote(bookPath, range, text, preview, highlight, color) → invoke("add_note")
        → Rust: Note::new() → state.notes.items.push → persist
      → data-note обновляется с временного ID на реальный UUID
      → closeNoteEditor('saved') → toast.success("Заметка добавлена")
```

---

## 5. Frontend (SolidJS)

### 5.1 Точка входа

**`src/index.tsx`** — всего 4 строки:
```tsx
import { render } from "solid-js/web";
import './index.css';
import App from "./Router";

render(() => <App />, document.getElementById("root") as HTMLElement);
```

### 5.2 Роутинг

**`src/Router.tsx`** — HashRouter с 5 маршрутами:

| Маршрут | Компонент | Что делает |
|---------|-----------|------------|
| `/` | `LibraryPage` | Главная — библиотека книг |
| `/book/:id` | `BookDetailPage` | Страница деталей книги |
| `/book/:id/read` | `ReaderPage` | 📖 Читалка |
| `/bookmarks` | `BookmarksPage` | Закладки + заметки |
| `/settings` | `SettingsPage` | Настройки |

### 5.3 Root Layout

**`src/widgets/layout/AppLayout.tsx`**:
```tsx
<AppLayout>
  ├── Sidebar          ← Навигация (скрывается на странице читалки)
  ├── <main>           ← Контент маршрута (children)
  ├── MobileNav        ← Мобильная навигация
  └── Toaster          ← Toast-уведомления
</AppLayout>
```

На `onMount` загружает настройки: `loadSettings()`.

### 5.4 SolidJS Stores

#### readerStore (`src/shared/stores/readerStore.ts`)

```ts
const [reader, setReader] = createStore({
  bookId: "",
  chapters: [] as Chapter[],
  books: await getBooks() ?? [] as Book[],  // Загружается при импорте модуля!
  currentIndex: 0,
});

// Хелперы
export const getBook = (path: string) => reader.books.find(b => b.meta.path === path);
export const getChapter = (bookPath, chapterId) => ...;
```

**Ключевая особенность:** `books` загружается **автоматически** при импорте модуля через `await getBooks()`.

#### settingsStore (`src/shared/stores/settingsStore.ts`)

```ts
const [settings, setSettings] = createStore<SettingStore>(getDefaultSettings());
```

Содержит 4 подсекции:
- `general` — тема, путь библиотеки, запоминание последней книги
- `reader` — шрифт, размер, межстрочный интервал, ширина колонки, режим
- `hotkeys` — горячие клавиши
- `ui` — автоскрытие, анимации, режим без отвлечений

**Ключевые функции:**
- `setTheme(theme)` → удаляет CSS-классы → добавляет новую тему → persist
- `setFontSize(size)` → `--reader-font-size` CSS variable → persist
- `setLineHeight(height)` → `--reader-line-height` CSS variable → persist
- `setColumnWidth(width)` → `--reader-max-width` CSS variable → persist

Все сеттеры **сразу применяют DOM-изменения** и затем асинхронно сохраняют в backend.

#### toastStore (`src/shared/stores/toastStore.ts`)

Простой toast-менеджер:
```ts
toast.success("Заметка добавлена");
toast.error("Не удалось загрузить книгу");
toast.warning("...");
toast.info("...");
```

### 5.5 API-слой (обёртки над Tauri invoke)

Все API-файлы следуют одному паттерну:
```ts
import { invoke } from "@tauri-apps/api/core";

export async function functionName(params): Promise<T> {
  return invoke<T>("tauri_command_name", { params });
}
```

| Файл | Функции |
|------|---------|
| `api/book.ts` | `getBook(id)`, `getBooks()`, `addBooks(path)`, `addBook(path)`, `openBook(path)`, `clearStore()` |
| `api/reader.ts` | `getReaderState()`, `setCurrentBook(bookPath)`, `saveReadingPosition(...)`, `getReadingPosition(bookPath)` |
| `api/bookmarks.ts` | `addBookmark(...)`, `getBookmarks(bookPath?)`, `deleteBookmark(id)`, `getBookmark(id)` |
| `api/notes.ts` | `addNote(...)`, `getNotes(bookPath?)`, `updateNote(...)`, `deleteNote(id)` |
| `api/settings.ts` | `getSettings()`, `updateSettings(settings)`, `getDefaultSettings()` |

---

## 6. Backend (Rust/Tauri)

### 6.1 Точка входа

**`src-tauri/src/main.rs`**:
```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
fn main() {
    grev_lib::run();
}
```

**`src-tauri/src/lib.rs`** — ядро инициализации:
```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new()...)
        .setup(|app| {
            // 1. Открываем store.json
            let store = app.store(STORE_PATH)?;
            migrate_if_needed(&store);
            let state = load_state(&store);
            
            // 2. Управляем AppState (Arc<RwLock>)
            app.manage(Arc::new(RwLock::new(state)));
            
            // 3. Инициализируем кэш глав
            let cache = ChapterCache::new(cache_dir);
            cache.prune(30 * 24 * 60 * 60); // 30 дней
            app.manage(Arc::new(RwLock::new(cache)));
            
            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![... 22 команды ...])
        .run(|_app, _event| { /* позиция сохраняется debounce */ });
}
```

### 6.2 AppState

```rust
pub struct AppState {
    pub book: BookStore,           // Vec<Book> — библиотека
    pub setting: SettingStore,     // настройки (тема, шрифт, UI)
    pub reader: ReaderState,       // HashMap сессий чтения
    pub bookmarks: BookmarkStore,  // Vec<Bookmark>
    pub notes: NoteStore,          // Vec<Note>
}
```

**Почему `Arc<RwLock<AppState>>`?**
- `Arc` — несколько потоков могут обращаться к состоянию
- `RwLock` — **множество читателей, один писатель** — оптимизация для read-heavy нагрузки (чтение книг чаще чем запись)

### 6.3 Pattern команд

Все команды следуют одному паттерну:
```rust
#[tauri::command]
pub async fn command_name(
    app: AppHandle,                          // для доступа к store
    state: State<'_, Arc<RwLock<AppState>>>, // глобальное состояние
    // ... параметры ...
) -> Result<T, String> {
    // 1. Читаем/пишем state (с lock)
    let result = {
        let state_guard = state.read().map_err(...)?;  // или write()
        // ... логика ...
        state_guard.clone()
    };
    
    // 2. Persist асинхронно (не блокируем)
    persist(&app, &result).await?;
    
    // 3. Возвращаем результат
    Ok(result)
}
```

### 6.4 Персистентность

**`core/storage/mod.rs`**:

```rust
pub const STORE_PATH: &str = "store.json";
pub const SCHEMA_VERSION: u32 = 1;

// Загрузка при старте
pub fn load_state(store: &Store<Wry>) -> AppState { ... }

// Сохранение при мутации
pub fn save_state(store: &Store<Wry>, state: &AppState) -> Result<(), String> { ... }

// Миграция v0 → v1
pub fn migrate_if_needed(store: &Store<Wry>) { ... }
```

**Миграция v0 → v1:**
- `book` → `books` (нормализация ключей)
- `setting` → `settings`
- Инициализация `reader_state`, `bookmarks`, `notes` если их нет

---

## 7. Система состояний (State Management)

### 7.1 Два уровня состояния

```
┌─────────────────────────────────────────────────────┐
│                  Rust AppState                       │
│         (Arc<RwLock<AppState>>) ← store.json        │
│  ┌────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐    │
│  │ books  │ │ settings│ │ reader │ │bookmarks│    │
│  └────────┘ └─────────┘ └────────┘ └─────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │ invoke() / persist
┌──────────────────────┴──────────────────────────────┐
│               SolidJS Stores                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ readerStore  │  │settingsStore │  │toastStore │ │
│  │ books, chaps │  │ theme, font  │  │ messages  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
```

**Как синхронизируются:**
1. При загрузке страницы → `invoke()` → получаем данные → обновляем Solid store
2. При мутации → обновляем Solid store → `invoke()` для persist → Rust сохраняет в store.json
3. **Нет автоматической синхронизации** — только через explicit API calls

### 7.2 Поток данных читалки

```
ReaderPage (BookRead.tsx) — оркестратор
  │
  ├── useBookLoader()        → загружает книгу, закладки, заметки, позицию
  ├── useReadingPosition()   → debounce сохранение позиции при скролле
  ├── useNotesManager()      → создание/редактирование заметок
  ├── useBookmarksManager()  → добавление закладок
  ├── useAutoHideControls()  → автоскрытие тулбара/сайдбаров
  ├── useKeyboardShortcuts() → горячие клавиши
  ├── useFullscreen()        → полноэкранный режим
  │
  ├── ReaderContent          → рендерит главы (scroll/chapters)
  ├── ReaderToolbar          → тулбар (TOC, настройки, закладка)
  ├── ReaderFooter           ← навигация по главам
  ├── SettingSidebar         ← настройки шрифта
  ├── TOCSidebar             ← оглавление книги
  └── ReaderNotePopup        ← popup редактора заметки
```

---

## 8. Читалка — главный компонент

### 8.1 BookRead.tsx — оркестратор (~344 строки)

Файл **рефакторен** с 1412 строк до ~344. Теперь это тонкий компонент, который:

1. Получает `bookId` из URL-параметров
2. Вызывает 7 хуков (см. выше)
3. Рендерит 5 дочерних компонентов
4. Управляет UI-состоянием (показать TOC, настройки, controls)

### 8.2 Два режима просмотра

**Режим "Scroll" (свиток):**
- Все главы рендерятся **одновременно** в `<For>` цикле
- Каждая глава — `<div id="chapter-{index}">`
- Непрерывный скролл, как свиток
- Позиция сохраняется через `getReadingAnchor` (центр экрана)

**Режим "Chapters" (главы):**
- Рендерится **только текущая глава**
- Prev/Next кнопки в ReaderFooter
- Прогресс: `{currentIndex + 1} / {totalChapters}`

**Переключение:** `settings.reader.mode` ('scroll' | 'chapters')

### 8.3 ReaderContent — рендеринг глав

```tsx
<ReaderContent
  book={book()}
  currentIndex={() => currentIndex()}
  contentRef={(el) => contentRef = el}
  onScroll={debouncedSavePosition}
  settings={{ columnWidth, fontSize, lineHeight }}
/>
```

Рендерит:
- В scroll режиме: `<For each={sortedChapters()}>` — все главы
- В chapters режиме: только `currentChapter()`

CSS для читалки:
```css
.reader {
  max-width: var(--reader-max-width);
  font-size: var(--reader-font-size);
  line-height: var(--reader-line-height);
  font-family: var(--reader-font-family);
}
```

### 8.4 Автосохранение позиции

**`getReadingAnchor()`** — находит текст в центре экрана:
1. Создаёт TreeWalker по всем текстовым узлам
2. Вычисляет `centerY = scrollTop + clientHeight / 2`
3. Находит текстовый узел, содержащий centerY
4. Возвращает `ReadingPosition { chapter_id, anchor_text (80 символов), before (40), after (40) }`

**`scrollToAnchor()`** — восстанавливает позицию:
1. TreeWalker по текстовым узлам (включая внутри `<mark>`)
2. Ищет точное совпадение `anchor_text`
3. Fallback: контекстное совпадение по `before/after`
4. Fallback: частичное совпадение (первые 40 символов)
5. `root.scrollTo({ top: targetScroll - 120, behavior: 'smooth' })`

**Debounce:** 500ms при скролле

---

## 9. Система заметок

### 9.1 Жизненный цикл заметки

```
1. User выделяет текст → useSelection() ловит selectionchange
2. handleAddNote() → 
   - findTextOffset() — находит глобальный offset текста в contentEl
   - buildTextIndex() — индексирует весь текст в DOM
   - wrapRangeWithMarks() — оборачивает выделение в <mark data-note="temp-id" style="background: #fb7100">
   - Показывает ReaderNotePopup в позиции выделения (x, y)

3. User пишет текст заметки → createNote() →
   - addNote() → invoke("add_note") → Rust: Note::new() → persist
   - Обновляет data-note с temp-id на UUID
   - Закрывает popup

4. При повторной загрузке книги → updateNotes() →
   - Для каждой заметки: wrapOffsetsWithMarks() — оборачивает текст по offset
   - Fallback: поиск по preview тексту
   - bindNoteMarks() — привязывает click handler к <mark>

5. Клик на <mark> → _onMarkClick() →
   - Создаёт DOM popup прямо на <mark> элементе
   - Color picker + contenteditable textarea
   - Изменения сразу через updateNoteApi() → invoke("update_note")
   - Клик вне popup → удаляет popup
```

### 9.2 DOM структура заметки

```html
<mark data-note="uuid-123" style="background-color: #fb7100; border-radius: 4px; color: #fff;">
  выделенный текст
  <div data-popup class="absolute z-50 bg-(--background)/80 backdrop-blur-lg ...">
    <div class="popup-note flex gap-2 p-2">
      <label class="input-label">
        <input type="color" value="#fb7100" />
        <span class="w-6 h-6 rounded-full border shadow"></span>
      </label>
      <div contenteditable>Текст заметки...</div>
    </div>
  </div>
</mark>
```

---

## 10. Система закладок

### 10.1 Создание закладки

```
handleAddBookmark() →
  1. getReadingAnchor(contentEl, chapterId) → текущая позиция
  2. Берём текст из anchor_text как preview
  3. addBookmark(bookPath, position, preview, 'regular') → invoke("add_bookmark")
  4. Rust: Bookmark::new() → state.bookmarks.items.push → persist
  5. toast.success("Закладка добавлена")
```

### 10.2 Страница закладок

`BookmarksPage.tsx` — табы "Закладки" / "Заметки":
- Фильтрация по книге (если открыта из контекста книги)
- Группировка по книгам
- Клик на закладку → `navigate(`/book/:id/read?bookmarkId=...`)`
- useBookLoader восстанавливает позицию по bookmarkId

---

## 11. Форматы книг и загрузчики

### 11.1 BookSource trait

```rust
pub trait BookSource {
    fn can_load(&self, path: &Path) -> bool;  // Проверка по расширению
    fn load(&self, path: &Path, chapters: bool) -> Result<Book, Error>;
    fn decode_text(&self, bytes: &[u8]) -> Result<String, Error>;  // опционально
}
```

### 11.2 Фабрика загрузчиков

```rust
fn available_sources() -> Vec<Box<dyn BookSource>> {
    vec![
        Box::new(TxtLoader),     // .txt
        Box::new(PdfLoader),     // .pdf
        Box::new(EpubLoader),    // .epub
        Box::new(Fb2Loader),     // .fb2, .fb2.zip
        Box::new(HtmlLoader),    // .html, .htm
        Box::new(MarkdownLoader),// .md, .markdown
        Box::new(DocxLoader),    // .docx
    ]
}
```

### 11.3 Как работает загрузка

```
get_book(path, load_chapters) →
  for loader in available_sources():
    if loader.can_load(path):
      return loader.load(path, load_chapters)
  return Err("Unsupported format")
```

### 11.4 Детали загрузчиков

| Формат | Как загружает | Особенности |
|--------|---------------|-------------|
| **TXT** | Читает весь файл как одну главу | UTF-8 → Windows-1251 fallback через encoding_rs |
| **EPUB** | ZIP → META-INF/container.xml → OPF → spine → XHTML главы | Base64 изображения, CSS встраивание, автоопределение кодировки |
| **FB2** | XML-парсинг через roxmltree | Поддержка .fb2.zip, извлечение binary (изображений) |
| **HTML** | Весь файл как одна глава | UTF-8 с fallback |
| **Markdown** | pulldown-cmark → HTML | Простой парсинг |
| **PDF** | pdfium-render → извлечение текста/изображений → классификация блоков (H1/H2/H3/P/UL/Image) | Base64 изображения, ~838 строк |
| **DOCX** | docx-rust + zip → параграфы, таблицы, изображения | Base64 изображения |

### 11.5 Структура загруженной книги

```rust
Book {
    id: "uuid-123",
    meta: BookMeta {
        title: "Война и мир",
        author: Some("Лев Толстой"),
        language: Some("ru"),
        cover: Some(vec![...]), // байты JPEG
        path: "/path/to/book.epub",
    },
    chapters: Some(vec![
        Chapter { id: "uuid-1", title: Some("Глава 1"), html: "<p>Текст...</p>", order: 0 },
        Chapter { id: "uuid-2", title: Some("Глава 2"), html: "<p>Текст...</p>", order: 1 },
    ]),
}
```

---

## 12. Персистентность (сохранение данных)

### 12.1 store.json

**Расположение:** `app.path().app_data_dir() / "store.json"`

**Структура:**
```json
{
  "schema_version": 1,
  "books": [
    {
      "id": "uuid",
      "meta": { "title": "...", "author": "...", "path": "..." },
      "chapters": null  // главы не сохраняются (кэшируются отдельно!)
    }
  ],
  "settings": {
    "general": { "theme": "light", "remember_last_book": true, "library_path": null },
    "reader": { "font_family": "serif", "font_size": 18, "line_height": 1.5, "column_width": 720, "mode": "scroll" },
    "hotkeys": { "next_page": "ArrowRight", ... },
    "ui": { "auto_hide": true, "animations": true, "distraction_free": false }
  },
  "reader_state": {
    "current_book_path": null,
    "last_session_book_path": null,
    "sessions": {
      "/path/to/book.epub": {
        "book_path": "...",
        "position": { "chapter_id": null, "anchor_text": "...", "before": "...", "after": "..." },
        "mode": "scroll",
        "last_opened_at": 1712345678901,
        "last_read_at": 1712345678901
      }
    }
  },
  "bookmarks": [
    { "id": "uuid", "book_path": "...", "position": {...}, "preview": "...", "kind": "regular", "created_at": ... }
  ],
  "notes": [
    { "id": "uuid", "book_path": "...", "range": {...}, "text": "...", "preview": "...", "highlight": true, "highlight_color": "#fb7100", "created_at": ..., "updated_at": ... }
  ]
}
```

### 12.2 Когда сохраняется

| Событие | Что сохраняется |
|---------|-----------------|
| Добавление книг | books |
| Открытие книги | books (с главами) |
| Изменение настроек | settings |
| Сохранение позиции | reader_state.sessions |
| Добавление закладки | bookmarks |
| Добавление/удаление заметки | notes |
| Очистка store | всё + chapter cache |

### 12.3 Pattern persist

```rust
async fn persist(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    save_state(&store, state)
}
```

Все команды вызывают `persist()` **после** мутации состояния. Сохранение происходит в **том же потоке** (не асинхронно), но вызывается из `async` команд.

---

## 13. Кэширование глав

### 13.1 ChapterCache

**Расположение кэша:** `app.path().app_cache_dir() / "chapters/"`

**Структура кэша:**
```
cache/
  └── chapters/
      ├── cache_index.json          ← индекс: file_path → {hash, last_accessed, chapter_count}
      ├── abc123def456.chapters.json ← кэш глав для файла с hash abc123
      └── 789xyz012abc.chapters.json
```

### 13.2 Как работает

```rust
ChapterCache {
    cache_dir: PathBuf,
    index: CacheIndex { entries: HashMap<String, CacheEntry> },
}

CacheEntry {
    file_hash: String,      // SHA256 хеш файла
    last_modified: u64,     // timestamp
    last_accessed: u64,     // timestamp
    chapter_count: usize,
    cached_at: u64,         // timestamp
}
```

**SHA256 хеш файла:**
```rust
pub fn compute_hash(path: &Path) -> Option<String> {
    let mut file = File::open(path).ok()?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let n = file.read(&mut buffer).ok()?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }
    Some(format!("{:x}", hasher.finalize()))
}
```

### 13.3 Lifecycle

1. **При старте:** `cache.prune(30 дней)` — удаляет записи старше 30 дней
2. **При загрузке книги:** проверяет `is_cache_valid(file_path)` → если да → `get_chapters(file_path)`
3. **При парсинге глав:** `set_chapters(file_path, file_hash, chapters)` — сохраняет в кэш
4. **При очистке store:** `cache.clear()` — удаляет все файлы кэша

---

## 14. Дизайн-система и темы

### 14.1 Шрифты

| Шрифт | Назначение | Вес | Формат |
|-------|------------|-----|--------|
| **Literata Variable** | Текст чтения | 200-900 | TTF |
| **Inter Variable** | UI-элементы | 100-900 | TTF |

### 14.2 Темы

4 темы, переключаются через CSS-класс на `<html>`:

| Тема | Описание | Ключевые цвета |
|------|----------|----------------|
| **light** | Бумага, тёплый белый | `--background: oklch(0.99 0.003 95)` |
| **dark** | Тёмная, мягкий чёрный | `--background: oklch(0.16 0.01 260)` |
| **sepia** | Сепия, тёплые тона | `--background: oklch(0.92 0.03 80)` |
| **night** | OLED, чёрный фон | `--background: oklch(0.05 0 0)` |

**Цветовая система:** OKLCH (perceptually uniform)
- Акцент: `oklch(0.62 0.14 260)` — мягкий сине-фиолетовый

### 14.3 CSS переменные

```css
/* Reader */
--reader-font-size: 18px;
--reader-line-height: 1.7;
--reader-max-width: 68ch;
--reader-font-family: var(--font-reader);

/* Glassmorphism */
--glass-blur: 14px;
--glass-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);

.glass { @apply bg-(--surface)/40 backdrop-blur-md border border-[var(--border)] shadow; }
.glass-strong { background: var(--surface-hover); backdrop-filter: blur(calc(var(--glass-blur) * 1.25)); }
```

### 14.4 Анимации

```css
@keyframes fadeIn { ... }          /* 0.2s ease-out */
@keyframes slideInRight { ... }    /* 0.2s ease-out */
@keyframes page-flip { ... }       /* 1.6s infinite (loader) */

.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.stagger-1 { animation-delay: 0.02s; }  /* stagger для списков */
```

### 14.5 Применение темы

```ts
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark', 'sepia', 'night');
  if (theme !== 'light') {
    root.classList.add(theme);
  }
}
```

**Light — default** (нет класса).

---

## 15. Маршруты (Routing)

### 15.1 HashRouter

Используется `@solidjs/router` с hash-based routing (`#/book/123/read`).

### 15.2 Структура маршрутов

```
<HashRouter root={AppLayout}>
  <Route path="/" component={LibraryPage} />
  <Route path="/book/:id" component={BookDetailPage} />
  <Route path="/book/:id/read" component={ReaderPage} />
  <Route path="/bookmarks" component={BookmarksPage} />
  <Route path="/settings" component={SettingsPage} />
  <Route path="*404" component={...} />
</HashRouter>
```

### 15.3 URL-параметры

| Страница | Параметры | Пример |
|----------|-----------|--------|
| BookDetail | `:id` (UUID книги) | `#/book/abc123` |
| Reader | `:id` (UUID книги) | `#/book/abc123/read` |
| Reader (закладка) | `:id` + `?bookmarkId=...` | `#/book/abc123/read?bookmarkId=xyz` |

---

## 16. Tauri-команды (IPC API)

### 16.1 Книги (`commands/book.rs`)

| Команда | Параметры | Возвращает | Описание |
|---------|-----------|------------|----------|
| `get_books` | — | `Vec<Book>` | Все книги из библиотеки |
| `get_book` | `path: String` | `Book` | Одна книга (из памяти или файла) |
| `open_book` | `path: String` | `Book` | Открыть книгу, загрузить главы |
| `add_books` | `path: &Path` (папка) | `Vec<Book>` | Сканировать папку, добавить книги |
| `add_book` | `path: &Path` (файл) | `Vec<Book>` | Добавить один файл |
| `clear_store` | — | `()` | Очистить всё (книги, закладки, заметки, сессии) |
| `get_cache_stats` | — | `CacheStats` | Статистика кэша |
| `clear_chapter_cache` | — | `()` | Очистить кэш глав |

### 16.2 Читалка (`commands/reader.rs`)

| Команда | Параметры | Возвращает | Описание |
|---------|-----------|------------|----------|
| `get_reader_state` | — | `ReaderState` | Полное состояние читалки |
| `set_current_book` | `book_path: String` | `ReaderState` | Установить текущую книгу |
| `save_reading_position` | `book_path, position, mode` | `ReaderState` | Сохранить позицию |
| `get_reading_position` | `book_path: String` | `ReadingPosition` | Последняя позиция для книги |
| `add_bookmark` | `book_path, position, preview, kind` | `Bookmark` | Создать закладку |
| `get_bookmarks` | `book_path: Option<String>` | `Vec<Bookmark>` | Все или scoped закладки |
| `get_bookmark` | `bookmark_id: Option<String>` | `Option<Bookmark>` | Одна закладка |
| `delete_bookmark` | `bookmark_id: String` | `()` | Удалить закладку |
| `add_note` | `book_path, range, text, preview, highlight, highlight_color` | `Note` | Создать заметку |
| `update_note` | `note_id, range, text, highlight, highlight_color` | `Note` | Обновить заметку |
| `delete_note` | `note_id: String` | `()` | Удалить заметку |
| `get_notes` | `book_path: Option<String>` | `Vec<Note>` | Все или scoped заметки |
| `get_settings` | — | `SettingStore` | Получить настройки |
| `update_settings` | `settings: SettingStore` | `SettingStore` | Обновить настройки |

---

## 17. Модели данных

### 17.1 Book (Rust ↔ TypeScript)

**Rust:**
```rust
pub struct Book {
    pub id: String,
    pub meta: BookMeta,
    pub chapters: Option<Vec<Chapter>>,
}

pub struct BookMeta {
    pub title: String,
    pub author: Option<String>,
    pub language: Option<String>,
    pub cover: Option<Vec<u8>>,  // байты JPEG
    pub path: String,
}

pub struct Chapter {
    pub id: String,
    pub title: Option<String>,
    pub html: String,
    pub order: usize,
}
```

**TypeScript:**
```ts
type Book = {
  id: string;
  meta: BookMeta;
  chapters: Chapter[];
}

type BookMeta = {
  title: string;
  author?: string;
  language?: string;
  cover?: number[];  // Uint8Array → number[]
  path: string;
}

type Chapter = {
  id: string;
  title?: string;
  html: string;
  order: number;
}
```

### 17.2 ReadingPosition

**Rust:**
```rust
pub struct ReadingPosition {
    pub chapter_id: Option<String>,
    pub anchor_text: String,
    pub before: Option<String>,
    pub after: Option<String>,
}
```

**TypeScript:**
```ts
type ReadingPosition = {
  chapter_id: string;
  anchor_text: string;
  before?: string;
  after?: string;
}
```

### 17.3 Bookmark

**Rust:**
```rust
pub struct Bookmark {
    pub id: String,
    pub book_path: String,
    pub position: ReadingPosition,
    pub preview: String,
    pub kind: BookmarkKind,  // Regular | Custom
    pub created_at: i64,     // unix timestamp ms
}
```

### 17.4 Note

**Rust:**
```rust
pub struct TextRange {
    pub start: TextLocation,
    pub end: TextLocation,
}

pub struct TextLocation {
    pub chapter_id: Option<String>,
    pub offset: Option<f32>,
    pub percent: Option<f32>,
    pub page: Option<u32>,
}

pub struct Note {
    pub id: String,
    pub preview: String,
    pub book_path: String,
    pub range: TextRange,
    pub text: String,
    pub highlight: bool,
    pub highlight_color: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}
```

### 17.5 SettingStore

**TypeScript (определяет структуру):**
```ts
type SettingStore = {
  general: {
    theme: 'light' | 'dark' | 'sepia' | 'night';
    remember_last_book: boolean;
    library_path: string | null;
  };
  reader: {
    font_family: 'serif' | 'sans_serif' | 'monospace' | { custom: string };
    font_size: number;        // 12-32px
    line_height: number;      // 1.2-2.5
    column_width: number;     // 400-1200px
    mode: 'scroll' | 'chapters';
  };
  hotkeys: {
    next_page: string;
    prev_page: string;
    toggle_theme: string;
    increase_font: string;
    decrease_font: string;
  };
  ui: {
    auto_hide: boolean;
    animations: boolean;
    distraction_free: boolean;
  };
}
```

---

## 18. Горячие клавиши

Реализованы в `useKeyboardShortcuts.ts`:

| Клавиша | Действие | Контекст |
|---------|----------|----------|
| `ArrowRight` / `PageDown` | Следующая глава | Только в chapters режиме |
| `ArrowLeft` / `PageUp` | Предыдущая глава | Только в chapters режиме |
| `Escape` | Закрыть TOC / настройки / fullscreen / вернуться назад | Приоритет: TOC → Settings → Fullscreen → Back |
| `F` | Полный экран | Всегда |
| `T` | Открыть/закрыть TOC | Всегда |
| `B` | Добавить закладку | Всегда |
| `N` | Добавить заметку (выделить текст) | Всегда |

**Особенность:** в `input/textarea` работают только `Escape`.

---

## 19. Конфигурация сборки

### 19.1 Vite (`vite.config.ts`)

```ts
{
  server: { port: 1420, strictPort: true },  // Tauri требует фиксированный порт
  plugins: [solid(), tailwindcss()],
  resolve: { alias: { '@': '/src' } },       // path alias
}
```

### 19.2 TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "jsx": "preserve",            // solid-js
    "jsxImportSource": "solid-js",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### 19.3 Tauri (`tauri.conf.json`)

```json
{
  "identifier": "com.litav.grev",
  "build": {
    "beforeDevCommand": "yarn dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "yarn build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{ "title": "grev", "width": 800, "height": 600, "decorations": false }]
  },
  "bundle": {
    "resources": { "bin/pdfium.dll": "pdfium.dll" },
    "externalBin": ["bin/poppler/pdftohtml"]
  }
}
```

**Ключевые моменты:**
- `decorations: false` — окно без стандартной рамки (кастомный дизайн)
- `CSP: null` — Content Security Policy отключён
- Бинарные ресурсы упаковываются в bundle

---

## 20. Бинарные зависимости

| Файл | Назначение | Размер |
|------|------------|--------|
| `src-tauri/bin/pdfium.dll` | PDFium — нативный рендеринг PDF | ~10MB |
| `src-tauri/bin/poppler/pdftohtml.exe` | Poppler — альтернативный PDF→HTML конвертер | ~ |
| `src-tauri/bin/poppler/*.dll` | DLL для Poppler | |

**PDFium** — основной движок PDF. **Poppler** — fallback если PDFium недоступен.

---

## 21. Как запустить проект

### 21.1 Требования

- Node.js (с yarn)
- Rust (с cargo)
- Tauri CLI: `cargo install tauri-cli --version "^2"`

### 21.2 Установка зависимостей

```bash
yarn install
```

### 21.3 Development режим

```bash
yarn tauri dev
# или
cargo tauri dev
```

Это запустит:
1. `yarn dev` → Vite dev server на порту 1420
2. Tauri соберёт Rust backend и откроет окно

### 21.4 Production сборка

```bash
yarn tauri build
# или
cargo tauri build
```

Результат: `src-tauri/target/release/bundle/` — установщик для Windows.

---

## 22. Ключевые файлы с описанием

### Frontend

| Файл | Строк | Что делает |
|------|-------|------------|
| `src/index.tsx` | 4 | Точка входа: render(<App />) |
| `src/Router.tsx` | 30 | HashRouter с 5 маршрутами |
| `src/index.css` | 350+ | Дизайн-токены, темы, анимации, glassmorphism |
| `src/pages/book/[id]/read/BookRead.tsx` | ~344 | 📖 **Главный компонент читалки** (оркестратор) |
| `src/pages/library/LibraryPage.tsx` | ~453 | Библиотека с карточками, поиском, сортировкой |
| `src/widgets/layout/AppLayout.tsx` | 25 | Корневой layout: Sidebar + main + Toaster |
| `src/widgets/layout/Sidebar.tsx` | 90 | Боковая навигация (сворачивается) |
| `src/shared/stores/readerStore.ts` | 15 | Store книг и глав (автозагрузка getBooks) |
| `src/shared/stores/settingsStore.ts` | 110 | Store настроек с DOM-apply логикой |
| `src/shared/api/book.ts` | 25 | Обёртки Tauri invoke для книг |
| `src/shared/api/reader.ts` | 40 | Обёртки Tauri invoke для позиции чтения |
| `src/shared/api/bookmarks.ts` | 25 | Обёртки Tauri invoke для закладок |
| `src/shared/api/notes.ts` | 35 | Обёртки Tauri invoke для заметок |
| `src/shared/api/settings.ts` | 60 | Обёртки Tauri invoke для настроек + типы |
| `src/features/reader/hooks/useBookLoader.ts` | 95 | Загрузка книги, закладок, заметок, позиции |
| `src/features/reader/hooks/useReadingPosition.ts` | 70 | Debounce сохранение позиции (500ms) |
| `src/features/reader/hooks/useNotesManager.ts` | 250+ | CRUD заметок, DOM-wrapping, popup логика |
| `src/features/reader/hooks/useKeyboardShortcuts.ts` | 80 | Глобальный keydown handler |
| `src/features/reader/hooks/useAutoHideControls.ts` | 75 | Автоскрытие панелей (1200ms таймер) |
| `src/features/reader/components/ReaderContent.tsx` | 60 | Рендеринг глав (scroll/chapters режимы) |
| `src/shared/utils/anchor.ts` | 100 | getReadingAnchor + scrollToAnchor |
| `src/shared/hooks/useSelection.ts` | 70 | Хук выделения текста |

### Backend

| Файл | Строк | Что делает |
|------|-------|------------|
| `src-tauri/src/lib.rs` | 70 | Инициализация Tauri, store, cache, команды |
| `src-tauri/src/state/mod.rs` | 20 | AppState struct |
| `src-tauri/src/commands/book.rs` | 160 | Команды работы с книгами |
| `src-tauri/src/commands/reader.rs` | 270 | Команды читалки (позиция, закладки, заметки) |
| `src-tauri/src/core/book/model.rs` | 25 | Модели Book, BookMeta, Chapter |
| `src-tauri/src/core/reader/position.rs` | 15 | ReadingPosition, TextLocation |
| `src-tauri/src/core/reader/session.rs` | 30 | ReadingSession, ReaderMode |
| `src-tauri/src/core/reader/bookmarks.rs` | 35 | Bookmark, BookmarkKind |
| `src-tauri/src/core/reader/notes.rs` | 35 | Note, TextRange |
| `src-tauri/src/core/formats/loader.rs` | 100 | BookSource trait, фабрика, dispatch |
| `src-tauri/src/core/formats/epub/epub.rs` | 480 | EPUB-парсер |
| `src-tauri/src/core/formats/pdf/pdf.rs` | 838 | PDF через pdfium-render |
| `src-tauri/src/core/formats/fb2/fb2.rs` | 500 | FB2-парсер |
| `src-tauri/src/core/storage/mod.rs` | 95 | load_state, save_state, migrate, persist |
| `src-tauri/src/core/cache/mod.rs` | 150 | ChapterCache (SHA256, disk-based) |
| `src-tauri/src/core/utils/file.rs` | 25 | Рекурсивный поиск файлов |

---

## Глоссарий

| Термин | Значение |
|--------|----------|
| **Tauri** | Фреймворк для десктопных приложений (Rust backend + Web frontend) |
| **SolidJS** | Реактивный UI-фреймворк (сигналы, не виртуальный DOM) |
| **invoke** | Tauri IPC — вызов Rust-команды из JS |
| **Store** | tauri-plugin-store — JSON-хранилище (store.json) |
| **AppState** | Глобальное состояние Rust (Arc<RwLock<AppState>>) |
| **createStore** | SolidJS реактивный store |
| **createSignal** | SolidJS реактивный сигнал |
| **createMemo** | SolidJS вычисляемое значение |
| **BookSource** | Rust trait для загрузчиков форматов |
| **ReadingPosition** | Позиция в книге (anchor_text + before/after контекст) |
| **TextRange** | Диапазон текста (start/end TextLocation) |
| **TreeWalker** | DOM API для обхода текстовых узлов |
| **Glassmorphism** | Дизайн-стиль: backdrop-blur + полупрозрачность |
| **OKLCH** | Цветовое пространство (perceptually uniform) |

---

*Документ создан 15 апреля 2026 на основе анализа ~100 файлов проекта.*
