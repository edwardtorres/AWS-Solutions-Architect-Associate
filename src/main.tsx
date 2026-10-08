import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { SaveContext, createAppStore } from './save/context';

const store = createAppStore();

if (import.meta.env.DEV) {
  void import('./dev/devHooks').then((m) => {
    m.installDevHooks(store);
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
createRoot(root).render(
  <SaveContext.Provider value={store}>
    <App />
  </SaveContext.Provider>,
);
