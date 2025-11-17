# ローディング & エラー処理ガイド

アプリケーション全体で統一されたローディング状態とエラーハンドリングを実装するためのガイドです。

## 📦 新規追加されたコンポーネント

### 1. ローディング関連

#### `LoadingSpinner` - シンプルなスピナー
```tsx
import { LoadingSpinner, LoadingInline, LoadingScreen, LoadingOverlay } from "@/components/ui/loading-spinner";

// 基本的な使い方
<LoadingSpinner size="md" />

// インラインローディング (テキスト付き)
<LoadingInline message="データを取得中..." size="sm" />

// フルスクリーンローディング
<LoadingScreen message="読み込み中..." />

// オーバーレイローディング (カード内など)
<div className="relative">
  <LoadingOverlay message="保存中..." />
  {/* コンテンツ */}
</div>
```

#### `Skeleton` - スケルトンローディング
```tsx
import {
  Skeleton,
  CardSkeleton,
  ListSkeleton,
  CalendarSkeleton,
  StatCardSkeleton
} from "@/components/ui/loading-skeleton";

// 基本的なスケルトン
<Skeleton className="h-4 w-[200px]" />

// カード用スケルトン
<CardSkeleton />

// リスト用スケルトン (3つ表示)
<ListSkeleton count={3} />

// カレンダー用スケルトン
<CalendarSkeleton />

// 統計カード用スケルトン
<StatCardSkeleton />
```

### 2. エラー処理関連

#### `ErrorBoundary` - エラーバウンダリー
```tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";

// アプリ全体を囲む
<ErrorBoundary>
  <App />
</ErrorBoundary>

// 特定のセクションのみ
<ErrorBoundary fallback={<div>カスタムエラー画面</div>}>
  <ComplexComponent />
</ErrorBoundary>
```

#### `ErrorState` - エラー表示コンポーネント
```tsx
import { ErrorState, EmptyState } from "@/components/ui/error-state";

// ネットワークエラー
<ErrorState
  type="network"
  onRetry={() => refetch()}
/>

// サーバーエラー
<ErrorState
  type="server"
  onRetry={() => refetch()}
  showDetails={true}
  error={error}
/>

// カスタムエラーメッセージ
<ErrorState
  type="generic"
  title="データの保存に失敗しました"
  message="もう一度お試しください。"
  onRetry={() => retry()}
/>

// 空状態
<EmptyState
  icon="📭"
  title="データがありません"
  message="新しいデータを追加してください。"
  action={{
    label: "追加する",
    onClick: () => navigate('/add')
  }}
/>
```

### 3. カスタムフック

#### `useAsync` - 非同期処理フック
```tsx
import { useAsync } from "@/hooks/useAsync";

function MyComponent() {
  const { data, isLoading, isError, error, refetch } = useAsync(
    () => fetchData(),
    {
      onSuccess: (data) => console.log("Success:", data),
      onError: (error) => console.error("Error:", error),
      immediate: true, // 即座に実行
    }
  );

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorState type="generic" error={error} onRetry={refetch} />;

  return <div>{data}</div>;
}
```

#### `useMutation` - ミューテーションフック
```tsx
import { useMutation } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";

function MyComponent() {
  const toast = useToast();

  const { mutate, isLoading } = useMutation(
    (data) => saveData(data),
    {
      onSuccess: () => toast.success("保存しました"),
      onError: (error) => toast.error("保存に失敗しました"),
    }
  );

  const handleSave = async () => {
    try {
      await mutate({ name: "test" });
    } catch (error) {
      // エラーハンドリング
    }
  };

  return (
    <Button onClick={handleSave} disabled={isLoading}>
      {isLoading ? <LoadingInline message="保存中..." /> : "保存"}
    </Button>
  );
}
```

#### `useToast` - トースト通知フック
```tsx
import { useToast } from "@/hooks/useToast";

function MyComponent() {
  const toast = useToast();

  const handleAction = async () => {
    // Promise用
    toast.promise(
      saveData(),
      {
        loading: "保存中...",
        success: "保存しました",
        error: "保存に失敗しました",
      }
    );

    // 個別の通知
    toast.success("成功しました");
    toast.error("エラーが発生しました");
    toast.info("情報を更新しました");
    toast.warning("注意してください");
  };

  return <Button onClick={handleAction}>実行</Button>;
}
```

