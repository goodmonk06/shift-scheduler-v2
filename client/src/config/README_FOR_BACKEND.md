# 介護シフト管理システム - バックエンド統合ガイド

このディレクトリには、フロントエンドコードをバックエンドシステムに統合するための包括的なドキュメントが含まれています。

**最終更新**: 2025年11月8日  
**システムバージョン**: 2.0.0  
**フロントエンド**: React + TypeScript + Tailwind CSS  
**想定バックエンド**: Node.js + tRPC + Prisma + PostgreSQL

---

## 📚 ドキュメント一覧

### 1. [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - 統合ガイド
**最初に読むべきドキュメント**

- システム全体像の理解
- データベース設計と変更内容
- 統合手順（ステップ・バイ・ステップ）
- 環境構築と設定
- 動作確認方法
- トラブルシューティング

👉 **統合作業を始める前に必ずお読みください**

---

### 2. [API_REQUIREMENTS.md](./API_REQUIREMENTS.md) - API要件定義書
**API実装の詳細仕様**

- 全APIエンドポイントの仕様
- リクエスト/レスポンス型定義
- バリデーションルール
- エラーハンドリング規約
- テストケース例
- パフォーマンス要件

👉 **API実装時に参照してください**

---

### 3. [AI_GENERATION_GUIDE.md](./AI_GENERATION_GUIDE.md) - AI生成ガイド
**ChatGPT 4 mini統合の詳細**

- AI自動シフト生成の仕組み
- OpenAI API統合方法
- プロンプト設計
- 制約条件の扱い
- エラーハンドリング
- コスト管理

👉 **シフトAI生成機能の実装時に参照してください**

---

### 4. [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) - 統合チェックリスト
**作業進捗管理用**

- データベースマイグレーション
- APIエンドポイント実装
- フロントエンド統合
- テスト実施
- デプロイ準備

👉 **統合作業の進捗管理に使用してください**

---

## 🎯 システム概要

### 職員画面（スマホ最適化）
1. **ホーム**: 次回シフト、今月のスケジュール、緊急連絡ボタン
2. **希望休申請**: カレンダーUIで希望休・有休・時間指定を入力
3. **シフト確認**:
   - 仮確定タブ: AI生成後の追加調整（緊急の希望休申請）
   - 確定タブ: 最終確定済みシフト
   - 実績報告タブ: 勤務後の実績入力
4. **設定**: テーマ、ヘッダー画像、フォントサイズのカスタマイズ

### 管理者画面（PC最適化）
1. **ダッシュボード**: 全体の状況把握
2. **希望休管理**: 職員からの希望休申請の承認・却下
3. **シフト生成**: AI自動生成（ChatGPT 4 mini）+ 手動調整
4. **シフト編集**: カレンダー/テーブルビューでシフト編集
5. **シフト一覧**: 過去・現在のシフト管理
6. **職員管理**: 職員情報・役職・制約条件の管理
7. **必須人員設定**: 日付・時間帯別の最低必要人数設定
8. **職位グループ**: 役職別の優先度・制約設定
9. **勤務時間帯**: シフトタイプ（早番・遅番・夜勤）の定義
10. **職場ルール**: 連続勤務制限、休日間隔などのルール設定
11. **統計**: 勤務実績の分析とレポート
12. **アーカイブ**: 過去シフトの保存と参照

---

## 🔄 シフト生成フロー（6段階）

```
① 希望休収集
   ↓
② AI自動生成（ChatGPT 4 mini）
   ↓
③ 仮確定（管理者が確認・調整）
   ↓
④ 仮確定改（職員からの追加希望 + 管理者調整）
   ↓
⑤ 最終確定（確定シフトの公開）
   ↓
⑥ 実績報告（勤務後の実績入力）
```

### 各段階の詳細

| 段階 | ステータス | 操作者 | 説明 |
|-----|-----------|--------|------|
| ① 希望休収集 | `draft` | 職員 | 希望休申請期間中に職員が入力 |
| ② AI生成 | `draft` | システム | ChatGPT 4 miniが制約条件を考慮して自動生成 |
| ③ 仮確定 | `tentative` | 管理者 | 管理者が内容を確認・調整して仮公開 |
| ④ 仮確定改 | `tentative_revised` | 職員→管理者 | やむを得ない理由での追加希望受付 |
| ⑤ 最終確定 | `confirmed` | 管理者 | 最終確定してシフト確定 |
| ⑥ 実績報告 | `actual` | 職員 | 実際の勤務時間を報告（残業・早退など） |

---

## 🚀 クイックスタート

### Step 1: ドキュメントを読む
```bash
# 統合ガイドを開く
cat config/INTEGRATION_GUIDE.md

# API要件定義書を開く
cat config/API_REQUIREMENTS.md

# AI生成ガイドを開く
cat config/AI_GENERATION_GUIDE.md
```

