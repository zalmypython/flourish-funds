import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import OptimalCardSuggestion from '@/components/OptimalCardSuggestion';
import { CreditCard } from '@/types';

const mockCards: CreditCard[] = [
  {
    id: '1',
    name: 'Cash Back Card',
    issuer: 'Bank',
    type: 'cashback',
    limit: 5000,
    initialBalance: 0,
    currentBalance: 0,
    paymentDueDay: 15,
    dueDate: '2024-01-15',
    defaultRewardRate: 1.5,
    categoryRewards: { dining: { type: 'cashback', rate: 3.0 }, gas: { type: 'cashback', rate: 2.0 } },
    isActive: true,
    statementBalance: 0,
    minimumPayment: 25,
    interestRate: 18.99,
    createdAt: '2024-01-01',
    lastSyncDate: '2024-01-01',
    bonuses: []
  },
  {
    id: '2', 
    name: 'Travel Card',
    issuer: 'Bank',
    type: 'travel',
    limit: 10000,
    initialBalance: 0,
    currentBalance: 0,
    paymentDueDay: 20,
    dueDate: '2024-01-20',
    defaultRewardRate: 2.0,
    categoryRewards: { travel: { type: 'miles', rate: 5.0 }, dining: { type: 'points', rate: 2.0 } },
    isActive: true,
    statementBalance: 0,
    minimumPayment: 25,
    interestRate: 16.99,
    createdAt: '2024-01-01',
    lastSyncDate: '2024-01-01',
    bonuses: []
  }
];

vi.mock('@/hooks/useRewardCalculation', () => ({
  useRewardCalculation: () => ({
    getOptimalCardSuggestion: vi.fn().mockReturnValue({
      card: mockCards[0],
      rewardAmount: 9.0,
      rewardType: 'cashback'
    }),
    calculateRewardForTransaction: vi.fn().mockReturnValue({
      rewardAmount: 9.0,
      rewardType: 'cashback'
    })
  })
}));

describe('OptimalCardSuggestion', () => {
  const mockProps = {
    amount: 300,
    category: 'dining',
    cards: mockCards,
    onCardSelect: vi.fn()
  };

  it('renders optimal card suggestion', () => {
    const { getByText } = render(<OptimalCardSuggestion {...mockProps} />);
    
    expect(getByText('Cash Back Card')).toBeInTheDocument();
    expect(getByText('••••1234')).toBeInTheDocument();
    expect(getByText('$9.00')).toBeInTheDocument();
  });

  it('calls onCardSelect when use button is clicked', async () => {
    const user = userEvent.setup();
    const { getByText } = render(<OptimalCardSuggestion {...mockProps} />);
    
    const useButton = getByText('Use This Card');
    await user.click(useButton);
    
    expect(mockProps.onCardSelect).toHaveBeenCalledWith('1');
  });

  it('shows no suggestion when no cards available', () => {
    const { getByText } = render(
      <OptimalCardSuggestion {...mockProps} cards={[]} />
    );
    
    expect(getByText('No optimal card found')).toBeInTheDocument();
  });
});