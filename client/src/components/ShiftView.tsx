import { useState } from "react";
import { Clock, MessageSquare, AlertCircle, CheckCircle2, Edit3, FileText } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { toast } from "sonner";

interface ShiftDay {
  date: string;
  day: number;
  shiftType: "早番" | "遅番" | "夜勤" | "休み";
  time: string;
  status: "tentative" | "confirmed" | "completed";
  actualTime?: string; // 実際の勤務時間
  reportStatus?: "not_reported" | "reported" | "approved";
}

export function ShiftView() {
  const [activeTab, setActiveTab] = useState("tentative");
  const [showAdditionalRequestDialog, setShowAdditionalRequestDialog] = useState(false);
  const [showActualReportDialog, setShowActualReportDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftDay | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [actualStartTime, setActualStartTime] = useState("");
  const [actualEndTime, setActualEndTime] = useState("");
  const [reportNote, setReportNote] = useState("");
  
  // 仮確定後の追加希望締め切り（モック）
  const additionalRequestDeadline = new Date("2025-11-20T23:59:59");
  const canRequestAdditional = new Date() < additionalRequestDeadline;
  
  // 実績報告期限（モック）
  const actualReportDeadline = new Date("2025-11-10T23:59:59");
  const canReportActual = new Date() < actualReportDeadline;
  
  const handleRequestAdditional = (shift: ShiftDay) => {
    setSelectedShift(shift);
    setRequestReason("");
    setShowAdditionalRequestDialog(true);
  };
  
  const handleReportActual = (shift: ShiftDay) => {
    setSelectedShift(shift);
    // 予定時間から初期値を設定
    const [start, end] = shift.time.split("-");
    setActualStartTime(start);
    setActualEndTime(end);
    setReportNote("");
    setShowActualReportDialog(true);
  };
  
  const handleSubmitAdditionalRequest = () => {
    if (!requestReason.trim()) {
      toast.error("理由を入力してください");
      return;
    }
    
    toast.success("追加の希望休申請を送信しました", {
      description: "管理者が確認後、調整します"
    });
    setShowAdditionalRequestDialog(false);
    setSelectedShift(null);
    setRequestReason("");
  };
  
  const handleSubmitActualReport = () => {
    if (!actualStartTime || !actualEndTime) {
      toast.error("実際の勤務時間を入力してください");
      return;
    }
    
    toast.success("勤務実績を報告しました", {
      description: "管理者が確認後、承認されます"
    });
    setShowActualReportDialog(false);
    setSelectedShift(null);
    setActualStartTime("");
    setActualEndTime("");
    setReportNote("");
  };

  // Mock shift data
  const tentativeShifts: ShiftDay[] = [
    { date: "11/10", day: 10, shiftType: "早番", time: "8:00-17:00", status: "tentative" },
    { date: "11/11", day: 11, shiftType: "遅番", time: "10:00-19:00", status: "tentative" },
    { date: "11/12", day: 12, shiftType: "休み", time: "-", status: "tentative" },
    { date: "11/13", day: 13, shiftType: "早番", time: "8:00-17:00", status: "tentative" },
    { date: "11/14", day: 14, shiftType: "夜勤", time: "17:00-翌9:00", status: "tentative" },
    { date: "11/15", day: 15, shiftType: "休み", time: "-", status: "tentative" },
  ];

  const confirmedShifts: ShiftDay[] = [
    { date: "11/16", day: 16, shiftType: "早番", time: "8:00-17:00", status: "confirmed" },
    { date: "11/17", day: 17, shiftType: "遅番", time: "10:00-19:00", status: "confirmed" },
    { date: "11/18", day: 18, shiftType: "休み", time: "-", status: "confirmed" },
    { date: "11/19", day: 19, shiftType: "早番", time: "8:00-17:00", status: "confirmed" },
    { date: "11/20", day: 20, shiftType: "夜勤", time: "17:00-翌9:00", status: "confirmed" },
  ];

  const completedShifts: ShiftDay[] = [
    { date: "11/1", day: 1, shiftType: "早番", time: "8:00-17:00", status: "completed", actualTime: "8:00-17:00", reportStatus: "approved" },
    { date: "11/2", day: 2, shiftType: "遅番", time: "10:00-19:00", status: "completed", actualTime: "10:00-19:30", reportStatus: "approved" },
    { date: "11/3", day: 3, shiftType: "休み", time: "-", status: "completed", reportStatus: "approved" },
    { date: "11/4", day: 4, shiftType: "早番", time: "8:00-17:00", status: "completed", actualTime: "8:00-17:00", reportStatus: "not_reported" },
    { date: "11/5", day: 5, shiftType: "夜勤", time: "17:00-翌9:00", status: "completed", actualTime: "17:00-翌9:15", reportStatus: "reported" },
  ];

  const getShiftColor = (shiftType: string) => {
    switch (shiftType) {
      case "早番": return "bg-gradient-to-br from-secondary/30 to-secondary/50 border-secondary";
      case "遅番": return "bg-gradient-to-br from-warning/30 to-warning/50 border-warning";
      case "夜勤": return "bg-gradient-to-br from-primary/30 to-primary/50 border-primary";
      case "休み": return "bg-gradient-to-br from-success/20 to-success/30 border-success";
      default: return "bg-card";
    }
  };

  const getShiftIcon = (shiftType: string) => {
    switch (shiftType) {
      case "早番": return "🌅";
      case "遅番": return "☀️";
      case "夜勤": return "🌙";
      case "休み": return "🌸";
      default: return "";
    }
  };

  const getReportStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success text-white"><CheckCircle2 className="w-3 h-3 mr-1" />承認済</Badge>;
      case "reported":
        return <Badge variant="outline" className="border-blue-500 text-blue-600">確認中</Badge>;
      case "not_reported":
        return <Badge variant="outline" className="border-warning text-warning">未報告</Badge>;
      default:
        return null;
    }
  };

  const ShiftCard = ({ shift, showActions = false, showReport = false }: { shift: ShiftDay; showActions?: boolean; showReport?: boolean }) => (
    <Card className={`p-4 ${getShiftColor(shift.shiftType)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-2xl">{getShiftIcon(shift.shiftType)}</div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4>{shift.date}</h4>
              <Badge variant="outline" className="bg-card/50">
                {shift.shiftType}
              </Badge>
              {showReport && getReportStatusBadge(shift.reportStatus)}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>予定: {shift.time}</span>
            </div>
            {shift.actualTime && shift.actualTime !== shift.time && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-success">実績: {shift.actualTime}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {showActions && canRequestAdditional && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl"
              onClick={() => handleRequestAdditional(shift)}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}
          {showReport && shift.shiftType !== "休み" && shift.reportStatus !== "approved" && canReportActual && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl"
              onClick={() => handleReportActual(shift)}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h2>シフト確認</h2>
            <p className="text-muted-foreground">今月のシフト表</p>
          </div>
        </div>

        {/* フロー説明カード */}
        <Card className="p-4 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
          <div className="flex gap-3">
            <div>📋</div>
            <div className="space-y-2 flex-1">
              <h4>シフト生成フロー</h4>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline" className="bg-card">①希望休提出</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-card">②AI生成</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge className="bg-warning text-white">③仮確定・追加調整</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="outline" className="bg-card">④最終確定</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge className="bg-success text-white">⑤実績報告</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="tentative" className="rounded-xl text-xs">
              仮確定
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="rounded-xl text-xs">
              確定
            </TabsTrigger>
            <TabsTrigger value="actual" className="rounded-xl text-xs">
              実績報告
            </TabsTrigger>
          </TabsList>

          {/* 仮確定シフト（追加調整） */}
          <TabsContent value="tentative" className="space-y-4 mt-6">
            <Card className="p-4 bg-warning/10 border-warning/30">
              <div className="flex gap-3">
                <div className="text-warning text-xl">⚡</div>
                <div className="space-y-2 flex-1">
                  <h4>仮確定シフト（追加調整）</h4>
                  <p className="text-sm text-muted-foreground">
                    管理者が作成したシフト案です。<strong className="text-warning">やむを得ない理由</strong>で休みが必要になった場合は、右上の<MessageSquare className="w-3 h-3 inline mx-1" />アイコンから追加希望を申請できます。
                  </p>
                  <div className="p-2 bg-card rounded-lg text-xs text-muted-foreground">
                    💡 通常の希望休とは異なり、仮確定後の緊急対応です
                  </div>
                </div>
              </div>
            </Card>
            
            {canRequestAdditional && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex gap-3">
                  <div>⏰</div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm">追加希望の締め切り</h4>
                    <p className="text-sm text-muted-foreground">
                      {additionalRequestDeadline.toLocaleDateString("ja-JP", {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}まで
                    </p>
                  </div>
                  <Badge variant="outline" className="h-fit">
                    受付中
                  </Badge>
                </div>
              </Card>
            )}

            <div className="space-y-3">
              {tentativeShifts.map((shift) => (
                <ShiftCard key={shift.day} shift={shift} showActions={true} />
              ))}
            </div>
          </TabsContent>

          {/* 確定シフト */}
          <TabsContent value="confirmed" className="space-y-4 mt-6">
            <Card className="p-4 bg-success/10 border-success/30">
              <div className="flex gap-3">
                <div className="text-success text-xl">✅</div>
                <div className="space-y-2">
                  <h4>確定シフト</h4>
                  <p className="text-sm text-muted-foreground">
                    こちらは最終確定済みのシフトです。このシフトに従って勤務してください。勤務後は「実績報告」タブから実際の勤務時間を報告します。
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-3">
              {confirmedShifts.map((shift) => (
                <ShiftCard key={shift.day} shift={shift} />
              ))}
            </div>
          </TabsContent>

          {/* 実績報告 */}
          <TabsContent value="actual" className="space-y-4 mt-6">
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex gap-3">
                <div className="text-purple-600 text-xl">📝</div>
                <div className="space-y-2 flex-1">
                  <h4>勤務実績報告</h4>
                  <p className="text-sm text-muted-foreground">
                    勤務が終了したら、実際の勤務時間を報告してください。予定と異なる場合は右上の<Edit3 className="w-3 h-3 inline mx-1" />アイコンから修正できます。
                  </p>
                  <div className="p-2 bg-card rounded-lg text-xs text-muted-foreground">
                    💡 残業や早退などがあった場合は、実際の時間を正確に報告してください
                  </div>
                </div>
              </div>
            </Card>

            {canReportActual && (
              <Card className="p-4 bg-amber-50 border-amber-200">
                <div className="flex gap-3">
                  <div>⏰</div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm">実績報告の締め切り</h4>
                    <p className="text-sm text-muted-foreground">
                      {actualReportDeadline.toLocaleDateString("ja-JP", {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}まで
                    </p>
                  </div>
                  <Badge variant="outline" className="h-fit">
                    受付中
                  </Badge>
                </div>
              </Card>
            )}

            <div className="space-y-3">
              {completedShifts.map((shift) => (
                <ShiftCard key={shift.day} shift={shift} showReport={true} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Summary */}
        <Card className="p-6 bg-gradient-to-br from-secondary/10 to-accent/10">
          <h4 className="mb-4">今月の勤務予定</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-muted-foreground">早番</p>
              <h3>8日</h3>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">遅番</p>
              <h3>6日</h3>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">夜勤</p>
              <h3>4日</h3>
            </div>
          </div>
        </Card>
      </div>
      
      {/* 追加希望申請ダイアログ */}
      <Dialog open={showAdditionalRequestDialog} onOpenChange={setShowAdditionalRequestDialog}>
        <DialogContent className="max-w-md mx-4 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-warning" />
              追加の希望休申請
            </DialogTitle>
            <DialogDescription>
              仮確定後のやむを得ない事情による追加希望を申請します
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm">申請内容</h4>
                  {selectedShift && (
                    <p className="text-sm text-muted-foreground">
                      {selectedShift.date} ({selectedShift.shiftType} {selectedShift.time})
                      <br />
                      この日を休みにする追加希望を申請します
                    </p>
                  )}
                </div>
              </div>
            </Card>
            
            <div className="space-y-2">
              <label className="text-sm">やむを得ない理由 *</label>
              <Textarea
                placeholder="例: 子供の急な発熱のため、保育園から呼び出しがありました"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                className="rounded-xl"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                緊急性のある理由を具体的に記入してください
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdditionalRequestDialog(false)}
              className="rounded-xl"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmitAdditionalRequest}
              className="rounded-xl bg-warning hover:bg-warning/90"
            >
              申請する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 実績報告ダイアログ */}
      <Dialog open={showActualReportDialog} onOpenChange={setShowActualReportDialog}>
        <DialogContent className="max-w-md mx-4 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              勤務実績報告
            </DialogTitle>
            <DialogDescription>
              実際の勤務時間を報告してください
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex gap-2">
                <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm">予定シフト</h4>
                  {selectedShift && (
                    <p className="text-sm text-muted-foreground">
                      {selectedShift.date} ({selectedShift.shiftType})
                      <br />
                      予定時間: {selectedShift.time}
                    </p>
                  )}
                </div>
              </div>
            </Card>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">実際の開始時刻 *</label>
                <Input
                  type="time"
                  value={actualStartTime}
                  onChange={(e) => setActualStartTime(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">実際の終了時刻 *</label>
                <Input
                  type="time"
                  value={actualEndTime}
                  onChange={(e) => setActualEndTime(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm">備考（任意）</label>
              <Textarea
                placeholder="例: 利用者様の緊急対応のため30分残業しました"
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                className="rounded-xl"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                予定と異なる場合は理由を記入してください
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActualReportDialog(false)}
              className="rounded-xl"
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmitActualReport}
              className="rounded-xl bg-purple-600 hover:bg-purple-700"
            >
              報告する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
