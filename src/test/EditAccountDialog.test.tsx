import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { EditAccountDialog } from '@/components/EditAccountDialog';

const mockAccount = {
  id: '1',
  name: 'Test Account',
  type: 'checking',
  currentBalance: 1000,
  initialBalance: 500,
  accountNumber: '1234',
  isActive: true
};

const mockProps = {
  account: mockAccount,
  open: true,
  onOpenChange: vi.fn(),
  onSave: vi.fn()
};

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('EditAccountDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with account data prefilled', () => {
    const { getByDisplayValue } = render(<EditAccountDialog {...mockProps} />);
    
    expect(getByDisplayValue('Test Account')).toBeInTheDocument();
    expect(getByDisplayValue('1000')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    const { getByRole, getByText } = render(<EditAccountDialog {...mockProps} />);
    
    // Clear required field
    const nameInput = getByDisplayValue('Test Account');
    await user.clear(nameInput);
    
    const submitButton = getByRole('button', { name: /update account/i });
    await user.click(submitButton);
    
    expect(getByText('Account name is required')).toBeInTheDocument();
  });

  it('calls onSave with correct data', async () => {
    const user = userEvent.setup();
    const { getByRole, getByDisplayValue } = render(<EditAccountDialog {...mockProps} />);
    
    const balanceInput = getByDisplayValue('1000');
    await user.clear(balanceInput);
    await user.type(balanceInput, '1500');
    
    const submitButton = getByRole('button', { name: /update account/i });
    await user.click(submitButton);
    
    expect(mockProps.onSave).toHaveBeenCalledWith('1', expect.objectContaining({
      currentBalance: 1500
    }));
  });

  it('handles save errors gracefully', async () => {
    const user = userEvent.setup();
    const mockOnSaveError = vi.fn().mockRejectedValue(new Error('Save failed'));
    
    const { getByRole } = render(
      <EditAccountDialog {...mockProps} onSave={mockOnSaveError} />
    );
    
    const submitButton = getByRole('button', { name: /update account/i });
    await user.click(submitButton);
    
    expect(mockOnSaveError).toHaveBeenCalled();
  });

  it('closes dialog on cancel', async () => {
    const user = userEvent.setup();
    const { getByRole } = render(<EditAccountDialog {...mockProps} />);
    
    const cancelButton = getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(mockProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});