# План проекта Grev

> Подробный план развития, рефакторинга и стабилизации проекта Grev — десктопной читалки электронных книг.

**Дата составления**: 12 апреля 2026  
**Версия плана**: 1.0  
**Текущая версия приложения**: 0.1.0

---

## ОГЛАВЛЕНИЕ

1. [Видение и цели](#1-видение-и-цели)
2. [Текущее состояние](#2-текущее-состояние)
3. [Приоритеты](#3-приоритеты)
4. [Фаза 0 — Критические исправления](#4-фаза-0-—-критические-исправления)
5. [Фаза 1 — Стабилизация и рефакторинг](#5-фаза-1-—-стабилизация-и-рефакторинг)
6. [Фаза 2 — Производительность](#6-фаза-2-—-производительность)
7. [Фаза 3 — Качество кода](#7-фаза-3-—-качество-кода)
8. [Фаза 4 — Расширение функционала](#8-фаза-4-—-расширение-функционала)
9. [Фаза 5 — Полировка и релиз](#9-фаза-5-—-полировка-и-релиз)
10. [Архитектурное видение](#10-архитектурное-видение)
11. [Технический стек](#11-технический-стек)
12. [Структура команды и ролей](#12-структура-команды-и-ролей)
13. [Метрики качества](#13-метрики-качества)
14. [Риски и митигация](#14-риски-и-митигация)
15. [Приложения](#15-приложения)

---

## 1. ВИДЕНИЕ И ЦЕЛИ

### 1.1. Миссия

Создать **быструю, красивую и надёжную** десктопную читалку электронных книг с поддержкой множества форматов, современным glassmorphism-интерфейсом и удобной системой заметок и закладок.

### 1.2. Целевая аудитория

- Читатели, работающие с большим объёмом текста (студенты, исследователи)
- Пользователи, которым нужна поддержка нескольких форматов (EPUB, FB2, PDF, DOCX, TXT, MD)
- Пользователи Windows/macOS/Linux, ценящие красивый интерфейс

### 1.3. Ключевые ценности

| Ценность | Описание |
|----------|----------|
| **Скорость** | Мгновенная загрузка книг, плавный скролл |
| **Надёжность** | Потеря данных недопустима |
| **Красота** | Glassmorphism UI, 4 темы, плавные анимации |
| **Удобство** | Заметки, закладки, сохранение позиции |
| **Открытость** | Поддержка 7+ форматов файлов |

### 1.4. Долгосрочные цели (1 год)

- [ ] Поддержка 10+ форматов (CBR/CBZ, DJVU, MOBI, AZW3)
- [ ] Синхронизация между устройствами
- [ ] Система аннотаций и экспорта заметок
- [ ] Полнотекстовый поиск по библиотеке
- [ ] Поддержка плагинов
- [ ] Мобильные версии (Tauri Mobile)

---

## 2. ТЕКУЩЕЕ СОСТОЯНИЕ

### 2.1. Сводка

| Параметр | Значение | Статус |
|----------|----------|--------|
| Версия | 0.1.0 | Alpha |
| Форматы | TXT, EPUB, FB2, HTML, MD, PDF, DOCX | ✅ Работает |
| Платформы | Windows (разработано), macOS/Linux (не тестировалось) | ⚠️ Частично |
| Тесты | 0 | ❌ Отсутствуют |
| Документация | Минимальная | ❌ Недостаточно |
| Критические баги | 3 | 🔴 Требуют исправления |
| Технический долг | Значительный | 🔴 Требует рефакторинга |

### 2.2. Что работает

- ✅ Загрузка книг из 7 форматов
- ✅ Библиотека с отображением обложек
- ✅ Читалка с двумя режимами (scroll/chapters)
- ✅ Система заметок (выделение + color picker)
- ✅ Система закладок
- ✅ Автосохранение позиции чтения
- ✅ 4 темы оформления (light/dark/sepia/night)
- ✅ Настройки шрифта (размер, высота строки, ширина колонки)
- ✅ Автоскрытие панелей
- ✅ Полноэкранный режим

### 2.3. Что НЕ работает / сломано

- ❌ Сохранение при выходе (закомментировано)
- ❌ Горячие клавиши (закомментированы)
- ❌ CSP отключён (безопасность)
- ❌ XSS-уязвимость через innerHTML
- ❌ Дублирование компонентов
- ❌ Нет тестов

### 2.4. Метрики кодовой базы

| Метрика | Значение | Норма |
|---------|----------|-------|
| Файлов (всего) | ~95 | — |
| Строк кода (frontend) | ~5,500 | — |
| Строк кода (backend) | ~6,000 | — |
| Самый большой файл | 1,412 строк (BookRead.tsx) | < 300 |
| Цикломатическая сложность | Высокая (ReaderPage) | < 10 на функцию |
| Покрытие тестами | 0% | > 80% |

---

## 3. ПРИОРИТЕТЫ

### 3.1. Матрица приоритетов

```
ВЛИЯНИЕ
  ↑
  │  🔴 P0: Критические       🟡 P1: Важные
  │  Потеря данных            Рефакторинг
  │  Безопасность             Производительность
  │  Блокирующие баги         Тестирование
  │
  │  🟢 P2: Улучшения         ⚪ P3: Nice-to-have
  │  DX и документация        Новые форматы
  │  UX-улучшения             Синхронизация
  │  Линтеры                  Плагины
  │
  └──────────────────────────────→ УСИЛИЯ
      Мало        Средне        Много
```

### 3.2. Приоритизированный бэклог

| Приоритет | Задача | Влияние | Усилие |
|-----------|--------|---------|--------|
| P0 | Исправить сохранение при выходе | 🔴 Критическое | 🟢 Малое |
| P0 | Включить и настроить CSP | 🔴 Критическое | 🟡 Среднее |
| P0 | Санитизация HTML перед innerHTML | 🔴 Критическое | 🟡 Среднее |
| P0 | Исправить `?? as Book[]` | 🟡 Среднее | 🟢 Малое |
| P1 | Разделить ReaderPage на компоненты | 🔴 Высокое | 🔴 Большое |
| P1 | Написать unit-тесты (utils) | 🟡 Среднее | 🟡 Среднее |
| P1 | Исправить дублирование bookPath | 🟡 Среднее | 🟢 Малое |
| P1 | Удалить мёртвый код | 🟢 Низкое | 🟢 Малое |
| P1 | Исправить debounce настроек | 🟡 Среднее | 🟡 Среднее |
| P2 | Виртуализация списка глав | 🟡 Среднее | 🟡 Среднее |
| P2 | Подтверждение удаления закладок | 🟢 Низкое | 🟢 Малое |
| P2 | Добавить minWidth/minHeight окна | 🟢 Низкое | 🟢 Малое |
| P2 | Написать README | 🟡 Среднее | 🟡 Среднее |
| P3 | Кроссплатформенные бинарники | 🟡 Среднее | 🔴 Большое |
| P3 | Поддержка CBR/CBZ | 🟢 Низкое | 🟡 Среднее |

---

## 4. ФАЗА 0 — КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ

> **Цель**: Устранить потерю данных и уязвимости безопасности.  
> **Срок**: 1-2 спринта (1-2 недели).  
> **Результат**: Приложение безопасно для использования.

### 4.1. Задача 0.1 — Раскомментировать сохранение при выходе

**Файл**: `src-tauri/src/lib.rs`

**Что сделать**:
1. Раскомментировать блок `ExitRequested`
2. Добавить корректную обработку ошибок
3. Протестировать: открыть книгу → проскроллить → закрыть → открыть → проверить позицию

**Код**:
```rust
tauri::RunEvent::ExitRequested { api: _, code: _, .. } => {
    if let Ok(store) = app.store(STORE_PATH) {
        if let Ok(state) = app.state::<Mutex<AppState>>().try_lock() {
            if let Err(err) = save_state(&store, &state) {
                log::error!("Failed to save store on exit: {}", err);
            }
        }
    }
}
```

**Критерий приёмки**:
- [ ] При закрытии приложения позиция чтения сохраняется
- [ ] При закрытии приложения несохранённые заметки сохраняются
- [ ] Ошибки логируются через `tauri-plugin-log`

---

### 4.2. Задача 0.2 — Включить CSP

**Файл**: `src-tauri/tauri.conf.json`

**Что сделать**:
1. Заменить `"csp": null` на корректную политику
2. Протестировать все функции приложения с включённым CSP
3. Убедиться что шрифты загружаются корректно

**Конфигурация**:
```json
"security": {
  "csp": "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self'"
}
```

**Критерий приёмки**:
- [ ] CSP включён в tauri.conf.json
- [ ] Все шрифты загружаются
- [ ] Все стили работают
- [ ] Нет CSP-violations в консоли

---

### 4.3. Задача 0.3 — Санитизация HTML

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`, `src/shared/utils/html.ts`

**Что сделать**:
1. Реализовать функцию `sanitizeHtml(html: string): string` в `html.ts`
2. Использовать её перед вставкой через `innerHTML`
3. Удалить `<script>`, `on*` атрибуты, `<iframe>`, `<object>`, `<embed>`

**Подход**:
- Написать собственную санитизацию через DOMParser (без внешних зависимостей)
- Или добавить `dompurify` как зависимость

**Рекомендация (DOMPurify)**:
```bash
yarn add dompurify
yarn add -D @types/dompurify
```

```typescript
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(chapter.html, {
  ALLOWED_TAGS: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                 'strong', 'em', 'b', 'i', 'u', 'a', 'img', 'ul', 
                 'ol', 'li', 'blockquote', 'code', 'pre', 'hr',
                 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                 'sup', 'sub', 'span', 'div', 'section', 'article',
                 'figure', 'figcaption', 'abbr', 'cite', 'q'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'colspan', 'rowspan'],
});
```

**Критерий приёмки**:
- [ ] Все `<script>` теги удалены из HTML книг
- [ ] Все `on*` атрибуты удалены
- [ ] Книги отображаются корректно после санитизации
- [ ] XSS-тесты проходят

---

### 4.4. Задача 0.4 — Исправить `?? as Book[]`

**Файл**: `src/shared/stores/readerStore.ts`

**Что сделать**:
```typescript
// Было:
books: await getBooks() ?? [] as Book[],

// Стало:
books: (await getBooks()) ?? [],
```

**Критерий приёмки**:
- [ ] TypeScript компилирует без ошибок
- [ ] Библиотека книг загружается корректно

---

### 4.5. Задача 0.5 — Исправить bookPath inconsistency

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

**Что сделать**:
1. Удалить дублирующую функцию `savePosition()`
2. Везде использовать `book()!.meta.path` через единый хелпер `getBookPath()`
3. Добавить валидацию что `book()` не `null`

```typescript
function getBookPath(): string {
  const b = book();
  if (!b?.meta?.path) throw new Error('Book path not available');
  return b.meta.path;
}
```

**Критерий приёмки**:
- [ ] Все вызовы `saveReadingPosition` используют один источник bookPath
- [ ] Позиция чтения сохраняется и восстанавливается корректно

---

### 4.6. Задача 0.6 — Убрать дублирование updateNotes

**Файл**: `src/pages/book/[id]/read/BookRead.tsx`

**Что сделать**:
1. Убрать ручной вызов `scheduleUpdateNotes(nts)` в `loadBook()`
2. Оставить только `createEffect` — он сработает при `setNotes(nts)`

**Критерий приёмки**:
- [ ] Заметки применяются один раз при загрузке
- [ ] Нет двойного рендеринга маркеров

---

### 4.7. Чек-лист Фазы 0

- [ ] 0.1 — Сохранение при выходе
- [ ] 0.2 — CSP включён
- [ ] 0.3 — HTML санитизация
- [ ] 0.4 — Исправлен `?? as`
- [ ] 0.5 — Унифицирован bookPath
- [ ] 0.6 — Убран дублирующий updateNotes

---

## 5. ФАЗА 1 — СТАБИЛИЗАЦИЯ И РЕФАКТОРИНГ

> **Цель**: Привести кодовую базу в поддерживаемое состояние.  
> **Срок**: 3-4 спринта.  
> **Результат**: Код читаемый, модульный, с тестами.

### 5.1. Задача 1.1 — Разделить ReaderPage

**Цель**: Превратить 1412-строчный файл в 8-10 маленьких модулей.

**Целевая структура**:

```
src/features/reader/
├── components/
│   ├── ReaderPage.tsx              ← ~80 строк (оркестратор)
│   ├── ReaderToolbar.tsx           ← ~60 строк (верхняя панель)
│   ├── ReaderFooter.tsx            ← ~40 строк (навигация по главам)
│   ├── ReaderContent.tsx           ← ~50 строк (рендеринг глав)
│   ├── ReaderNotePopup.tsx         ← ~80 строк (popup заметок)
│   └── ReaderBookLoader.tsx        ← ~30 строк (состояние загрузки)
├── hooks/
│   ├── useBookLoader.ts            ← ~80 строк
│   ├── useReadingPosition.ts       ← ~60 строк
│   ├── useNotesManager.ts          ← ~120 строк
│   ├── useBookmarksManager.ts      ← ~80 строк
│   ├── useAutoHideControls.ts      ← ~70 строк
│   ├── useKeyboardShortcuts.ts     ← ~80 строк
│   └── useFullscreen.ts            ← ~30 строк
├── utils/
│   ├── noteHighlight.ts            ← ~150 строк (wrap/unwrap marks)
│   └── textSelection.ts            ← ~100 строк (getRangeStartSnippet и т.д.)
└── stores/
    └── readerState.ts              ← ~50 строк (локальные сигналы)
```

**План разделения**:

#### Шаг 1: Вынести хуки (сначала)

1. `useBookLoader()` — вся логика `loadBook()`
2. `useReadingPosition()` — `saveReadingAnchor()`, `savePosition()`, debounce
3. `useNotesManager()` — `updateNotes()`, `createNote()`, `handleAddNote()`, mark-логика
4. `useBookmarksManager()` — `handleAddBookmark()`, `findAllAndSelect()`
5. `useAutoHideControls()` — `setupControlsAutoHide()`
6. `useKeyboardShortcuts()` — `handleKeyDown()` + все горячие клавиши
7. `useFullscreen()` — `toggleFullscreen()`, `isFullscreen`

#### Шаг 2: Вынести компоненты

8. `ReaderToolbar` — header с кнопками (TOC, закладки, заметки, настройки, fullscreen)
9. `ReaderFooter` — footer с навигацией по главам (только chapters mode)
10. `ReaderContent` — article с `<For>` или одной главой
11. `ReaderNotePopup` — popup редактора заметок

#### Шаг 3: Упростить ReaderPage

12. ReaderPage становится оркестратором: вызывает хуки, рендерит компоненты

**Критерий приёмки**:
- [ ] ReaderPage.tsx < 150 строк
- [ ] Каждый хук < 120 строк
- [ ] Каждый компонент < 80 строк
- [ ] Все тесты проходят
- [ ] Нет регрессий функционала

---

### 5.2. Задача 1.2 — Объединить дублирующие компоненты книг

**Текущая ситуация**:

```
widgets/book/     → Book.tsx, Books.tsx, BookView.tsx, Progress.tsx
components/book/  → BookCard.tsx, BookElement.tsx, BookList.tsx, Chapter.tsx
```

**Решение**: Оставить один набор.

```
src/entities/book/
├── BookCard.tsx       ← Карточка для библиотеки (обложка + мета + прогресс)
├── BookList.tsx       ← Список/сетка карточек
└── Progress.tsx       ← Прогресс-бар

src/widgets/book/
└── BookLibrary.tsx    ← Виджет библиотеки (использует BookList)
```

Удалить: `Book.tsx` (widgets), `Books.tsx`, `BookView.tsx`, `BookElement.tsx`, `BookList.tsx` (components)

**Критерий приёмки**:
- [ ] Один источник истины для компонентов книг
- [ ] Библиотека отображается корректно
- [ ] Нет неиспользуемых файлов

---

### 5.3. Задача 1.3 — Удалить мёртвый код

**Файлы для удаления**:
- [ ] `src/shared/utils/reader.ts` (пустой)
- [ ] `src-tauri/src/core/reader/pagination.rs` (пустой)
- [ ] Закомментированные горячие клавиши в `BookRead.tsx`
- [ ] `pdf-parse` и `pdf.js-extract` из `package.json` dependencies

**Файлы для чистки**:
- [ ] `console.log` в продакшен-коде
- [ ] Неиспользуемые импорты
- [ ] `Breadcrumble.tsx` → переименовать в `Breadcrumb.tsx`

---

### 5.4. Задача 1.4 — Написать unit-тесты для утилит

**Приоритет тестирования**:

| Модуль | Файл | Функции для тестирования |
|--------|------|-------------------------|
| anchor | `shared/utils/anchor.ts` | `getReadingAnchor()`, `scrollToAnchor()` |
| color | `shared/utils/color.ts` | `isHexLight()` |
| common | `shared/utils/common.ts` | `debounce()` |
| file | `shared/utils/file.ts` | `getFileExtension()` |
| html | `shared/utils/html.ts` | `sanitizeHtml()` (после реализации) |
| chapter | `shared/utils/chapter.ts` | Все функции |

**Инструменты**: Vitest (совместим с Vite + SolidJS)

```bash
yarn add -D vitest @solidjs/testing-library jsdom
```

**Пример структуры тестов**:
```
src/
  shared/
    utils/
      anchor.ts
      anchor.test.ts      ← Новый файл
      color.test.ts       ← Новый файл
      common.test.ts      ← Новый файл
```

**Критерий приёмки**:
- [ ] Vitest настроен
- [ ] coverage > 80% для `shared/utils/`
- [ ] Все тесты зелёные

---

### 5.5. Задача 1.5 — Исправить debounce сохранения настроек

**Файл**: `src/shared/stores/settingsStore.ts`

**Проблема**: При быстром изменении нескольких настроек debounce сбрасывается.

**Решение**: Использовать flush-on-change паттерн:

```typescript
const [dirty, setDirty] = createSignal(false);

export function setTheme(theme: Theme) {
  setSettings('general', 'theme', theme);
  applyTheme(theme);
  setDirty(true);
  scheduleSave();
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    if (dirty()) {
      try {
        await updateSettings(settings);
        setDirty(false);
      } catch (err) {
        console.error('Failed to save settings:', err);
        setDirty(true); // повторить при следующей возможности
      }
    }
  }, 500);
}
```

**Альтернатива**: Использовать `createEffect` для автосохранения при изменении любого поля настроек.

**Критерий приёмки**:
- [ ] Все изменения настроек сохраняются
- [ ] Нет потерянных обновлений
- [ ]dirty-флаг корректно отслеживает состояние

---

### 5.6. Задача 1.6 — Реализовать горячие клавиши

**Файл**: `src/pages/book/[id]/read/BookRead.tsx` → `src/features/reader/hooks/useKeyboardShortcuts.ts`

**Что сделать**:
1. Раскомментировать все case-ы
2. Настроить привязку к действиям
3. Добавить отображение в настройках
4. Обновить тултипы в UI

**Горячие клавиши**:

| Клавиша | Действие | Контекст |
|---------|----------|----------|
| `→` / `PageDown` | Следующая глава | chapters mode |
| `←` / `PageUp` | Предыдущая глава | chapters mode |
| `Escape` | Закрыть сайдбар / выйти из fullscreen | Всегда |
| `F` | Полный экран | Всегда |
| `T` | Открыть/закрыть оглавление | Читалка |
| `B` | Добавить закладку | Читалка |
| `N` | Добавить заметку (выделить текст) | Читалка |
| `S` | Переключить режим scroll/chapters | Читалка |

**Критерий приёмки**:
- [ ] Все горячие клавиши работают
- [ ] Тултипы в UI актуальны
- [ ] Горячие клавиши не работают в input/textarea (кроме Escape)
- [ ] Настраиваемые горячие клавиши (из settings)

---

### 5.7. Чек-лист Фазы 1

- [ ] 1.1 — ReaderPage разделён (< 150 строк)
- [ ] 1.2 — Компоненты книг объединены
- [ ] 1.3 — Мёртвый код удалён
- [ ] 1.4 — Unit-тесты utils (coverage > 80%)
- [ ] 1.5 — Debounce настроек исправлен
- [ ] 1.6 — Горячие клавиши работают

---

## 6. ФАЗА 2 — ПРОИЗВОДИТЕЛЬНОСТЬ

> **Цель**: Обеспечить плавную работу с большими книгами.  
> **Срок**: 2-3 спринта.  
> **Результат**: Книги до 2000 страниц работают плавно.

### 6.1. Задача 2.1 — Виртуализация списка глав

**Файл**: `src/pages/book/[id]/read/BookRead.tsx` → `src/features/reader/components/ReaderContent.tsx`

**Проблема**: Все главы рендерятся сразу. Для книг с 100+ главами — лаги.

**Решение**: Использовать `virtua` (уже в зависимостях).

```tsx
import { VList } from 'virtua';

<VList
  ref={contentRef}
  style={{ height: '100%' }}
>
  {sortedChapters().map((chapter, index) => (
    <div key={chapter.id} id={`chapter-${index}`} class='mb-12'>
      <Show when={chapter.title && hasMultipleChapters()}>
        <h2>{chapter.title}</h2>
      </Show>
      <div innerHTML={sanitizeHtml(chapter.html)} />
    </div>
  ))}
</VList>
```

**Альтернатива**: IntersectionObserver для ленивой загрузки глав:

```typescript
const [loadedChapters, setLoadedChapters] = createSignal<Set<number>>(new Set());

// Загружать только видимые + 2 соседние главы
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = parseInt(entry.target.dataset.index!);
      setLoadedChapters(prev => new Set([...prev, idx - 1, idx, idx + 1]));
    }
  });
}, { rootMargin: '200%' });
```

**Критерий приёмки**:
- [ ] Книга с 200 главами скроллится плавно (60fps)
- [ ] Память < 500MB для книги 1000 страниц
- [ ] Время начального рендера < 1 секунды

---

### 6.2. Задача 2.2 — Оптимизация обновления заметок

**Файл**: `src/features/reader/utils/noteHighlight.ts`

**Проблема**: `updateNotes()` делает множественные DOM-модификации с reflow.

**Решение**:
1. Батчить все DOM-модификации через `requestAnimationFrame`
2. Использовать `DocumentFragment` для batch-вставки
3. Кэшировать результаты `buildTextIndex()`

```typescript
function updateNotesInBatch(notes: Note[], root: HTMLElement) {
  requestAnimationFrame(() => {
    const textIndex = buildTextIndex(root);  // Один обход
    
    notes.forEach(note => {
      // Использовать кэшированный индекс
      applyNoteHighlight(note, root, textIndex);
    });
  });
}
```

**Критерий приёмки**:
- [ ] 100 заметок применяются за < 100ms
- [ ] Нет видимых лагов при загрузке книги с заметками

---

### 6.3. Задача 2.3 — Инкрементальное сохранение состояния

**Файл**: `src-tauri/src/commands/reader.rs`

**Проблема**: Каждая мутация клонирует и сериализует ВЕСЬ `AppState`.

**Решение**: Сохранять только изменённую часть.

```rust
// Вместо clone() всего AppState:
async fn persist_field(app: &AppHandle, field: &str, value: impl Serialize) -> Result<(), String> {
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set(field, serde_json::to_value(value).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

// Использование:
pub async fn save_reading_position(...) -> Result<ReaderState, String> {
    let mut state = state.lock().unwrap();
    // ... изменяем только reader.sessions ...
    
    // Сохраняем только reader_state, не весь AppState
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set(KEY_READER, serde_json::to_value(&state.reader).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    
    Ok(state.reader.clone())
}
```

**Критерий приёмки**:
- [ ] Сохранение позиции < 10ms для библиотеки 100 книг
- [ ] Нет блокировки UI при сохранении

---

### 6.4. Задача 2.4 — Уменьшить debounce сохранения позиции

**Файл**: `src/features/reader/hooks/useReadingPosition.ts`

**Текущее значение**: 500ms

**Рекомендация**: 250ms с `leading: true, trailing: true`

```typescript
// Debounce с leading + trailing
function debounceLeadingTrailing(fn: Function, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let leading = true;
  
  return (...args: any[]) => {
    if (leading) {
      fn(...args);
      leading = false;
    }
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      leading = true;
      fn(...args);
    }, delay);
  };
}
```

**Критерий приёмки**:
- [ ] Позиция сохраняется при начале скролла
- [ ] Позиция сохраняется при окончании скролла
- [ ] Максимальная потеря — 250ms скролла

---

### 6.5. Задача 2.5 — Уменьшить размер окна по умолчанию

**Файл**: `src-tauri/tauri.conf.json`

```json
"windows": [{
    "title": "grev",
    "width": 1200,
    "height": 800,
    "minWidth": 600,
    "minHeight": 400,
    "resizable": true,
    "decorations": false
}]
```

**Критерий приёмки**:
- [ ] Окно открывается 1200x800
- [ ] Нельзя сжать меньше 600x400
- [ ] Окно можно ресайзить

---

### 6.6. Чек-лист Фазы 2

- [ ] 2.1 — Виртуализация глав
- [ ] 2.2 — Оптимизация заметок
- [ ] 2.3 — Инкрементальное сохранение
- [ ] 2.4 — Debounce 250ms
- [ ] 2.5 — Размер окна

---

## 7. ФАЗА 3 — КАЧЕСТВО КОДА

> **Цель**: Обеспечить долгосрочную поддерживаемость.  
> **Срок**: 2-3 спринта.  
> **Результат**: Линтеры, типы, документация, CI.

### 7.1. Задача 3.1 — Настроить линтеры

#### Frontend

```bash
yarn add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-solid
```

**.eslintrc.json**:
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "solid"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:solid/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "solid/reactivity": "warn"
  }
}
```

**package.json scripts**:
```json
{
  "lint": "eslint src --ext .ts,.tsx",
  "lint:fix": "eslint src --ext .ts,.tsx --fix",
  "typecheck": "tsc --noEmit"
}
```

#### Backend

Добавить `clippy` в CI:
```bash
cargo clippy -- -D warnings
```

**Критерий приёмки**:
- [ ] `yarn lint` проходит без ошибок
- [ ] `yarn typecheck` проходит без ошибок
- [ ] `cargo clippy` проходит без предупреждений

---

### 7.2. Задача 3.2 — Настроить форматирование

```bash
yarn add -D prettier
```

**.prettierrc**:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "all"
}
```

**package.json**:
```json
{
  "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
  "format:check": "prettier --check \"src/**/*.{ts,tsx,css,json}\""
}
```

**Rust**: `cargo fmt`

**Критерий приёмки**:
- [ ] `yarn format:check` проходит
- [ ] `cargo fmt -- --check` проходит

---

### 7.3. Задача 3.3 — Настроить pre-commit хуки

```bash
yarn add -D husky lint-staged
```

**package.json**:
```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "src-tauri/**/*.rs": ["cargo fmt --"],
    "*.json": ["prettier --write"]
  }
}
```

**Критерий приёмки**:
- [ ] pre-commit хук запускает линтер и форматирование
- [ ] Коммиты с ошибками блокируются

---

### 7.4. Задача 3.4 — Написать README

**Структура README.md**:

```markdown
# Grev 📖

Современная десктопная читалка электронных книг с glassmorphism UI.

## Скриншоты

[Скриншот библиотеки]
[Скриншот читалки]

## Возможности

- 📚 Поддержка 7+ форматов: EPUB, FB2, PDF, DOCX, TXT, HTML, Markdown
- 🎨 4 темы: Light, Dark, Sepia, Night
- 📝 Заметки с выделением текста и color picker
- 🔖 Закладки с сохранением позиции
- ⌨️ Горячие клавиши
- 🖥️ Полноэкранный режим

## Установка

### Из релизов
Скачайте последний релиз с [GitHub Releases](...)

### Из исходников
```bash
git clone https://github.com/.../grev.git
cd grev
yarn install
yarn tauri dev
```

## Горячие клавиши

[Таблица]

## Разработка

### Требования
- Node.js 18+
- Rust 1.70+
- Tauri CLI

### Структура проекта
[Краткое описание]

### Добавление нового формата
[Инструкция]

## Лицензия

MIT
```

---

### 7.5. Задача 3.5 — Добавить документацию в код

**Frontend** (JSDoc):
```typescript
/**
 * Определяет текущую позицию чтения в содержимом главы.
 * 
 * @param root - Корневой элемент контента
 * @param chapterId - ID текущей главы
 * @returns ReadingPosition или null если позиция не определена
 */
export function getReadingAnchor(root: HTMLElement, chapterId: string): ReadingPosition | null {
```

**Backend** (Rust doc comments):
```rust
/// Сохраняет позицию чтения для указанной книги.
/// 
/// # Arguments
/// * `app` -_handle_ приложения
/// * `state` - Глобальное состояние приложения
/// * `book_path` - Путь к книге
/// * `position` - Позиция чтения (глава, якорь)
/// * `mode` - Режим просмотра (scroll/page)
/// 
/// # Returns
/// Обновлённое состояние читалки или ошибку
#[tauri::command]
pub async fn save_reading_position(...) -> Result<ReaderState, String> {
```

**Критерий приёмки**:
- [ ] Все публичные функции имеют doc-комментарии
- [ ] `cargo doc` генерирует документацию без ошибок

---

### 7.6. Задача 3.6 — Настроить CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`):

```yaml
name: CI

on: [push, pull_request]

jobs:
  lint-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: yarn install
      - run: yarn lint
      - run: yarn typecheck
      - run: yarn test

  lint-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo clippy -- -D warnings
      - run: cargo test

  build:
    needs: [lint-frontend, lint-backend]
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: dtolnay/rust-toolchain@stable
      - run: yarn install
      - run: yarn tauri build
```

---

### 7.7. Чек-лист Фазы 3

- [ ] 3.1 — ESLint + Clippy настроены
- [ ] 3.2 — Prettier настроен
- [ ] 3.3 — Husky pre-commit хуки
- [ ] 3.4 — README написан
- [ ] 3.5 — Документация в коде
- [ ] 3.6 — CI/CD настроен

---

## 8. ФАЗА 4 — РАСШИРЕНИЕ ФУНКЦИОНАЛА

> **Цель**: Добавить востребованные функции.  
> **Срок**: 4-6 спринтов.  
> **Результат**: Конкурентоспособный продукт.

### 8.1. Задача 4.1 — Полнотекстовый поиск

**Описание**: Поиск по содержимому всех книг в библиотеке.

**Архитектура**:
- Индексирование при добавлении книги (Rust-бэкенд)
- Поиск по индексу через `tantivy` (Rust search engine)
- UI: строка поиска в библиотеке с автодополнением

**UI**:
```
[🔍 Поиск по библиотеке...]
┌─────────────────────────────────────┐
│ 📖 Война и мир — Глава 5           │
│    "...князь Андрей смотрел в небо..." │
├─────────────────────────────────────┤
│ 📖 Преступление и наказание — Ч.2   │
│    "...Раскольников вошёл в комнату..."│
└─────────────────────────────────────┘
```

**Зависимости**:
```toml
tantivy = "0.21"  # Rust search engine
```

**Критерий приёмки**:
- [ ] Поиск по названию книги
- [ ] Поиск по автору
- [ ] Полнотекстовый поиск по содержимому
- [ ] Результаты с контекстом (snippet)
- [ ] Поиск < 100ms для 1000 книг

---

### 8.2. Задача 4.2 — Экспорт заметок

**Описание**: Экспорт всех заметок в файл.

**Форматы экспорта**:
- Markdown (.md)
- HTML (.html)
- JSON (.json)
- Plain text (.txt)

**UI**: Страница заметок → кнопка «Экспорт»

```
Экспорт заметок:
○ Markdown
○ HTML  
○ JSON
○ Plain text

[Экспортировать]
```

**Формат Markdown**:
```markdown
# Заметки — Война и мир

## Глава 5
> ...текст выделения...

Моя заметка к этому месту.

---

## Глава 12
> ...другое выделение...

Ещё одна заметка.
```

**Критерий приёмки**:
- [ ] Экспорт в 4 формата
- [ ] Файл скачивается через dialog
- [ ] Форматирование корректное

---

### 8.3. Задача 4.3 — Подтверждение удаления

**Описание**: Модальное окно подтверждения при удалении закладок/заметок.

**UI**:
```
┌─────────────────────────────────┐
│     Удалить закладку?           │
│                                 │
│  "...текст превью закладки..."   │
│                                 │
│    [Отмена]    [Удалить]        │
└─────────────────────────────────┘
```

**Компонент**: `src/shared/ui/ConfirmDialog.tsx`

```typescript
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}
```

**Критерий приёмки**:
- [ ] Подтверждение при удалении закладки
- [ ] Подтверждение при удалении заметки
- [ ] Подтверждение при удалении книги из библиотеки
- [ ] Можно отменить

---

### 8.4. Задача 4.4 — Поддержка CBR/CBZ (комиксы)

**Описание**: Чтение комиксов в форматах CBR/CBZ (RAR/ZIP архивы изображений).

**Архитектура**:
```
src-tauri/src/core/formats/comic/
├── mod.rs
├── comic.rs          ← ComicLoader
└── model.rs          ← ComicPage { image: Vec<u8> }
```

**Реализация**:
1. Распаковать ZIP (CBZ) или RAR (CBR)
2. Извлечь изображения в порядке сортировки по имени
3. Отобразить как страницы (не текст, а изображения)

**UI читалки комиксов**:
- Полноэкранный режим по умолчанию
- Навигация ← → между страницами
- Zoom (pinch/click)
- Режимы: single page / double spread

**Зависимости**:
```toml
unrar = "0.5"  # Для CBR
```

**Критерий приёмки**:
- [ ] CBZ файлы открываются
- [ ] CBR файлы открываются (если unrar доступен)
- [ ] Изображения отображаются в полном размере
- [ ] Навигация между страницами

---

### 8.5. Задача 4.5 — Коллекции / полки

**Описание**: Группировка книг в коллекции (полки).

**Модель**:
```rust
struct Collection {
    id: String,
    name: String,
    icon: Option<String>,
    book_paths: Vec<String>,
    created_at: i64,
}
```

**UI**:
- Страница коллекции
- Drag & drop книг на полку
- Быстрое переключение между полками в sidebar

**Критерий приёмки**:
- [ ] Создание/удаление коллекций
- [ ] Добавление/удаление книг из коллекции
- [ ] Одна книга может быть в нескольких коллекциях
- [ ] Коллекция «Все книги» по умолчанию

---

### 8.6. Задача 4.6 — Статистика чтения

**Описание**: Отслеживание прогресса и статистики чтения.

**Метрики**:
- Время чтения (за сессию, за день, за всё время)
- Прочитано страниц
- Скорость чтения (стр/час)
- streak (дней подряд)

**UI**: Страница статистики с графиками

```
📊 Статистика чтения

Сегодня: 45 мин · 32 стр
За неделю: 5ч 20мин · 234 стр
Всего: 127ч 15мин · 8901 стр

📈 График за месяц:
[━━━━━━━━████████░░░░░░]
 Пн Вт Ср Чт Пт Сб Вс
```

**Зависимости**:
```toml
chrono = "0.4"  # Уже есть косвенно
```

**Критерий приёмки**:
- [ ] Отслеживание времени чтения
- [ ] Подсчёт страниц
- [ ] Визуализация графика

---

### 8.7. Чек-лист Фазы 4

- [ ] 4.1 — Полнотекстовый поиск
- [ ] 4.2 — Экспорт заметок
- [ ] 4.3 — Подтверждение удаления
- [ ] 4.4 — Поддержка CBR/CBZ
- [ ] 4.5 — Коллекции/полки
- [ ] 4.6 — Статистика чтения

---

## 9. ФАЗА 5 — ПОЛИРОВКА И РЕЛИЗ

> **Цель**: Подготовить к публичному релизу v1.0.  
> **Срок**: 2-3 спринта.  
> **Результат**: Стабильный v1.0.

### 9.1. Задача 5.1 — Кроссплатформенная сборка

**Проблема**: Бинарные зависимости PDF только для Windows.

**Решение**:
1. Для macOS: Homebrew poppler (`brew install poppler`)
2. Для Linux: apt install poppler-utils
3. Условная компиляция в Rust:

```rust
#[cfg(target_os = "windows")]
const PDFIUM_DLL: &str = "pdfium.dll";

#[cfg(target_os = "macos")]
const PDFIUM_DYLIB: &str = "libpdfium.dylib";

#[cfg(target_os = "linux")]
const PDFIUM_SO: &str = "libpdfium.so";
```

4. Для Linux/macOS использовать системный poppler

**Критерий приёмки**:
- [ ] Сборка на Windows
- [ ] Сборка на macOS
- [ ] Сборка на Ubuntu 22.04+
- [ ] PDF работает на всех платформах

---

### 9.2. Задача 5.2 — Тестирование E2E

**Инструмент**: Playwright

```bash
yarn add -D @playwright/test
```

**Тест-кейсы**:

| # | Сценарий | Ожидаемый результат |
|---|----------|---------------------|
| 1 | Открыть приложение | Отображается библиотека |
| 2 | Добавить книгу | Книга появляется в библиотеке |
| 3 | Открыть книгу | Читалка отображает контент |
| 4 | Добавить закладку | Закладка появляется в списке |
| 5 | Добавить заметку | Выделение подсвечивается |
| 6 | Закрыть и открыть книгу | Позиция восстановлена |
| 7 | Переключить тему | Тема применяется |
| 8 | Поиск по библиотеке | Результаты фильтруются |

**Критерий приёмки**:
- [ ] 8+ E2E-тестов
- [ ] Все тесты зелёные в CI
- [ ] Скриншоты на регрессию

---

### 9.3. Задача 5.3 — Оптимизация размера бандла

**Цель**: Размер установочного файла < 50MB.

**Действия**:
1. Удалить неиспользуемые зависимости
2. Включить сжатие в Tauri
3. Оптимизировать изображения обложек
4. Стриппинг бинарей

**tauri.conf.json**:
```json
"bundle": {
  "windows": {
    "wix": {
      "language": ["ru-RU", "en-US"]
    }
  },
  "targets": ["msi", "app", "dmg", "appimage"]
}
```

**Критерий приёмки**:
- [ ] Windows MSI < 50MB
- [ ] macOS DMG < 50MB
- [ ] Linux AppImage < 50MB

---

### 9.4. Задача 5.4 — Финальное тестирование

**Чек-лист ручного тестирования**:

- [ ] Открыть книгу каждого из 7 форматов
- [ ] Добавить 50 закладок
- [ ] Добавить 50 заметок
- [ ] Прокрутить книгу 1000+ страниц
- [ ] Переключить все 4 темы
- [ ] Изменить все настройки
- [ ] Проверить горячие клавиши
- [ ] Закрыть приложение → открыть → проверить позицию
- [ ] Полный экран
- [ ] Автоскрытие панелей
- [ ] TOC навигация
- [ ] Страница закладок/заметок
- [ ] Страница настроек
- [ ] 404 страница

---

### 9.5. Задача 5.5 — Релиз v1.0

**Чек-лист релиза**:

- [ ] Все тесты зелёные
- [ ] Все критические баги исправлены
- [ ] README актуален
- [ ] CHANGELOG написан
- [ ] Собрать бинарники для всех платформ
- [ ] Опубликовать на GitHub Releases
- [ ] Обновить версию в package.json и Cargo.toml

---

### 9.6. Чек-лист Фазы 5

- [ ] 5.1 — Кроссплатформенная сборка
- [ ] 5.2 — E2E-тесты
- [ ] 5.3 — Оптимизация бандла
- [ ] 5.4 — Финальное тестирование
- [ ] 5.5 — Релиз v1.0

---

## 10. АРХИТЕКТУРНОЕ ВИДЕНИЕ

### 10.1. Целевая структура проекта (после рефакторинга)

```
src/
├── app/                          ← Приложение целиком
│   ├── App.tsx                   ← Root-компонент
│   └── Router.tsx                ← Роутинг
│
├── pages/                        ← Страницы (маршруты)
│   ├── library/
│   │   └── LibraryPage.tsx       ← Использует widgets
│   ├── book/
│   │   ├── BookDetailPage.tsx
│   │   └── read/ReaderPage.tsx   ← Оркестратор (< 150 строк)
│   ├── bookmarks/BookmarksPage.tsx
│   └── settings/SettingsPage.tsx
│
├── widgets/                      ← Крупные блоки UI
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   └── Sidebar.tsx
│   └── library/
│       └── BookLibrary.tsx       ← Виджет библиотеки
│
├── features/                     ← Фичи (бизнес-логика + UI)
│   ├── reader/
│   │   ├── components/           ← ReaderToolbar, ReaderContent, ...
│   │   ├── hooks/                ← useBookLoader, useNotesManager, ...
│   │   ├── utils/                ← noteHighlight, textSelection
│   │   └── stores/               ← Локальные сигналы читалки
│   ├── bookmarks/
│   │   ├── components/
│   │   └── hooks/
│   └── notes/
│       ├── components/
│       └── hooks/
│
├── entities/                     ← Бизнес-сущности
│   ├── book/
│   │   ├── BookCard.tsx
│   │   ├── BookList.tsx
│   │   └── types.ts
│   └── note/
│       ├── NoteCard.tsx
│       └── types.ts
│
├── shared/                       ← Переиспользуемое
│   ├── api/                      ← Tauri invoke-функции
│   ├── stores/                   ← Глобальные stores
│   ├── ui/                       ← UI-кит (Button, Icon, Modal, ...)
│   ├── utils/                    ← Утилиты
│   ├── hooks/                    ← Общие хуки
│   └── types/                    ← Общие типы
│
└── assets/                       ← Статика
    ├── fonts/
    └── styles/
```

### 10.2. Принципы проектирования

| Принцип | Описание |
|---------|----------|
| **FSD (Feature-Sliced Design)** | Разделение по фичам, сущностям, shared |
| **Single Responsibility** | Каждый файл < 200 строк, одна задача |
| **Dependency Rule** | Зависимости только внутрь своего слоя или вниз |
| **No God Objects** | Компонент не делает больше 3 вещей |
| **Test First** | Новые фичи начинаются с тестов |

### 10.3. Паттерны

| Паттерн | Где применяется |
|---------|-----------------|
| Repository | API-слой → Tauri commands |
| Store (SolidJS) | Глобальное состояние (settings, reader) |
| Composite | Главы → Книга |
| Strategy | BookSource для разных форматов |
| Observer | createEffect для реактивности |
| Debounce | Сохранение позиции и настроек |

---

## 11. ТЕХНИЧЕСКИЙ СТЕК

### 11.1. Текущий стек

| Уровень | Технология | Версия |
|---------|------------|--------|
| Framework | Tauri | 2.x |
| Frontend | SolidJS | 1.9.x |
| Роутинг | @solidjs/router | 0.15.x |
| Стили | Tailwind CSS | 4.x |
| Язык | TypeScript | 5.6.x |
| Бэкенд | Rust | Stable |
| Парсинг XML | roxmltree, quick-xml | — |
| PDF | pdfium-render, poppler | — |
| Markdown | pulldown-cmark | — |
| DOCX | docx-rust | — |

### 11.2. Планируемые additions

| Технология | Назначение | Фаза |
|------------|------------|------|
| Vitest | Unit-тесты frontend | 1 |
| ESLint | Линтинг frontend | 3 |
| Prettier | Форматирование | 3 |
| Husky | Pre-commit хуки | 3 |
| tantivy | Полнотекстовый поиск | 4 |
| Playwright | E2E-тесты | 5 |
| DOMPurify | HTML-санитизация | 0 |

---

## 12. СТРУКТУРА КОМАНДЫ И РОЛЕЙ

> Для pet-проекта один разработчик, но роли полезны для планирования.

| Роль | Обязанности | Задачи из плана |
|------|-------------|-----------------|
| **Frontend-разработчик** | SolidJS компоненты, стили, UI | 1.1, 1.2, 2.1, 2.2, 4.2, 4.3 |
| **Backend-разработчик** | Rust, Tauri commands, форматы | 0.1, 2.3, 4.1, 4.4, 5.1 |
| **QA-инженер** | Тесты, E2E, ручное тестирование | 1.4, 5.2, 5.4 |
| **DevOps** | CI/CD, релизы, бандлы | 3.6, 5.3, 5.5 |
| **UX/UI дизайнер** | Дизайн, пользовательский опыт | 4.5, 4.6 |
| **Tech Lead** | Архитектура, ревью, стандарты | 1.1, 3.1, 10 |

---

## 13. МЕТРИКИ КАЧЕСТВА

### 13.1. Целевые метрики

| Метрика | Сейчас | Цель v0.5 | Цель v1.0 |
|---------|--------|-----------|-----------|
| Покрытие тестами | 0% | 40% | 80% |
| Макс. размер файла | 1412 строк | 500 строк | 200 строк |
| Цикломатическая сложность | >20 | <15 | <10 |
| Время загрузки книги | до 30 сек | до 10 сек | до 5 сек |
| Размер бандла | неизвестно | < 80MB | < 50MB |
| FPS при скролле | проседает | 50+ | 60 |
| Критические баги | 3 | 0 | 0 |

### 13.2. Метрики производительности

| Сценарий | Цель |
|----------|------|
| Открытие книги (TXT/EPUB) | < 1 сек |
| Открытие книги (PDF 500 стр.) | < 5 сек |
| Переключение главы | < 100ms |
| Сохранение позиции | < 10ms |
| Применение 100 заметок | < 100ms |
| Поиск по 1000 книгам | < 100ms |

---

## 14. РИСКИ И МИТИГАЦИЯ

### 14.1. Матрица рисков

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Потеря данных пользователя | Средняя | 🔴 Критическое | Фаза 0, автосохранение, резервное копирование |
| XSS-атака через книгу | Средняя | 🔴 Критическое | Фаза 0, санитизация, CSP |
| Падение производительности на больших книгах | Высокая | 🟡 Высокое | Фаза 2, виртуализация |
| Кроссплатформенные проблемы | Высокая | 🟡 Высокое | Фаза 5.1, условная компиляция |
| Зависимости от внешних бинарей (pdfium) | Средняя | 🟡 Высокое | Fallback на poppler, документация |
| Выгорание (pet-проект) | Высокая | 🔴 Критическое | Реалистичные сроки, разбиение на мелкие задачи |
| Breaking changes в Tauri/Solid | Низкая | 🟡 Среднее | Pin версий, мониторинг changelog |

### 14.2. План действий при потере данных

1. Резервное копирование `store.json` при каждом запуске
2. Хранить backup в `.grev/backups/` с timestamp
3. UI для восстановления из backup

---

## 15. ПРИЛОЖЕНИЯ

### 15.1. Словарь терминов

| Термин | Определение |
|--------|-------------|
| **Якорь (anchor)** | Текстовый фрагмент для определения позиции чтения |
| **Закладка (bookmark)** | Сохранённая позиция чтения с превью |
| **Заметка (note)** | Аннотация к выделенному тексту |
| **Глава (chapter)** | Логический раздел книги с HTML-контентом |
| **Свиток (scroll mode)** | Непрерывный скролл всех глав |
| **Главы (chapters mode)** | Постраничная навигация по одной главе |
| **Store** | Tauri persist-хранилище (JSON-файл) |
| **BookSource** | Трейт загрузчика формата книги |

### 15.2. Глоссарий слоёв (FSD)

| Слой | Что содержит | Пример |
|------|-------------|--------|
| `app` | Инициализация приложения | Router, Providers |
| `pages` | Компоненты маршрутов | LibraryPage, ReaderPage |
| `widgets` | Крупные блоки UI | Sidebar, Header |
| `features` | Пользовательские сценарии | reader, bookmarks |
| `entities` | Бизнес-сущности | Book, Note |
| `shared` | Переиспользуемый код | Button, API, utils |

### 15.3. Справочник Tauri-команд

| Команда | Параметры | Возвращает |
|---------|-----------|------------|
| `open_book` | `path: String, load_chapters: bool` | `Book` |
| `get_books` | — | `Vec<Book>` |
| `get_book` | `id: String` | `Option<Book>` |
| `add_books` | `folder_path: String` | `Vec<Book>` |
| `add_book` | `file_path: String` | `Book` |
| `get_reader_state` | — | `ReaderState` |
| `set_current_book` | `book_path: String` | `ReaderState` |
| `save_reading_position` | `book_path, position, mode` | `ReaderState` |
| `get_reading_position` | `book_path: String` | `ReadingPosition` |
| `add_bookmark` | `book_path, position, preview, kind` | `Bookmark` |
| `get_bookmarks` | `book_path: Option<String>` | `Vec<Bookmark>` |
| `delete_bookmark` | `bookmark_id: String` | `()` |
| `add_note` | `book_path, range, text, preview, highlight, color` | `Note` |
| `update_note` | `note_id, range, text, highlight, color` | `Note` |
| `delete_note` | `note_id: String` | `()` |
| `get_notes` | `book_path: Option<String>` | `Vec<Note>` |
| `get_settings` | — | `SettingStore` |
| `update_settings` | `settings: SettingStore` | `SettingStore` |
| `clear_store` | — | `()` |

### 15.4. Справочник типов (TypeScript)

```typescript
interface Book {
  id: string;
  meta: BookMeta;
  chapters: Chapter[];
}

interface BookMeta {
  title: string;
  author: string;
  language: string;
  cover: string | null;
  path: string;
}

interface Chapter {
  id: string;
  title: string;
  html: string;
  order: number;
}

interface ReadingPosition {
  chapter_id: string;
  anchor_text: string;
  before: string;
  after: string;
}

interface Bookmark {
  id: string;
  book_path: string;
  position: ReadingPosition;
  preview: string;
  kind: 'regular' | 'custom';
  created_at: number;
}

interface Note {
  id: string;
  preview: string;
  book_path: string;
  range: TextRange;
  text: string;
  highlight: boolean;
  highlight_color: string;
  created_at: number;
  updated_at: number;
}

interface TextRange {
  start: TextLocation;
  end: TextLocation;
}

interface TextLocation {
  chapter_id: string;
  offset: number;
}
```

### 15.5. Справочник типов (Rust)

```rust
struct Book {
    id: String,
    meta: BookMeta,
    chapters: Vec<Chapter>,
}

struct BookMeta {
    title: String,
    author: String,
    language: String,
    cover: Option<String>,
    path: String,
}

struct Chapter {
    id: String,
    title: String,
    html: String,
    order: u32,
}

struct ReadingPosition {
    chapter_id: String,
    anchor_text: String,
    before: String,
    after: String,
}

struct ReadingSession {
    book_path: String,
    position: ReadingPosition,
    mode: ReaderMode,
    last_opened_at: i64,
    last_read_at: i64,
}

enum ReaderMode {
    Scroll,
    Page,
}

struct Bookmark {
    id: String,
    book_path: String,
    position: ReadingPosition,
    preview: String,
    kind: BookmarkKind,
    created_at: i64,
}

enum BookmarkKind {
    Regular,
    Custom,
}

struct Note {
    id: String,
    preview: String,
    book_path: String,
    range: TextRange,
    text: String,
    highlight: bool,
    highlight_color: Option<String>,
    created_at: i64,
    updated_at: i64,
}
```

---

*План составлен на основе анализа 95 файлов проекта.  
Рекомендуется пересматривать план каждые 2 спринта.*
