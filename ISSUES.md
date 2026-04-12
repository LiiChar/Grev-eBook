# Ошибки и проблемы проекта Grev

> Файл содержит логические, структурные и архитектурные проблемы, найденные в ходе анализа кодовой базы.

---

## 1. КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1.1. God Object — ReaderPage.tsx (1412 строк)

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

**Проблема**: Весь функционал читалки содержится в одном гигантском компоненте. Это нарушает Single Responsibility Principle и делает код неподдерживаемым.

**Что содержится в одном файле**:
- Загрузка книги
- Рендеринг глав (2 режима: scroll/chapters)
- Система заметок (выделение, popup, color picker, сохранение)
- Система закладок
- Автосохранение позиции
- Автоскрытие панелей
- Fullscreen режим
- Горячие клавиши
- TOC Sidebar интеграция
- SettingSidebar интеграция

**Рекомендация**: Разделить на отдельные хуки и компоненты:
- `useBookLoader()` — загрузка книги
- `useReadingPosition()` — сохранение позиции
- `useNotesManager()` — управление заметками
- `useBookmarksManager()` — управление закладками
- `useAutoHideControls()` — автоскрытие панелей
- `useKeyboardShortcuts()` — горячие клавиши
- `ReaderContent` — рендеринг глав (отдельный компонент)
- `ReaderToolbar` — тулбар (отдельный компонент)
- `ReaderNotePopup` — popup заметок (отдельный компонент)

---

### 1.2. Сохранение при выходе ЗАКОММЕНТИРОВАНО

**Файл**: `src-tauri/src/lib.rs` (строки ~62-70)

```rust
tauri::RunEvent::ExitRequested { api: _, .. } => {
    // Сохраняем состояние при выходе
    // let store = app.store(STORE_PATH).expect("Failed to open store");
    // let state: tauri::State<'_, Mutex<AppState>> = app.state::<Mutex<AppState>>();
    // let state = state.lock().unwrap();
    // if let Err(err) = save_state(&store, &state) {
    //     eprintln!("Failed to save store: {}", err);
    // }
}
```

**Проблема**: При закрытии приложения состояние **не сохраняется**. Это приводит к потере данных (позиция чтения, закладки, заметки), если они не были сохранены ранее через отдельные команды.

**Последствия**:
- Пользователь теряет последнюю позицию чтения
- Несохранённые закладки/заметки теряются
- Настройки могут не примениться

**Рекомендация**: Раскомментировать код и корректно обработать ошибку.

---

### 1.3. CSP отключён

**Файл**: `src-tauri/tauri.conf.json`

```json
"security": {
  "csp": null
}
```

**Проблема**: Content Security Policy полностью отключён. Это открывает приложение для XSS-атак, особенно опасно учитывая что книги загружают HTML-контент, который может содержать вредоносный код.

**Рекомендация**: Настроить CSP как минимум:
```json
"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
```

---

### 1.4. Race condition при сохранении настроек

**Файл**: `src/shared/stores/settingsStore.ts`

```typescript
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
async function saveSettings() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await updateSettings(settings);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  }, 500);
}
```

**Проблема**: При каждом вызове setter-функции (`setTheme`, `setFontSize`, и т.д.) вызывается `saveSettings()`. Если пользователь быстро меняет несколько настроек, debounce сбрасывается и может выполниться только последнее изменение. Предыдущие изменения будут утеряны.

**Пример**: Пользователь меняет тему + размер шрифта + ширину колонки за 300ms — сохранится только последнее.

**Рекомендация**: Использовать полноценный debounce с отслеживанием dirty-флага или вызывать сохранение при unmount компонента настроек.

---

## 2. ЛОГИЧЕСКИЕ ОШИБКИ

### 2.1. Дублирование функций сохранения позиции

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

В файле есть ДВЕ практически идентичные функции:

