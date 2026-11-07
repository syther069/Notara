import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./styles/tokens.css";
import "./styles/app.css";
import { Layout } from "./components/Layout";
import { WalletProvider } from "./lib/wallet";
import { Home } from "./pages/Home";
import { CheckPage } from "./pages/Check";
import { DemoPage } from "./pages/Demo";
import { VaultPage } from "./pages/Vault";
import { InvoicesPage } from "./pages/Invoices";
import { InvoicePage } from "./pages/Invoice";
import { AboutPage } from "./pages/About";
import { PayPage } from "./pages/Pay";
import { MerchantPage } from "./pages/Merchant";
// near-api-js is large: load the send and claim pages only when opened.
const SendPage = lazy(() => import("./pages/Send").then((m) => ({ default: m.SendPage })));
const ClaimPage = lazy(() => import("./pages/Claim").then((m) => ({ default: m.ClaimPage })));

function NotFound() {
  return (
    <div className="page-head">
      <h1>Page not found</h1>
      <p>
        <a href="/">Go to the home page</a>
      </p>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="check" element={<CheckPage />} />
          <Route path="security" element={<DemoPage />} />
          <Route path="demo" element={<Navigate to="/security" replace />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoicePage />} />
          <Route path="pay/:id" element={<PayPage />} />
          <Route path="m/:account" element={<MerchantPage />} />
          <Route path="send" element={<Suspense fallback={null}><SendPage /></Suspense>} />
          <Route path="claim/:id" element={<Suspense fallback={null}><ClaimPage /></Suspense>} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </WalletProvider>
  </StrictMode>,
);
