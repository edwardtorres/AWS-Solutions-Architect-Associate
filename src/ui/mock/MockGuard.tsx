import { useEffect } from 'react';
import { isExpired } from '../../game/mock';
import { useSaveStore, useSnapshot } from '../../save/context';
import { loadQuestions } from '../../questions/pool';

/**
 * Mounted whenever a mock is open, on any page. If the mock's time ran out (even while the app was closed) it is graded and
 * submitted: unanswered questions count as wrong. The page that shows the clock does the same at zero; this covers every other page.
 */
export default function MockGuard() {
  const store = useSaveStore();
  const { save } = useSnapshot();
  const active = save.game.mock.active;
  useEffect(() => {
    if (!active) return undefined;
    let busy = false;
    const check = () => {
      const current = store.getSnapshot().save.game.mock.active;
      if (busy || !current || !isExpired(current, new Date())) return;
      busy = true;
      void loadQuestions().then((bank) => {
        const byId = new Map(bank.map((q) => [q.id, q]));
        const out = store.finishMock((id) => byId.get(id), true);
        busy = false;
        if (out && /^#\/mock\/(run|review)/.test(window.location.hash)) window.location.hash = `#/mock/result/${out.record.id}`;
      });
    };
    check();
    const id = window.setInterval(check, 5000);
    return () => {
      window.clearInterval(id);
    };
  }, [active, store]);
  return null;
}
