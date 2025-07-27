import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RecurringPayment } from "@/types/recurringPayments";

interface RecurringPaymentCalendarProps {
  payments: RecurringPayment[];
  onAddPayment?: () => void;
}

export const RecurringPaymentCalendar = ({ payments, onAddPayment }: RecurringPaymentCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getPaymentsForDate = (date: Date) => {
    return payments.filter(payment => {
      const paymentDate = new Date(payment.nextDueDate);
      return isSameDay(date, paymentDate);
    });
  };

  const getDayTotal = (date: Date) => {
    const dayPayments = getPaymentsForDate(date);
    return dayPayments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "Housing": "hsl(var(--primary))",
      "Entertainment": "hsl(var(--accent))",
      "Health": "hsl(var(--success))",
      "Insurance": "hsl(var(--warning))",
      "Software": "hsl(190 60% 50%)",
      "Utilities": "hsl(var(--destructive))",
      "Transportation": "hsl(30 60% 50%)",
      "Food": "hsl(60 60% 50%)"
    };
    return colors[category] || "hsl(var(--muted))";
  };

  const selectedDatePayments = selectedDate ? getPaymentsForDate(selectedDate) : [];

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Payment Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayPayments = getPaymentsForDate(day);
              const dayTotal = getDayTotal(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const hasPayments = dayPayments.length > 0;

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[80px] p-1 border border-border/20 rounded-md cursor-pointer transition-colors",
                    isCurrentMonth ? "bg-background" : "bg-muted/20",
                    isToday && "ring-2 ring-primary ring-offset-1",
                    hasPayments && "hover:bg-accent/50",
                    selectedDate && isSameDay(day, selectedDate) && "bg-accent"
                  )}
                  onClick={() => {
                    setSelectedDate(day);
                    if (hasPayments) setShowDetails(true);
                  }}
                >
                  <div className="flex flex-col h-full">
                    <div className={cn(
                      "text-sm font-medium",
                      isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {format(day, 'd')}
                    </div>
                    
                    {hasPayments && (
                      <div className="flex-1 space-y-1 mt-1">
                        {dayPayments.slice(0, 2).map((payment, index) => (
                          <div
                            key={payment.id}
                            className="text-xs p-1 rounded text-white truncate"
                            style={{ backgroundColor: getCategoryColor(payment.category) }}
                          >
                            ${payment.amount}
                          </div>
                        ))}
                        
                        {dayPayments.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayPayments.length - 2} more
                          </div>
                        )}
                        
                        {dayTotal > 0 && (
                          <div className="text-xs font-medium text-foreground mt-auto">
                            Total: ${dayTotal.toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border/20">
            <div className="text-sm text-muted-foreground">Categories:</div>
            {Array.from(new Set(payments.map(p => p.category))).map((category) => (
              <Badge 
                key={category} 
                variant="secondary" 
                className="text-white"
                style={{ backgroundColor: getCategoryColor(category) }}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Payment Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Payments for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedDatePayments.length} payment{selectedDatePayments.length !== 1 ? 's' : ''} scheduled
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedDatePayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getCategoryColor(payment.category) }}
                  />
                  <div>
                    <p className="font-medium">{payment.name}</p>
                    <p className="text-sm text-muted-foreground">{payment.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${payment.amount}</p>
                  <Badge variant={payment.isAutomatic ? "default" : "secondary"}>
                    {payment.isAutomatic ? "Auto" : "Manual"}
                  </Badge>
                </div>
              </div>
            ))}
            
            {selectedDatePayments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No payments scheduled for this date</p>
                {onAddPayment && (
                  <Button variant="outline" className="mt-2" onClick={onAddPayment}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};