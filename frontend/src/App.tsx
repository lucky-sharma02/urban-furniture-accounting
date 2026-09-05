import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AccountsPage } from "@/pages/internal/AccountsPage";
import { ContactsPage } from "@/pages/internal/ContactsPage";
import { DashboardPage } from "@/pages/internal/DashboardPage";
import { JournalsPage } from "@/pages/internal/JournalsPage";
import { ProductsPage } from "@/pages/internal/ProductsPage";

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
