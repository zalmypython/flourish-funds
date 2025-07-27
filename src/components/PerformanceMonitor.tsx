import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { Activity, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMonitorProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function PerformanceMonitor({ 
  showDetails: initialShowDetails = false, 
  autoRefresh = true,
  refreshInterval = 5000 
}: PerformanceMonitorProps) {
  const [summary, setSummary] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(process.env.NODE_ENV === 'development');
  const [showDetails, setShowDetails] = useState(initialShowDetails);

  useEffect(() => {
    const updateSummary = () => {
      const newSummary = performanceMonitor.getPerformanceSummary();
      setSummary(newSummary);
    };

    updateSummary();

    if (autoRefresh) {
      const interval = setInterval(updateSummary, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Only show in development or when explicitly enabled
  if (!isVisible || !summary) return null;

  const getPerformanceStatus = () => {
    if (summary.avgRenderTime > 16 || summary.longTasks > 5) {
      return { status: 'poor', color: 'destructive', icon: AlertTriangle };
    }
    if (summary.avgRenderTime > 8 || summary.longTasks > 2) {
      return { status: 'fair', color: 'warning', icon: Activity };
    }
    return { status: 'good', color: 'success', icon: CheckCircle };
  };

  const { status, color, icon: StatusIcon } = getPerformanceStatus();

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-background/95 backdrop-blur-sm border shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            <CardTitle className="text-sm">Performance Monitor</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={color as any} className="text-xs">
              {status.toUpperCase()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          Real-time performance metrics
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Avg Render</div>
            <div className="font-mono">
              {summary.avgRenderTime?.toFixed(1) || '0'}ms
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg API</div>
            <div className="font-mono">
              {summary.avgApiTime?.toFixed(0) || '0'}ms
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Long Tasks</div>
            <div className="font-mono">{summary.longTasks || 0}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Layout Shifts</div>
            <div className="font-mono">{summary.layoutShifts || 0}</div>
          </div>
        </div>

        {showDetails && (
          <>
            {summary.memoryUsage && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Memory Usage: {(summary.memoryUsage / 1048576).toFixed(1)}MB
                </div>
                <Progress 
                  value={(summary.memoryUsage / (50 * 1048576)) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {summary.bundleSize && (
              <div className="text-xs">
                <span className="text-muted-foreground">Bundle Size: </span>
                <span className="font-mono">
                  {(summary.bundleSize / 1024).toFixed(1)}KB
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              performanceMonitor.measureMemoryUsage();
              performanceMonitor.measureBundleSize();
              setSummary(performanceMonitor.getPerformanceSummary());
            }}
            className="text-xs h-6"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(prev => !prev)}
            className="text-xs h-6"
          >
            {showDetails ? 'Less' : 'More'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook to show performance monitor only in development
export function useDevPerformanceMonitor() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Add performance monitor to body
      const container = document.createElement('div');
      container.id = 'performance-monitor';
      document.body.appendChild(container);

      return () => {
        const element = document.getElementById('performance-monitor');
        if (element) {
          document.body.removeChild(element);
        }
      };
    }
  }, []);
}