```typescript
// Функция 1 (строка ~218)
async function saveReadingAnchor() {
    if (!contentRef) return;
    const chapter = currentChapter();
    if (!chapter) return;
    const anchor = getReadingAnchor(contentRef, chapter.id);
    if (!anchor) return;
    await saveReadingPosition(
        book()!.meta.path,
        anchor,
        viewMode() === 'chapters' ? 'page' : 'scroll',
    );
}

// Функция 2 (строка ~380)
async function savePosition() {
    const chapter = currentChapter();
    if (!chapter || !contentRef) return;
    const position = getReadingAnchor(contentRef, chapter.id)
    if (!position) return;
    try {
        await saveReadingPosition(
            params.id,        // ← разница: params.id вместо book()!.meta.path
            position,
            viewMode() === 'chapters' ? 'page' : 'scroll',
        );
    } catch (err) {
        console.error('Failed to save position:', err);
    }
}
```

**Проблема**: 
1. Функции делают одно и то же, но используют разные источники `bookPath` (`book()!.meta.path` vs `params.id`)
2. `params.id` может не соответствовать `book().meta.path` (например, если книга была переименована)
3. `savePosition()` нигде не вызывается (dead code)

**Рекомендация**: Удалить одну функцию, унифицировать путь к книге.

---

### 2.2. Несоответствие bookPath при сохранении позиции

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

```typescript
// В loadBook() — используется book()!.meta.path
await saveReadingPosition(book()!.meta.path, anchor, ...);

// В savePosition() — используется params.id
await saveReadingPosition(params.id, position, ...);

// В onScroll debounce — используется saveReadingAnchor(), который использует book()!.meta.path
```

**Проблема**: Если `params.id !== book().meta.path`, позиция чтения сохранится под неправильным ключом и не будет найдена при следующем открытии книги.

---

### 2.3. notes_update при загрузке вызывает дублирование

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

```typescript
// Строка ~145
const nts = await getNotes(data.meta.path);
setNotes(nts || []);
console.log("Start update notes");  // ← Отладочный лог в продакшене!

scheduleUpdateNotes(nts);  // Первый вызов

// Затем в createEffect (строка ~95)
createEffect(() => {
    const currentNotes = notes();
    if (!currentNotes.length || !contentRef) return;
    scheduleUpdateNotes(currentNotes);  // ← Второй вызов!
});
```

**Проблема**: `scheduleUpdateNotes` вызывается дважды при загрузке — один раз вручную, второй раз через createEffect. Это приводит к двойному рендерингу маркеров заметок.

---

### 2.4. Отладочные логи в продакшен-коде

**Файлы**:
- `src/pages/book/[id]/read/BookRead.tsx` — `console.log("Start update notes");`
- `src/pages/book/[id]/read/BookRead.tsx` — `console.log('Scrolling', bookmark);`
- `src/pages/book/[id]/read/BookRead.tsx` — `console.log("Start update notes");`

**Проблема**: Отладочные `console.log` не удалены и попадут в продакшен-сборку.

**Рекомендация**: Использовать `tauri-plugin-log` для логирования или удалить отладочные вызовы.

---

### 2.5. Горячие клавиши полностью закомментированы

**Файл**: `src/pages/book/[id]/read/BookRead.tsx` (строки ~244-275)

```typescript
function handleKeyDown(e: KeyboardEvent) {
    // ...
    switch (e.code) {
        // case 'ArrowRight':
        // case 'PageDown':
        //     if (viewMode() === 'chapters') {
        //         e.preventDefault();
        //         goToNextChapter();
        //     }
        //     break;
        // ... все кейсы закомментированы
    }
}
```

**Проблема**: 
1. Функция `setupKeyboardShortcuts()` регистрирует обработчик, который **ничего не делает**
2. В настройках есть секция "Горячие клавиши", но они не работают
3. В UI есть тултипы с горячими клавишами (`title='Оглавление (T)'`), но они не работают

**Рекомендация**: Либо раскомментировать и реализовать, либо удалить мёртвый код и убрать тултипы.

---

### 2.6. Бесполезный обработчик Escape

