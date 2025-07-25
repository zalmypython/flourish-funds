import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import BankAccounts from "./pages/BankAccounts";
import CreditCards from "./pages/CreditCards";
import Budgets from "./pages/Budgets";
import SavingsGoals from "./pages/SavingsGoals";
import NetWorth from "./pages/NetWorth";
import RecurringPayments from "./pages/RecurringPayments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import { Transactions } from "./pages/Transactions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<BankAccounts />} />
            <Route path="/credit-cards" element={<CreditCards />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<SavingsGoals />} />
            <Route path="/net-worth" element={<NetWorth />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/recurring" element={<RecurringPayments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
