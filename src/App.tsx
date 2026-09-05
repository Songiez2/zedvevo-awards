import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import ScrollToTop from '@/components/common/ScrollToTop';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import MusicPlayer from '@/components/music/MusicPlayer';
import AdminPage from '@/pages/AdminPage';
import { Navigate as NavRedirect } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from './routes';

// Guard for admin routes
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  // While auth is resolving, show a minimal spinner rather than blank/redirect
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return <NavRedirect to="/" replace />;
  }
  return <>{children}</>;
}

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <PlayerProvider>
          <RouteGuard>
            <ScrollToTop />
            <IntersectObserver />
            <Routes>
              {/* Admin — full-screen, no public Header/MobileNav */}
              <Route path="/admin/*" element={<AdminGuard><AdminPage /></AdminGuard>} />

              {/* All public routes wrapped in shared layout */}
              <Route path="/*" element={
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-grow">
                    <Routes>
                      {routes.filter(r => !r.path.startsWith('/admin')).map((route) => (
                        <Route key={route.path} path={route.path} element={<route.component />} />
                      ))}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                  <MusicPlayer />
                  <MobileNav />
                </div>
              } />
            </Routes>
            <Toaster richColors />
          </RouteGuard>
        </PlayerProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
