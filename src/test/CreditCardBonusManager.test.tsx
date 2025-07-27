import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { CreditCardBonusManager } from '@/components/CreditCardBonusManager';

const mockBonuses = [
  {
    id: '1',
    title: 'Welcome Bonus',
    description: 'Spend $3000 in 3 months',
    requirement: 'Spend $3000 in 3 months',
    bonusAmount: "50000",
    bonusValue: 500,
    progress: 1500,
    currentSpending: 1500,
    spendingRequired: 3000,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    isCompleted: false,
    isActive: true,
    status: 'in_progress' as const,
    rewardType: 'points' as const,
    autoTracking: true
  }
];

const mockProps = {
  cardId: 'card-1',
  bonuses: mockBonuses,
  onBonusUpdate: vi.fn()
};

vi.mock('@/hooks/useFirestore', () => ({
  useFirestore: () => ({
    updateDocument: vi.fn(),
    documents: []
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('CreditCardBonusManager', () => {
  it('renders bonus list correctly', () => {
    const { getByText } = render(<CreditCardBonusManager {...mockProps} />);
    
    expect(getByText('Welcome Bonus')).toBeInTheDocument();
    expect(getByText('Spend $3000 in 3 months')).toBeInTheDocument();
    expect(getByText('$500')).toBeInTheDocument();
  });

  it('shows progress bar with correct percentage', () => {
    const { container } = render(<CreditCardBonusManager {...mockProps} />);
    
    // Progress should be 50% (1500 / 3000)
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('opens add bonus dialog', async () => {
    const user = userEvent.setup();
    const { getByText } = render(<CreditCardBonusManager {...mockProps} />);
    
    const addButton = getByText('Add Bonus');
    await user.click(addButton);
    
    expect(getByText('Add New Bonus')).toBeInTheDocument();
  });

  it('marks bonus as completed', () => {
    const completedBonus = { 
      ...mockBonuses[0], 
      isCompleted: true, 
      progress: 3000, 
      currentSpending: 3000,
      status: 'completed' as const
    };
    const { getByText } = render(
      <CreditCardBonusManager {...mockProps} bonuses={[completedBonus]} />
    );
    
    expect(getByText('Completed')).toBeInTheDocument();
  });
});