// リクエストタイプの設定を取得
export const getTypeConfig = (type: "休" | "有休" | "時間指定") => {
  const configs = {
    "休": { emoji: "🌸", color: "bg-success/10 text-success border-success/20", label: "休" },
    "有休": { emoji: "💐", color: "bg-secondary/10 text-primary border-secondary/20", label: "有休" },
    "時間指定": { emoji: "⏰", color: "bg-warning/10 text-warning border-warning/20", label: "時間指定" },
  };
  return configs[type];
};

// 日付をフォーマット
export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// 締切日時をフォーマット
export const formatDeadline = (deadline: Date) => {
  return deadline.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ステータスの設定を取得
export const getStatusConfig = (status: "pending" | "approved" | "rejected") => {
  const configs = {
    pending: { label: "未承認", color: "bg-warning", icon: "Clock" },
    approved: { label: "承認済", color: "bg-success", icon: "Check" },
    rejected: { label: "却下", color: "bg-destructive", icon: "X" },
  };
  return configs[status];
};
