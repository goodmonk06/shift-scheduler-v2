# 次期実装ロードマップ

## Phase 1: フロントエンド統合（即実施）

### 1.1 ShiftEditor.tsxの修正
```typescript
// 新しい生成方式選択
const [generationMethod, setGenerationMethod] = useState<'rule_based' | 'time_slot'>('time_slot');

// APIエンドポイントの追加
const generateTimeSlotShift = api.shifts.generateTimeSlotBased.useMutation();
```

### 1.2 生成オプションUI
- ラジオボタンで生成方式選択
- 段階生成オプション（パート→正社員→管理者）
- プログレスバー表示

## Phase 2: AI制約変換（1-2日）

### 2.1 職員管理画面の拡張
```typescript
// /client/src/components/EmployeeManagement.tsx
interface EmployeeConstraint {
  id: string;
  description: string;  // "月曜午前は勤務不可"
  timeSlots?: boolean[]; // AI変換後の48スロット配列
}
```

### 2.2 OpenAI API統合
```typescript
// /server/aiConstraintConverter.ts
export async function convertNaturalLanguageToSlots(
  constraint: string
): Promise<boolean[]> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "制約文を48個の30分時間スロットに変換してください"
      },
      {
        role: "user",
        content: constraint
      }
    ]
  });
  // パース処理
  return parseToTimeSlots(completion.choices[0].message.content);
}
```

### 2.3 自動変換トリガー
- 保存ボタン押下時に自動実行
- バックグラウンドで変換・保存
- 変換結果のプレビュー表示

## Phase 3: 段階的生成（2-3日）

### 3.1 生成ステップ管理
```typescript
interface GenerationStep {
  step: number;
  targetGroup: 'パート' | '正社員' | '管理者';
  status: 'pending' | 'in_progress' | 'completed' | 'confirmed';
  assignments: ShiftAssignment[];
}
```

### 3.2 ステップ毎の確認UI
- 各段階での結果表示
- 手動修正機能
- 次ステップへの引き継ぎ

### 3.3 ロールバック機能
- 前ステップへの戻り
- 部分的な再生成

## Phase 4: 高度な最適化（3-5日）

### 4.1 公平性スコアリング
```typescript
interface FairnessMetrics {
  workDaysVariance: number;      // 勤務日数のばらつき
  nightShiftDistribution: number; // 夜勤の公平性
  weekendBalance: number;         // 週末勤務の公平性
}
```

### 4.2 機械学習による最適化
- 過去のシフトパターン学習
- 職員の好みの学習
- 最適配置の予測

### 4.3 リアルタイム調整
- ドラッグ&ドロップでの即座の再計算
- 影響範囲の可視化
- 自動補完提案

## 実装優先順位

1. **今すぐ**: Phase 1.1-1.2（フロントエンド統合）
2. **今週中**: Phase 2.1-2.2（AI制約変換の基本実装）
3. **来週**: Phase 3.1-3.3（段階的生成）
4. **将来**: Phase 4（高度な最適化）

## 技術的準備

### 必要なパッケージ
```bash
# OpenAI API
pnpm add openai

# 進捗表示
pnpm add react-step-progress-bar

# ドラッグ&ドロップ
pnpm add @dnd-kit/sortable
```

### 環境変数追加
```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview
```

### データベーススキーマ拡張
```sql
-- 制約テーブル
CREATE TABLE employee_constraints (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  constraint_text TEXT,
  time_slots JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

## 成功指標

- **パフォーマンス**: 生成時間を2秒以内に
- **精度**: 制約違反率を1%未満に
- **利便性**: 3クリック以内でシフト生成完了
- **満足度**: 職員からの修正要求を50%削減

## リスクと対策

| リスク | 対策 |
|-------|------|
| AI APIの応答遅延 | キャッシュとバッチ処理 |
| 制約の矛盾 | 事前検証とエラーハンドリング |
| UIの複雑化 | プログレッシブディスクロージャー |
| データ整合性 | トランザクション管理強化 |