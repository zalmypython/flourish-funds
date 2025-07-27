import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, Smartphone, CreditCard, AlertTriangle, Gift } from 'lucide-react';
import { NotificationPreferences } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferencesProps {
  onSave?: (preferences: NotificationPreferences) => void;
}

export default function NotificationPreferencesComponent({ onSave }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<Partial<NotificationPreferences>>({
    emailNotifications: true,
    pushNotifications: false,
    balanceReminders: true,
    paymentReminders: true,
    bonusAlerts: true,
    utilizationWarnings: true,
    reminderDays: [7, 3, 1],
    notificationTime: '09:00'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleReminderDayChange = (day: number, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      reminderDays: checked 
        ? [...(prev.reminderDays || []), day].sort((a, b) => b - a)
        : (prev.reminderDays || []).filter(d => d !== day)
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // API call to save preferences would go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated successfully.',
      });
      
      onSave?.(preferences as NotificationPreferences);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    toast({
      title: 'Test notification sent',
      description: 'Check your email for a test notification.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Notification Preferences</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Delivery Methods */}
        <div>
          <h3 className="text-lg font-medium mb-4">Delivery Methods</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                </div>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => handleToggle('emailNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive browser push notifications</p>
                </div>
              </div>
              <Switch
                checked={preferences.pushNotifications}
                onCheckedChange={(checked) => handleToggle('pushNotifications', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Notification Types */}
        <div>
          <h3 className="text-lg font-medium mb-4">Notification Types</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Payment Reminders</Label>
                  <p className="text-xs text-muted-foreground">Alerts for upcoming payment due dates</p>
                </div>
              </div>
              <Switch
                checked={preferences.paymentReminders}
                onCheckedChange={(checked) => handleToggle('paymentReminders', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Balance Reminders</Label>
                  <p className="text-xs text-muted-foreground">Notifications for outstanding balances</p>
                </div>
              </div>
              <Switch
                checked={preferences.balanceReminders}
                onCheckedChange={(checked) => handleToggle('balanceReminders', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Utilization Warnings</Label>
                  <p className="text-xs text-muted-foreground">Alerts when credit utilization is high</p>
                </div>
              </div>
              <Switch
                checked={preferences.utilizationWarnings}
                onCheckedChange={(checked) => handleToggle('utilizationWarnings', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Bonus Alerts</Label>
                  <p className="text-xs text-muted-foreground">Updates on credit card bonuses and rewards</p>
                </div>
              </div>
              <Switch
                checked={preferences.bonusAlerts}
                onCheckedChange={(checked) => handleToggle('bonusAlerts', checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Timing Settings */}
        <div>
          <h3 className="text-lg font-medium mb-4">Timing Settings</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Payment Reminder Days</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Send payment reminders this many days before due date
              </p>
              <div className="flex gap-2 flex-wrap">
                {[14, 7, 5, 3, 1].map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={preferences.reminderDays?.includes(day) || false}
                      onCheckedChange={(checked) => handleReminderDayChange(day, checked as boolean)}
                    />
                    <Label htmlFor={`day-${day}`} className="text-sm">
                      {day} day{day !== 1 ? 's' : ''}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="notification-time" className="text-sm font-medium">
                Preferred Notification Time
              </Label>
              <Select
                value={preferences.notificationTime}
                onValueChange={(value) => setPreferences(prev => ({ ...prev, notificationTime: value }))}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="06:00">6:00 AM</SelectItem>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="14:00">2:00 PM</SelectItem>
                  <SelectItem value="16:00">4:00 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                  <SelectItem value="20:00">8:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Email Settings */}
        {preferences.emailNotifications && (
          <div>
            <h3 className="text-lg font-medium mb-4">Email Settings</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="email-address" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email-address"
                  type="email"
                  placeholder="your.email@example.com"
                  value={preferences.emailAddress || ''}
                  onChange={(e) => setPreferences(prev => ({ ...prev, emailAddress: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
              >
                Send Test Email
              </Button>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}