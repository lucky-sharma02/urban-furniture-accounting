import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AccountsPage } from "@/pages/internal/AccountsPage";
import { ContactsPage } from "@/pages/internal/ContactsPage";
import { CustomerInvoiceDetailPage } from "@/pages/internal/CustomerInvoiceDetailPage";
import { CustomerInvoicesPage } from "@/pages/internal/CustomerInvoicesPage";
import { DashboardPage } from "@/pages/internal/DashboardPage";
import { JournalsPage } from "@/pages/internal/JournalsPage";
import { PostEntryPage } from "@/pages/internal/PostEntryPage";
import { ProductsPage } from "@/pages/internal/ProductsPage";
import { PurchaseOrdersPage } from "@/pages/internal/PurchaseOrdersPage";
import { SalesOrdersPage } from "@/pages/internal/SalesOrdersPage";
import { VendorBillDetailPage } from "@/pages/internal/VendorBillDetailPage";
import { VendorBillsPage } from "@/pages/internal/VendorBillsPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="journals" element={<JournalsPage />} />
          <Route path="post-entry" element={<PostEntryPage />} />
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="sales-orders" element={<SalesOrdersPage />} />
          <Route path="customer-invoices" element={<CustomerInvoicesPage />} />
          <Route path="customer-invoices/:id" element={<CustomerInvoiceDetailPage />} />
          <Route path="vendor-bills" element={<VendorBillsPage />} />
          <Route path="vendor-bills/:id" element={<VendorBillDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
