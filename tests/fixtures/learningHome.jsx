import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { IndexedDBAdapter } from '../../src/infrastructure/storage/IndexedDBAdapter';
import HomeScreen from '../../src/components/HomeScreen';
import Dashboard from '../../src/components/Dashboard';
import StudySetView from '../../src/features/study/components/StudySetView';
import TodoView from '../../src/components/TodoView';
import { LanguageProvider } from '../../src/lib/LanguageContext';
import { WorkspaceNavigationProvider, SidebarToggle } from '../../src/components/WorkspaceNavigation';
const storage = new IndexedDBAdapter(); await storage.init();
const A = 'home-account-a', B = 'home-account-b';
async function seed(owner) {
  storage.setWorkspaceOwner(owner);
  if ((await storage.listPages()).length) return;
  const repo = storage.getStudyRepository();
  for (const [title, count] of [['English words', 2], ['Other words', 1], ['Empty set', 0]]) {
    const deck = await storage.createPage({ title: `${owner === A ? '' : 'B '}${title}`, kind: 'study_set' });
    await repo.ensureDeck(deck);
    if (count) await repo.addCards(deck.id, Array.from({ length: count }, (_, i) => ({ front: `${title} ${i}`, back: '答案' })));
    await repo.configure(deck.id, { direction_confirmed: true, new_limit: 1, review_limit: 2 });
  }
  for (let i = 0; i < 5; i++) {
    const page = await storage.createPage({ title: `Task ${i}`, kind: 'todo' });
    await storage.savePage({ ...page, due_date: Date.now(), completed: i === 4 });
  }
}
await seed(A); await seed(B); storage.setWorkspaceOwner(A);
window.homeStorage = storage;
function App() {
  const [owner, setOwner] = useState(A), [pages, setPages] = useState([]), [view, setView] = useState(null), [drawer, setDrawer] = useState(false);
  React.useEffect(() => { let alive = true; storage.setWorkspaceOwner(owner); storage.listPages().then(next => { if (alive) setPages(next); }); return () => { alive = false; }; }, [owner]);
  window.switchOwner = next => { setPages([]); setView(null); setOwner(next); };
  window.refreshHome = async () => setPages(await storage.listPages());
  window.failHomeRead = () => {
    const repository = storage.getStudyRepository(), original = repository.readScheduledDeck.bind(repository);
    repository.readScheduledDeck = async () => { throw Error('fixture unavailable'); };
    window.restoreHomeRead = () => { repository.readScheduledDeck = original; };
    window.dispatchEvent(new Event('nexus-study-changed'));
  };
  const own = pages.filter(p => p.workspace_owner_id === owner), repo = storage.getStudyRepository();
  const open = id => setView({ id, mode: 'manage' });
  const page = own.find(p => p.id === view?.id);
  return <LanguageProvider initialLanguage={new URLSearchParams(location.search).has('en') ? 'en' : 'zh-TW'}>
    <WorkspaceNavigationProvider open={() => setDrawer(!drawer)}><div className="flex h-dvh min-w-0 flex-col"><nav className="flex shrink-0 gap-2 p-2"><SidebarToggle/><button onClick={() => setView(null)}>Nexus Home</button>{drawer && <span>Existing navigation</span>}</nav>
      {view?.todos ? <TodoView pages={own} onCreate={() => {}} onUpdate={() => {}} onDelete={() => {}} onSelectPage={open}/>
      : page?.kind === 'study_set' ? <StudySetView page={page} repository={repo} initialMode={view.mode} onTitleChange={() => {}} onBackToInterface={() => setView(null)}/>
      : page ? <p>{page.title}</p>
      : <HomeScreen key={owner} owner={owner} pages={pages} repository={repo} onStudy={(id, mode) => setView({ id, mode })} onOpenPage={open} onCreateStudySet={() => { window.studySetsOpened = true; }} onOpenTodos={() => setView({ todos: true })}
        classic={<Dashboard pages={own} onSelectPage={open} onDeletePages={() => {}} onPinPages={() => {}} onReorderPages={() => {}} onSetFolder={() => {}}/>}/>}
    </div></WorkspaceNavigationProvider>
  </LanguageProvider>;
}
createRoot(document.getElementById('root')).render(<App/>);
