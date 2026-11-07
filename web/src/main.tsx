import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
          <Route path="demo" element={<DemoPage />} />
          <Route path="vault" element={<VaultPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/:id" element={<InvoicePage />} />
          <Route path="pay/:id" element={<PayPage />} />
          <Route path="m/:account" element={<MerchantPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </WalletProvider>
  </StrictMode>,
);
