import { Loader2 } from "lucide-react";
import { cn } from "./utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <Loader2 className={cn("animate-spin text-primary", sizeClasses[size], className)} />
  );
}

// フルスクリーンローディング
interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "読み込み中..." }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// インラインローディング
interface LoadingInlineProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingInline({ message, size = "sm" }: LoadingInlineProps) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <LoadingSpinner size={size} />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

// オーバーレイローディング
interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "処理中..." }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      <div className="text-center space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
