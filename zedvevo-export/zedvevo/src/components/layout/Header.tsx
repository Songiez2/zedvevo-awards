import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Music2, Video, Trophy, Upload, Library, User, LayoutDashboard, LogOut, LogIn, TrendingUp, Download, Heart, HelpCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import CDLogo from '@/components/ui/CDLogo';
import SearchBar from '@/components/search/SearchBar';
import NotificationBell from '@/components/notifications/NotificationBell';
import DonationDialog from '@/components/donation/DonationDialog';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/music', label: 'Music', icon: Music2 },
  { to: '/videos', label: 'Videos', icon: Video },
  { to: '/awards', label: 'Awards', icon: Trophy },
  { to: '/trending', label: 'Trending', icon: TrendingUp },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/downloads', label: 'Downloads', icon: Download },
];

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  // Help dialog state
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  const [helpName, setHelpName] = useState(profile?.display_name || profile?.username || '');
  const [helpEmail, setHelpEmail] = useState(profile?.email || '');
  const [helpSending, setHelpSending] = useState(false);

  // Prefill name/email when profile loads
  useEffect(() => {
    if (profile) {
      setHelpName(profile.display_name || profile.username || '');
      setHelpEmail(profile.email || '');
    }
  }, [profile]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (to: string) => location.pathname === to;

  const handleSendHelp = async () => {
    if (!helpMessage.trim()) { toast.error('Please write your message'); return; }
    setHelpSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await supabase.functions.invoke('help-message', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: {
          message: helpMessage.trim(),
          name: helpName.trim() || undefined,
          email: helpEmail.trim() || undefined,
          subject: helpSubject.trim() || 'General Help',
          user_id: user?.id,
        },
      });
      if (res.error) throw res.error;
      toast.success('Message sent! We\'ll get back to you soon.');
      setHelpOpen(false);
      setHelpSubject(''); setHelpMessage('');
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Failed to send message');
    } finally { setHelpSending(false); }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'glass shadow-card py-2' : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <CDLogo size={40} spinning />
            <span className="text-lg font-bold tracking-tight hidden sm:block">ZedVevo</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </Link>
            ))}
            {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search — md+ */}
            <div className="hidden md:block">
              <SearchBar />
            </div>

            {/* Donate — desktop label, mobile icon */}
            <Button
              size="sm"
              variant="ghost"
              className="hidden sm:inline-flex items-center gap-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-accent"
              onClick={() => setDonateOpen(true)}
            >
              <Heart className="h-3.5 w-3.5 text-destructive fill-destructive" />
              Donate
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden h-9 w-9"
              onClick={() => setDonateOpen(true)}
            >
              <Heart className="h-4 w-4 text-destructive fill-destructive" />
            </Button>

            {/* Help button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Get help / send message"
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            {/* Notification bell */}
            <NotificationBell />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs font-semibold bg-accent text-accent-foreground">
                        {(profile?.display_name || profile?.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-medium truncate">{profile?.display_name || profile?.username || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2"><User className="h-4 w-4" />Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/downloads" className="flex items-center gap-2"><Download className="h-4 w-4" />My Downloads</Link>
                  </DropdownMenuItem>
                  {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" />Admin</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/login"><LogIn className="h-4 w-4 mr-1.5" />Sign In</Link>
              </Button>
            )}

            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 bg-sidebar">
                <div className="flex flex-col gap-1 mt-6">
                  <div className="px-2 mb-3">
                    <SearchBar />
                  </div>
                  {/* Mobile donate row */}
                  <button
                    type="button"
                    onClick={() => { setMobileOpen(false); setDonateOpen(true); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Heart className="h-4 w-4 shrink-0 text-destructive fill-destructive" />
                    Donate
                  </button>
                  {/* Mobile help row */}
                  <button
                    type="button"
                    onClick={() => { setMobileOpen(false); setHelpOpen(true); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    Help / Contact Us
                  </button>
                  {navLinks.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        isActive(to)
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      {label}
                    </Link>
                  ))}
                  {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0" />Admin
                    </Link>
                  )}
                  {!user && (
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium bg-accent text-accent-foreground mt-2"
                    >
                      <LogIn className="h-4 w-4 shrink-0" />Sign In
                    </Link>
                  )}
                  {user && (
                    <button
                      onClick={() => { setMobileOpen(false); signOut(); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-muted mt-2 text-left"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />Sign Out
                    </button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <DonationDialog open={donateOpen} onClose={() => setDonateOpen(false)} />

      {/* Help / Contact Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-accent" />
              Help &amp; Support
            </DialogTitle>
            <DialogDescription>
              Send a message to the ZedVevo team. We'll reply by email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Your Name</Label>
                <Input className="mt-1" value={helpName} onChange={e => setHelpName(e.target.value)} placeholder="Name" />
              </div>
              <div>
                <Label>Your Email</Label>
                <Input className="mt-1" type="email" value={helpEmail} onChange={e => setHelpEmail(e.target.value)} placeholder="email@example.com" />
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Select value={helpSubject} onValueChange={setHelpSubject}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="General Help">General Help</SelectItem>
                  <SelectItem value="Nomination Issue">Nomination Issue</SelectItem>
                  <SelectItem value="Payment Issue">Payment Issue</SelectItem>
                  <SelectItem value="Voting Issue">Voting Issue</SelectItem>
                  <SelectItem value="Account Issue">Account Issue</SelectItem>
                  <SelectItem value="Report Content">Report Content</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea
                className="mt-1"
                rows={4}
                value={helpMessage}
                onChange={e => setHelpMessage(e.target.value)}
                placeholder="Describe your issue or question…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHelpOpen(false)}>Cancel</Button>
            <Button
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={handleSendHelp}
              disabled={helpSending || !helpMessage.trim()}
            >
              {helpSending && <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
