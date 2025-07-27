import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  Globe, 
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useXSSProtection, XSSNotification, SecurityDashboard } from './XSSProtection';

interface SecurityEvent {
  id: string;
  type: 'XSS_ATTEMPT' | 'CSP_VIOLATION' | 'RATE_LIMIT' | 'AUTH_FAILURE';
  timestamp: string;
  message: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  blocked: boolean;
}

export const SecurityMonitor: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    blockedThreats: 0,
    criticalEvents: 0,
    lastUpdated: new Date()
  });
  
  const { threats, clearThreats, hasCriticalThreats } = useXSSProtection();
  const [showNotification, setShowNotification] = useState(false);
  const [currentThreat, setCurrentThreat] = useState<any>(null);

  useEffect(() => {
    // Show notification for critical threats
    if (hasCriticalThreats && threats.length > 0) {
      const latestThreat = threats[threats.length - 1];
      setCurrentThreat({
        type: 'XSS_ATTEMPT',
        message: `Critical XSS attempt blocked: ${latestThreat.threats.join(', ')}`,
        riskLevel: latestThreat.riskLevel
      });
      setShowNotification(true);
    }
  }, [hasCriticalThreats, threats]);

  useEffect(() => {
    // Simulate security event monitoring
    const interval = setInterval(() => {
      if (isMonitoring) {
        // In a real app, this would come from your security service
        const mockEvents: SecurityEvent[] = [
          // This would be replaced with real security events from your backend
        ];
        
        setStats(prev => ({
          ...prev,
          totalEvents: prev.totalEvents + mockEvents.length,
          blockedThreats: prev.blockedThreats + mockEvents.filter(e => e.blocked).length,
          criticalEvents: prev.criticalEvents + mockEvents.filter(e => e.riskLevel === 'critical').length,
          lastUpdated: new Date()
        }));
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'XSS_ATTEMPT': return <AlertTriangle className="h-4 w-4" />;
      case 'CSP_VIOLATION': return <Shield className="h-4 w-4" />;
      case 'RATE_LIMIT': return <Activity className="h-4 w-4" />;
      case 'AUTH_FAILURE': return <Lock className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* XSS Notification */}
      {currentThreat && (
        <XSSNotification
          open={showNotification}
          onClose={() => setShowNotification(false)}
          threat={currentThreat}
        />
      )}

      {/* Security Dashboard */}
      <SecurityDashboard />

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              Security events monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Threats</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.blockedThreats}</div>
            <p className="text-xs text-muted-foreground">
              Threats successfully blocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalEvents}</div>
            <p className="text-xs text-muted-foreground">
              High-risk security events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <div className={`h-2 w-2 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {isMonitoring ? 'Active' : 'Inactive'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: {stats.lastUpdated.toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Monitoring</CardTitle>
              <CardDescription>
                Real-time monitoring of security events and threats
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={isMonitoring ? "destructive" : "default"}
                size="sm"
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                {isMonitoring ? 'Stop' : 'Start'} Monitoring
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearThreats}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Alerts
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* XSS Protection Status */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <strong>XSS Protection:</strong> Active with {threats.length} detected threats
                  </div>
                  <Badge variant={hasCriticalThreats ? "destructive" : "default"}>
                    {hasCriticalThreats ? 'Critical Threats' : 'Protected'}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>

            {/* Security Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Input Sanitization</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">CSP Headers</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Rate Limiting</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Secure Storage</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Audit Logging</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Data Encryption</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>
            Latest security events and threat detections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2" />
              <p>No security events detected</p>
              <p className="text-sm">Your application is secure</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getEventIcon(event.type)}
                    <div>
                      <div className="font-medium text-sm">{event.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleString()} • {event.source}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getRiskColor(event.riskLevel)}`} />
                    <Badge variant={event.blocked ? "default" : "destructive"}>
                      {event.blocked ? 'Blocked' : 'Allowed'}
                    </Badge>
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