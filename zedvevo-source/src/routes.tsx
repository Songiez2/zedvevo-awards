import type { ComponentType } from 'react';
import HomePage from './pages/HomePage';
import MusicPage from './pages/MusicPage';
import VideosPage from './pages/VideosPage';
import AwardsPage from './pages/AwardsPage';
import UploadPage from './pages/UploadPage';
import LibraryPage from './pages/LibraryPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import SearchPage from './pages/SearchPage';
import TrendingPage from './pages/TrendingPage';
import MyDownloadsPage from './pages/MyDownloadsPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';

export interface RouteConfig {
  name: string;
  path: string;
  // Component reference — instantiated at render time, not module-load time,
  // so hooks inside pages only run after all providers have mounted.
  component: ComponentType;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  { name: 'Home',           path: '/',                component: HomePage,           public: true },
  { name: 'Music',          path: '/music',           component: MusicPage,          public: true },
  { name: 'Videos',         path: '/videos',          component: VideosPage,         public: true },
  { name: 'Awards',         path: '/awards',          component: AwardsPage,         public: true },
  { name: 'Trending',       path: '/trending',        component: TrendingPage,       public: true },
  { name: 'Search',         path: '/search',          component: SearchPage,         public: true },
  { name: 'PaymentSuccess', path: '/payment-success', component: PaymentSuccessPage, public: true },
  { name: 'Upload',         path: '/upload',          component: UploadPage,         public: false },
  { name: 'Library',        path: '/library',         component: LibraryPage,        public: false },
  { name: 'Downloads',      path: '/downloads',       component: MyDownloadsPage,    public: false },
  { name: 'Dashboard',      path: '/dashboard',       component: DashboardPage,      public: false },
  { name: 'Profile',        path: '/profile',         component: DashboardPage,      public: false },
  { name: 'Admin',          path: '/admin',           component: AdminPage,          public: false },
  { name: 'Login',          path: '/login',           component: LoginPage,          public: true },
];
