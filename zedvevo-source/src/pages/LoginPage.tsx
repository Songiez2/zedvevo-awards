import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import CDLogo from '@/components/ui/CDLogo';

export default function LoginPage() {
  const { user, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPw, setShowPw] = useState(false);

  // Login form — email + password
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { toast.error('Fill in all fields'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) { toast.error('Enter a valid email address'); return; }
    setLoginLoading(true);
    try {
      await signInWithEmail(loginEmail, loginPassword);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Login failed. Check your email and password.');
    } finally { setLoginLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regEmail || !regPassword || !regConfirm) { toast.error('Fill in all required fields'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) { toast.error('Enter a valid email address'); return; }
    if (regPassword !== regConfirm) { toast.error('Passwords do not match'); return; }
    if (regPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(regUsername)) { toast.error('Username: letters, numbers and underscores only'); return; }
    setRegLoading(true);
    try {
      await signUpWithEmail(regEmail, regPassword, regUsername, regDisplayName || regUsername);
      toast.success('Account created! Welcome to ZedVevo.');
      navigate('/');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Registration failed. Try a different username or email.');
    } finally { setRegLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <CDLogo size={48} spinning />
            <h1 className="text-2xl font-bold tracking-tight">ZedVevo</h1>
          </div>
          <p className="text-sm text-muted-foreground">Zambia's music & video platform</p>
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as 'login' | 'register')}>
          <TabsList className="w-full mb-4">
            <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Welcome back</CardTitle>
                <CardDescription className="text-xs">Sign in with your email and password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      className="mt-1"
                      type="email"
                      placeholder="you@gmail.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value.trim())}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={loginLoading}>
                    {loginLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Create account</CardTitle>
                <CardDescription className="text-xs">Join ZedVevo today</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <Label>Username *</Label>
                    <Input
                      className="mt-1"
                      placeholder="your_username"
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value.toLowerCase())}
                      autoComplete="username"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Letters, numbers, underscores only</p>
                  </div>
                  <div>
                    <Label>Email Address *</Label>
                    <Input
                      className="mt-1"
                      type="email"
                      placeholder="you@example.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value.trim())}
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <Label>Display Name</Label>
                    <Input className="mt-1" placeholder="Your Name" value={regDisplayName} onChange={e => setRegDisplayName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Password *</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showPw ? 'text' : 'password'}
                        placeholder="Min. 8 characters"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Confirm Password *</Label>
                    <Input
                      type={showPw ? 'text' : 'password'}
                      className="mt-1"
                      placeholder="Re-enter password"
                      value={regConfirm}
                      onChange={e => setRegConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={regLoading}>
                    {regLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