Даже если раскомментировать горячие клавиши, обработчик `handleKeyDown` возвращается раньше для input/textarea:

```typescript
function handleKeyDown(e: KeyboardEvent) {
    if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
    ) {
        return;  // ← Escape в textarea заметки не обработается
    }
```

**Проблема**: Это корректное поведение, но тогда Escape для закрытия сайдбаров не будет работать когда пользователь вводит текст в заметке.

---

## 3. СТРУКТУРНЫЕ ПРОБЛЕМЫ

### 3.1. Нарушение слоённой архитектуры

**Проблема**: Границы слоёв размыты. Компоненты из `components/` напрямую импортируют API-функции и stores:

- `components/reader/SettingSidebar.tsx` импортирует из `shared/stores/settingsStore`
- `pages/book/[id]/read/BookRead.tsx` импортирует напрямую из 10+ разных слоёв

**Рекомендация**: Каждый слой должен общаться только с相邻ними слоями.

---

### 3.2. Дублирование компонентов и виджетов

**Проблема**: Существуют параллельные наборы компонентов для одной и той же задачи:

| Уровень | Файлы | Назначение |
|---------|-------|------------|
| `widgets/book/` | Book.tsx, Books.tsx, BookView.tsx | Карточки/списки книг |
| `components/book/` | BookCard.tsx, BookList.tsx, BookElement.tsx | Те же карточки/списки |

**Проблема**: Два набора компонентов с одинаковым назначением. Непонятно какой использовать.

**Рекомендация**: Объединить в один набор, удалить дубликаты.

---

### 3.3. Избыточная вложенность layout-компонентов

**Структура**:
```
AppLayout → Layout → Header + Footer + Sidebar + Breadcrumble + <content>
```

**Файлы**:
- `widgets/layout/AppLayout.tsx`
- `widgets/layout/Layout.tsx`
- `widgets/layout/Header.tsx`
- `widgets/layout/Footer.tsx`
- `widgets/layout/Sidebar.tsx`
- `widgets/layout/Breadcrumble.tsx`

**Проблема**: 6 слоёв layout-обёрток для приложения, где реально используются только 2. Большинство этих компонентов — пустые обёртки без функциональности.

---

### 3.4. Пустые файлы-заглушки

| Файл | Содержимое |
|------|------------|
| `src/shared/utils/reader.ts` | Пустой |
| `src-tauri/src/core/reader/pagination.rs` | Пустой |

**Проблема**: Мёртвый код, создаёт путаницу.

---

### 3.5. Непоследовательные именование

**Проблема**: Смешение стилей именования:

| Стиль | Примеры |
|-------|---------|
| camelCase (TS) | `getBooks`, `addBookmark`, `saveReadingPosition` |
| snake_case (TS) | `book_path`, `current_book_path` (в типах) |
| snake_case (Rust) | `get_reader_state`, `set_current_book` |
| PascalCase (TS файлы) | `BookRead.tsx`, `LibraryPage.tsx` |
| kebab-case (директории) | `book/[id]/read/` |

В типах TypeScript используется `book_path` (snake_case), что не соответствует TypeScript-конвенциям (camelCase).

---

### 3.6. Breadcrumble опечатка

**Файл**: `src/widgets/layout/Breadcrumble.tsx`

**Проблема**: Опечатка в названии файла — `Breadcrumble` вместо `Breadcrumb`. "Breadcrumble" — это крошка (от хлеба), "Breadcrumb" — хлебные крошки.

---

## 4. ПРОБЛЕМЫ ПРОИЗВОДИТЕЛЬНОСТИ

### 4.1. Отсутствие виртуализации в читалке

**Проблема**: В режиме "Свиток" ВСЕ главы рендерятся сразу через `<For each={sortedChapters()}>`. Для книг с 100+ главами это приведёт к серьёзным проблемам производительности.

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

```tsx
<For each={sortedChapters()}>
    {(chapter, index) => (
        <div id={`chapter-${index()}`} class='mb-12'>
            {/* ... вся глава рендерится сразу ... */}
        </div>
    )}
</For>
```

