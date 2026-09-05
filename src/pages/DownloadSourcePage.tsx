import { Download, FileArchive, CheckCircle, FolderOpen, Terminal, Settings } from 'lucide-react';

export default function DownloadSourcePage() {
  const files = [
    { label: 'src/', desc: '105 TypeScript/TSX/CSS source files — all pages, components, hooks' },
    { label: 'supabase/migrations/', desc: '21 SQL migration files — complete database schema' },
    { label: 'supabase/functions/', desc: '10 Edge Functions — payments, email, webhooks' },
    { label: 'public/', desc: 'Images, favicon, OG image assets' },
    { label: 'package.json', desc: 'Standard npm dependencies — installs with npm install' },
    { label: 'vite.config.ts + tsconfig.json', desc: 'Build & TypeScript configuration' },
    { label: 'tailwind.config.js', desc: 'Tailwind CSS design tokens' },
    { label: 'README.md', desc: 'Setup & deployment instructions' },
  ];

  const steps = [
    { icon: <FolderOpen className="w-4 h-4" />, cmd: 'cd zedvevo', desc: 'Enter the project folder' },
    { icon: <Terminal className="w-4 h-4" />, cmd: 'npm install', desc: 'Install all dependencies' },
    { icon: <Settings className="w-4 h-4" />, cmd: 'cp .env.example .env.local', desc: 'Create env file, add your Supabase keys' },
    { icon: <Terminal className="w-4 h-4" />, cmd: 'npm run dev', desc: 'Start development server' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <FileArchive className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">ZedVevo Source Code</h1>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Complete React + TypeScript source code. 200 files · 254 KB compressed.
            Runs with plain <code className="bg-muted px-1 py-0.5 rounded text-xs">npm install</code>.
          </p>
        </div>

        {/* Download button */}
        <a
          href="/zedvevo-source.zip"
          download="zedvevo-source.zip"
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded-lg py-3 px-6 font-medium text-sm hover:opacity-90 transition-opacity mb-12"
        >
          <Download className="w-4 h-4" />
          Download zedvevo-source.zip
          <span className="opacity-60 font-normal ml-1">620 KB · 431 files</span>
        </a>

        {/* Contents */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">What's inside</h2>
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {files.map((f) => (
              <div key={f.label} className="flex items-start gap-3 px-4 py-3 bg-card">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-mono font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick start */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Quick start</h2>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-muted rounded-lg px-4 py-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {i + 1}
                </span>
                <code className="text-sm font-mono flex-1">{s.cmd}</code>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{s.desc}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
