import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, CreditCard as CreditCardIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import { CreditCard } from '@/types';
import { CreditCardBalanceService } from '@/services/creditCardBalanceService';

interface CreditCardBalanceWidgetProps {
  card: CreditCard;
  onPaymentClick?: () => void;
  onViewDetails?: () => void;
}

export default function CreditCardBalanceWidget({ 
  card, 
  onPaymentClick, 
  onViewDetails 
}: CreditCardBalanceWidgetProps) {
  const utilization = CreditCardBalanceService.calculateUtilization(card.currentBalance, card.limit);
  const availableCredit = CreditCardBalanceService.calculateAvailableCredit(card.limit, card.currentBalance);
  const daysUntilDue = CreditCardBalanceService.getDaysUntilDue(card.dueDate);
  const isOverdue = CreditCardBalanceService.isPaymentOverdue(card.dueDate);
  
  const getUtilizationColor = (util: number) => {
    if (util >= 90) return 'text-destructive';
    if (util >= 70) return 'text-warning';
    return 'text-success';
  };

  const getPaymentStatusColor = () => {
    if (isOverdue) return 'destructive';
    if (daysUntilDue <= 3) return 'destructive';
    return 'secondary';
  };

  const getPaymentStatusText = () => {
    if (isOverdue) return 'Overdue';
    if (daysUntilDue <= 0) return 'Due Today';
    if (daysUntilDue === 1) return 'Due Tomorrow';
    return `Due in ${daysUntilDue} days`;
  };

  return (
    <Card className="border-primary/10 hover:border-primary/20 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{card.name}</CardTitle>
          </div>
          <Badge variant={card.isActive ? 'default' : 'secondary'}>
            {card.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Balance Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold">${card.currentBalance.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available Credit</p>
            <p className="text-2xl font-bold text-success">${availableCredit.toFixed(2)}</p>
          </div>
        </div>

        {/* Statement Balance vs Current Balance */}
        {card.statementBalance !== card.currentBalance && (
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Statement Balance</p>
                <p className="text-lg font-bold">${card.statementBalance.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className={`text-lg font-bold ${card.currentBalance > card.statementBalance ? 'text-warning' : 'text-success'}`}>
                  ${Math.abs(card.currentBalance - card.statementBalance).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Utilization Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Credit Utilization</p>
            <p className={`text-sm font-medium ${getUtilizationColor(utilization)}`}>
              {utilization.toFixed(1)}%
            </p>
          </div>
          <Progress 
            value={utilization} 
            className="h-2"
            // @ts-ignore - custom color handling
            indicatorClassName={
              utilization >= 90 ? 'bg-destructive' :
              utilization >= 70 ? 'bg-warning' : 
              'bg-success'
            }
          />
          <p className="text-xs text-muted-foreground mt-1">
            ${card.currentBalance.toFixed(2)} of ${card.limit.toFixed(2)} limit
          </p>
        </div>

        {/* Payment Information */}
        <div className="bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <p className="text-sm font-medium">Payment Due</p>
            </div>
            <Badge variant={getPaymentStatusColor()}>
              {getPaymentStatusText()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Minimum Payment</p>
              <p className="text-lg font-bold">${card.minimumPaymentDue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Due Date</p>
              <p className="text-sm font-medium">{new Date(card.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Auto Pay Status */}
          {card.autoPayEnabled && (
            <div className="flex items-center gap-2 mt-2 text-success">
              <CheckCircle className="h-4 w-4" />
              <p className="text-xs">
                Auto-pay enabled: ${card.autoPayAmount?.toFixed(2) || card.minimumPaymentDue.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Warning Indicators */}
        {(utilization >= 70 || isOverdue || daysUntilDue <= 3) && (
          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">Attention Required</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                {utilization >= 70 && <li>• High credit utilization ({utilization.toFixed(1)}%)</li>}
                {isOverdue && <li>• Payment is overdue</li>}
                {daysUntilDue <= 3 && !isOverdue && <li>• Payment due soon</li>}
              </ul>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onPaymentClick && (
            <Button 
              variant={isOverdue || daysUntilDue <= 3 ? 'default' : 'outline'}
              size="sm"
              onClick={onPaymentClick}
              className="flex-1"
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Make Payment
            </Button>
          )}
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewDetails}
              className="flex-1"
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}