**Примечание**: В зависимостях есть `virtua` (^0.48.3), но она не используется.

**Рекомендация**: Использовать `virtua` для виртуализации глав или реализовать IntersectionObserver для ленивой загрузки.

---

### 4.2. Полный клон AppState при каждой мутации

**Файл**: `src-tauri/src/commands/reader.rs`

```rust
pub async fn save_reading_position(...) -> Result<ReaderState, String> {
    let reader_state = {
        let mut state = state.lock().unwrap();
        // ... изменение ...
        state.clone()  // ← КЛОНИРУЕТСЯ ВЕСЬ AppState
    };
    persist(&app, &reader_state).await?;
}
```

**Проблема**: Каждая мутация (сохранение позиции, добавление закладки) клонирует ВЕСЬ `AppState`, включая все книги, закладки, заметки. Для большой библиотеки это O(N) операция на каждое сохранение.

**Рекомендация**: Сериализовать и сохранять только изменённую часть.

---

### 4.3. Синхронная сериализация при сохранении

**Файл**: `src-tauri/src/core/storage/mod.rs`

```rust
pub fn save_state(store: &Store<Wry>, state: &AppState) -> Result<(), String> {
    store.set(KEY_BOOKS, serde_json::to_value(&state.book).map_err(to_string)?);
    store.set(KEY_SETTINGS, serde_json::to_value(&state.setting).map_err(to_string)?);
    store.set(KEY_READER, serde_json::to_value(&state.reader).map_err(to_string)?);
    store.set(KEY_BOOKMARKS, serde_json::to_value(&state.bookmarks).map_err(to_string)?);
    store.set(KEY_NOTES, serde_json::to_value(&state.notes).map_err(to_string)?);
    store.set(KEY_SCHEMA_VERSION, serde_json::to_value(SCHEMA_VERSION).map_err(to_string)?);
    store.save().map_err(to_string)?;  // ← Синхронная запись на диск
}
```

**Проблема**: Запись на диск происходит синхронно, что блокирует UI при больших объёмах данных.

---

### 4.4. Debounce скролла 500ms — слишком большой

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

```tsx
<div
    ref={contentRef}
    class='flex-1 overflow-y-auto reader-wrapper'
    onScroll={debounce(saveReadingAnchor, 500)}
>
```

**Проблема**: Debounce 500ms означает что при быстром скролле позиция может не сохраниться до того как пользователь закроет книгу.

**Рекомендация**: Уменьшить до 200-300ms или использовать trailing + leading debounce.

---

### 4.5. reflow при обновлении заметок

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

Функция `updateNotes()` выполняет обход DOM через `TreeWalker` и модифицирует текстовые узлы (splitText, replaceChild) для КАЖДОЙ заметки. Для книг с большим количеством заметок это вызывает множественные reflow.

```typescript
function updateNotes(notes: Note[]) {
    notes.forEach(note => {
        // ... обход DOM, splitText, replaceChild для каждой заметки
    });
}
```

---

## 5. ПРОБЛЕМЫ БЕЗОПАСНОСТИ

### 5.1. XSS через innerHTML

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

```tsx
<div
    class='chapter'
    data-chapter-id={chapter.id}
    innerHTML={chapter.html}  // ← НЕСАНИТИЗИРОВАННЫЙ HTML ИЗ ФАЙЛА
/>
```

**Проблема**: HTML-содержимое книг вставляется напрямую через `innerHTML` без санитизации. Если файл книги содержит `<script>` или `onerror` обработчики, они выполнятся.

**Примечание**: В проекте есть `src/shared/utils/html.ts` (утилиты для sanitization), но он не используется в читалке.

---

### 5.2. Все Tauri-команды разрешены

**Файл**: `src-tauri/capabilities/default.json`

**Проблема**: Все команды имеют разрешение `allow`. Нет разделения по уровням доступа.

---

### 5.3. Отсутствие валидации входных данных

**Файл**: `src-tauri/src/commands/reader.rs`

