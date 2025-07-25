import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Clock
} from "lucide-react";

interface RecurringPayment {
  id: string;
  name: string;
  amount: number;
  frequency: "Monthly" | "Weekly" | "Yearly";
  nextDueDate: string;
  paymentMethod: string;
  category: string;
  isActive: boolean;
  isAutomatic: boolean;
  lastPaid?: string;
}

const RecurringPayments = () => {
  const [payments, setPayments] = useState<RecurringPayment[]>([
    {
      id: "1",
      name: "Rent",
      amount: 1500,
      frequency: "Monthly",
      nextDueDate: "2024-02-01",
      paymentMethod: "Chase Checking",
      category: "Housing",
      isActive: true,
      isAutomatic: true,
      lastPaid: "2024-01-01"
    },
    {
      id: "2",
      name: "Netflix",
      amount: 15.99,
      frequency: "Monthly",
      nextDueDate: "2024-02-05",
      paymentMethod: "Chase Sapphire",
      category: "Entertainment",
      isActive: true,
      isAutomatic: true,
      lastPaid: "2024-01-05"
    },
    {
      id: "3",
      name: "Spotify",
      amount: 9.99,
      frequency: "Monthly",
      nextDueDate: "2024-02-10",
      paymentMethod: "Chase Sapphire",
      category: "Entertainment",
      isActive: true,
      isAutomatic: true,
      lastPaid: "2024-01-10"
    },
    {
      id: "4",
      name: "Gym Membership",
      amount: 45,
      frequency: "Monthly",
      nextDueDate: "2024-02-15",
      paymentMethod: "Citi Double Cash",
      category: "Health",
      isActive: true,
      isAutomatic: false
    },
    {
      id: "5",
      name: "Car Insurance",
      amount: 150,
      frequency: "Monthly",
      nextDueDate: "2024-02-20",
      paymentMethod: "Chase Checking",
      category: "Insurance",
      isActive: true,
      isAutomatic: true,
      lastPaid: "2024-01-20"
    },
    {
      id: "6",
      name: "Adobe Creative Suite",
      amount: 52.99,
      frequency: "Monthly",
      nextDueDate: "2024-02-12",
      paymentMethod: "Chase Sapphire",
      category: "Software",
      isActive: false,
      isAutomatic: false,
      lastPaid: "2023-12-12"
    }
  ]);

  const activePayments = payments.filter(payment => payment.isActive);
  const inactivePayments = payments.filter(payment => !payment.isActive);
  const monthlyTotal = activePayments
    .filter(payment => payment.frequency === "Monthly")
    .reduce((sum, payment) => sum + payment.amount, 0);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recurring Payments</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and recurring expenses</p>
        </div>
        <div className="flex items-center gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Recurring Payment</DialogTitle>
                <DialogDescription>
                  Set up a new recurring payment to track automatically
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="paymentName">Payment Name</Label>
                  <Input id="paymentName" placeholder="e.g. Netflix, Rent" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" type="number" placeholder="15.99" />
                  </div>
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="nextDueDate">Next Due Date</Label>
                  <Input id="nextDueDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">Chase Checking</SelectItem>
                      <SelectItem value="sapphire">Chase Sapphire</SelectItem>
                      <SelectItem value="citi">Citi Double Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="housing">Housing</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="software">Software</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">Add Payment</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
                        <p className="text-sm text-muted-foreground">{payment.category} • {payment.frequency}</p>
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
                      <Button variant="outline" size="sm">
                        {payment.isAutomatic ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm">
                        Pay Now
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
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
                          {payment.category} • ${payment.amount} {payment.frequency.toLowerCase()}
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
    </div>
  );
};

export default RecurringPayments;