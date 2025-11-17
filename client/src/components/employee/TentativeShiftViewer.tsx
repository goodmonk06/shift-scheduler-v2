import { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  X,
  Filter,
  Download,
  MessageSquare
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { trpcClient } from '../../lib/trpc';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { LoadingInline } from '../ui/loading-spinner';

interface TentativeShiftViewerProps {
  shiftId: number;
  employeeId: number;
  employeeName: string;
  onModificationRequest?: (date: string, currentAssignment: string) => void;
}

interface DaySchedule {
  date: string;
  dayOfWeek: string;
  assignments: Array<{
    timeSlot: string;
    startTime: string;
    endTime: string;
    assigned: boolean;
    isMyShift: boolean;
    otherEmployees: string[];
    requiredCount: number;
    assignedCount: number;
  }>;
  isHoliday: boolean;
  holidayName?: string;
  myTotalHours: number;
  hasModificationRequest: boolean;
}

export function TentativeShiftViewer({
  shiftId,
  employeeId,
  employeeName,
  onModificationRequest
}: TentativeShiftViewerProps) {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [filterView, setFilterView] = useState<'all' | 'myShifts' | 'needsCoverage'>('all');

  // 仮確定シフトデータを取得
  const {
    data: shiftData,
    isLoading,
    isError,
    error,
    refetch
  } = useAsync(
    async () => {
      // 仮確定シフトの詳細データを取得
      const [shift, assignments, modifications] = await Promise.all([
        trpcClient.shifts.getById.query({ id: shiftId }),
        trpcClient.shifts.getAssignmentsByShift.query({ shiftId }),
        trpcClient.modificationRequests.getByEmployee.query({ employeeId, shiftId })
      ]);
      return { shift, assignments, modifications };
    },
    {
      onError: () => toast.error('シフトデータの取得に失敗しました')
    },
    [shiftId, employeeId]
  );

  // 日付ごとのスケジュールを整理
  const scheduleByDate = useMemo(() => {
    if (!shiftData) return [];

    const { shift, assignments, modifications } = shiftData;
    const scheduleMap = new Map<string, DaySchedule>();

    // 修正希望のマップ作成
    const modificationMap = new Map(
      modifications.map(mod => [mod.requestDate, mod])
    );

    // 各日付のスケジュールを構築
    assignments.forEach(assignment => {
      const date = assignment.date;
      if (!scheduleMap.has(date)) {
        const dateObj = new Date(date);
        const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        scheduleMap.set(date, {
          date,
          dayOfWeek: dayNames[dateObj.getDay()],
          assignments: [],
          isHoliday: false,
          myTotalHours: 0,
          hasModificationRequest: modificationMap.has(date)
        });
      }

      const schedule = scheduleMap.get(date)!;
      const isMyShift = assignment.employeeId === employeeId;

      // 時間スロットごとの情報を追加
      const timeSlotInfo = {
        timeSlot: assignment.timeSlot || '未定',
        startTime: assignment.startTime || '',
        endTime: assignment.endTime || '',
        assigned: !!assignment.employeeId,
        isMyShift,
        otherEmployees: assignment.otherEmployees || [],
        requiredCount: assignment.requiredCount || 1,
        assignedCount: assignment.assignedCount || 0
      };

      schedule.assignments.push(timeSlotInfo);

      // 自分のシフトの合計時間を計算
      if (isMyShift && assignment.startTime && assignment.endTime) {
        const start = new Date(`2000-01-01 ${assignment.startTime}`);
        const end = new Date(`2000-01-01 ${assignment.endTime}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        schedule.myTotalHours += hours;
      }
    });

    // 日付でソート
    return Array.from(scheduleMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [shiftData, employeeId]);

  // フィルタリングされたスケジュール
  const filteredSchedule = useMemo(() => {
    switch (filterView) {
      case 'myShifts':
        return scheduleByDate.filter(day =>
          day.assignments.some(a => a.isMyShift)
        );
      case 'needsCoverage':
        return scheduleByDate.filter(day =>
          day.assignments.some(a => a.assignedCount < a.requiredCount)
        );
      default:
        return scheduleByDate;
    }
  }, [scheduleByDate, filterView]);

  // 週ごとのグループ化
  const weeklySchedule = useMemo(() => {
    const weeks: DaySchedule[][] = [];
    let currentWeek: DaySchedule[] = [];

    filteredSchedule.forEach(day => {
      const date = new Date(day.date);
      if (date.getDay() === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [filteredSchedule]);

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleModificationRequest = (date: string, currentAssignment: string) => {
    if (onModificationRequest) {
      onModificationRequest(date, currentAssignment);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <LoadingInline />
          <span className="ml-2">シフトデータを読み込み中...</span>
        </div>
      </Card>
    );
  }

  if (isError || !shiftData) {
    return (
      <Card className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            シフトデータを取得できませんでした
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  const { shift } = shiftData;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <Card className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              仮確定シフト
            </h2>
            <p className="text-muted-foreground">
              {shift.year}年{shift.month}月分
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-100 text-yellow-700">
              仮確定
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('PDF出力機能は実装中です')}
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>

        {/* フィルターコントロール */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterView} onValueChange={(value: any) => setFilterView(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて表示</SelectItem>
              <SelectItem value="myShifts">自分のシフト</SelectItem>
              <SelectItem value="needsCoverage">要員不足</SelectItem>
            </SelectContent>
          </Select>

          <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <TabsList>
              <TabsTrigger value="week">週表示</TabsTrigger>
              <TabsTrigger value="month">月表示</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* スケジュール表示 */}
      {viewMode === 'week' ? (
        <div className="space-y-4">
          {weeklySchedule.map((week, weekIndex) => (
            <Card key={weekIndex} className="p-4">
              <h3 className="font-semibold mb-3">
                第{weekIndex + 1}週
              </h3>
              <div className="grid grid-cols-7 gap-2">
                {week.map(day => (
                  <button
                    key={day.date}
                    onClick={() => handleDayClick(day.date)}
                    className={`
                      p-2 rounded-lg border transition-all hover:shadow-md
                      ${day.assignments.some(a => a.isMyShift)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card border-border'}
                      ${day.hasModificationRequest
                        ? 'ring-2 ring-yellow-400'
                        : ''}
                    `}
                  >
                    <div className="text-center">
                      <div className="font-semibold">
                        {new Date(day.date).getDate()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {day.dayOfWeek}
                      </div>
                      {day.assignments.some(a => a.isMyShift) && (
                        <Badge className="mt-1" variant="secondary">
                          出勤
                        </Badge>
                      )}
                      {day.myTotalHours > 0 && (
                        <div className="text-xs mt-1">
                          {day.myTotalHours}h
                        </div>
                      )}
                      {day.hasModificationRequest && (
                        <MessageSquare className="h-3 w-3 mx-auto mt-1 text-yellow-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {['日', '月', '火', '水', '木', '金', '土'].map(day => (
              <div
                key={day}
                className="text-center p-2 font-semibold text-sm"
              >
                {day}
              </div>
            ))}
            {filteredSchedule.map(day => (
              <button
                key={day.date}
                onClick={() => handleDayClick(day.date)}
                className={`
                  aspect-square p-1 rounded border text-xs transition-all hover:shadow
                  ${day.assignments.some(a => a.isMyShift)
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border'}
                  ${day.hasModificationRequest
                    ? 'ring-1 ring-yellow-400'
                    : ''}
                `}
              >
                <div>{new Date(day.date).getDate()}</div>
                {day.assignments.some(a => a.isMyShift) && (
                  <div className="mt-1">出</div>
                )}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* 日付詳細ダイアログ */}
      {selectedDate && (
        <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {new Date(selectedDate).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {scheduleByDate
                .find(d => d.date === selectedDate)
                ?.assignments.map((assignment, index) => (
                  <Card key={index} className={`p-3 ${
                    assignment.isMyShift ? 'bg-primary/5 border-primary' : ''
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">
                            {assignment.timeSlot}
                          </span>
                          {assignment.isMyShift && (
                            <Badge variant="secondary">
                              あなたのシフト
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {assignment.startTime} - {assignment.endTime}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3" />
                          <span>
                            要員: {assignment.assignedCount}/{assignment.requiredCount}名
                          </span>
                          {assignment.assignedCount < assignment.requiredCount && (
                            <Badge variant="destructive" className="text-xs">
                              不足
                            </Badge>
                          )}
                        </div>
                        {assignment.otherEmployees.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            同僚: {assignment.otherEmployees.join(', ')}
                          </div>
                        )}
                      </div>
                      {assignment.isMyShift && onModificationRequest && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModificationRequest(
                            selectedDate,
                            assignment.timeSlot
                          )}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          修正希望
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}

              {scheduleByDate
                .find(d => d.date === selectedDate)
                ?.hasModificationRequest && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      この日付には修正希望が提出されています
                    </AlertDescription>
                  </Alert>
                )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* サマリー情報 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">月間サマリー</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">出勤日数</div>
            <div className="text-2xl font-bold">
              {scheduleByDate.filter(d => d.assignments.some(a => a.isMyShift)).length}日
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">総勤務時間</div>
            <div className="text-2xl font-bold">
              {scheduleByDate.reduce((sum, d) => sum + d.myTotalHours, 0)}時間
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">修正希望</div>
            <div className="text-2xl font-bold">
              {scheduleByDate.filter(d => d.hasModificationRequest).length}件
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">ステータス</div>
            <Badge className="mt-1 bg-yellow-100 text-yellow-700">
              仮確定
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}