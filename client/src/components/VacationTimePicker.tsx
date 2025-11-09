import { useState } from "react";
import { Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import Picker from "react-mobile-picker";
import type { VacationTimePickerProps, PickerValue } from "../types/vacationTypes";
import { pickerSelections } from "../utils/vacationHelpers";

export function VacationTimePicker({
  open,
  onOpenChange,
  startHour,
  startMinute,
  endHour,
  endMinute,
  onConfirm,
}: VacationTimePickerProps) {
  const [pickerValue, setPickerValue] = useState<PickerValue>({
    startHour,
    startMinute,
    endHour,
    endMinute,
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setPickerValue({ startHour, startMinute, endHour, endMinute });
    }
    onOpenChange(isOpen);
  };

  const handleConfirm = () => {
    onConfirm(pickerValue);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-3xl border-2 border-accent/50 max-w-sm bg-gradient-to-br from-white to-accent/5 shadow-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="w-7 h-7 text-accent" />
            時間帯を選択
            <span className="text-2xl ml-auto">⏰</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* ホイールピッカー */}
          <div className="relative">
            <div className="mb-4 text-center">
              <Label className="text-lg font-semibold text-[#2B3A55]">
                時間をスクロールして選択 ⏰
              </Label>
            </div>

            {/* ホイールピッカーコンテナ */}
            <div className="relative rounded-3xl border-2 border-accent/30 bg-gradient-to-br from-white to-accent/5 p-4 shadow-xl overflow-hidden">
              {/* 中央のハイライトバー */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-14 bg-gradient-to-r from-accent/20 via-secondary/20 to-accent/20 border-y-2 border-accent/40 pointer-events-none z-10" />

              <Picker
                value={pickerValue}
                onChange={setPickerValue}
                wheelMode="natural"
                height={200}
                itemHeight={50}
              >
                {Object.keys(pickerSelections).map((name) => (
                  <Picker.Column key={name} name={name}>
                    {pickerSelections[name as keyof typeof pickerSelections].map((option) => (
                      <Picker.Item key={option} value={option}>
                        {({ selected }) => (
                          <div className={`flex items-center justify-center h-[50px] transition-all ${
                            selected
                              ? 'text-[#2B3A55] font-bold text-3xl scale-110'
                              : 'text-muted-foreground text-xl opacity-60'
                          }`}>
                            {name.includes('Hour') ? `${option}時` : `${option}分`}
                          </div>
                        )}
                      </Picker.Item>
                    ))}
                  </Picker.Column>
                ))}
              </Picker>
            </div>

            {/* ラベル表示 */}
            <div className="grid grid-cols-4 gap-2 mt-3 text-center text-sm font-medium text-muted-foreground">
              <div className="flex items-center justify-center gap-1">
                <span className="text-lg">🌅</span>
                <span>開始</span>
              </div>
              <div></div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-lg">🌙</span>
                <span>終了</span>
              </div>
              <div></div>
            </div>
          </div>

          {/* プレビュー */}
          <div className="relative overflow-hidden p-5 bg-gradient-to-br from-accent/30 via-secondary/20 to-accent/20 rounded-2xl border-2 border-accent/50 shadow-lg">
            <div className="absolute top-0 right-0 text-6xl opacity-10">⏰</div>
            <div className="relative text-center">
              <p className="text-sm text-muted-foreground mb-3 font-medium">選択中の時間</p>
              <div className="flex items-center justify-center gap-3">
                <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                  <span className="text-2xl font-bold text-[#2B3A55]">{pickerValue.startHour}:{pickerValue.startMinute}</span>
                </div>
                <span className="text-xl text-muted-foreground">→</span>
                <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm">
                  <span className="text-2xl font-bold text-[#2B3A55]">{pickerValue.endHour}:{pickerValue.endMinute}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl border-2 text-lg h-14 hover:bg-muted/50 transition-all font-semibold flex-1"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleConfirm}
            className="rounded-2xl bg-gradient-to-r from-accent via-accent/90 to-secondary/80 hover:from-accent/90 hover:via-accent/80 hover:to-secondary/70 shadow-lg text-lg h-14 font-bold transition-all flex-1"
          >
            <Clock className="w-6 h-6 mr-2" />
            決定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
