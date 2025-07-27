import { useState } from 'react';
import { StockPortfolioManager } from '../components/StockPortfolioManager';
import { AuthModal } from '../components/AuthModal';
import { useApiAuth } from '../hooks/useApiAuth';

export default function Portfolio() {
  const { user } = useApiAuth();
  const [authModalOpen, setAuthModalOpen] = useState(!user);

  if (!user) {
    return <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />;
  }

  return (
    <div className="container mx-auto p-6">
      <StockPortfolioManager />
    </div>
  );
}