import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/hooks/useFirestore";
import { AuthModal } from "@/components/AuthModal";
import { EnhancedCreditCardForm } from "@/components/EnhancedCreditCardForm";
import { useAuth } from "@/hooks/useAuth";
import { useAccountBalance } from "@/hooks/useAccountBalance";
import { CreditCard } from "@/types";
import { 
  Plus, 
  CreditCard as CreditCardIcon, 
  AlertTriangle,
  Calendar,
  Percent,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  LogIn,
  RotateCcw,
  Archive,
  Building2,
  TrendingUp,
  Award,
  DollarSign
} from "lucide-react";


const CreditCards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { documents: cards, loading, addDocument, updateDocument, deleteDocument } = useFirestore<CreditCard>("creditCards");
  const { calculateAccountBalance, getAccountTransactionSummary } = useAccountBalance();
  const [showBalances, setShowBalances] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [currentView, setCurrentView] = useState<'grid' | 'company'>('grid');

  const { toast } = useToast();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Credit Cards</h1>
          <p className="text-muted-foreground mb-6">Sign in to manage your credit cards</p>
          <Button onClick={() => setIsAuthModalOpen(true)} className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>
        </div>
        <AuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
      </div>
    );
  }

  const activeCards = cards.filter(card => card.isActive);
  const inactiveCards = cards.filter(card => !card.isActive);

  const handleDeactivateCard = async (cardId: string) => {
    try {
      await updateDocument(cardId, { 
        isActive: false
      });
      toast({
        title: "Card Deactivated",
        description: "Credit card has been deactivated. You can restore it anytime."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRestoreCard = async (cardId: string) => {
    try {
      await updateDocument(cardId, { 
        isActive: true
      });
      toast({
        title: "Card Restored",
        description: "Credit card has been reactivated successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const totalBalance = activeCards.reduce((sum, card) => {
    const currentBalance = calculateAccountBalance(card.id, 'credit', card.initialBalance);
    return sum + currentBalance;
  }, 0);
  const totalLimit = activeCards.reduce((sum, card) => sum + card.limit, 0);
  const utilization = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;
  const activeBonuses = activeCards.flatMap(card => card.bonuses || []).filter(bonus => bonus.status === 'in_progress');
  const completedBonuses = activeCards.flatMap(card => card.bonuses || []).filter(bonus => bonus.status === 'completed');

  // Group cards by issuer for company view
  const cardsByIssuer = activeCards.reduce((acc, card) => {
    if (!acc[card.issuer]) {
      acc[card.issuer] = [];
    }
    acc[card.issuer].push(card);
    return acc;
  }, {} as Record<string, CreditCard[]>);

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 30) return "text-success";
    if (utilization < 70) return "text-warning";
    return "text-destructive";
  };

  const getBonusStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return "bg-success text-success-foreground";
      case 'in_progress': return "bg-warning text-warning-foreground";
      case 'paid_out': return "bg-primary text-primary-foreground";
      case 'expired': return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCardTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "travel": return "bg-primary text-primary-foreground";
      case "cashback": return "bg-accent text-accent-foreground";
      case "rewards": return "bg-success text-success-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleAddCard = async (cardData: Partial<CreditCard>) => {
    try {
      await addDocument({
        ...cardData,
        initialBalance: 0,
        currentBalance: 0,
        lastBalanceUpdate: new Date().toISOString(),
        accountStatus: 'active' as const
      } as Omit<CreditCard, 'id' | 'userId' | 'createdAt' | 'updatedAt'>);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleEditCard = async (cardData: Partial<CreditCard>) => {
    if (!editingCard) return;
    
    try {
      await updateDocument(editingCard.id, cardData);
      setEditingCard(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    await deleteDocument(cardId);
  };

  const handleToggleCardStatus = async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      await updateDocument(cardId, { isActive: !card.isActive });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your credit cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Credit Cards</h1>
          <p className="text-muted-foreground mt-1">Track credit cards, balances, and rewards</p>
        </div>
        <div className="flex items-center gap-4">
          {inactiveCards.length > 0 && (
            <Button
              variant={showInactive ? "default" : "outline"}
              onClick={() => setShowInactive(!showInactive)}
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              {showInactive ? 'Hide' : 'Show'} Inactive Cards ({inactiveCards.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowBalances(!showBalances)}
            className="gap-2"
          >
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showBalances ? "Hide" : "Show"} Balances
          </Button>
          <div className="flex gap-2">
            <Button 
              variant={currentView === 'grid' ? 'default' : 'outline'}
              onClick={() => setCurrentView('grid')}
              size="sm"
            >
              Grid View
            </Button>
            <Button 
              variant={currentView === 'company' ? 'default' : 'outline'}
              onClick={() => setCurrentView('company')}
              size="sm"
            >
              <Building2 className="h-4 w-4 mr-2" />
              By Company
            </Button>
            <Button 
              className="bg-gradient-primary text-primary-foreground hover:scale-105 shadow-elegant"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {showBalances ? `$${totalBalance.toLocaleString()}` : "••••••"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Across {activeCards.length} cards</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credit Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${getUtilizationColor(utilization)}`}>
              {utilization.toFixed(1)}%
            </p>
            <Progress value={utilization} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">
              {showBalances ? `$${(totalLimit - totalBalance).toLocaleString()}` : "••••••"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total limit: ${totalLimit.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Bonuses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">
              {activeBonuses.length}
            </p>
            <p className="text-sm text-muted-foreground mt-1">In progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Cards */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">Active Cards</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeCards.map((card) => {
            const currentBalance = calculateAccountBalance(card.id, 'credit', card.initialBalance);
            const cardUtilization = (currentBalance / card.limit) * 100;
            return (
              <Card key={card.id} className="shadow-card border-border/50 hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getCardTypeColor(card.type)}`}>
                        <CreditCardIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{card.name}</CardTitle>
                        <CardDescription>{card.issuer} • {card.type}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleDeactivateCard(card.id)}>
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <span className="text-sm text-muted-foreground">
                        {showBalances ? `$${currentBalance.toLocaleString()} / $${card.limit.toLocaleString()}` : "•••••• / ••••••"}
                      </span>
                    </div>
                    <Progress value={cardUtilization} className="h-2" />
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-sm font-medium ${getUtilizationColor(cardUtilization)}`}>
                        {cardUtilization.toFixed(1)}% utilization
                      </span>
                      {cardUtilization > 70 && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-xs">High utilization</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(card.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Interest Rate</p>
                      <p className="font-medium flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {card.interestRate}%
                      </p>
                    </div>
                  </div>

                  {card.bonuses.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">Sign-up Bonuses</p>
                      <div className="space-y-2">
                        {card.bonuses.map((bonus) => (
                          <div key={bonus.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                            <div>
                              <p className="text-sm font-medium">{bonus.description}</p>
                              {bonus.requirement && (
                                <p className="text-xs text-muted-foreground">{bonus.requirement}</p>
                              )}
                            </div>
                            <Badge className={getBonusStatusColor(bonus.status)}>
                              {bonus.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Make Payment
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => window.location.href = `/credit-cards/${card.id}`}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Inactive Cards */}
      {showInactive && inactiveCards.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Inactive Cards</h2>
          <div className="space-y-3">
            {inactiveCards.map((card) => (
              <Card key={card.id} className="shadow-card border-border/50 opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getCardTypeColor(card.type)} opacity-50`}>
                        <CreditCardIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{card.name}</h3>
                        <p className="text-sm text-muted-foreground">{card.issuer} • {card.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant="secondary">Inactive</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Limit: ${card.limit.toLocaleString()}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRestoreCard(card.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Form Dialogs */}
      <EnhancedCreditCardForm 
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddCard}
      />
      
      <EnhancedCreditCardForm 
        open={!!editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        onSubmit={handleEditCard}
        editCard={editingCard}
      />
    </div>
  );
};

export default CreditCards;