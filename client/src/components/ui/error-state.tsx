import { AlertCircle, RefreshCw, WifiOff, ServerCrash } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";

type ErrorType = "network" | "server" | "notfound" | "permission" | "generic";

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  showDetails?: boolean;
  error?: Error;
}

const errorConfig: Record<ErrorType, { icon: any; title: string; message: string }> = {
  network: {
    icon: WifiOff,
    title: "ネットワークエラー",
    message: "インターネット接続を確認してください。",
  },
  server: {
    icon: ServerCrash,
    title: "サーバーエラー",
    message: "サーバーに接続できません。しばらくしてから再度お試しください。",
  },
  notfound: {
    icon: AlertCircle,
    title: "データが見つかりません",
    message: "お探しのデータは存在しないか、削除された可能性があります。",
  },
  permission: {
    icon: AlertCircle,
    title: "アクセス権限がありません",
    message: "この操作を実行する権限がありません。",
  },
  generic: {
    icon: AlertCircle,
    title: "エラーが発生しました",
    message: "予期しないエラーが発生しました。",
  },
};

export function ErrorState({
  type = "generic",
  title,
  message,
  onRetry,
  retryLabel = "再試行",
  showDetails = false,
  error,
}: ErrorStateProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <Card className="p-8 text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon className="w-8 h-8 text-destructive" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title || config.title}</h3>
        <p className="text-muted-foreground">{message || config.message}</p>

        {showDetails && error && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              エラー詳細を表示
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>

      {onRetry && (
        <Button onClick={onRetry} className="w-full sm:w-auto">
          <RefreshCw className="w-4 h-4 mr-2" />
          {retryLabel}
        </Button>
      )}
    </Card>
  );
}

// 空状態用のコンポーネント
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <Card className="p-12 text-center space-y-6">
      {icon && <div className="flex justify-center text-6xl">{icon}</div>}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {message && <p className="text-muted-foreground">{message}</p>}
      </div>

      {action && (
        <Button onClick={action.onClick} className="w-full sm:w-auto">
          {action.label}
        </Button>
      )}
    </Card>
  );
}