### Step 2: データベースマイグレーション
```sql
-- 1. LeaveRequestテーブルの拡張
ALTER TABLE "LeaveRequest"
ADD COLUMN "leaveType" VARCHAR(20) NOT NULL DEFAULT '休',
ADD COLUMN "startTime" VARCHAR(5),
ADD COLUMN "endTime" VARCHAR(5),
ADD COLUMN "isAdditional" BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Shiftテーブルの拡張
ALTER TABLE "Shift"
ADD COLUMN "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
ADD COLUMN "leaveRequestDeadline" TIMESTAMP,
ADD COLUMN "additionalRequestDeadline" TIMESTAMP,
ADD COLUMN "generatedBy" VARCHAR(20) DEFAULT 'manual',
ADD COLUMN "aiPrompt" TEXT,
ADD COLUMN "aiResponse" JSONB;

-- 3. ShiftActualテーブルの新規作成（実績報告用）
CREATE TABLE "ShiftActual" (
  "id" SERIAL PRIMARY KEY,
  "shiftDetailId" INTEGER NOT NULL,
  "actualStartTime" VARCHAR(5),
  "actualEndTime" VARCHAR(5),
  "note" TEXT,
  "reportedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "approvedAt" TIMESTAMP,
  "approvedBy" INTEGER,
  "status" VARCHAR(20) NOT NULL DEFAULT 'reported',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_shift_detail" FOREIGN KEY ("shiftDetailId") 
    REFERENCES "ShiftDetail"("id") ON DELETE CASCADE
);

-- 4. StaffSettingsテーブルの新規作成（職員設定用）
CREATE TABLE "StaffSettings" (
  "id" SERIAL PRIMARY KEY,
  "employeeId" INTEGER NOT NULL UNIQUE,
  "theme" VARCHAR(50) DEFAULT 'default',
  "headerImage" VARCHAR(50) DEFAULT 'flowers',
  "fontSize" VARCHAR(20) DEFAULT 'medium',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "fk_employee" FOREIGN KEY ("employeeId") 
    REFERENCES "Employee"("id") ON DELETE CASCADE
);
```

### Step 3: 環境変数の設定
```bash
# .env ファイルに追加
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-mini
OPENAI_MAX_TOKENS=4000
```

### Step 4: APIエンドポイントの実装
```typescript
// 主要なエンドポイント（詳細はAPI_REQUIREMENTS.mdを参照）

// 希望休関連
- leaveRequests.createBatch      // 一括作成
- leaveRequests.createAdditional // 追加希望申請
- leaveRequests.getByEmployee    // 職員別取得

// シフト関連
- shifts.generateWithAI          // AI自動生成
- shifts.updateStatus            // ステータス更新
- shifts.setDeadlines            // 締め切り設定

// 実績報告関連
- shiftActuals.create            // 実績報告作成
- shiftActuals.approve           // 実績報告承認

// 設定関連
- staffSettings.get              // 設定取得
- staffSettings.update           // 設定更新
```

### Step 5: フロントエンドの統合
```typescript
// services/*.ts のProductionクラスを実装

// 例: vacationService.ts
export class VacationServiceProduction extends VacationService {
  async getLeaveRequests(filter: GetLeaveRequestsFilter): Promise<LeaveRequest[]> {
    const response = await this.fetchApi<LeaveRequest[]>(
      `/api/trpc/leaveRequests.getByEmployee?input=${encodeURIComponent(JSON.stringify(filter))}`,
      { method: 'GET' }
    );
    return response.data || [];
  }
}

// 環境変数で切り替え
const vacationService = import.meta.env.VITE_USE_MOCK_API === 'true'
  ? new VacationServiceMock()
  : new VacationServiceProduction();
```

---

## 📁 ファイル構成

```
/
├── types/
│   └── api.ts                    # 全API型定義（共通インターフェース）
├── services/
│   ├── vacationService.ts        # 希望休API（Mock/Production）
│   ├── shiftService.ts           # シフトAPI（Mock/Production）
│   └── authService.ts            # 認証API（Mock/Production）
├── contexts/
│   └── VacationContext.tsx       # 希望休のグローバル状態管理
├── components/
│   ├── EmployeeHome.tsx          # 職員ホーム画面
│   ├── VacationRequest.tsx       # 希望休申請画面
│   ├── ShiftView.tsx             # シフト確認画面（3タブ）
│   ├── AdminDashboard.tsx        # 管理者ダッシュボード
│   ├── ShiftCreation.tsx         # シフト生成画面（AI統合）
│   ├── VacationManagement.tsx    # 希望休管理画面
│   └── ...                       # その他12機能
├── config/
│   ├── README_FOR_BACKEND.md     # このファイル
│   ├── INTEGRATION_GUIDE.md      # 統合ガイド
│   ├── API_REQUIREMENTS.md       # API要件定義書
│   ├── AI_GENERATION_GUIDE.md    # AI生成ガイド
│   └── INTEGRATION_CHECKLIST.md  # 統合チェックリスト
└── .env.example                  # 環境変数サンプル
```

---

## 🔑 重要なポイント

