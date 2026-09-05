import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute, RequireRole } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider } from "@/lib/auth-context";
import { LoginPage } from "@/pages/LoginPage";
import { AccountsPage } from "@/pages/internal/AccountsPage";
import { BalanceSheetPage } from "@/pages/internal/BalanceSheetPage";
import { BudgetReportPage } from "@/pages/internal/BudgetReportPage";
import { ContactsPage } from "@/pages/internal/ContactsPage";
import { CustomerInvoiceDetailPage } from "@/pages/internal/CustomerInvoiceDetailPage";
import { CustomerInvoicesPage } from "@/pages/internal/CustomerInvoicesPage";
import { DashboardPage } from "@/pages/internal/DashboardPage";
import { JournalsPage } from "@/pages/internal/JournalsPage";
import { PostEntryPage } from "@/pages/internal/PostEntryPage";
import { ProductsPage } from "@/pages/internal/ProductsPage";
import { ProfitAndLossPage } from "@/pages/internal/ProfitAndLossPage";
import { PurchaseOrderDetailPage } from "@/pages/internal/PurchaseOrderDetailPage";
import { PurchaseOrdersPage } from "@/pages/internal/PurchaseOrdersPage";
import { SalesOrderDetailPage } from "@/pages/internal/SalesOrderDetailPage";
import { SalesOrdersPage } from "@/pages/internal/SalesOrdersPage";
import { UsersPage } from "@/pages/internal/UsersPage";
import { VendorBillDetailPage } from "@/pages/internal/VendorBillDetailPage";
import { VendorBillsPage } from "@/pages/internal/VendorBillsPage";
import { PortalIndexRedirect, RequirePortalArea } from "@/pages/portal/PortalGuards";
import { PortalLayout } from "@/pages/portal/PortalLayout";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<RequireRole roles={["Admin", "Accountant"]} />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="journals" element={<JournalsPage />} />
                <Route path="post-entry" element={<PostEntryPage />} />
                <Route path="reports/balance-sheet" element={<BalanceSheetPage />} />
                <Route path="reports/profit-and-loss" element={<ProfitAndLossPage />} />
                <Route path="reports/budget" element={<BudgetReportPage />} />
                <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
                <Route path="sales-orders" element={<SalesOrdersPage />} />
                <Route path="sales-orders/:id" element={<SalesOrderDetailPage />} />
                <Route path="customer-invoices" element={<CustomerInvoicesPage />} />
                <Route path="customer-invoices/:id" element={<CustomerInvoiceDetailPage />} />
                <Route path="vendor-bills" element={<VendorBillsPage />} />
                <Route path="vendor-bills/:id" element={<VendorBillDetailPage />} />
                <Route path="users" element={<RequireRole roles={["Admin"]} />}>
                  <Route index element={<UsersPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="portal" element={<RequireRole roles={["Contact"]} />}>
              <Route element={<PortalLayout />}>
                <Route index element={<PortalIndexRedirect />} />
                <Route element={<RequirePortalArea area="Vendor" />}>
                  <Route path="vendor-bills" element={<VendorBillsPage />} />
                  <Route path="vendor-bills/:id" element={<VendorBillDetailPage />} />
                </Route>
                <Route element={<RequirePortalArea area="Customer" />}>
                  <Route path="customer-invoices" element={<CustomerInvoicesPage />} />
                  <Route path="customer-invoices/:id" element={<CustomerInvoiceDetailPage />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
