import { Clock, Check, X, Sparkles } from "lucide-react";
import { Card } from "../ui/card";

interface StatsCardsProps {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  additionalCount: number;
}

export function StatsCards({ pendingCount, approvedCount, rejectedCount, additionalCount }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-6 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">未承認</p>
            <h2 className="text-warning">{pendingCount}件</h2>
          </div>
          <div className="bg-warning/20 p-3 rounded-xl">
            <Clock className="w-6 h-6 text-warning" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">承認済</p>
            <h2 className="text-success">{approvedCount}件</h2>
          </div>
          <div className="bg-success/20 p-3 rounded-xl">
            <Check className="w-6 h-6 text-success" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">却下</p>
            <h2 className="text-destructive">{rejectedCount}件</h2>
          </div>
          <div className="bg-destructive/20 p-3 rounded-xl">
            <X className="w-6 h-6 text-destructive" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">追加希望</p>
            <h2 className="text-blue-700">{additionalCount}件</h2>
          </div>
          <div className="bg-blue-500/20 p-3 rounded-xl">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </Card>
    </div>
  );
}