## 🎯 実装パターン

### パターン1: データ取得画面

```tsx
import { useAsync } from "@/hooks/useAsync";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { ErrorState } from "@/components/ui/error-state";

function DataListPage() {
  const { data, isLoading, isError, error, refetch } = useAsync(
    () => fetchDataList()
  );

  if (isLoading) return <ListSkeleton count={5} />;

  if (isError) {
    return (
      <ErrorState
        type="network"
        error={error}
        onRetry={refetch}
        showDetails={true}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="データがありません"
        action={{
          label: "新規作成",
          onClick: () => navigate('/create')
        }}
      />
    );
  }

  return (
    <div>
      {data.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  );
}
```

### パターン2: フォーム送信

```tsx
import { useMutation } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import { LoadingOverlay } from "@/components/ui/loading-spinner";

function FormComponent() {
  const toast = useToast();
  const navigate = useNavigate();

  const { mutate, isLoading } = useMutation(
    (formData) => submitForm(formData),
    {
      onSuccess: () => {
        toast.success("保存しました");
        navigate('/success');
      },
      onError: (error) => {
        toast.error("保存に失敗しました", {
          description: error.message
        });
      },
    }
  );

  const handleSubmit = async (formData) => {
    await mutate(formData);
  };

  return (
    <div className="relative">
      {isLoading && <LoadingOverlay message="保存中..." />}

      <form onSubmit={handleSubmit}>
        {/* フォームフィールド */}
        <Button type="submit" disabled={isLoading}>
          保存
        </Button>
      </form>
    </div>
  );
}
```

### パターン3: ダイアログ内の処理

```tsx
function ActionDialog({ open, onOpenChange }) {
  const toast = useToast();
  const { mutate, isLoading } = useMutation((id) => deleteItem(id));

  const handleDelete = async () => {
    try {
      await mutate(itemId);
      toast.success("削除しました");
      onOpenChange(false);
    } catch (error) {
      // エラーはuseMutationのonErrorで処理済み
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>本当に削除しますか?</DialogTitle>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? <LoadingInline message="削除中..." /> : "削除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## 🚀 既存コンポーネントへの適用例

### VacationManagement.tsx

```tsx
// 変更前
const [isLoadingStatus, setIsLoadingStatus] = useState(false);

const loadSubmissionStatus = async () => {
  try {
    setIsLoadingStatus(true);
    const status = await leaveRequestService.getSubmissionStatus(currentShiftId);
    setSubmissionStatus(status);
  } catch (error) {
    console.error("提出状況の取得に失敗しました:", error);
    toast.error("提出状況の取得に失敗しました");
  } finally {
    setIsLoadingStatus(false);
  }
};

// 変更後
const { data: submissionStatus, isLoading, error, refetch } = useAsync(
  () => leaveRequestService.getSubmissionStatus(currentShiftId),
  {
    immediate: false,
    onError: () => toast.error("提出状況の取得に失敗しました"),
  }
);

// UIで使用
{isLoading ? <LoadingSpinner /> : <SubmissionStatusDialog status={submissionStatus} />}
{error && <ErrorState type="network" onRetry={refetch} />}
```

## 📝 ベストプラクティス

### 1. ローディング状態
- データ取得中は必ずスケルトンまたはスピナーを表示
- 長時間かかる処理にはプログレスバーを追加検討
- ボタン押下時は即座に視覚的フィードバックを提供

### 2. エラー処理
- ネットワークエラー、サーバーエラーを区別
- ユーザーに次のアクションを明示 (再試行ボタンなど)
- 開発環境ではエラー詳細を表示

### 3. 空状態
- データが0件の場合も考慮
- 次のアクションを提案 (追加ボタンなど)

### 4. 楽観的UI
- 成功する前提でUIを更新
- 失敗時はロールバック

## 🔄 マイグレーション手順

1. `ErrorBoundary`でアプリ全体を囲む
2. データ取得処理を`useAsync`に置き換え
3. ミューテーション処理を`useMutation`に置き換え
4. ローディング表示をスケルトンに統一
5. エラー表示を`ErrorState`に統一
