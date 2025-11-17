import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import type { ShiftFlowCardProps } from "../types/shiftViewTypes";

export function ShiftFlowCard({}: ShiftFlowCardProps) {
  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="flex gap-3">
        <div>📋</div>
        <div className="space-y-2 flex-1">
          <h4>シフト生成フロー</h4>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline" className="bg-card">
              ①希望休提出
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="bg-card">
              ②AI生成
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge className="bg-warning text-white">③仮確定・追加調整</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="bg-card">
              ④最終確定
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge className="bg-success text-white">⑤実績報告</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
