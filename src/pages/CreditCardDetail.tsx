import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useFirestore } from '@/hooks/useFirestore';
import { useAccountBalance } from '@/hooks/useAccountBalance';
import { useAuth } from '@/hooks/useAuth';
import { CreditCard, Transaction, CreditCardGoal, CreditCardBonus } from '@/types';
import { ArrowLeft, CreditCard as CreditCardIcon, AlertTriangle, Calendar, Target, Gift, Plus, Edit, Percent, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const CreditCardDetail = () => {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { documents: cards } = useFirestore<CreditCard>('creditCards');
  const { documents: transactions } = useFirestore<Transaction>('transactions');
  const { calculateAccountBalance, getAccountTransactionSummary } = useAccountBalance();

  const [card, setCard] = useState<CreditCard | null>(null);

  useEffect(() => {
    const foundCard = cards.find(c => c.id === cardId);
    setCard(foundCard || null);
  }, [cards, cardId]);

  if (!user || !card) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground">Credit card not found</p>
          <Button onClick={() => navigate('/credit-cards')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Credit Cards
          </Button>
        </div>
      </div>
    );
  }

  const currentBalance = calculateAccountBalance(card.id, 'credit', card.initialBalance);
  const summary = getAccountTransactionSummary(card.id, 'credit');
  const cardTransactions = transactions.filter(t => t.accountId === card.id);
  const utilization = (currentBalance / card.limit) * 100;
  const availableCredit = card.limit - currentBalance;

  const activeGoals = card.goals?.filter(goal => goal.status === 'active') || [];
  const activeBonuses = card.bonuses?.filter(bonus => bonus.status === 'active') || [];

  const getUtilizationColor = (util: number) => {
    if (util < 30) return 'text-success';
    if (util < 70) return 'text-warning';
    return 'text-destructive';
  };

  const getBonusProgress = (bonus: CreditCardBonus) => {
    return Math.min((bonus.currentSpending / bonus.spendingRequired) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/credit-cards')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{card.name}</h1>
            <p className="text-muted-foreground">{card.issuer} • {card.type}</p>
          </div>
        </div>
        <Button variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit Card
        </Button>
      </div>

      {/* Card Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">${currentBalance.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">
              of ${card.limit.toLocaleString()} limit
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credit Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${getUtilizationColor(utilization)}`}>
              {utilization.toFixed(1)}%
            </p>
            <Progress value={utilization} className="mt-2 h-2" />
            {utilization > 70 && (
              <div className="flex items-center gap-1 text-destructive mt-1">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">High utilization</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">${availableCredit.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">Remaining credit</p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interest Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{card.interestRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">APR</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Info */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Next Due Date</p>
              <p className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(card.dueDate), 'MMM dd, yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Minimum Payment</p>
              <p className="text-lg font-bold text-warning">
                ${(currentBalance * 0.02).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Spending</p>
              <p className="text-lg font-bold text-foreground">
                ${summary.totalExpenses.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals & Bonuses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Bonuses */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Sign-up Bonuses</CardTitle>
              <CardDescription>Track your credit card rewards</CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Bonus
            </Button>
          </CardHeader>
          <CardContent>
            {activeBonuses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active bonuses</p>
                <p className="text-sm">Track signup bonuses and reward goals</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeBonuses.map((bonus) => {
                  const progress = getBonusProgress(bonus);
                  return (
                    <div key={bonus.id} className="space-y-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{bonus.title}</p>
                          <p className="text-sm text-muted-foreground">{bonus.description}</p>
                        </div>
                        <Badge variant="secondary">{bonus.bonusAmount}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Spending Progress</span>
                          <span>${bonus.currentSpending.toLocaleString()} / ${bonus.spendingRequired.toLocaleString()}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{progress.toFixed(1)}% complete</span>
                          <span>Ends {format(new Date(bonus.endDate), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Goals */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Card Goals</CardTitle>
              <CardDescription>Track utilization and payment goals</CardDescription>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active goals</p>
                <p className="text-sm">Set utilization or payment goals</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeGoals.map((goal) => (
                  <div key={goal.id} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{goal.title}</p>
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      </div>
                      <Badge variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'medium' ? 'default' : 'secondary'}>
                        {goal.priority}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Due {format(new Date(goal.endDate), 'MMM dd, yyyy')}</span>
                      <span className="capitalize">{goal.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <CardDescription>{cardTransactions.length} transactions for this card</CardDescription>
          </div>
          <Button size="sm" variant="outline">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {cardTransactions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CreditCardIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No transactions found</p>
              <p className="text-sm">Transactions for this card will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cardTransactions.slice(0, 10).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/20 text-destructive">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
                        <Badge variant="outline" className="ml-2">{transaction.category}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">
                      ${transaction.amount.toLocaleString()}
                    </p>
                    <Badge variant="secondary" className="text-xs">{transaction.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditCardDetail;