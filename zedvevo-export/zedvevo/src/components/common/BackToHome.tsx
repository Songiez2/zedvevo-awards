import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

/**
 * Minimal "← Home" breadcrumb shown at the top of every non-home page.
 * Usage: <BackToHome /> — renders a single link, no props needed.
 */
export default function BackToHome() {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5 shrink-0" />
        Home
      </Link>
    </div>
  );
}
