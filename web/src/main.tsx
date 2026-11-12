import { StrictMode, Suspense, lazy, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./styles/theme.css";
import { AppProviders } from "./components/Layout";
import { WalletProvider } from "./lib/wallet";
import { MarketingShell } from "./components/shell/MarketingShell";
import { LandingPage } from "./pages/Landing";

// The landing page loads on its own; the app and the customer pages arrive when they're opened.
const AppShell = lazy(() => import("./components/shell/AppShell").then((m) => ({ default: m.AppShell })));
const PublicShell = lazy(() => import("./components/shell/PublicShell").then((m) => ({ default: m.PublicShell })));
const DashboardPage = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.DashboardPage })));
const TransactionsPage = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.TransactionsPage })));
const GetPaidPage = lazy(() => import("./pages/GetPaid").then((m) => ({ default: m.GetPaidPage })));
const SendPage = lazy(() => import("./pages/Send").then((m) => ({ default: m.SendPage })));
const VaultConsolePage = lazy(() => import("./pages/VaultConsole").then((m) => ({ default: m.VaultConsolePage })));
const CheckPage = lazy(() => import("./pages/Check").then((m) => ({ default: m.CheckPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then((m) => ({ default: m.ProfilePage })));
const InvoicePage = lazy(() => import("./pages/Invoice").then((m) => ({ default: m.InvoicePage })));
const PayPage = lazy(() => import("./pages/Pay").then((m) => ({ default: m.PayPage })));
const MerchantPage = lazy(() => import("./pages/Merchant").then((m) => ({ default: m.MerchantPage })));
const ClaimPage = lazy(() => import("./pages/Claim").then((m) => ({ default: m.ClaimPage })));
const DocsPage = lazy(() => import("./docs/DocsPage").then((m) => ({ default: m.DocsPage })));

/** An old address moves to its new home, keeping any ?query and #fragment it carried. */
function Moved({ to }: { to: string }) {
  const loc = useLocation();
  const [pathname, hash] = to.split("#");
  return <Navigate to={{ pathname, search: loc.search, hash: hash ? `#${hash}` : loc.hash }} replace />;
}

const wait = (el: ReactNode) => <Suspense fallback={<div className="min-h-dvh bg-background" />}>{el}</Suspense>;
const page = (el: ReactNode) => <Suspense fallback={null}>{el}</Suspense>;

function NotFound() {
  return (
    <div className="nt flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center font-sans text-foreground">
      <h1 className="text-[40px] font-extrabold tracking-[-0.04em]">Page not found</h1>
      <p className="text-muted">That address doesn't lead anywhere on Notara.</p>
      <a href="/" className="inline-flex h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-foreground">
        Go to the home page
      </a>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProvider>
      <AppProviders>
        <BrowserRouter>
          <Routes>
            <Route element={<MarketingShell />}>
              <Route index element={<LandingPage />} />
            </Route>
            {/* A static server opens the build as /index.html: that is the home page. */}
            <Route path="index.html" element={<Navigate to="/" replace />} />

            <Route element={wait(<AppShell />)}>
              <Route path="dashboard" element={page(<DashboardPage />)} />
              <Route path="get-paid" element={page(<GetPaidPage />)} />
              <Route path="send" element={page(<SendPage />)} />
              <Route path="agents/vault" element={page(<VaultConsolePage />)} />
              <Route path="agents/check" element={page(<CheckPage />)} />
              <Route path="transactions" element={page(<TransactionsPage />)} />
              <Route path="profile" element={page(<ProfilePage />)} />
              {/* Settings were merged into Profile: old links land on its Preferences section. */}
              <Route path="settings" element={<Moved to="/profile#preferences" />} />
            </Route>

            <Route element={wait(<PublicShell />)}>
              <Route path="pay/:id" element={page(<PayPage />)} />
              <Route path="claim/:id" element={page(<ClaimPage />)} />
              <Route path="m/:account" element={page(<MerchantPage />)} />
              <Route path="invoices/:id" element={page(<InvoicePage />)} />
            </Route>

            <Route path="docs" element={wait(<DocsPage />)} />
            <Route path="docs/:slug" element={wait(<DocsPage />)} />

            {/* Addresses from before the redesign. The Agents area is two pages; everything else moved. */}
            <Route path="invoices" element={<Moved to="/get-paid" />} />
            <Route path="check" element={<Moved to="/agents/check" />} />
            <Route path="vault" element={<Moved to="/agents/vault" />} />
            <Route path="agents" element={<Moved to="/agents/vault" />} />
            <Route path="agents/*" element={<Moved to="/agents/vault" />} />
            <Route path="security" element={<Moved to="/agents/vault" />} />
            <Route path="demo" element={<Moved to="/agents/vault" />} />
            <Route path="start" element={<Moved to="/agents/vault" />} />
            <Route path="about" element={<Moved to="/#faq" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProviders>
    </WalletProvider>
  </StrictMode>,
);
