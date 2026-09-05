import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to (0,0) on every route change. Mount once inside <Router>. */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
