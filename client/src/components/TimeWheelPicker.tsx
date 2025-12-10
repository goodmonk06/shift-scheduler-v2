import { useRef, useEffect, useState } from "react";

interface TimeWheelPickerProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
}

// 時間オプション生成（7:00〜21:00、30分刻み）
const generateHours = () => {
  const hours: string[] = [];
  for (let h = 7; h <= 21; h++) {
    hours.push(h.toString().padStart(2, '0'));
  }
  return hours;
};

const HOURS = generateHours();
const MINUTES = ['00', '30'];

// 個別ホイールコンポーネント
function Wheel({
  options,
  value,
  onChange,
  label
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 44;
  const visibleItems = 5;
  const [isScrolling, setIsScrolling] = useState(false);

  // 現在の値のインデックス
  const currentIndex = options.indexOf(value);

  // 初期スクロール位置を設定
  useEffect(() => {
    if (containerRef.current && currentIndex >= 0) {
      containerRef.current.scrollTop = currentIndex * itemHeight;
    }
  }, [currentIndex]);

  // スクロール終了時に最も近い項目にスナップ
  const handleScroll = () => {
    if (!containerRef.current) return;

    setIsScrolling(true);

    // デバウンス処理
    const timeout = setTimeout(() => {
      if (!containerRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(index, options.length - 1));

      // スナップ
      containerRef.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth'
      });

      if (options[clampedIndex] !== value) {
        onChange(options[clampedIndex]);
      }

      setIsScrolling(false);
    }, 100);

    return () => clearTimeout(timeout);
  };

  // アイテムをクリックして選択
  const handleItemClick = (index: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: 'smooth'
      });
      onChange(options[index]);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-blue-600 mb-1 font-medium">{label}</span>
      <div className="relative">
        {/* 選択エリアのハイライト */}
        <div
          className="absolute left-0 right-0 bg-blue-100 rounded-lg pointer-events-none z-0"
          style={{
            top: `${(visibleItems - 1) / 2 * itemHeight}px`,
            height: `${itemHeight}px`,
          }}
        />

        {/* グラデーションオーバーレイ（上） */}
        <div
          className="absolute top-0 left-0 right-0 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-10"
          style={{ height: `${itemHeight * 1.5}px` }}
        />

        {/* グラデーションオーバーレイ（下） */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10"
          style={{ height: `${itemHeight * 1.5}px` }}
        />

        {/* スクロールコンテナ */}
        <div
          ref={containerRef}
          className="overflow-y-auto scrollbar-hide relative z-0"
          style={{
            height: `${visibleItems * itemHeight}px`,
            scrollSnapType: 'y mandatory',
          }}
          onScroll={handleScroll}
        >
          {/* 上部パディング */}
          <div style={{ height: `${((visibleItems - 1) / 2) * itemHeight}px` }} />

          {options.map((option, index) => {
            const isSelected = option === value;
            return (
              <div
                key={option}
                onClick={() => handleItemClick(index)}
                className={`
                  flex items-center justify-center cursor-pointer transition-all duration-150
                  ${isSelected
                    ? 'text-blue-700 font-bold text-xl'
                    : 'text-gray-400 text-lg hover:text-gray-600'
                  }
                `}
                style={{
                  height: `${itemHeight}px`,
                  scrollSnapAlign: 'center',
                }}
              >
                {option}
              </div>
            );
          })}

          {/* 下部パディング */}
          <div style={{ height: `${((visibleItems - 1) / 2) * itemHeight}px` }} />
        </div>
      </div>
    </div>
  );
}

export function TimeWheelPicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
}: TimeWheelPickerProps) {
  // 時間を分解
  const [startHour, startMinute] = startTime.split(':');
  const [endHour, endMinute] = endTime.split(':');

  const handleStartHourChange = (hour: string) => {
    onStartTimeChange(`${hour}:${startMinute}`);
  };

  const handleStartMinuteChange = (minute: string) => {
    onStartTimeChange(`${startHour}:${minute}`);
  };

  const handleEndHourChange = (hour: string) => {
    onEndTimeChange(`${hour}:${endMinute}`);
  };

  const handleEndMinuteChange = (minute: string) => {
    onEndTimeChange(`${endHour}:${minute}`);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border-2 border-blue-200">
      <div className="flex items-center justify-center gap-2">
        {/* 開始時刻 */}
        <div className="flex items-center gap-1 bg-blue-50 rounded-xl p-2">
          <Wheel
            options={HOURS}
            value={startHour}
            onChange={handleStartHourChange}
            label="時"
          />
          <span className="text-2xl text-blue-400 font-light mx-1">:</span>
          <Wheel
            options={MINUTES}
            value={startMinute}
            onChange={handleStartMinuteChange}
            label="分"
          />
        </div>

        {/* 矢印 */}
        <div className="flex flex-col items-center px-3">
          <span className="text-2xl text-blue-400">→</span>
        </div>

        {/* 終了時刻 */}
        <div className="flex items-center gap-1 bg-blue-50 rounded-xl p-2">
          <Wheel
            options={HOURS}
            value={endHour}
            onChange={handleEndHourChange}
            label="時"
          />
          <span className="text-2xl text-blue-400 font-light mx-1">:</span>
          <Wheel
            options={MINUTES}
            value={endMinute}
            onChange={handleEndMinuteChange}
            label="分"
          />
        </div>
      </div>

      {/* 選択中の時間表示 */}
      <div className="mt-3 text-center">
        <span className="text-sm text-blue-600 font-medium">
          {startTime} 〜 {endTime}
        </span>
      </div>
    </div>
  );
}
