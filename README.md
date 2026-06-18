# 📖 Uni

> Десктопное приложение для чтения электронных книг с современным интерфейсом и поддержкой популярных форматов.

![Версия](https://img.shields.io/badge/version-0.1.0-blue)
![Лицензия](https://img.shields.io/badge/license-MIT-green)
![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB)
![SolidJS](https://img.shields.io/badge/SolidJS-2C7FBE)

---

## ✨ Особенности

- **7 форматов:** EPUB, FB2 (включая `.fb2.zip`), PDF, DOCX, TXT, HTML, Markdown
- **Два режима чтения:** непрерывный «свиток» или постраничная навигация по главам
- **Заметки с выделением текста:** выбор цвета + комментарии
- **Закладки:** сохранение позиции с текстовым превью
- **Настройка читалки:** шрифт, размер, межстрочный интервал, ширина колонки
- **4 темы:** светлая, тёмная, сепия, ночной режим (OLED)
- **Горячие клавиши**
- **Локальное хранение** (всё на вашем компьютере)

---

## 📚 Поддерживаемые форматы

| Формат | Расширения |
|--------|------------|
| EPUB | `.epub` |
| FB2 | `.fb2`, `.fb2.zip` |
| PDF | `.pdf` |
| DOCX | `.docx` |
| TXT | `.txt` |
| HTML | `.html`, `.htm` |
| Markdown | `.md`, `.markdown` |

---

## ✨ Скриншоты

![Скриншот страницы библиотеки](https://github.com/LiiChar/Uni-eBook/blob/main/screenshot/image11.png)

![Скриншот страницы книги](https://github.com/LiiChar/Uni-eBook/blob/main/screenshot/image22.png)

![Скриншот читалки](https://github.com/LiiChar/Uni-eBook/blob/main/screenshot/image33.png)


---

## 🛠 Технологии

- **Frontend:** SolidJS + TypeScript
- **Backend:** Rust (Tauri v2)
- **Стили:** Tailwind CSS v4 (glassmorphism)
- **Сборка:** Vite + Tauri CLI

---

## 📦 Требования для разработки

- Node.js + Yarn
- Rust (последняя стабильная)
- Tauri CLI: `cargo install tauri-cli --version "^2"`

---

## 🚀 Быстрый старт

```bash
git clone https://github.com/your-username/uni.git
cd uni
yarn install
yarn tauri dev        # режим разработки
yarn tauri build      # production-сборка
```

---

## 🎮 Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| → / PageDown | Следующая глава |
| ← / PageUp | Предыдущая глава |
| `F` | Полноэкранный режим |
| `T` | Оглавление |
| `B` | Добавить закладку |
| `N` | Создать заметку (предварительно выделите текст) |
| `Esc` | Закрыть панели / выйти из fullscreen |

---

## ⚙️ Настройки

- **Общие:** тема, запоминание последней книги, путь к библиотеке
- **Читалка:** шрифт, размер (12–32px), интервал (1.2–2.5), ширина колонки (400–1200px), режим по умолчанию
- **Горячие клавиши:** переназначение
- **UI:** автоскрытие панелей, анимации, режим без отвлечений


4. Исправитт хедер, он не на всю высоту
6. Испрвить перезапись метаданных