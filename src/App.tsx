import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { useAccountBalanceInit } from "@/hooks/useAccountBalanceInit";
import Dashboard from "./pages/Dashboard";
import BankAccounts from "./pages/BankAccounts";
import BankAccountDetail from "./pages/BankAccountDetail";
import CreditCards from "./pages/CreditCards";
import CreditCardDetail from "./pages/CreditCardDetail";
import Budgets from "./pages/Budgets";
import SavingsGoals from "./pages/SavingsGoals";
import Portfolio from "./pages/Portfolio";
import NetWorth from "./pages/NetWorth";
import RecurringPayments from "./pages/RecurringPayments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import { Transactions } from "./pages/Transactions";
import { PlaidTransactions } from "./pages/PlaidTransactions";
import NotFound from "./pages/NotFound";
import { PerformanceMonitor } from "./components/PerformanceMonitor";
import { setupGlobalErrorHandling } from "./utils/errorHandler";
import { logger } from "./utils/logger";
import React from "react";

const queryClient = new QueryClient();

const AppContent = () => {
  // Initialize cached balances for existing accounts
  useAccountBalanceInit();
  
  React.useEffect(() => {
    // Set up global error handling
    setupGlobalErrorHandling();
    
    // Log app initialization
    logger.info('App initialized', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }, []);
  
  return (
    <Layout>
      <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<BankAccounts />} />
            <Route path="/accounts/:accountId" element={<BankAccountDetail />} />
            <Route path="/credit-cards" element={<CreditCards />} />
            <Route path="/credit-cards/:cardId" element={<CreditCardDetail />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<SavingsGoals />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/net-worth" element={<NetWorth />} />
            <Route path="/transactions" element={<PlaidTransactions />} />
            <Route path="/transactions-manual" element={<Transactions />} />
            <Route path="/recurring" element={<RecurringPayments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
      <PerformanceMonitor autoRefresh={true} />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
