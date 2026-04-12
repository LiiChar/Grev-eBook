import { Route, HashRouter } from '@solidjs/router';
import { AppLayout } from './widgets/layout/AppLayout';
import { LibraryPage } from './pages/library/LibraryPage';
import { BookmarksPage } from './pages/bookmarks/BookmarksPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ReaderPage } from './pages/book/[id]/read/BookRead';
import { BookDetailPage } from './pages/book/[id]/Book';

function App() {
  return (
    <HashRouter root={AppLayout}>
      {/* Library */}
      <Route path="/" component={LibraryPage} />

      {/* Book */}
      <Route path="/book/:id" component={BookDetailPage} />
      <Route path="/book/:id/read" component={ReaderPage} />

      {/* Bookmarks & Notes */}
      <Route path="/bookmarks" component={BookmarksPage} />

      {/* Settings */}
      <Route path="/settings" component={SettingsPage} />

      {/* 404 */}
      <Route path="*404" component={() => (
        <div class="h-full flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-4xl font-bold mb-2">404</h1>
            <p class="text-(--foreground-muted)">Страница не найдена</p>
          </div>
        </div>
      )} />
    </HashRouter>
  );
}

export default App;
