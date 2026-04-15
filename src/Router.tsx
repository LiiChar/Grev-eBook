import { Route, HashRouter } from '@solidjs/router';
import { AppLayout } from './widgets/layout/AppLayout';
import { LibraryPage } from './pages/library/LibraryPage';
import { BookmarksPage } from './pages/bookmarks/BookmarksPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { BookDetailPage } from './pages/book/[id]/Book';
import { ReaderPage } from './pages/book/[id]/read/BookRead';

function App() {
  return (
    <HashRouter root={AppLayout}>
      <Route path="/" component={LibraryPage} />

      <Route path="/book/:id" component={BookDetailPage} />
      <Route path="/book/:id/read" component={ReaderPage} />

      <Route path="/bookmarks" component={BookmarksPage} />

      <Route path="/settings" component={SettingsPage} />

      <Route path="*404" component={() => (
        <div class="h-full w-full flex items-center justify-center">
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
