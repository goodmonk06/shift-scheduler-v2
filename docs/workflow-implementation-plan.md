# シフト管理システム完全ワークフロー実装計画

## 📋 概要
希望休申請から最終確定まで、完全な8段階ワークフローを実装する詳細計画

## 🔍 現状分析結果

### ✅ 既存機能（活用可能）
1. **データベース**
   - shifts テーブル: 8段階ステータス完備
   - shiftDetails: generatedBy フィールドで生成方法を追跡
   - leaveRequests: 希望休申請管理
   - changeProposals: 変更提案システム（基本機能のみ）
   - parentShiftId: シフト派生関係の追跡

2. **バックエンド**
   - 3つの生成方法（時間スロット、ルールベース、AI）
   - transitionPhase: フェーズ遷移API
   - 希望休の一括承認機能
   - 基本的な通知取得API

3. **フロントエンド**
   - ShiftEditor: 生成・遷移ボタン実装済み
   - VacationRequest: 希望休申請UI完成
   - EmployeeHome: 基本カレンダー表示
   - ChangeProposals: 基本的な変更提案管理

### ❌ 不足機能（要実装）
1. **ワークフロー管理ダッシュボード**
2. **リアルタイムステータス表示**
3. **時間帯別人員不足表示**
4. **仮確定シフトへの職員フィードバック機能**
5. **各フェーズでの自動通知システム**
6. **修正希望の一括処理機能**

## 🏗️ 実装計画

### Phase 1: データベース拡張（Day 1）

#### 1.1 新規テーブル追加
```sql
-- 通知履歴テーブル
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipientType ENUM('all', 'employee', 'admin'),
  recipientId INT,
  shiftId INT,
  notificationType ENUM('status_change', 'deadline', 'feedback_request', 'approval'),
  title VARCHAR(255),
  message TEXT,
  isRead BOOLEAN DEFAULT FALSE,
  readAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 修正希望テーブル（changeProposalsとは別）
CREATE TABLE modification_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shiftId INT NOT NULL,
  employeeId INT NOT NULL,
  requestDate DATE NOT NULL,
  requestType ENUM('swap', 'off', 'time_change'),
  currentAssignment VARCHAR(100),
  requestedAssignment VARCHAR(100),
  reason TEXT,
  priority ENUM('low', 'medium', 'high'),
  status ENUM('pending', 'approved', 'rejected', 'processed'),
  processedAt TIMESTAMP,
  processedBy INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ワークフロー履歴テーブル
CREATE TABLE workflow_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shiftId INT NOT NULL,
  fromStatus VARCHAR(50),
  toStatus VARCHAR(50),
  changedBy INT,
  comment TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 1.2 既存テーブルのカラム追加
```sql
-- employees テーブル
ALTER TABLE employees ADD COLUMN notificationEnabled BOOLEAN DEFAULT TRUE;
ALTER TABLE employees ADD COLUMN notificationEmail VARCHAR(320);
ALTER TABLE employees ADD COLUMN lineUserId VARCHAR(100);

