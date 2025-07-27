import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Calendar,
  Repeat,
  CreditCard,
  Wallet,
  Play,
  Pause,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  CalendarDays,
  List
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFirestore } from "@/hooks/useFirestore";
import { AuthModal } from "@/components/AuthModal";
import { RecurringPaymentForm } from "@/components/RecurringPaymentForm";
import { RecurringPaymentCalendar } from "@/components/RecurringPaymentCalendar";
import { RecurringPayment } from "@/types/recurringPayments";


const RecurringPayments = () => {
  const { user } = useAuth();
  const { documents: payments, loading, updateDocument, deleteDocument } = useFirestore<RecurringPayment>('recurringPayments');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  if (!user) {
    return <AuthModal open={true} onOpenChange={() => {}} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activePayments = payments.filter(payment => payment.isActive);
  const inactivePayments = payments.filter(payment => !payment.isActive);
  
  // Calculate monthly total - handle new frequency structure
  const monthlyTotal = activePayments.reduce((sum, payment) => {
    const freq = payment.frequency;
    if (typeof freq === 'string') {
      // Legacy format
      if (freq === "Monthly") return sum + payment.amount;
      if (freq === "Weekly") return sum + (payment.amount * 4.33); // ~4.33 weeks per month
      if (freq === "Yearly") return sum + (payment.amount / 12);
    } else {
      // New format
      if (freq.type === 'monthly') return sum + (payment.amount / freq.interval);
      if (freq.type === 'weekly') return sum + (payment.amount * 4.33 / freq.interval);
      if (freq.type === 'yearly') return sum + (payment.amount / (12 * freq.interval));
      if (freq.type === 'daily') return sum + (payment.amount * 30.44 / freq.interval); // ~30.44 days per month
    }
    return sum;
  }, 0);
  
  const automaticPayments = activePayments.filter(payment => payment.isAutomatic);

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPaymentStatus = (payment: RecurringPayment) => {
    const daysUntilDue = getDaysUntilDue(payment.nextDueDate);
    
    if (daysUntilDue < 0) {
      return { status: "Overdue", color: "bg-destructive text-destructive-foreground", icon: AlertTriangle };
    } else if (daysUntilDue <= 3) {
      return { status: "Due Soon", color: "bg-warning text-warning-foreground", icon: Clock };
    } else if (payment.isAutomatic) {
      return { status: "Automatic", color: "bg-success text-success-foreground", icon: CheckCircle };
    } else {
      return { status: "Manual", color: "bg-muted text-muted-foreground", icon: Clock };
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "Housing": "hsl(var(--primary))",
      "Entertainment": "hsl(var(--accent))",
      "Health": "hsl(var(--success))",
      "Insurance": "hsl(var(--warning))",
      "Software": "hsl(190 60% 50%)",
      "Utilities": "hsl(var(--destructive))"
    };
    return colors[category] || "hsl(var(--muted))";
  };


  const handleTogglePayment = async (payment: RecurringPayment) => {
    await updateDocument(payment.id, { isActive: !payment.isActive });
  };

  const handleToggleAutomatic = async (payment: RecurringPayment) => {
    await updateDocument(payment.id, { isAutomatic: !payment.isAutomatic });
  };

  const handleDeletePayment = async (paymentId: string) => {
    await deleteDocument(paymentId);
  };

  const getFrequencyDisplay = (frequency: any) => {
    if (typeof frequency === 'string') {
      return frequency; // Legacy format
    }
    
    const { type, interval, dayOfWeek, dayOfMonth } = frequency;
    switch (type) {
      case 'daily':
        return interval === 1 ? 'Daily' : `Every ${interval} days`;
      case 'weekly':
        return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      case 'monthly':
        return interval === 1 ? 'Monthly' : `Every ${interval} months`;
      case 'yearly':
        return interval === 1 ? 'Yearly' : `Every ${interval} years`;
      default:
        return 'Custom';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recurring Payments</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and recurring expenses with advanced scheduling</p>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">${monthlyTotal.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">{activePayments.length} active payments</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Automatic Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{automaticPayments.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Set to autopay</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">
              {activePayments.filter(p => getDaysUntilDue(p.nextDueDate) <= 7 && getDaysUntilDue(p.nextDueDate) > 0).length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Upcoming payments</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {activePayments.filter(p => getDaysUntilDue(p.nextDueDate) < 0).length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Active Payments */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-6">Active Payments</h2>
            <div className="space-y-4">
              {activePayments.map((payment) => {
                const daysUntilDue = getDaysUntilDue(payment.nextDueDate);
                const paymentStatus = getPaymentStatus(payment);
                
                return (
                  <Card key={payment.id} className="shadow-card border-border/50 hover:shadow-elegant transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div 
                            className="p-3 rounded-lg text-white"
                            style={{ backgroundColor: getCategoryColor(payment.category) }}
                          >
                            <Repeat className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground text-lg">{payment.name}</h3>
                            <p className="text-sm text-muted-foreground">{payment.category} • {getFrequencyDisplay(payment.frequency)}</p>
                            {payment.description && (
                              <p className="text-sm text-muted-foreground/80">{payment.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className={paymentStatus.color} variant="secondary">
                                <paymentStatus.icon className="h-3 w-3 mr-1" />
                                {paymentStatus.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                via {payment.paymentMethod}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">${payment.amount}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(payment.nextDueDate).toLocaleDateString()}
                          </p>
                          <p className={`text-sm font-medium mt-1 ${
                            daysUntilDue < 0 ? 'text-destructive' : 
                            daysUntilDue <= 3 ? 'text-warning' : 'text-muted-foreground'
                          }`}>
                            {daysUntilDue < 0 
                              ? `${Math.abs(daysUntilDue)} days overdue`
                              : daysUntilDue === 0 
                              ? 'Due today'
                              : `${daysUntilDue} days remaining`
                            }
                          </p>
                        </div>

                        <div className="flex items-center gap-2 ml-6">
                          <Button variant="outline" size="sm" onClick={() => handleToggleAutomatic(payment)}>
                            {payment.isAutomatic ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="sm">
                            Pay Now
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeletePayment(payment.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Inactive Payments */}
          {inactivePayments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Inactive Payments</h2>
              <div className="space-y-3">
                {inactivePayments.map((payment) => (
                  <Card key={payment.id} className="shadow-card border-border/50 opacity-60">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg text-white opacity-70"
                            style={{ backgroundColor: getCategoryColor(payment.category) }}
                          >
                            <Repeat className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{payment.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {payment.category} • ${payment.amount} {getFrequencyDisplay(payment.frequency).toLowerCase()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-muted/50">
                            Inactive
                          </Badge>
                          {payment.lastPaid && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Last paid: {new Date(payment.lastPaid).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <RecurringPaymentCalendar 
            payments={activePayments} 
            onAddPayment={() => setIsAddDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Add Payment Form */}
      <RecurringPaymentForm 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />
    </div>
  );
};

export default RecurringPayments;