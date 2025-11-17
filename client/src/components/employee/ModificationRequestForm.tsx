import { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  MessageSquare,
  Send,
  AlertTriangle,
  ArrowRight,
  X,
  Plus
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { trpcClient } from '../../lib/trpc';
import { useToast } from '../../hooks/useToast';
import { LoadingInline } from '../ui/loading-spinner';

interface ModificationRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: number;
  employeeId: number;
  employeeName: string;
  date?: string;
  currentAssignment?: string;
  onSuccess?: () => void;
}

type RequestType = 'swap' | 'off' | 'time_change';

interface FormData {
  requestDate: string;
  requestType: RequestType;
  currentAssignment: string;
  requestedAssignment: string;
  swapTargetEmployeeId?: number;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export function ModificationRequestForm({
  open,
  onOpenChange,
  shiftId,
  employeeId,
  employeeName,
  date,
  currentAssignment,
  onSuccess
}: ModificationRequestFormProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // フォームデータ
  const [formData, setFormData] = useState<FormData>({
    requestDate: date || '',
    requestType: 'off',
    currentAssignment: currentAssignment || '',
    requestedAssignment: '',
    reason: '',
    priority: 'medium'
  });

  // 複数日付の選択
  const [selectedDates, setSelectedDates] = useState<string[]>(date ? [date] : []);
  const [isMultiDate, setIsMultiDate] = useState(false);

  const requestTypeLabels = {
    'swap': '他の職員と交代',
    'off': '休みに変更',
    'time_change': '時間変更'
  };

  const priorityLabels = {
    'low': '低',
    'medium': '中',
    'high': '高'
  };

  const handleSubmit = async () => {
    // バリデーション
    if (selectedDates.length === 0) {
      toast.error('日付を選択してください');
      return;
    }

    if (!formData.requestType) {
      toast.error('変更種別を選択してください');
      return;
    }

    if (!formData.reason.trim()) {
      toast.error('理由を入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      // 複数日付を1回のAPIコールでまとめて送信
      await trpcClient.modificationRequests.create.mutate({
        shiftId,
        requests: selectedDates.map(date => ({
          date,
          type: formData.requestType,
          current: formData.currentAssignment || undefined,
          requested: formData.requestedAssignment || '',
          swapTargetEmployeeId: formData.swapTargetEmployeeId,
          reason: formData.reason,
          priority: formData.priority
        }))
      });

      toast.success(
        selectedDates.length === 1
          ? '修正希望を提出しました'
          : `${selectedDates.length}件の修正希望を提出しました`
      );

      // リセット
      setFormData({
        requestDate: '',
        requestType: 'off',
        currentAssignment: '',
        requestedAssignment: '',
        reason: '',
        priority: 'medium'
      });
      setSelectedDates([]);
      setStep(1);

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('修正希望の提出に失敗しました', {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateToggle = (date: string) => {
    setSelectedDates(prev => {
      if (prev.includes(date)) {
        return prev.filter(d => d !== date);
      } else {
        return [...prev, date];
      }
    });
  };

  const handleReset = () => {
    setFormData({
      requestDate: date || '',
      requestType: 'off',
      currentAssignment: currentAssignment || '',
      requestedAssignment: '',
      reason: '',
      priority: 'medium'
    });
    setSelectedDates(date ? [date] : []);
    setStep(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            修正希望を提出
          </DialogTitle>
          <DialogDescription>
            仮確定シフトに対する変更希望を提出できます
          </DialogDescription>
        </DialogHeader>

        {/* ステップインジケーター */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className="mx-2" />
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className="mx-2" />
          <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`} />
        </div>

        <div className="space-y-4">
          {step === 1 && (
            <>
              {/* ステップ1: 日付選択 */}
              <div className="space-y-4">
                <div>
                  <Label>対象日付</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    変更を希望する日付を選択してください
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="multiDate"
                      checked={isMultiDate}
                      onChange={(e) => setIsMultiDate(e.target.checked)}
                    />
                    <Label htmlFor="multiDate">複数日付を選択</Label>
                  </div>

                  {!isMultiDate ? (
                    <input
                      type="date"
                      value={selectedDates[0] || ''}
                      onChange={(e) => setSelectedDates([e.target.value])}
                      className="w-full p-2 border rounded-md"
                    />
                  ) : (
                    <Card className="p-3">
                      <div className="grid grid-cols-7 gap-2">
                        {/* カレンダー風の日付選択UI */}
                        {Array.from({ length: 31 }, (_, i) => {
                          const day = i + 1;
                          const dateStr = `2024-11-${String(day).padStart(2, '0')}`;
                          const isSelected = selectedDates.includes(dateStr);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDateToggle(dateStr)}
                              className={`
                                p-2 rounded border transition-all
                                ${isSelected
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-white hover:bg-gray-50 border-gray-200'}
                              `}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {selectedDates.length}日選択中
                      </div>
                    </Card>
                  )}
                </div>

                {selectedDates.length > 0 && (
                  <Alert>
                    <Calendar className="h-4 w-4" />
                    <AlertDescription>
                      選択した日付:
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedDates.map(date => (
                          <Badge key={date} variant="secondary">
                            {new Date(date).toLocaleDateString('ja-JP')}
                            {isMultiDate && (
                              <button
                                type="button"
                                onClick={() => handleDateToggle(date)}
                                className="ml-1"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={selectedDates.length === 0}
                >
                  次へ
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* ステップ2: 変更内容 */}
              <div className="space-y-4">
                <div>
                  <Label>変更種別</Label>
                  <RadioGroup
                    value={formData.requestType}
                    onValueChange={(value: RequestType) =>
                      setFormData({ ...formData, requestType: value })
                    }
                  >
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="off" id="off" />
                        <Label htmlFor="off" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            休みに変更
                          </div>
                          <p className="text-sm text-muted-foreground">
                            出勤予定を休みに変更したい
                          </p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="swap" id="swap" />
                        <Label htmlFor="swap" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            他の職員と交代
                          </div>
                          <p className="text-sm text-muted-foreground">
                            別の職員とシフトを交代したい
                          </p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="time_change" id="time_change" />
                        <Label htmlFor="time_change" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            時間変更
                          </div>
                          <p className="text-sm text-muted-foreground">
                            勤務時間を変更したい
                          </p>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {formData.requestType === 'time_change' && (
                  <div>
                    <Label>希望する時間帯</Label>
                    <Select
                      value={formData.requestedAssignment}
                      onValueChange={(value) =>
                        setFormData({ ...formData, requestedAssignment: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="時間帯を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="早番">早番 (7:00-15:30)</SelectItem>
                        <SelectItem value="遅番">遅番 (10:30-19:00)</SelectItem>
                        <SelectItem value="夜勤">夜勤 (16:30-翌9:00)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.requestType === 'swap' && (
                  <Alert>
                    <Users className="h-4 w-4" />
                    <AlertDescription>
                      交代相手の職員は後日調整となります。
                      管理者が適切な職員を探して調整いたします。
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label>優先度</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high') =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低 - 可能であれば対応してほしい</SelectItem>
                      <SelectItem value="medium">中 - できるだけ対応してほしい</SelectItem>
                      <SelectItem value="high">高 - 必ず対応してほしい</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  戻る
                </Button>
                <Button
                  onClick={() => setStep(3)}
                >
                  次へ
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              {/* ステップ3: 理由入力と確認 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reason">
                    理由 <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    placeholder="変更を希望する理由を入力してください（例：家族の用事、通院など）"
                    rows={4}
                    className="mt-1"
                  />
                </div>

                {/* 確認内容 */}
                <Card className="p-4 bg-gray-50">
                  <h4 className="font-semibold mb-3">確認内容</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">対象日付:</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {selectedDates.map(date => (
                          <Badge key={date} variant="outline">
                            {new Date(date).toLocaleDateString('ja-JP')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">変更種別:</span>
                      <span>{requestTypeLabels[formData.requestType]}</span>
                    </div>
                    {formData.requestedAssignment && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">希望時間帯:</span>
                        <span>{formData.requestedAssignment}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">優先度:</span>
                      <Badge
                        variant={
                          formData.priority === 'high' ? 'destructive' :
                          formData.priority === 'medium' ? 'default' :
                          'secondary'
                        }
                      >
                        {priorityLabels[formData.priority]}
                      </Badge>
                    </div>
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground">理由:</span>
                      <p className="mt-1">{formData.reason || '（未入力）'}</p>
                    </div>
                  </div>
                </Card>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    提出後の修正希望は管理者が確認し、可能な範囲で対応いたします。
                    承認・却下の結果は通知でお知らせします。
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                >
                  戻る
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isSubmitting}
                  >
                    リセット
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !formData.reason.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingInline />
                        送信中...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        提出する
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}