### 1. シフトステータス管理
シフトのライフサイクルを6段階で管理します：
- `draft`: 下書き（希望休収集中、AI生成中）
- `tentative`: 仮確定（職員に公開、追加希望受付中）
- `tentative_revised`: 仮確定改（追加希望反映後）
- `confirmed`: 最終確定（変更不可）
- `actual`: 実績報告済み
- `archived`: アーカイブ済み

### 2. AI自動生成（ChatGPT 4 mini）
- 職員の希望休、制約条件、必須人員、職場ルールを考慮
- プロンプト設計が重要（AI_GENERATION_GUIDE.md参照）
- エラー時は手動生成にフォールバック
- コスト管理のため、生成回数制限を推奨

### 3. 追加希望申請（仮確定後）
- 仮確定公開後にやむを得ない理由で追加希望を申請
- 理由の記入必須
- 締め切り管理（additionalRequestDeadline）
- 管理者の承認が必要

### 4. 実績報告
- 勤務終了後に実際の勤務時間を報告
- 残業・早退の記録
- 管理者の承認が必要
- 給与計算の基礎データとして活用

### 5. 職員設定のカスタマイズ
- テーマ（5種類: ラベンダー、桜、オーシャン、フォレスト、サンセット）
- ヘッダー画像（5種類）
- フォントサイズ（4段階: 小・標準・大・特大）

---

## ⚠️ 注意事項

### データベース互換性
- 新カラムは `DEFAULT` 値を設定して既存データに影響しないように
- マイグレーションはステージング環境で十分テストしてから本番適用
- バックアップを必ず取得してから実行

### API設計
- RESTful原則に従う（すでにtRPCを使用している場合はそれに従う）
- バリデーションはフロント・バック両方で実施
- エラーメッセージは日本語で分かりやすく

### セキュリティ
- 職員は自分のデータのみアクセス可能
- 管理者権限のチェックを厳密に
- OpenAI APIキーは環境変数で管理、絶対にコミットしない
- SQL Injectionなどの脆弱性対策

### パフォーマンス
- 大量データの場合はページネーション実装
- N+1問題に注意（Prisma includeの最適化）
- AIシフト生成は非同期処理で実装し、進捗表示

---

## 📊 統合の進捗管理

チェックリストを使って進捗を管理してください：

```bash
# チェックリストを開く
cat config/INTEGRATION_CHECKLIST.md

# 完了した項目に ✅ をつけていく
# - [ ] → - [x]
```

---

## 🎯 統合完了の条件

以下が全て完了したら統合作業は完了です：

### Phase 1: データベース（2日）
- [ ] データベーススキーマ変更
- [ ] マイグレーションスクリプト作成
- [ ] ステージング環境で実行・確認

### Phase 2: API実装（5日）
- [ ] 希望休関連API（createBatch, createAdditional等）
- [ ] シフト関連API（generateWithAI, updateStatus等）
- [ ] 実績報告API（create, approve等）
- [ ] 設定API（get, update）
- [ ] 単体テスト作成

### Phase 3: AI統合（3日）
- [ ] OpenAI API統合
- [ ] プロンプト設計・最適化
- [ ] エラーハンドリング実装
- [ ] コスト管理機能

### Phase 4: フロントエンド統合（3日）
- [ ] services/*ServiceProduction実装
- [ ] エラーハンドリング
- [ ] ローディング状態の実装
- [ ] 統合テスト

### Phase 5: テスト（3日）
- [ ] 単体テスト（カバレッジ80%以上）
- [ ] 統合テスト
- [ ] E2Eテスト
- [ ] 負荷テスト

### Phase 6: デプロイ（2日）
- [ ] ステージング環境デプロイ
- [ ] UAT（ユーザー受入テスト）
- [ ] 本番環境デプロイ
- [ ] 監視設定

**総見積もり**: 約18日（約3.5週間）

---

## 💬 サポート・質問

質問や問題がある場合は、以下の情報を含めてご連絡ください：

1. **該当ドキュメント名**
2. **実行したコマンド/コード**
3. **エラーメッセージ（全文）**
4. **期待する動作と実際の動作**
5. **環境情報**
   - OS
   - Node.js バージョン
   - データベース バージョン
   - 使用しているライブラリのバージョン

---

## 📖 参考資料

### 技術スタック
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

### バックエンド推奨
- [Node.js](https://nodejs.org/)
- [tRPC](https://trpc.io/)
- [Prisma](https://www.prisma.io/)
- [PostgreSQL](https://www.postgresql.org/)

### AI統合
- [OpenAI API](https://platform.openai.com/docs/)
- [ChatGPT 4 mini](https://platform.openai.com/docs/models/gpt-4-mini)

---

**作成者**: フロントエンドチーム  
**作成日**: 2025年11月8日  
**最終更新**: 2025年11月8日  
**バージョン**: 2.0.0

---

## 🌟 次のステップ

1. [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) を読んで全体像を把握
2. [API_REQUIREMENTS.md](./API_REQUIREMENTS.md) でAPI仕様を確認
3. [AI_GENERATION_GUIDE.md](./AI_GENERATION_GUIDE.md) でAI生成の詳細を確認
4. [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md) で進捗管理

**Good Luck! 🚀**
