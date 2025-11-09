import { useState } from "react";
import { MessageSquare, Edit3 } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { toast } from "sonner";
import { ShiftCard } from "./ShiftCard";
import { AdditionalRequestDialog } from "./AdditionalRequestDialog";
import { ActualReportDialog } from "./ActualReportDialog";
import { ShiftFlowCard } from "./ShiftFlowCard";
import {
  tentativeShifts,
  confirmedShifts,
  completedShifts,
  additionalRequestDeadline,
  actualReportDeadline,
} from "../constants/shiftViewConstants";
import type { ShiftDay } from "../types/shiftViewTypes";

export function ShiftView() {
  const [activeTab, setActiveTab] = useState("tentative");
  const [showAdditionalRequestDialog, setShowAdditionalRequestDialog] = useState(false);
  const [showActualReportDialog, setShowActualReportDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftDay | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [actualStartTime, setActualStartTime] = useState("");
  const [actualEndTime, setActualEndTime] = useState("");
  const [reportNote, setReportNote] = useState("");

  const canRequestAdditional = new Date() < additionalRequestDeadline;
  const canReportActual = new Date() < actualReportDeadline;

  const handleRequestAdditional = (shift: ShiftDay) => {
    setSelectedShift(shift);
    setRequestReason("");
    setShowAdditionalRequestDialog(true);
  };

  const handleReportActual = (shift: ShiftDay) => {
    setSelectedShift(shift);
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
      description: "管理者が確認後、調整します",
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
      description: "管理者が確認後、承認されます",
    });
    setShowActualReportDialog(false);
    setSelectedShift(null);
    setActualStartTime("");
    setActualEndTime("");
    setReportNote("");
  };

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

        <ShiftFlowCard />

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
                    管理者が作成したシフト案です。
                    <strong className="text-warning">やむを得ない理由</strong>
                    で休みが必要になった場合は、右上の
                    <MessageSquare className="w-3 h-3 inline mx-1" />
                    アイコンから追加希望を申請できます。
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
                      })}
                      まで
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
                <ShiftCard
                  key={shift.day}
                  shift={shift}
                  showActions={true}
                  canRequestAdditional={canRequestAdditional}
                  onRequestAdditional={handleRequestAdditional}
                />
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
                    勤務が終了したら、実際の勤務時間を報告してください。予定と異なる場合は右上の
                    <Edit3 className="w-3 h-3 inline mx-1" />
                    アイコンから修正できます。
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
                      })}
                      まで
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
                <ShiftCard
                  key={shift.day}
                  shift={shift}
                  showReport={true}
                  canReportActual={canReportActual}
                  onReportActual={handleReportActual}
                />
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

      <AdditionalRequestDialog
        open={showAdditionalRequestDialog}
        onOpenChange={setShowAdditionalRequestDialog}
        selectedShift={selectedShift}
        requestReason={requestReason}
        onRequestReasonChange={setRequestReason}
        onSubmit={handleSubmitAdditionalRequest}
      />

      <ActualReportDialog
        open={showActualReportDialog}
        onOpenChange={setShowActualReportDialog}
        selectedShift={selectedShift}
        actualStartTime={actualStartTime}
        actualEndTime={actualEndTime}
        reportNote={reportNote}
        onActualStartTimeChange={setActualStartTime}
        onActualEndTimeChange={setActualEndTime}
        onReportNoteChange={setReportNote}
        onSubmit={handleSubmitActualReport}
      />
    </div>
  );
}
