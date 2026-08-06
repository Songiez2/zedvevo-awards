import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Bell, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  getAllPlans, updatePlan, getAllBanners, createBanner, updateBanner, deleteBanner,
  getSettings, updateSetting, createNotification, uploadFile, getAllDownloads,
} from '@/lib/api';
import PaymentSettingsPanel from '@/components/admin/PaymentSettingsPanel';
import { formatDate } from '@/lib/utils';
import type { UploadPlan, HeroBanner, Download as DownloadType } from '@/types/index';

type NotifType = 'info' | 'success' | 'warning' | 'error';

export default function AdminSettingsPage() {
  const [plans, setPlans]         = useState<UploadPlan[]>([]);
  const [banners, setBanners]     = useState<HeroBanner[]>([]);
  const [settings, setSettings]   = useState<Record<string, string>>({});
  const [downloads, setDownloads] = useState<DownloadType[]>([]);
  const [loading, setLoading]     = useState(true);

  // Banner dialog
  const [bannerDlg, setBannerDlg]   = useState<{ open: boolean; banner?: HeroBanner }>({ open: false });
  const [banTitle, setBanTitle]   = useState('');
  const [banSub, setBanSub]       = useState('');
  const [banBtnText, setBanBtnText] = useState('');
  const [banBtnUrl, setBanBtnUrl] = useState('');
  const [banOrder, setBanOrder]   = useState('0');
  const [banActive, setBanActive] = useState(true);
  const [banImage, setBanImage]   = useState<File | null>(null);
  const [banSaving, setBanSaving] = useState(false);

  // Notification broadcast
  const [notifTitle, setNotifTitle]   = useState('');
  const [notifMsg, setNotifMsg]       = useState('');
  const [notifType, setNotifType]     = useState<NotifType>('info');
  const [notifSending, setNotifSending] = useState(false);

  // Setting saving tracker
  const [settingSaving, setSettingSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([getAllPlans(), getAllBanners(), getSettings(), getAllDownloads()])
      .then(([p, b, s, d]) => { setPlans(p); setBanners(b); setSettings(s); setDownloads(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const saveSetting = async (key: string, value: string) => {
    setSettingSaving(p => ({ ...p, [key]: true }));
    try { await updateSetting(key, value); setSettings(p => ({ ...p, [key]: value })); toast.success('Setting saved'); }
    catch { toast.error('Failed to save setting'); }
    finally { setSettingSaving(p => ({ ...p, [key]: false })); }
  };

  // Banner helpers
  const openBannerDlg = (banner?: HeroBanner) => {
    setBanTitle(banner?.title || ''); setBanSub(banner?.subtitle || '');
    setBanBtnText(banner?.button_text || ''); setBanBtnUrl(banner?.button_url || '');
    setBanOrder(String(banner?.display_order ?? 0)); setBanActive(banner?.is_active ?? true);
    setBanImage(null); setBannerDlg({ open: true, banner });
  };
  const handleSaveBanner = async () => {
    if (!banTitle) { toast.error('Title required'); return; }
    setBanSaving(true);
    try {
      let imageUrl = bannerDlg.banner?.image_url || '';
      if (banImage) imageUrl = await uploadFile('banners', `banner_${Date.now()}.${banImage.name.split('.').pop()}`, banImage);
      if (!imageUrl) { toast.error('Upload an image'); return; }
      const payload = { title: banTitle, subtitle: banSub || undefined, button_text: banBtnText || undefined, button_url: banBtnUrl || undefined, display_order: parseInt(banOrder), is_active: banActive, image_url: imageUrl };
      if (bannerDlg.banner) { await updateBanner(bannerDlg.banner.id, payload); }
      else { await createBanner(payload); }
      setBanners(await getAllBanners());
      toast.success(`Banner ${bannerDlg.banner ? 'updated' : 'created'}`);
      setBannerDlg({ open: false });
    } catch (e: unknown) { toast.error((e as Error).message); }
    finally { setBanSaving(false); }
  };

  const handleSendBroadcast = async () => {
    if (!notifTitle || !notifMsg) { toast.error('Title and message required'); return; }
    setNotifSending(true);
    try {
      await createNotification({ title: notifTitle, message: notifMsg, type: notifType, notification_type: 'general' });
      toast.success('Broadcast sent to all users');
      setNotifTitle(''); setNotifMsg('');
    } catch { toast.error('Failed to send broadcast'); }
    finally { setNotifSending(false); }
  };

  const exportDownloads = () => {
    const rows = [
      ['Date', 'Title', 'Artist', 'Type', 'User ID'],
      ...downloads.map(d => [formatDate(d.downloaded_at), d.title, d.artist_name, d.content_type, d.user_id]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'downloads.csv'; a.click();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage plans, banners, notifications, and app settings</p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="h-8 flex-wrap">
          <TabsTrigger value="plans"    className="text-xs">Upload Plans</TabsTrigger>
          <TabsTrigger value="banners"  className="text-xs">Banners</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">Notifications</TabsTrigger>
          <TabsTrigger value="downloads" className="text-xs">Downloads</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
          <TabsTrigger value="app"      className="text-xs">App Config</TabsTrigger>
        </TabsList>

        {/* Plans */}
        <TabsContent value="plans" className="mt-4">
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-muted/40">
                <tr>{['Plan', 'Price', 'Duration', 'Max Uploads', 'Active', 'Action'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="px-3 py-2"><Skeleton className="h-5 w-full" /></td></tr>
                : plans.map(plan => {
                  const [editPrice, setEditPrice] = [plan.price.toString(), () => {}];
                  return (
                    <PlanRow key={plan.id} plan={plan} onSave={async (updates) => {
                      await updatePlan(plan.id, updates);
                      setPlans(p => p.map(pl => pl.id === plan.id ? { ...pl, ...updates } : pl));
                      toast.success('Plan updated');
                    }} />
                  );
                  void editPrice; void setEditPrice;
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Banners */}
        <TabsContent value="banners" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5 text-xs" onClick={() => openBannerDlg()}>
              <Plus className="h-3.5 w-3.5" />Add Banner
            </Button>
          </div>
          {loading ? <Skeleton className="h-20 w-full" /> : banners.map(b => (
            <Card key={b.id}>
              <CardContent className="flex items-center gap-3 py-2.5 px-4">
                <div className="h-10 w-16 rounded overflow-hidden bg-muted shrink-0">
                  {b.image_url && <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={b.is_active ? 'default' : 'secondary'} className="text-[10px]">{b.is_active ? 'Active' : 'Inactive'}</Badge>
                    <span className="text-xs text-muted-foreground">Order: {b.display_order}</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openBannerDlg(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={async () => { if (!confirm('Delete banner?')) return; await deleteBanner(b.id); setBanners(p => p.filter(x => x.id !== b.id)); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <div className="max-w-lg space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold">Broadcast to All Users</p>
            </div>
            <div><Label>Title *</Label><Input className="mt-1" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="e.g. New Feature Released" /></div>
            <div><Label>Message *</Label><Textarea className="mt-1 resize-none" rows={3} value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Message body…" /></div>
            <div>
              <Label>Type</Label>
              <Select value={notifType} onValueChange={v => setNotifType(v as NotifType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5" onClick={handleSendBroadcast} disabled={notifSending}>
              {notifSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Send Broadcast
            </Button>
          </div>
        </TabsContent>

        {/* Downloads */}
        <TabsContent value="downloads" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{downloads.length} total downloads</p>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={exportDownloads}>
              <Download className="h-3.5 w-3.5" />Export CSV
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-muted/40">
                <tr>{['Title', 'Artist', 'Type', 'User', 'Date'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-3 py-2"><Skeleton className="h-5 w-full" /></td></tr>
                : downloads.slice(0, 100).map(d => (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                    <td className="py-2.5 px-3 whitespace-nowrap max-w-[160px] truncate font-medium">{d.title}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">{d.artist_name}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap"><Badge variant="outline" className="text-[10px] capitalize">{d.content_type}</Badge></td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-xs">{d.user_id?.slice(0, 8)}…</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-xs">{formatDate(d.downloaded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* App Config */}
        <TabsContent value="app" className="mt-4">
          <div className="max-w-lg space-y-4">
            {[
              { key: 'site_name',      label: 'Site Name',           type: 'text' },
              { key: 'site_tagline',   label: 'Tagline',             type: 'text' },
              { key: 'contact_email',  label: 'Contact Email',       type: 'email' },
              { key: 'maintenance_mode', label: 'Maintenance Mode (true/false)', type: 'text' },
              { key: 'max_file_size_mb', label: 'Max Upload Size (MB)', type: 'number' },
            ].map(({ key, label, type }) => (
              <SettingRow key={key} label={label} type={type}
                value={settings[key] || ''} saving={!!settingSaving[key]}
                onSave={v => saveSetting(key, v)} />
            ))}
          </div>
        </TabsContent>
        {/* Payments */}
        <TabsContent value="payments" className="mt-4">
          <PaymentSettingsPanel settings={settings} onSave={saveSetting} saving={settingSaving} />
        </TabsContent>
      </Tabs>

      {/* Banner dialog */}
      <Dialog open={bannerDlg.open} onOpenChange={o => setBannerDlg({ open: o })}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader><DialogTitle>{bannerDlg.banner ? 'Edit' : 'New'} Banner</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div><Label>Title *</Label><Input className="mt-1" value={banTitle} onChange={e => setBanTitle(e.target.value)} /></div>
            <div><Label>Subtitle</Label><Input className="mt-1" value={banSub} onChange={e => setBanSub(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Button Text</Label><Input className="mt-1" value={banBtnText} onChange={e => setBanBtnText(e.target.value)} /></div>
              <div><Label>Button URL</Label><Input className="mt-1" value={banBtnUrl} onChange={e => setBanBtnUrl(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Order</Label><Input className="mt-1" type="number" value={banOrder} onChange={e => setBanOrder(e.target.value)} /></div>
              <div className="flex items-end gap-2 pb-0.5"><Switch checked={banActive} onCheckedChange={setBanActive} /><Label>Active</Label></div>
            </div>
            <div><Label>Image {!bannerDlg.banner && '*'}</Label><Input className="mt-1" type="file" accept="image/*" onChange={e => setBanImage(e.target.files?.[0] || null)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBannerDlg({ open: false })}>Cancel</Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleSaveBanner} disabled={banSaving}>
              {banSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline sub-components to avoid prop-drilling issues in a single-file page
function PlanRow({ plan, onSave }: { plan: UploadPlan; onSave: (u: Partial<UploadPlan>) => void }) {
  const [price, setPrice]   = useState(plan.price.toString());
  const [active, setActive] = useState(plan.is_active);
  return (
    <tr className="border-t border-border hover:bg-muted/30">
      <td className="py-2.5 px-3 whitespace-nowrap font-medium capitalize">{plan.plan_type.replace(/_/g, ' ')}</td>
      <td className="py-2.5 px-3 whitespace-nowrap">
        <Input className="h-7 w-24 text-xs" value={price} onChange={e => setPrice(e.target.value)} type="number" />
      </td>
      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground text-xs">{plan.validity_days ? `${plan.validity_days}d` : '—'}</td>
      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">{plan.uploads_allowed ?? '—'}</td>
      <td className="py-2.5 px-3 whitespace-nowrap"><Switch checked={active} onCheckedChange={v => { setActive(v); onSave({ is_active: v }); }} /></td>
      <td className="py-2.5 px-3 whitespace-nowrap">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSave({ price: parseFloat(price), is_active: active })}>Save</Button>
      </td>
    </tr>
  );
}

function SettingRow({ label, type, value: init, saving, onSave }: {
  label: string; type: string; value: string; saving: boolean; onSave: (v: string) => void;
}) {
  const [val, setVal] = useState(init);
  // Sync external changes
  useEffect(() => { setVal(init); }, [init]);
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input type={type} className="flex-1 h-8 text-sm" value={val} onChange={e => setVal(e.target.value)} />
        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={() => onSave(val)} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  );
}