```rust
pub async fn add_note(
    ...
    text: String,         // ← Нет валидации длины
    preview: String,      // ← Нет валидации
    highlight_color: Option<String>,  // ← Нет валидации hex-формата
) -> Result<Note, String> {
```

**Проблема**: Нет ограничений на длину текста, цвета, пути. Злоумышленник может передать очень длинные строки.

---

## 6. ПРОБЛЕМЫ С ТИПАМИ

### 6.1. `as Book[]` приведение вместо корректной инициализации

**Файл**: `src/shared/stores/readerStore.ts`

```typescript
export const [reader, setReader] = createStore({
  bookId: "",
  chapters: [] as Chapter[],
  books: await getBooks() ?? [] as Book[],  // ← ?? имеет меньший приоритет чем as
  currentIndex: 0,
});
```

**Проблема**: Оператор `??` имеет мень приоритет чем `as`. Выражение `[] as Book[]` выполняется FIRST, затем `await getBooks() ?? (Book[])`. Это не работает как задумано.

**Правильно**:
```typescript
books: (await getBooks()) ?? [] as Book[],
// или
books: await getBooks() ?? ([] as Book[]),
```

---

### 6.2. `any` и пропуск проверок типов

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

```typescript
const createNote = async () => {
    // ...
    const bm = await addNote(  // ← bm имеет тип Note, но создаётся Bookmark-логика
        book()!.meta.path,
        nodeEditing().range,
        nodeEditing().text,
        nodeEditing().preview,
        true,
        nodeEditing().color,
    );
    toast.success('Закладка добавлена');  // ← Сообщение "Закладка" для заметки!
}
```

**Проблема**: Функция `createNote` создаёт ЗАМЕТКУ, но toast-сообщение говорит "Закладка добавлена". Это когнитивный диссонанс для пользователя.

---

### 6.3. book()! unsafe non-null assertion

**Файл**: `src/pages/book/[id]/read/BookRead.tsx` —多处

```typescript
await saveReadingPosition(book()!.meta.path, ...);  // ← ! без проверки
const bm = await addBookmark(book()!.meta.path, ...);  // ← ! без проверки
```

**Проблема**: `book()!` используется без гарантии что `book()` не `null`. Если книга не загрузилась, будет runtime ошибка.

---

## 7. ПРОБЛЕМЫ UX

### 7.1. Нет индикации загрузки при открытии книги

**Проблема**: При открытии большой книги (PDF/DOCX) пользователь может не понимать что происходит. `BookLoader` показывает анимацию, но нет текста "Загрузка книги...".

---

### 7.2. Нет обработки ошибок загрузки глав

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

```typescript
if (!data.chapters || data.chapters.length === 0) {
    const bookChapters = reader.chapters;
    if (bookChapters && bookChapters.length > 0) {
        data.chapters = bookChapters;
    } else {
        throw Error('No chapters found in the book');  // ← Общее сообщение
    }
}
```

**Проблема**: Если книга повреждена или формат не поддерживается, пользователь видит общее сообщение "Не удалось загрузить книгу" без деталей.

---

### 7.3. Потеря контекста при навигации

**Проблема**: При переходе от закладки к книге (`navigate(`/book/${params.id}/read?bookmark=${id}`)`) нет индикации какой текст был в закладке. Пользователь должен сам найти выделенный фрагмент.

---

### 7.4. Нет подтверждения при удалении

**Файл**: `src/pages/bookmarks/BookmarksPage.tsx`

**Проблема**: Удаление закладок и заметок происходит без подтверждения. Случательное удаление невозможно отменить.

---

## 8. ПРОБЛЕМЫ КОНФИГУРАЦИИ

### 8.1. Фиксированный размер окна

**Файл**: `src-tauri/tauri.conf.json`

```json
"windows": [{
    "title": "grev",
    "width": 800,
    "height": 600,
    "decorations": false
}]
```

