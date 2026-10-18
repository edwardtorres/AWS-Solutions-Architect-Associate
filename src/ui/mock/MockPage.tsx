import { useRoute } from '../../lib/route';
import MockHome from './MockHome';
import MockResult from './MockResult';
import MockReview from './MockReview';
import MockRun from './MockRun';

/** #/mock (start, history, ready to book), #/mock/run[/n], #/mock/review and #/mock/result/<id>. */
export default function MockPage() {
  const route = useRoute();
  if (route.param === 'run') return <MockRun number={route.extra ? Number(route.extra) : null} />;
  if (route.param === 'review') return <MockReview />;
  if (route.param === 'result') return <MockResult id={route.extra ?? null} />;
  return <MockHome />;
}
