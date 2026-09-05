import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import "./index.css";

Sentry.init({
  dsn: import.meta.env['VITE_SENTRY_DSN'] as string | undefined,
  environment: import.meta.env.MODE,
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <Sentry.ErrorBoundary fallback={
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'sans-serif', gap:'12px' }}>
      <p style={{ fontSize:'1.1rem', fontWeight:600 }}>Something went wrong</p>
      <p style={{ fontSize:'0.875rem', color:'#666' }}>Please refresh the page</p>
      <button onClick={() => window.location.reload()} style={{ padding:'8px 20px', borderRadius:'6px', background:'#000', color:'#fff', border:'none', cursor:'pointer' }}>
        Refresh
      </button>
    </div>
  }>
    <AppWrapper>
      <App />
    </AppWrapper>
  </Sentry.ErrorBoundary>
);