**Проблема**: 
1. Нет `minWidth`/`minHeight` — окно можно сжать до 0
2. Нет `resizable: true` (по умолчанию true, но лучше явно указать)
3. 800x600 — маленький размер для читалки

---

### 8.2. Tailwind v4 конфигурация несовместима с legacy config

**Файл**: `tailwind.config.js`

```javascript
module.exports = {
    darkMode: ['class'],
    content: [...],
    theme: {...},
    plugins: [require('@tailwindcss/typography')],
};
```

**Проблема**: Tailwind CSS v4 использует новый подход к конфигурации через CSS `@theme`. Legacy `tailwind.config.js` может не работать корректно с `@tailwindcss/vite` плагином. Кастомные цвета в config (border, input, ring, и т.д.) с `var(...)` могут дублироваться с `@theme` в `index.css`.

---

### 8.3. Зависимости frontend в production

**Файл**: `package.json`

```json
"dependencies": {
    "pdf-parse": "^2.4.5",
    "pdf.js-extract": "^0.2.1"
}
```

**Проблема**: `pdf-parse` и `pdf.js-extract` — Node.js-библиотеки. Они НЕ будут работать в браузере/Tauri frontend. PDF-обработка происходит на Rust-бэкенде. Эти зависимости мёртвый код в frontend.

---

## 9. ПРОБЛЕМЫ Rust-БЭКЕНДА

### 9.1. Синхронные команды в Tauri

**Файл**: `src-tauri/src/commands/book.rs`

```rust
#[tauri::command]
pub async fn open_book(
    ...
) -> Result<Book, String> {
    // Синхронная загрузка всех глав книги
    let book = get_book(&path, true)?;  // ← Может блокировать на minutes
    Ok(book)
}
```

**Проблема**: Команда помечена как `async`, но внутри вызывает синхронную `get_book(path, true)` которая загружает ВСЕ главы. Для PDF/DOCX это может занять минуты и заблокировать UI.

---

### 9.2. Нет обработки ошибок кодировки

**Файл**: `src-tauri/src/core/formats/txt/txt.rs`

```rust
fn decode_text(bytes: &[u8]) -> String {
    // UTF-8 → Windows-1251 fallback
    String::from_utf8(bytes.to_vec())
        .unwrap_or_else(|_| decode_windows1251(bytes))
}
```

**Проблема**: Если файл в другой кодировке (KOI8-R, MacCyrillic, ISO-8859-5), текст будет нечитаемым без уведомления пользователя.

---

### 9.3. Жёстко заданный путь к бинарникам

**Файл**: `src-tauri/tauri.conf.json`

```json
"resources": { "bin/pdfium.dll": "pdfium.dll" },
"externalBin": ["bin/poppler/pdftohtml"]
```

**Проблема**: Бинарные зависимости специфичны для Windows (.dll). На macOS/Linux эти файлы не будут работать. Нет условной компиляции или кроссплатформенной альтернативы.

---

### 9.4. Миграция схемы не обрабатывает будущие версии

**Файл**: `src-tauri/src/core/storage/mod.rs`

```rust
pub fn migrate_if_needed(store: &Store<Wry>) {
    let version = store.get(KEY_SCHEMA_VERSION)...unwrap_or(0);
    if version >= SCHEMA_VERSION {
        return;  // ← Версия 999 будет проигнорирована
    }
    // Только v0 -> v1
}
```

**Проблема**: Если будущая версия приложения (schema v5) откроет store от v2, миграция не выполнится (5 >= 2 → return). Но если v2 откроет store от v5, тоже будет return (5 >= 1). Это корректно, но нет обработки случая когда store от будущую версии.

---

## 10. ПРОБЛЕМЫ ДОКУМЕНТАЦИИ

### 10.1. Минимальный README

**Файл**: `README.md`

```markdown
# Tauri + Solid + Typescript
This template should help get you started developing with Tauri, Solid and Typescript in Vite.
```

**Проблема**: Это стандартный README из шаблона Tauri. Нет информации о:
- Как запустить проект
- Какие форматы поддерживаются
- Как добавить новые форматы
- Структура проекта
- Горячие клавиши
- Known issues

