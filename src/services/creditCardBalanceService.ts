import { CreditCard, Transaction } from '@/types';

export class CreditCardBalanceService {
  /**
   * Calculates the current balance based on transactions
   */
  static calculateCurrentBalance(transactions: Transaction[], initialBalance: number = 0): number {
    return transactions.reduce((balance, transaction) => {
      return transaction.type === 'expense' 
        ? balance + Math.abs(transaction.amount)
        : balance - Math.abs(transaction.amount);
    }, initialBalance);
  }

  /**
   * Calculates credit utilization percentage
   */
  static calculateUtilization(currentBalance: number, creditLimit: number): number {
    if (creditLimit === 0) return 0;
    return Math.min((currentBalance / creditLimit) * 100, 100);
  }

  /**
   * Calculates available credit
   */
  static calculateAvailableCredit(creditLimit: number, currentBalance: number): number {
    return Math.max(creditLimit - currentBalance, 0);
  }

  /**
   * Determines if a payment is overdue
   */
  static isPaymentOverdue(dueDate: string): boolean {
    const today = new Date();
    const paymentDue = new Date(dueDate);
    return today > paymentDue;
  }

  /**
   * Calculates days until payment due
   */
  static getDaysUntilDue(dueDate: string): number {
    const today = new Date();
    const paymentDue = new Date(dueDate);
    const diffTime = paymentDue.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determines the next statement date based on current date and statement cycle
   */
  static calculateNextStatementDate(lastStatementDate: string, cycleDays: number = 30): string {
    const lastDate = new Date(lastStatementDate);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + cycleDays);
    return nextDate.toISOString().split('T')[0];
  }

  /**
   * Calculates the minimum payment based on balance and card terms
   */
  static calculateMinimumPayment(
    currentBalance: number, 
    interestRate: number, 
    minimumPercentage: number = 0.02
  ): number {
    const minimumByPercentage = currentBalance * minimumPercentage;
    const interestCharge = (currentBalance * (interestRate / 100)) / 12;
    return Math.max(minimumByPercentage + interestCharge, 25); // Minimum $25
  }

  /**
   * Updates balance information for a credit card
   */
  static updateBalanceInfo(
    card: CreditCard, 
    transactions: Transaction[]
  ): Partial<CreditCard> {
    const currentBalance = this.calculateCurrentBalance(transactions, card.initialBalance);
    const utilization = this.calculateUtilization(currentBalance, card.limit);
    const availableCredit = this.calculateAvailableCredit(card.limit, currentBalance);
    const minimumPaymentDue = this.calculateMinimumPayment(currentBalance, card.interestRate);

    return {
      currentBalance,
      lastBalanceUpdate: new Date().toISOString(),
      minimumPaymentDue,
      // Update next statement date if needed
      nextStatementDate: card.nextStatementDate || 
        this.calculateNextStatementDate(card.lastStatementDate || new Date().toISOString())
    };
  }

  /**
   * Checks if balance should trigger notifications
   */
  static shouldNotifyForBalance(card: CreditCard): {
    highUtilization: boolean;
    paymentDue: boolean;
    overdue: boolean;
    daysUntilDue: number;
  } {
    const utilization = this.calculateUtilization(card.currentBalance, card.limit);
    const daysUntilDue = this.getDaysUntilDue(card.dueDate);
    const isOverdue = this.isPaymentOverdue(card.dueDate);

    return {
      highUtilization: utilization >= 70,
      paymentDue: daysUntilDue <= card.paymentReminderDays && daysUntilDue > 0,
      overdue: isOverdue,
      daysUntilDue
    };
  }
}