-- shifts テーブル
ALTER TABLE shifts ADD COLUMN feedbackDeadline TIMESTAMP;
ALTER TABLE shifts ADD COLUMN notificationsSent JSON;
```

### Phase 2: バックエンドAPI拡張（Day 2-3）

#### 2.1 ワークフロー管理API (`server/routers.ts` に追加)
```typescript
// ワークフロー管理ルーター
workflow: router({
  // 現在のワークフローステータスを取得
  getStatus: protectedProcedure
    .input(z.object({ shiftId: z.number() }))
    .query(async ({ input }) => {
      // ステータス、期限、進捗率を返す
    }),

  // 次のフェーズへの移行可能性をチェック
  canTransition: protectedProcedure
    .input(z.object({
      shiftId: z.number(),
      targetStatus: z.string()
    }))
    .query(async ({ input }) => {
      // ビジネスルールに基づいて判定
    }),

  // 一括通知送信
  sendBulkNotifications: protectedProcedure
    .input(z.object({
      shiftId: z.number(),
      notificationType: z.enum(['tentative_published', 'feedback_request', 'final_confirmed'])
    }))
    .mutation(async ({ input }) => {
      // 全職員に通知を送信
    }),
})
```

#### 2.2 修正希望管理API
```typescript
modificationRequests: router({
  // 職員からの修正希望を作成
  create: protectedProcedure
    .input(z.object({
      shiftId: z.number(),
      requests: z.array(z.object({
        date: z.string(),
        type: z.enum(['swap', 'off', 'time_change']),
        current: z.string(),
        requested: z.string(),
        reason: z.string(),
        priority: z.enum(['low', 'medium', 'high'])
      }))
    }))
    .mutation(async ({ input }) => {
      // 修正希望を保存
    }),

  // 管理者が修正希望を処理
  process: protectedProcedure
    .input(z.object({
      requestIds: z.array(z.number()),
      action: z.enum(['approve', 'reject']),
      comment: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      // 一括処理
    }),
})
```

### Phase 3: 管理者側UI実装（Day 4-6）

#### 3.1 ワークフロー管理ダッシュボード
`client/src/components/admin/WorkflowDashboard.tsx`

```typescript
export function WorkflowDashboard() {
  // 実装内容:
  // 1. 現在のステータス表示（大きなステータスバッジ）
  // 2. 次のアクションボタン（文脈に応じた表示）
  // 3. 各フェーズの期限表示
  // 4. 進捗インジケーター
  // 5. 通知送信ボタン
}
```

#### 3.2 希望休提出状況モニター
`client/src/components/admin/VacationSubmissionMonitor.tsx`

```typescript
export function VacationSubmissionMonitor() {
  // 実装内容:
  // 1. 提出/未提出の職員リスト
  // 2. リマインダー送信機能
  // 3. 締切延長機能
  // 4. 一括承認ボタン
}
```

#### 3.3 時間帯別人員配置ビュー
`client/src/components/admin/TimeSlotStaffingView.tsx`

```typescript
export function TimeSlotStaffingView() {
  // 実装内容:
  // 1. 30分刻みの時間軸
  // 2. 各時間帯の必要/配置人数表示
  // 3. 不足箇所の赤色ハイライト
  // 4. ドラッグ&ドロップでの調整
}
```

#### 3.4 修正希望管理パネル
`client/src/components/admin/ModificationRequestPanel.tsx`

```typescript
export function ModificationRequestPanel() {
  // 実装内容:
  // 1. 優先度別ソート表示
  // 2. 一括承認/却下機能
  // 3. 代替案提示機能
  // 4. 影響シミュレーション表示
}
```

### Phase 4: 職員側UI実装（Day 7-8）

#### 4.1 ホーム画面の拡張
`client/src/components/employee/EmployeeHomeEnhanced.tsx`

```typescript
export function EmployeeHomeEnhanced() {
  // 追加実装:
  // 1. ワークフローステータスバッジ
  // 2. 次のアクション表示
  // 3. 期限カウントダウン
  // 4. 通知センター
}
```

#### 4.2 仮確定シフト確認画面
`client/src/components/employee/TentativeShiftView.tsx`

```typescript
export function TentativeShiftView() {
  // 実装内容:
  // 1. 月間カレンダービュー
  // 2. 自分のシフト詳細表示
  // 3. 修正希望ボタン
  // 4. 確認済みマーク機能
}
```

#### 4.3 修正希望申請フォーム
`client/src/components/employee/ModificationRequestForm.tsx`

```typescript
export function ModificationRequestForm() {
  // 実装内容:
  // 1. カレンダーから日付選択
  // 2. 変更種別選択（交換/休み/時間変更）
  // 3. 理由入力（テンプレート付き）
  // 4. 優先度設定
  // 5. 一括送信機能
}
```

### Phase 5: 通知システム実装（Day 9）

#### 5.1 通知サービス
`server/services/notificationService.ts`

```typescript
export class NotificationService {
  // 各フェーズでの自動通知
  async notifyStatusChange(shiftId: number, newStatus: string) {}

  // 締切リマインダー
  async sendDeadlineReminder(shiftId: number, daysBeforeDeadline: number) {}

  // 個別通知
  async notifyEmployee(employeeId: number, message: string) {}

  // 一括通知
  async notifyAllEmployees(shiftId: number, message: string) {}
}
```

#### 5.2 通知UI
`client/src/components/NotificationCenter.tsx`

```typescript
export function NotificationCenter() {
  // 実装内容:
  // 1. 未読通知数バッジ
  // 2. 通知リスト（時系列）
  // 3. 既読管理
  // 4. フィルタリング機能
}
```

### Phase 6: 統合テスト（Day 10）

#### 6.1 テストシナリオ
1. **完全フロー確認**
   - 希望休申請 → 自動生成 → 仮確定 → 修正希望 → 最終確定

2. **エッジケース**
   - 締切超過処理
   - 権限チェック
   - 同時編集の制御

3. **パフォーマンス**
   - 27名の職員での動作確認
   - 通知の送信速度
   - UI の応答性

## 📊 実装優先順位

### 🔴 最優先（Phase 1-2）
1. ワークフローステータス表示
2. 仮確定 → 職員通知機能
3. 修正希望受付機能

### 🟡 高優先（Phase 3-4）
1. 時間帯別人員表示
2. 修正希望一括処理
3. 通知センター

### 🟢 中優先（Phase 5-6）
1. 自動リマインダー
2. 詳細な統計表示
3. 履歴管理

## ✅ 各フェーズ完了時の確認項目

### Phase 1 完了確認
- [ ] 全テーブル作成完了
- [ ] マイグレーション実行成功
- [ ] スキーマドキュメント更新

### Phase 2 完了確認
- [ ] API エンドポイント全実装
- [ ] API テスト作成
- [ ] Postman コレクション作成

### Phase 3 完了確認
- [ ] 管理者ダッシュボード動作確認
- [ ] ステータス遷移の正常動作
- [ ] 通知送信機能確認

### Phase 4 完了確認
- [ ] 職員画面の動作確認
- [ ] 修正希望申請フロー確認
- [ ] レスポンシブ対応確認

### Phase 5 完了確認
- [ ] 通知の送受信確認
- [ ] 既読管理動作確認
- [ ] パフォーマンステスト合格

### Phase 6 完了確認
- [ ] E2Eテスト全項目合格
- [ ] ユーザー受け入れテスト完了
- [ ] 本番環境デプロイ準備完了

## 🎯 成功指標

1. **機能完成度**: 全8フェーズが正常動作
2. **ユーザビリティ**: 3クリック以内で主要操作完了
3. **パフォーマンス**: 全画面3秒以内に表示
4. **通知到達率**: 95%以上の職員に通知到達
5. **エラー率**: 運用エラー1%未満

## 📝 注意事項

- 既存の `generatedBy: 'leave_request'` で保護された休暇申請は変更不可
- ステータス遷移は必ず定義されたルールに従う
- 通知は opt-in 方式（職員が通知を有効化している場合のみ）
- 修正希望は締切後のみ受付
- 全ての操作は監査ログに記録

## 🚀 次のステップ

1. このプランの承認を得る
2. Phase 1 のデータベース設計から開始
3. 毎日の進捗をトラッキング
4. 各 Phase 完了時にレビューを実施