---

### 10.2. Нет комментариев в коде

**Проблема**: Код практически не документирован. Нет JSDoc/TSDoc комментариев, нет doc-комментариев в Rust (`///`).

---

### 10.3. Нет .env.example

**Проблема**: Если в будущем потребуются API-ключи или секреты, их некуда будет положить.

---

## 11. PROBLEMA ОТТЕСТРИРОВАНИЯ

### 11.1. Полное отсутствие тестов

**Проблема**: В проекте НЕТ ни одного теста:
- ❌ Unit-тесты (Rust или TypeScript)
- ❌ Интеграционные тесты
- ❌ E2E-тесты
- ❌ Тесты компонентов

**Файлы для тестирования** (критичные):
- `src/shared/utils/anchor.ts` — логика определения позиции
- `src/shared/utils/html.ts` — sanitization
- `src-tauri/src/core/formats/` — все загрузчики
- `src-tauri/src/core/storage/mod.rs` — миграция и сериализация

---

## СВОДНАЯ ТАБЛИЦА

| # | Проблема | Критичность | Файл(ы) |
|---|----------|-------------|---------|
| 1 | God Object ReaderPage (1412 строк) | 🔴 Высокая | BookRead.tsx |
| 2 | Сохранение при выходе закомментировано | 🔴 Критическая | lib.rs |
| 3 | CSP отключён | 🔴 Критическая | tauri.conf.json |
| 4 | Race condition сохранения настроек | 🟡 Средняя | settingsStore.ts |
| 5 | Дублирование savePosition/saveReadingAnchor | 🟡 Средняя | BookRead.tsx |
| 6 | Несоответствие bookPath | 🟡 Средняя | BookRead.tsx |
| 7 | Двойной вызов updateNotes при загрузке | 🟡 Средняя | BookRead.tsx |
| 8 | Отладочные логи в продакшене | 🟢 Низкая | BookRead.tsx |
| 9 | Горячие клавиши закомментированы | 🟡 Средняя | BookRead.tsx |
| 10 | Дублирование компонентов book | 🟢 Низкая | widgets/, components/ |
| 11 | Пустые файлы-заглушки | 🟢 Низкая | reader.ts, pagination.rs |
| 12 | Опечатка Breadcrumble | 🟢 Низкая | Breadcrumble.tsx |
| 13 | Нет виртуализации в читалке | 🟡 Средняя | BookRead.tsx |
| 14 | Клонирование всего AppState | 🟡 Средняя | commands/reader.rs |
| 15 | Синхронная запись на диск | 🟡 Средняя | storage/mod.rs |
| 16 | Debounce 500ms слишком большой | 🟢 Низкая | BookRead.tsx |
| 17 | XSS через innerHTML | 🔴 Критическая | BookRead.tsx |
| 18 | Нет валидации входных данных | 🟡 Средняя | commands/reader.rs |
| 19 | Ошибка приоритета операторов `??` | 🟡 Средняя | readerStore.ts |
| 20 | Неверные toast-сообщения | 🟢 Низкая | BookRead.tsx |
| 21 | Unsafe non-null assertions | 🟡 Средняя | BookRead.tsx |
| 22 | Нет подтверждения удаления | 🟢 Низкая | BookmarksPage.tsx |
| 23 | Фиксированный размер окна | 🟢 Низкая | tauri.conf.json |
| 24 | Tailwind v4 legacy config | 🟡 Средняя | tailwind.config.js |
| 25 | Мёртвые Node.js зависимости | 🟡 Средняя | package.json |
| 26 | Синхронная загрузка книг | 🟡 Средняя | commands/book.rs |
| 27 | Windows-only бинарники | 🟡 Средняя | tauri.conf.json |
| 28 | Нет тестов | 🔴 Высокая | весь проект |
| 29 | Минимальный README | 🟡 Средняя | README.md |

---

*Файл сгенерирован автоматически на основе анализа 95 файлов проекта.*
