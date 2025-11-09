/**
 * ローディング状態とエラー処理のヘルパー関数
 * 既存コンポーネントを簡単に移行できるようにするユーティリティ
 */

import { LoadingSpinner, LoadingInline } from "../components/ui/loading-spinner";
import { ErrorState } from "../components/ui/error-state";

/**
 * 標準的なローディング・エラー・空状態のレンダリングパターン
 */
export interface RenderStateOptions<T> {
  isLoading: boolean;
  error: Error | null;
  data: T | null;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  isEmpty?: (data: T) => boolean;
  onRetry?: () => void;
}

export function renderWithState<T>({
  isLoading,
  error,
  data,
  loadingComponent,
  errorComponent,
  emptyComponent,
  isEmpty,
  onRetry,
}: RenderStateOptions<T>): { shouldRender: boolean; component: React.ReactNode | null } {
  // ローディング中
  if (isLoading) {
    return {
      shouldRender: false,
      component: loadingComponent || <LoadingSpinner />,
    };
  }

  // エラー状態
  if (error) {
    return {
      shouldRender: false,
      component: errorComponent || (
        <ErrorState
          type="generic"
          error={error}
          onRetry={onRetry}
          showDetails={true}
        />
      ),
    };
  }

  // データが空
  if (isEmpty && data && isEmpty(data)) {
    return {
      shouldRender: false,
      component: emptyComponent || null,
    };
  }

  // データあり - 通常のレンダリングを続行
  return {
    shouldRender: true,
    component: null,
  };
}

/**
 * ボタンのローディング状態を簡単に扱うヘルパー
 */
export function renderButtonContent(isLoading: boolean, label: string, loadingLabel?: string) {
  if (isLoading) {
    return <LoadingInline message={loadingLabel || `${label}中...`} size="sm" />;
  }
  return label;
}
