import React from 'react';
import { logger } from './logger';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observations: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;

    // Long Task Observer
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) {
              this.recordMetric('long-task', entry.duration, {
                startTime: entry.startTime,
                name: entry.name
              });
              
              logger.warn('Long task detected', {
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observations.push(longTaskObserver);
      } catch (e) {
        // Long task API not supported
      }

      // Layout Shift Observer
      try {
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (entry.value > 0.1) {
              this.recordMetric('cumulative-layout-shift', entry.value, {
                sources: entry.sources?.map((s: any) => s.node?.outerHTML?.slice(0, 100))
              });
              
              logger.warn('Layout shift detected', {
                value: entry.value,
                hadRecentInput: entry.hadRecentInput
              });
            }
          });
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observations.push(clsObserver);
      } catch (e) {
        // CLS API not supported
      }

      // First Input Delay Observer
      try {
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            this.recordMetric('first-input-delay', entry.processingStart - entry.startTime, {
              processingStart: entry.processingStart,
              startTime: entry.startTime
            });
            
            logger.info('First input delay recorded', {
              fid: entry.processingStart - entry.startTime
            });
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observations.push(fidObserver);
      } catch (e) {
        // FID API not supported
      }
    }
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: performance.now(),
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    logger.trackPerformance(name, value, metadata);
  }

  // React component render timing
  measureRender<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    const result = renderFn();
    const duration = performance.now() - startTime;
    
    this.recordMetric('component-render', duration, {
      component: componentName
    });

    if (duration > 16) { // More than one frame
      logger.warn('Slow component render', {
        component: componentName,
        duration
      });
    }

    return result;
  }

  // API call timing
  measureApiCall<T>(endpoint: string, requestFn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    return requestFn().then(
      (result) => {
        const duration = performance.now() - startTime;
        this.recordMetric('api-call', duration, {
          endpoint,
          success: true
        });
        return result;
      },
      (error) => {
        const duration = performance.now() - startTime;
        this.recordMetric('api-call', duration, {
          endpoint,
          success: false,
          error: error.message
        });
        throw error;
      }
    );
  }

  // Memory usage monitoring
  measureMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('memory-usage', memory.usedJSHeapSize, {
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      });
    }
  }

  // Bundle size tracking
  measureBundleSize() {
    if ('getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalSize = 0;
      
      resources.forEach((resource) => {
        if (resource.transferSize) {
          totalSize += resource.transferSize;
        }
      });
      
      this.recordMetric('bundle-size', totalSize);
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    const summary = {
      avgRenderTime: this.getAverageMetric('component-render'),
      avgApiTime: this.getAverageMetric('api-call'),
      longTasks: this.metrics.filter(m => m.name === 'long-task').length,
      layoutShifts: this.metrics.filter(m => m.name === 'cumulative-layout-shift').length,
      memoryUsage: this.getLatestMetric('memory-usage'),
      bundleSize: this.getLatestMetric('bundle-size')
    };

    logger.info('Performance summary', summary);
    return summary;
  }

  private getAverageMetric(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.value, 0);
    return total / metrics.length;
  }

  private getLatestMetric(name: string): number | null {
    const metrics = this.metrics.filter(m => m.name === name);
    return metrics.length > 0 ? metrics[metrics.length - 1].value : null;
  }

  // Cleanup observers
  disconnect() {
    this.observations.forEach(observer => observer.disconnect());
    this.observations = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric('component-lifecycle', duration, {
        component: componentName
      });
    };
  }, [componentName]);

  return {
    measureRender: (renderFn: () => any) => 
      performanceMonitor.measureRender(componentName, renderFn),
    recordMetric: (name: string, value: number, metadata?: any) =>
      performanceMonitor.recordMetric(name, value, { component: componentName, ...metadata })
  };
}
