import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import BankAccounts from '@/pages/BankAccounts';

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' },
    loading: false,
  }),
}));

vi.mock('@/hooks/useFirestore', () => ({
  useFirestore: () => ({
    documents: [
      {
        id: '1',
        name: 'Test Checking',
        type: 'checking',
        initialBalance: 1000,
        currentBalance: 1200,
        isActive: true,
        createdDate: '2024-01-01',
      },
    ],
    loading: false,
    addDocument: vi.fn(),
    updateDocument: vi.fn(),
  }),
}));

vi.mock('@/hooks/useBankConnections', () => ({
  useBankConnections: () => ({
    connections: [],
    isLoading: false,
    addConnection: vi.fn(),
    removeConnection: vi.fn(),
    syncAllConnections: vi.fn(),
    getTotalBalance: () => 0,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('BankAccounts', () => {
  it('renders bank accounts page', () => {
    const { getByText } = render(<BankAccounts />);
    
    expect(getByText('Bank Accounts')).toBeInTheDocument();
    expect(getByText('Test Checking')).toBeInTheDocument();
  });

  it('shows add account dialog when button is clicked', async () => {
    const user = userEvent.setup();
    const { getByText } = render(<BankAccounts />);
    
    const addButton = getByText('Add Manual Account');
    await user.click(addButton);
    
    expect(getByText('Add Bank Account')).toBeInTheDocument();
  });

  it('displays account balance correctly', () => {
    const { getByText } = render(<BankAccounts />);
    
    expect(getByText('$1,200')).toBeInTheDocument();
  });

  it('toggles balance visibility', async () => {
    const user = userEvent.setup();
    const { getByText } = render(<BankAccounts />);
    
    const toggleButton = getByText('Hide Balances');
    await user.click(toggleButton);
    
    expect(getByText('••••••')).toBeInTheDocument();
  });
});