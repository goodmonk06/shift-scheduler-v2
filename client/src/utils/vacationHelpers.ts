import type { DayRequest } from "../types/vacationTypes";

// localStorageから初期データを読み込む関数
export const loadFromStorage = (key: string): Map<number, DayRequest> => {
  if (typeof window === 'undefined') return new Map();
  const saved = localStorage.getItem(key);
  if (!saved) return new Map();
  try {
    const array = JSON.parse(saved);
    return new Map(array);
  } catch {
    return new Map();
  }
};

// 時間指定のテキストを生成
export const formatTimeText = (startTime: string, endTime: string): string => {
  const [startH, startM] = startTime.split(":");
  const [endH, endM] = endTime.split(":");

  const startDisplay = startM === "00" ? startH : `${startH}:${startM}`;
  const endDisplay = endM === "00" ? endH : `${endH}:${endM}`;

  // 両方とも分がある場合は二段表示
  if (startM !== "00" || endM !== "00") {
    return `${startDisplay}\n-${endDisplay}`;
  } else {
    return `${startDisplay}-${endDisplay}`;
  }
};

// リクエストタイプに応じた設定を取得
export const getRequestTypeConfig = (type: "休" | "有休" | "時間指定", isSubmitted: boolean, timeText?: string) => {
  const configs = {
    "休": {
      color: isSubmitted
        ? "bg-gradient-to-r from-success/40 to-success/30"
        : "bg-gradient-to-r from-success to-success/70",
      emoji: "🌸",
      text: "休"
    },
    "有休": {
      color: isSubmitted
        ? "bg-gradient-to-r from-secondary/40 to-secondary/30"
        : "bg-gradient-to-r from-secondary to-secondary/70",
      emoji: "💐",
      text: "有"
    },
    "時間指定": {
      color: isSubmitted
        ? "bg-gradient-to-r from-warning/40 to-warning/30"
        : "bg-gradient-to-r from-warning to-warning/70",
      emoji: "⏰",
      text: timeText || ""
    }
  };

  return configs[type];
};

// ホイールピッカーの選択肢を生成
export const pickerSelections = {
  startHour: Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")),
  startMinute: ["00", "15", "30", "45"],
  endHour: Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0")),
  endMinute: ["00", "15", "30", "45"],
};
