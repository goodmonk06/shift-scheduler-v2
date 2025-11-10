import { useState } from "react";
import { Calendar, Sparkles, Save, Users, AlertCircle, Table, Grid3X3, ChevronLeft } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Skeleton } from "./ui/skeleton";

interface ShiftCreationProps {
  onBack?: () => void;
}

export function ShiftCreation({ onBack }: ShiftCreationProps = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");

  const staff = [
    { id: 1, name: "山田花子", skill: "1.0", constraints: ["夜勤可"] },
    { id: 2, name: "佐藤美咲", skill: "0.5", constraints: ["土日休み"] },
    { id: 3, name: "田中さくら", skill: "1.0", constraints: ["夜勤可", "リーダー"] },
    { id: 4, name: "鈴木あかり", skill: "0.5", constraints: [] },
    { id: 5, name: "高橋ゆい", skill: "1.0", constraints: ["夜勤可"] },
    { id: 6, name: "伊藤まり", skill: "0.5", constraints: [] },
  ];

  const shiftTypes = [
    { name: "早番", color: "bg-secondary", textColor: "text-secondary-foreground", time: "8:00-17:00", code: "早" },
    { name: "遅番", color: "bg-warning", textColor: "text-warning-foreground", time: "10:00-19:00", code: "遅" },
    { name: "夜勤", color: "bg-primary", textColor: "text-primary-foreground", time: "17:00-翌9:00", code: "夜" },
  ];

  const monthDays = Array.from({ length: 30 }, (_, i) => i + 1);

  // Mock shift data for table view
  const generateMockShift = (staffId: number, day: number) => {
    const shifts = ["早", "遅", "夜", ""];
    const random = (staffId * day) % 4;
    return shifts[random];
  };

  const handleGenerateAI = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 戻るボタン（AdminApp統合時に表示） */}
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="rounded-xl">
            <ChevronLeft className="w-4 h-4 mr-2" />
            シフト一覧に戻る
          </Button>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1>シフト作成</h1>
            <p className="text-muted-foreground">11月のシフト表を作成・編集</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-xl">
              <Save className="w-4 h-4 mr-2" />
              下書き保存
            </Button>
            <Button className="rounded-xl bg-primary">
              確定して公開
            </Button>
          </div>
        </div>

        {/* AI Generation Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-primary/20 to-accent/20 p-4 rounded-xl">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3>AI自動生成</h3>
                <p className="text-muted-foreground">
                  職員の希望休・勤務制約・スキルレベルを考慮して、最適なシフトを自動生成します
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="rounded-xl bg-primary"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isGenerating ? "生成中..." : "AI自動生成"}
                </Button>
                {isGenerating && (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="font-medium">AIがシフトを生成中...</span>
                    </div>
                    <div className="text-xs space-y-0.5 ml-6">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>職員情報を読み込み完了</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>制約条件を分析完了</span>
                      </div>
                      <div className="flex items-center gap-2 animate-pulse">
                        <span className="text-primary">⏳</span>
                        <span>最適なシフトを計算中（20-30秒）</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {viewMode === "table" ? (
          <div className="space-y-4">
            {/* Table View Header */}
            <div className="flex items-center justify-between">
              <h3>シフト表</h3>
              <div className="flex gap-3">
                <div className="flex gap-2 bg-secondary/20 p-1 rounded-xl">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("calendar")}
                    className="rounded-lg"
                  >
                    <Grid3X3 className="w-4 h-4 mr-1" />
                    カレンダー
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="rounded-lg"
                  >
                    <Table className="w-4 h-4 mr-1" />
                    表形式
                  </Button>
                </div>
                <div className="flex gap-2">
                  {shiftTypes.map((type) => (
                    <div key={type.name} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${type.color}`} />
                      <span className="text-muted-foreground">{type.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable Table */}
            <Card className="overflow-x-auto">
              <table className="border-collapse" style={{ minWidth: `${120 + 30 * 60}px` }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-card border border-border p-3 text-left shadow-[2px_0_4px_rgba(0,0,0,0.05)]" style={{ minWidth: '120px', maxWidth: '120px', width: '120px' }}>
                      職員名
                    </th>
                    {monthDays.map((day) => {
                      const date = new Date(2024, 10, day);
                      const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <th
                          key={day}
                          className={`border border-border p-2 ${
                            isWeekend ? "bg-secondary/20" : "bg-card"
                          }`}
                          style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-muted-foreground">{dayOfWeek}</span>
                            <span>{day}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-secondary/5">
                      <td className="sticky left-0 z-10 bg-card border border-border p-3 shadow-[2px_0_4px_rgba(0,0,0,0.05)]" style={{ minWidth: '120px', maxWidth: '120px', width: '120px' }}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8 bg-secondary/20 flex-shrink-0">
                            <AvatarFallback className="text-primary text-xs">
                              {member.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate">{member.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {member.skill}人前
                            </div>
                          </div>
                        </div>
                      </td>
                      {monthDays.map((day) => {
                        const shift = generateMockShift(member.id, day);
                        const shiftType = shiftTypes.find((t) => t.code === shift);
                        const date = new Date(2024, 10, day);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        
                        return (
                          <td
                            key={day}
                            className={`border border-border p-1 text-center cursor-pointer hover:bg-secondary/10 transition-colors ${
                              isWeekend ? "bg-secondary/10" : "bg-card"
                            }`}
                            style={{ minWidth: '60px', maxWidth: '60px', width: '60px' }}
                            onClick={() => {
                              // シフト編集ロジックをここに追加
                            }}
                          >
                            {shift && (
                              <div
                                className={`${shiftType?.color} ${shiftType?.textColor} rounded-lg p-1.5 transition-all hover:shadow-sm`}
                              >
                                {shift}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Staff List for Table View */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3>職員一覧</h3>
                </div>

                <div className="space-y-3">
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-card hover:bg-secondary/10 transition-colors cursor-pointer"
                    >
                      <Avatar className="bg-secondary/20">
                        <AvatarFallback className="text-primary">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <h4>{member.name}</h4>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {member.skill}人前
                          </Badge>
                          {member.constraints.map((constraint) => (
                            <Badge key={constraint} className="bg-primary/10 text-xs">
                              {constraint}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full rounded-xl">
                  職員を追加
                </Button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar View */}
            <Card className="lg:col-span-3 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3>シフトカレンダー</h3>
                  <div className="flex gap-3">
                    <div className="flex gap-2 bg-secondary/20 p-1 rounded-xl">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setViewMode("calendar")}
                        className="rounded-lg"
                      >
                        <Grid3X3 className="w-4 h-4 mr-1" />
                        カレンダー
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("table")}
                        className="rounded-lg"
                      >
                        <Table className="w-4 h-4 mr-1" />
                        表形式
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      {shiftTypes.map((type) => (
                        <div key={type.name} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${type.color}`} />
                          <span className="text-muted-foreground">{type.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {isGenerating ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
                      <div key={day} className="text-center p-2">
                        {day}
                      </div>
                    ))}
                    {monthDays.map((day) => (
                      <button
                        key={day}
                        onClick={() => setSelectedDate(day)}
                        className={`
                          aspect-square rounded-xl p-2 transition-all hover:shadow-md
                          ${selectedDate === day ? "ring-2 ring-primary bg-primary/10" : "bg-card hover:bg-secondary/10"}
                        `}
                      >
                        <div className="h-full flex flex-col">
                          <span className="text-sm">{day}</span>
                          <div className="flex-1 flex flex-col gap-1 mt-1">
                            <div className="h-1 rounded-full bg-secondary" />
                            <div className="h-1 rounded-full bg-warning" />
                            <div className="h-1 rounded-full bg-primary" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Staff List */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h3>職員一覧</h3>
                </div>

                <div className="space-y-3">
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-card hover:bg-secondary/10 transition-colors cursor-pointer"
                    >
                      <Avatar className="bg-secondary/20">
                        <AvatarFallback className="text-primary">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <h4>{member.name}</h4>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {member.skill}人前
                          </Badge>
                          {member.constraints.map((constraint) => (
                            <Badge key={constraint} className="bg-primary/10 text-xs">
                              {constraint}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full rounded-xl">
                  職員を追加
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Warnings */}
        <Card className="p-4 bg-warning/10 border-warning/30">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4>確認事項</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 11月15日：佐藤美咲さんの希望休と重複しています</li>
                <li>• 夜勤スキル保持者が3名のみです</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
