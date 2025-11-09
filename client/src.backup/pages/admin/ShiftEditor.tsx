import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save, Sparkles, GripVertical, FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation, useRoute } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

export default function ShiftEditor() {
  const [, params] = useRoute("/shifts/:id/edit");
  const [, setLocation] = useLocation();
  const shiftId = params?.id ? parseInt(params.id) : null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedShift, setDraggedShift] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [addShiftDate, setAddShiftDate] = useState<string>("");
  const [addShiftEmployeeId, setAddShiftEmployeeId] = useState<number | null>(null);
  const [addShiftTimeSlotId, setAddShiftTimeSlotId] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: shift, isLoading: shiftLoading } = trpc.shifts.getById.useQuery(
    { id: shiftId! },
    { enabled: !!shiftId }
  );
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: workTimeSlots } = trpc.workTimeSlots.list.useQuery();
  const { data: shiftDetails } = trpc.shiftDetails.getByShift.useQuery(
    { shiftId: shiftId! },
    { enabled: !!shiftId }
  );

  // デバッグログ
  if (shiftDetails && shiftDetails.length > 0) {
    console.log("[DEBUG] shiftDetails:", shiftDetails.slice(0, 5));
    console.log("[DEBUG] 日付フォーマット例:", shiftDetails[0]?.date);
  }

  const utils = trpc.useUtils();

  const exportPDFMutation = trpc.shifts.exportPDF.useMutation({
    onSuccess: (data) => {
      // Base64デコードしてダウンロード
      const binary = atob(data.pdf);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDFエクスポートが完了しました');
    },
    onError: (error) => {
      toast.error(`PDFエクスポートに失敗しました: ${error.message}`);
    },
  });

  const generateAIMutation = trpc.shifts.generateAI.useMutation({
    onSuccess: async () => {
      toast.success("AIシフト生成が完了しました");
      await utils.shiftDetails.getByShift.invalidate({ shiftId: shiftId! });
      // 強制的に再取得
      window.location.reload();
      setShowAIDialog(false);
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast.error("AIシフト生成に失敗しました: " + error.message);
      setIsGenerating(false);
    },
  });

  const createDetailMutation = trpc.shiftDetails.create.useMutation({
    onSuccess: () => {
      toast.success("シフトを追加しました");
      utils.shiftDetails.getByShift.invalidate({ shiftId: shiftId! });
      setSelectedDate(null);
      setSelectedEmployee("");
      setSelectedTimeSlot("");
    },
    onError: (error: any) => {
      toast.error("シフトの追加に失敗しました: " + error.message);
    },
  });

  const updateDetailMutation = trpc.shiftDetails.update.useMutation({
    onSuccess: () => {
      toast.success("シフトを更新しました");
      utils.shiftDetails.getByShift.invalidate({ shiftId: shiftId! });
    },
    onError: (error: any) => {
      toast.error("シフトの更新に失敗しました: " + error.message);
    },
  });

  const deleteDetailMutation = trpc.shiftDetails.delete.useMutation({
    onSuccess: () => {
      toast.success("シフトを削除しました");
      utils.shiftDetails.getByShift.invalidate({ shiftId: shiftId! });
    },
    onError: (error: any) => {
      toast.error("シフトの削除に失敗しました: " + error.message);
    },
  });

  if (!shiftId) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">シフトIDが指定されていません</p>
          <Button onClick={() => setLocation("/shifts")} className="mt-4">
            シフト一覧に戻る
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (shiftLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!shift) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">シフトが見つかりません</p>
          <Button onClick={() => setLocation("/shifts")} className="mt-4">
            シフト一覧に戻る
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const daysInMonth = new Date(shift.year, shift.month, 0).getDate();
  const firstDayOfWeek = new Date(shift.year, shift.month - 1, 1).getDay();

  const handleGenerateAI = () => {
    setShowAIDialog(true);
  };

  const confirmGenerateAI = () => {
    setIsGenerating(true);
    generateAIMutation.mutate({ shiftId: shiftId! });
  };

  const handleAddShift = () => {
    if (!selectedDate || !selectedEmployee || !selectedTimeSlot) {
      toast.error("日付、職員、勤務時間枠を選択してください");
      return;
    }

    const date = new Date(selectedDate);
    createDetailMutation.mutate({
      shiftId: shiftId!,
      employeeId: parseInt(selectedEmployee),
      date: selectedDate,
      status: "working",
      timeSlotId: parseInt(selectedTimeSlot),
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    // Find the dragged shift
    const shiftDetail = shiftDetails?.find(sd => `shift-${sd.id}` === active.id);
    if (shiftDetail) {
      setDraggedShift(shiftDetail);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setDraggedShift(null);
      return;
    }

    // Extract shift detail ID from active.id (format: "shift-{id}")
    const shiftDetailId = parseInt((active.id as string).replace("shift-", ""));
    const shiftDetail = shiftDetails?.find(sd => sd.id === shiftDetailId);
    
    if (!shiftDetail) {
      setActiveId(null);
      setDraggedShift(null);
      return;
    }

    // Extract day from over.id (format: "day-{day}")
    const targetDay = parseInt((over.id as string).replace("day-", ""));
    const newDate = `${shift.year}-${String(shift.month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;

    // Update the shift detail with new date
    if (shiftDetail.date !== newDate) {
      updateDetailMutation.mutate({
        id: shiftDetailId,
        date: newDate,
      });
    }

    setActiveId(null);
    setDraggedShift(null);
  };

  const getShiftForDate = (day: number) => {
    const dateStr = `${shift.year}-${String(shift.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shiftDetails?.filter(sd => sd.date === dateStr && sd.status === "working") || [];
  };

  const getEmployeeName = (id: number) => {
    return employees?.find(e => e.id === id)?.name || "不明";
  };

  const getTimeSlotLabel = (id: number) => {
    return workTimeSlots?.find(ts => ts.id === id)?.displayLabel || "不明";
  };

  return (
    <DashboardLayout>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/shifts")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">
                  {shift.year}年{shift.month}月のシフト編集
                </h1>
                <p className="text-muted-foreground mt-2">
                  ステータス: {shift.status === "draft" ? "下書き" : shift.status === "tentative" ? "仮確定" : shift.status === "confirmed" ? "確定" : "アーカイブ"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
                  <Button onClick={() => setShowAIDialog(true)} disabled={isGenerating}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI自動生成
              </Button>
              <Button 
                onClick={() => exportPDFMutation.mutate({ shiftId: shiftId! })}
                disabled={exportPDFMutation.isPending}
                variant="outline"
              >
                <FileDown className="h-4 w-4 mr-2" />
                PDFエクスポート
              </Button>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                保存
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>シフト表</CardTitle>
              <CardDescription>{shift.year}年{shift.month}月のシフト表</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "table")}>
                <TabsList className="mb-4">
                  <TabsTrigger value="calendar">カレンダー表示</TabsTrigger>
                  <TabsTrigger value="table">テーブル表示</TabsTrigger>
                </TabsList>
                
                <TabsContent value="calendar">
              <div className="overflow-x-auto">
                <div className="grid grid-cols-7 gap-2 min-w-[800px]">
                  {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
                    <div key={i} className="font-bold text-center p-2 bg-muted rounded">
                      {day}
                    </div>
                  ))}
                  
                  {Array.from({ length: firstDayOfWeek }, (_, i) => (
                    <div key={`empty-${i}`} className="p-2 min-h-[120px]" />
                  ))}
                  
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const shifts = getShiftForDate(day);
                    return (
                      <DroppableDay
                        key={day}
                        day={day}
                        shifts={shifts}
                        getEmployeeName={getEmployeeName}
                        getTimeSlotLabel={getTimeSlotLabel}
                        onDelete={(id) => deleteDetailMutation.mutate({ id })}
                        onAddShift={(day) => {
                          const dateStr = `${shift.year}-${String(shift.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          setAddShiftDate(dateStr);
                          setAddShiftEmployeeId(null);
                          setAddShiftTimeSlotId("");
                          setShowAddShiftDialog(true);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
                </TabsContent>
                
                <TabsContent value="table">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="border p-2 bg-muted sticky left-0 z-10 min-w-[120px]">職員名</th>
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const date = new Date(shift.year, shift.month - 1, day);
                            const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            return (
                              <th key={day} className={`border p-1 text-center min-w-[80px] ${
                                isWeekend ? 'bg-red-50 dark:bg-red-950/20' : ''
                              }`}>
                                <div>{day}</div>
                                <div className="text-xs text-muted-foreground">{dayOfWeek}</div>
                              </th>
                            );
                          })}
                          <th className="border p-2 bg-muted text-center min-w-[100px]">
                            <div>合計</div>
                            <div className="text-xs text-muted-foreground">勤務時間</div>
                          </th>
                          <th className="border p-2 bg-muted text-center min-w-[80px]">
                            <div>合計</div>
                            <div className="text-xs text-muted-foreground">出勤日数</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees?.map((employee) => {
                          // 月間合計を計算
                          const employeeShifts = shiftDetails?.filter(
                            sd => sd.employeeId === employee.id && sd.status === "working"
                          ) || [];
                          
                          let totalHours = 0;
                          const workDays = new Set<string>();
                          
                          employeeShifts.forEach(sd => {
                            const timeSlot = workTimeSlots?.find(ts => ts.id === sd.timeSlotId);
                            if (timeSlot) {
                              // startTimeとendTimeから勤務時間を計算
                              const [startHour, startMin] = timeSlot.startTime.split(':').map(Number);
                              const [endHour, endMin] = timeSlot.endTime.split(':').map(Number);
                              let hours = (endHour * 60 + endMin - startHour * 60 - startMin) / 60;
                              // 夜勤の場合、翌日にまたがる
                              if (hours < 0) hours += 24;
                              totalHours += hours;
                              workDays.add(sd.date);
                            }
                          });
                          
                          const totalDays = workDays.size;
                          return (
                            <tr key={employee.id}>
                              <td className="border p-2 font-medium sticky left-0 z-10 bg-background">
                                {employee.name}
                              </td>
                              {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const dateStr = `${shift.year}-${String(shift.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const dayShifts = shiftDetails?.filter(
                                  sd => sd.date === dateStr && sd.employeeId === employee.id && sd.status === "working"
                                ) || [];
                                const date = new Date(shift.year, shift.month - 1, day);
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                
                                return (
                                  <td 
                                    key={day} 
                                    className={`border p-1 text-center cursor-pointer hover:bg-accent/50 ${
                                      isWeekend ? 'bg-red-50 dark:bg-red-950/20' : ''
                                    }`}
                                    onClick={() => {
                                      setAddShiftDate(dateStr);
                                      setAddShiftEmployeeId(employee.id);
                                      setAddShiftTimeSlotId("");
                                      setShowAddShiftDialog(true);
                                    }}
                                  >
                                    <div className="space-y-1">
                                      {dayShifts.map((sd) => {
                                        const isAIGenerated = sd.generatedBy === "ai";
                                        return (
                                          <div
                                            key={sd.id}
                                            className={`text-xs px-1 py-0.5 rounded ${
                                              isAIGenerated
                                                ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                                                : "bg-primary/10"
                                            }`}
                                          >
                                            {getTimeSlotLabel(sd.timeSlotId || 0)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="border p-2 text-center font-bold bg-muted">
                                {totalHours.toFixed(1)}h
                              </td>
                              <td className="border p-2 text-center font-bold bg-muted">
                                {totalDays}日
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <DragOverlay>
          {activeId && draggedShift ? (
            <div className="text-xs p-1 bg-primary/10 rounded flex items-center gap-1 cursor-grabbing">
              <GripVertical className="h-3 w-3" />
              <Badge variant="outline" className="mr-1">
                {getTimeSlotLabel(draggedShift.timeSlotId || 0)}
              </Badge>
              {getEmployeeName(draggedShift.employeeId)}
            </div>
          ) : null}
        </DragOverlay>

        <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AI自動生成</DialogTitle>
            <DialogDescription>
                AIを使用してシフトを自動生成します。手動で作成したシフトは保持され、AI生成分のみが更新されます。
            </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAIDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={confirmGenerateAI} disabled={isGenerating}>
                {isGenerating ? "生成中..." : "生成開始"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* シフト追加ダイアログ */}
        <Dialog open={showAddShiftDialog} onOpenChange={setShowAddShiftDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>シフトを追加</DialogTitle>
              <DialogDescription>
                {addShiftDate} のシフトを追加します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">職員</label>
                <Select 
                  value={addShiftEmployeeId?.toString() || ""} 
                  onValueChange={(v) => setAddShiftEmployeeId(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="職員を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">勤務時間枠</label>
                <Select value={addShiftTimeSlotId} onValueChange={setAddShiftTimeSlotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="時間枠を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {workTimeSlots?.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id.toString()}>
                        {slot.name} ({slot.displayLabel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddShiftDialog(false)}>
                キャンセル
              </Button>
              <Button 
                onClick={() => {
                  if (!addShiftEmployeeId || !addShiftTimeSlotId) {
                    toast.error("職員と時間枠を選択してください");
                    return;
                  }
                  createDetailMutation.mutate({
                    shiftId: shiftId!,
                    employeeId: addShiftEmployeeId,
                    date: addShiftDate,
                    timeSlotId: parseInt(addShiftTimeSlotId),
                    status: "working",
                  });
                  setShowAddShiftDialog(false);
                }}
              >
                追加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DndContext>
    </DashboardLayout>
  );
}

// Droppable Day Component
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

function DroppableDay({ day, shifts, getEmployeeName, getTimeSlotLabel, onDelete, onAddShift }: { day: number; shifts: any[]; getEmployeeName: (id: number) => string; getTimeSlotLabel: (id: number) => string; onDelete: (id: number) => void; onAddShift: (day: number) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day}`,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onAddShift(day)}
      className={`border rounded p-2 min-h-[120px] transition-colors cursor-pointer ${
        isOver ? "bg-accent border-primary" : "hover:bg-accent/50"
      }`}
    >
      <div className="font-semibold mb-2">{day}</div>
      <div className="space-y-1">
        {shifts.map((sd: any) => (
          <DraggableShift
            key={sd.id}
            shift={sd}
            getEmployeeName={getEmployeeName}
            getTimeSlotLabel={getTimeSlotLabel}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function DraggableShift({ shift, getEmployeeName, getTimeSlotLabel, onDelete }: { shift: any; getEmployeeName: (id: number) => string; getTimeSlotLabel: (id: number) => string; onDelete: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `shift-${shift.id}`,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const isAIGenerated = shift.generatedBy === "ai";
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`text-xs p-1 rounded flex justify-between items-center group cursor-grab active:cursor-grabbing ${
        isAIGenerated ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700" : "bg-primary/10"
      }`}
    >
      <span className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 opacity-50" />
        <Badge variant="outline" className="mr-1">
          {getTimeSlotLabel(shift.timeSlotId || 0)}
        </Badge>
        {getEmployeeName(shift.employeeId)}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(shift.id);
        }}
        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80"
      >
        ×
      </button>
    </div>
  );
}
