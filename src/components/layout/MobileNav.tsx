import { Link, useLocation } from 'react-router-dom';
import { Home, Music2, Video, Trophy, Upload, TrendingUp } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/music', label: 'Music', icon: Music2 },
  { to: '/videos', label: 'Videos', icon: Video },
  { to: '/trending', label: 'Trending', icon: TrendingUp },
  { to: '/awards', label: 'Awards', icon: Trophy },
  { to: '/upload', label: 'Upload', icon: Upload },
];

export default function MobileNav() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden glass border-t border-border">
      <div className="flex items-stretch justify-around">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 min-h-[56px] transition-colors ${
                active ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
