import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, Target, Zap } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'savings' | 'budget' | 'transaction' | 'goal';
  earned: boolean;
  earnedDate?: string;
  progress?: number;
  maxProgress?: number;
}

interface AchievementsCenterProps {
  className?: string;
}

export const AchievementsCenter = ({ className }: AchievementsCenterProps) => {
  // Mock achievements data - in real app, this would come from a hook/API
  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'First Transaction',
      description: 'Record your first transaction',
      type: 'transaction',
      earned: true,
      earnedDate: '2024-01-15'
    },
    {
      id: '2',
      title: 'Budget Master',
      description: 'Stay under budget for 3 months',
      type: 'budget',
      earned: true,
      earnedDate: '2024-03-20'
    },
    {
      id: '3',
      title: 'Savings Goal Achiever',
      description: 'Complete your first savings goal',
      type: 'goal',
      earned: false,
      progress: 75,
      maxProgress: 100
    },
    {
      id: '4',
      title: 'Transaction Tracker',
      description: 'Record 100 transactions',
      type: 'transaction',
      earned: false,
      progress: 67,
      maxProgress: 100
    },
    {
      id: '5',
      title: 'Emergency Fund Builder',
      description: 'Save $10,000 in emergency fund',
      type: 'savings',
      earned: false,
      progress: 4500,
      maxProgress: 10000
    }
  ];

  const earnedAchievements = achievements.filter(a => a.earned);
  const inProgressAchievements = achievements.filter(a => !a.earned && a.progress);
  const lockedAchievements = achievements.filter(a => !a.earned && !a.progress);

  const getTypeIcon = (type: Achievement['type']) => {
    switch (type) {
      case 'savings': return Target;
      case 'budget': return CheckCircle;
      case 'transaction': return Zap;
      case 'goal': return Target;
      default: return CheckCircle;
    }
  };

  const getTypeColor = (type: Achievement['type']) => {
    switch (type) {
      case 'savings': return 'text-success';
      case 'budget': return 'text-primary';
      case 'transaction': return 'text-warning';
      case 'goal': return 'text-accent';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className={`shadow-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          Achievements
        </CardTitle>
        <CardDescription>
          Track your financial milestones and celebrate your progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-success">{earnedAchievements.length}</p>
            <p className="text-sm text-muted-foreground">Earned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{inProgressAchievements.length}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-muted-foreground">{lockedAchievements.length}</p>
            <p className="text-sm text-muted-foreground">Locked</p>
          </div>
        </div>

        {/* Earned Achievements */}
        {earnedAchievements.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Recent Achievements</h4>
            {earnedAchievements.slice(0, 3).map(achievement => {
              const IconComponent = getTypeIcon(achievement.type);
              return (
                <div key={achievement.id} className="flex items-center gap-3 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <div className={`p-2 rounded-lg bg-success/20 ${getTypeColor(achievement.type)}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{achievement.title}</p>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    {achievement.earnedDate && (
                      <p className="text-xs text-success mt-1">
                        Earned {new Date(achievement.earnedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
              );
            })}
          </div>
        )}

        {/* In Progress Achievements */}
        {inProgressAchievements.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">In Progress</h4>
            {inProgressAchievements.map(achievement => {
              const IconComponent = getTypeIcon(achievement.type);
              const progressPercentage = achievement.progress && achievement.maxProgress 
                ? (achievement.progress / achievement.maxProgress) * 100 
                : 0;
              
              return (
                <div key={achievement.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className={`p-2 rounded-lg bg-primary/10 ${getTypeColor(achievement.type)}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{achievement.title}</p>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    <div className="mt-2 space-y-1">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{achievement.progress?.toLocaleString()}</span>
                        <span>{achievement.maxProgress?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{progressPercentage.toFixed(0)}%</Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Coming Up</h4>
            {lockedAchievements.slice(0, 2).map(achievement => {
              const IconComponent = getTypeIcon(achievement.type);
              return (
                <div key={achievement.id} className="flex items-center gap-3 p-3 border border-dashed rounded-lg opacity-60">
                  <div className="p-2 rounded-lg bg-muted">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-muted-foreground">{achievement.title}</p>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};