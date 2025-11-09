# ローディング & エラー処理 移行チェックリスト

このドキュメントは、既存コンポーネントを新しいローディング & エラー処理パターンに移行するためのチェックリストです。

## 📋 移行対象コンポーネント

### ✅ 完了
- [x] App.tsx - ErrorBoundary適用、LoadingScreen使用

### 🔄 優先度: 高
- [ ] EmployeeHome.tsx - 職員ホーム画面
- [ ] VacationManagement.tsx - 希望休管理
- [ ] ShiftEditor.tsx - シフト編集
- [ ] StaffManagement.tsx - 職員管理
- [ ] VacationRequest.tsx - 希望休申請

### 🔄 優先度: 中
- [ ] ShiftView.tsx - シフト確認
- [ ] ShiftCalendarView.tsx - カレンダー表示
- [ ] Statistics.tsx - 統計表示
- [ ] ServerManagement.tsx - サーバー管理
- [ ] AdminDashboard.tsx - 管理者ダッシュボード

### 🔄 優先度: 低
- [ ] ShiftCreation.tsx - シフト作成
- [ ] WorkTimeSlots.tsx - 勤務時間設定
- [ ] PositionGroups.tsx - ポジショングループ
- [ ] Settings.tsx - 設定画面
- [ ] その他の小さなコンポーネント

## 📝 移行手順 (コンポーネントごと)

### Step 1: インポート追加

```tsx
// 必要に応じて追加
import { useAsync, useMutation } from "../hooks/useAsync";
import { useToast } from "../hooks/useToast";
import { ListSkeleton, CardSkeleton } from "../components/ui/loading-skeleton";
import { LoadingSpinner, LoadingInline, LoadingOverlay } from "../components/ui/loading-spinner";
import { ErrorState, EmptyState } from "../components/ui/error-state";
```

### Step 2: useState + useEffect を useAsync に置き換え

**変更前:**
```tsx
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  async function loadData() {
    try {
      setIsLoading(true);
      const result = await fetchData();
      setData(result);
    } catch (err) {
      setError(err);
      toast.error("エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }
  loadData();
}, []);
```

**変更後:**
```tsx
const toast = useToast();
const { data, isLoading, isError, error, refetch } = useAsync(
  () => fetchData(),
  {
    onError: () => toast.error("エラーが発生しました"),
  }
);
```

### Step 3: ミューテーション処理を useMutation に置き換え

**変更前:**
```tsx
const [isSaving, setIsSaving] = useState(false);

const handleSave = async () => {
  try {
    setIsSaving(true);
    await saveData(formData);
    toast.success("保存しました");
  } catch (error) {
    toast.error("保存に失敗しました");
  } finally {
    setIsSaving(false);
  }
};
```

**変更後:**
```tsx
const { mutate, isLoading: isSaving } = useMutation(
  (data) => saveData(data),
  {
    onSuccess: () => toast.success("保存しました"),
    onError: () => toast.error("保存に失敗しました"),
  }
);

const handleSave = () => mutate(formData);
```

### Step 4: ローディング表示を統一

**変更前:**
```tsx
if (isLoading) {
  return <div>読み込み中...</div>;
}
```

**変更後:**
```tsx
if (isLoading) {
  return <ListSkeleton count={5} />; // または <LoadingSpinner />
}
```

### Step 5: エラー表示を統一

**変更前:**
```tsx
if (error) {
  return <div>エラーが発生しました: {error.message}</div>;
}
```

**変更後:**
```tsx
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
```

### Step 6: 空状態を追加

**変更前:**
```tsx
if (data.length === 0) {
  return <div>データがありません</div>;
}
```

**変更後:**
```tsx
if (data.length === 0) {
  return (
    <EmptyState
      icon="📭"
      title="データがありません"
      message="新しいデータを追加してください"
      action={{
        label: "追加する",
        onClick: () => navigate('/add')
      }}
    />
  );
}
```

### Step 7: ボタンのローディング状態

**変更前:**
```tsx
<Button disabled={isLoading}>
  {isLoading ? "保存中..." : "保存"}
</Button>
```

**変更後:**
```tsx
<Button disabled={isLoading}>
  {isLoading ? <LoadingInline message="保存中..." /> : "保存"}
</Button>
```

## 🎯 コンポーネント別の移行ポイント

### EmployeeHome.tsx
- [ ] 通知取得処理を `useAsync` に変更
- [ ] スケルトンローディング追加 (カレンダー用)
- [ ] エラー状態の表示改善

### VacationManagement.tsx
- [ ] 提出状況取得を `useAsync` に変更
- [ ] 一括承認を `useMutation` に変更
- [ ] リスト用スケルトン追加

### ShiftEditor.tsx
- [ ] シフトデータ取得を `useAsync` に変更
- [ ] 保存処理を `useMutation` に変更
- [ ] カレンダースケルトン追加

### StaffManagement.tsx
- [ ] 職員リスト取得を `useAsync` に変更
- [ ] CRUD操作を `useMutation` に変更
- [ ] テーブルスケルトン追加

## ✅ 移行完了の確認

各コンポーネントで以下を確認:

- [ ] ローディング中にスケルトンまたはスピナーが表示される
- [ ] エラー時に適切なエラーメッセージと再試行ボタンが表示される
- [ ] データが空の場合に EmptyState が表示される
- [ ] ミューテーション中はボタンが無効化される
- [ ] toast通知が適切に表示される
- [ ] ビルドエラーがない
- [ ] 既存の機能が正常に動作する

## 📊 進捗トラッキング

```
完了: 1 / 15 コンポーネント (6.7%)
高優先度: 0 / 5
中優先度: 0 / 5
低優先度: 0 / 5
```

## 🚀 次のアクション

1. 高優先度コンポーネントから順に移行
2. 各コンポーネント移行後にテスト
3. ビルド & デプロイ確認
4. 次のコンポーネントへ

---

**Note:** 一度に全て変更せず、1-2コンポーネントずつ移行してテストすることを推奨します。
