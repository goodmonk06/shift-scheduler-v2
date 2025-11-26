# シフトスケジューラー v2.0 完全実装計画書
**作成日:** 2025年12月26日
**目標:** 2026年1月からの新シフト生成システム稼働
**プロジェクトコード:** SHIFT-2026-Q1

---

## 📋 目次
1. [プロジェクト概要](#1-プロジェクト概要)
2. [現状分析](#2-現状分析)
3. [目標ワークフロー](#3-目標ワークフロー)
4. [システムアーキテクチャ](#4-システムアーキテクチャ)
5. [データベース設計](#5-データベース設計)
6. [フロントエンド設計](#6-フロントエンド設計)
7. [バックエンドAPI設計](#7-バックエンドapi設計)
8. [実装フェーズ](#8-実装フェーズ)
9. [テスト計画](#9-テスト計画)
10. [デプロイ計画](#10-デプロイ計画)
11. [リスク管理](#11-リスク管理)
12. [成功指標](#12-成功指標)

---

## 1. プロジェクト概要

### 1.1 目的
- **12月専用システム**の成功したロジックを**通常システム**に統合
- **職員側UI/UX**を全面改善し、希望休・希望シフト登録を簡単に
- **管理側UI**を新設計し、承認→自動反映→段階的配置→AI修正→確定の一貫したフローを実現
- **PDF出力・通知機能**を強化し、紙掲示と電子配信の両立

### 1.2 スコープ
✅ **含まれるもの:**
- データベース拡張（休憩時間ルール、ワークフロー状態管理）
- 職員側希望休・希望シフト登録UI改善
- 管理側シフト編集UI全面刷新
- 段階的配置アルゴリズム（12月ロジック踏襲）
- AI生成/修正機能（段階的改善）
- PDF出力・印刷・通知機能
- 承認フロー自動化

❌ **含まれないもの:**
- 12月専用システムの変更（完全に触らない）
- モバイルアプリ開発
- LINE通知（将来対応）

### 1.3 前提条件
- **12月システム（DecemberShiftGeneration.tsx）は2025年12月中絶対に触らない**
- **既存の「段階的配置方式」は削除**（精度が低いため）
- **データベースはMySQL（PlanetScale/Aiven）**
- **フロントエンドはReact 19 + Vite + Tailwind CSS 4**
- **バックエンドはExpress + tRPC 11**

---

## 2. 現状分析

### 2.1 12月専用システムの特徴
**場所:** `client/src/components/DecemberShiftGeneration.tsx`

**成功要因:**
- ✅ 27名の職員データをハードコード（制約条件、休憩時間ルール）
- ✅ 条件付き休憩時間ルール（固定/条件付き/なし）
- ✅ 夜勤15時間（休憩2時間控除）、明けを勤務日数にカウント
- ✅ 12/1～12/31の正確な統計計算
- ✅ 直感的なUI（時間指定ボタン、統計列、編集ポップアップ）

**制約:**
- ❌ データベース不使用（JSONファイル保存）
- ❌ 職員追加・変更時にコード修正が必要
- ❌ 他の月に流用できない

### 2.2 通常システムの課題
**場所:** `client/src/components/ShiftEditor.tsx`, `server/phaseBasedShiftGenerator.ts`

**問題点:**
- ❌ 「段階的配置方式」の精度が低い
- ❌ 休憩時間ルールが単純（0/30/60分の固定値のみ）
- ❌ UI/UXが複雑で使いにくい
- ❌ 希望休・希望シフトの承認→自動反映フローが未整備
- ❌ PDF出力の品質が低い

### 2.3 職員側UIの課題
**場所:** `client/src/components/VacationRequest.tsx`, `WorkPreferenceRequest.tsx`

**問題点:**
- ✅ 既存コンポーネントは存在するが、ワークフローが不明確
- ❌ 承認状態の可視化が弱い
- ❌ 希望シフトと確定シフトの連携が不透明

---

## 3. 目標ワークフロー

### 3.1 全体フロー（1月シフト作成例）

```
【職員側】
1. 希望休・希望シフト登録（12/1～12/15）
   ├─ 希望休: カレンダーで日付選択 → 休/有休選択 → 理由入力（任意）
   └─ 希望シフト: 日付選択 → 時間指定（9～13など） → 理由入力（任意）

【管理側】
2. 希望承認（12/16～12/20）
   ├─ 希望休一覧で承認/却下
   ├─ 希望シフト一覧で承認/却下
   └─ 承認済みデータは自動的に1月シフトに反映・ロック

3. 段階的配置実行（12/21～12/25）
   ├─ 「段階的配置」ボタンをクリック
   ├─ Phase 1: ハード制約確定（希望休・希望シフトを配置）
   ├─ Phase 2: 基本配置（夜勤・日勤を職員条件・職場条件で配置）
   └─ Phase 3: 統計計算（休憩時間控除、夜勤15時間、明けカウント）

4. AI生成/修正（任意、12/26～12/27）
   ├─ 「AI修正」ボタンをクリック
   ├─ 人員不足日、連続勤務違反などを検出
   └─ AI提案を受け入れ or 拒否

5. 仮シフトPDF出力・掲示（12/28）
   ├─ 「仮確定」ボタンをクリック
   ├─ PDF自動生成（A3横、職員名×日付マトリクス、統計列付き）
   ├─ ダウンロード → 印刷 → 職場に掲示
   └─ 職員にメール通知「仮シフトを確認してください」

6. 変更事項の手動修正（12/29～12/31）
   ├─ 職員からの変更希望を受付（口頭 or メール）
   ├─ 管理者がシフトエディタで手動修正
   └─ 変更履歴を自動記録

7. 最終確定・通知（1/1）
   ├─ 「確定」ボタンをクリック
   ├─ 最終PDF自動生成
   ├─ 職員全員にメール送信（PDFリンク付き）
   ├─ 印刷 → 職場に掲示
   └─ ステータスを「confirmed」に変更

【職員側】
8. 確定シフト閲覧
   ├─ アプリでカレンダー表示
   ├─ PDF閲覧・ダウンロード
   └─ 職場の紙掲示を確認
```

### 3.2 ステータス遷移

```
vacation_only      希望休受付中（職員が登録中）
  ↓ （管理者が「希望受付終了」）
approval_pending   希望承認待ち（管理者が承認作業中）
  ↓ （管理者が全て承認/却下完了）
draft             下書き（管理者が段階的配置実行前）
  ↓ （管理者が「段階的配置」実行）
ai_generated      AI生成完了（段階的配置完了、AI修正前）
  ↓ （管理者が「AI修正」実行、任意）
tentative         仮確定（PDF出力済み、職員確認中）
  ↓ （管理者が手動修正）
tentative_revised 仮確定（修正版）
  ↓ （管理者が「確定」実行）
confirmed         確定（職員に通知済み、変更不可）
  ↓ （月末に自動移行）
actual            実績（勤務実績入力可能）
  ↓ （5年後に自動移行）
archived          アーカイブ（PDF保存、DB削除）
```

---

## 4. システムアーキテクチャ

### 4.1 全体構成

```
┌─────────────────────────────────────────────────────────┐
│                   職員側アプリ                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │ EmployeeApp.tsx                                   │    │
│  │  ├─ EmployeeHome.tsx (カレンダー、シフト確認)      │    │
│  │  ├─ VacationRequest.tsx (希望休登録)              │    │
│  │  ├─ WorkPreferenceRequest.tsx (希望シフト登録)    │    │
│  │  └─ ShiftView.tsx (確定シフト閲覧)                │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ↕ tRPC API
┌─────────────────────────────────────────────────────────┐
│                   管理側アプリ                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │ AdminApp.tsx                                      │    │
│  │  ├─ ShiftYearlyView.tsx (年間ビュー)              │    │
│  │  ├─ ShiftEditorV2.tsx (新シフトエディタ) ★新規    │    │
│  │  ├─ VacationManagement.tsx (希望休承認)           │    │
│  │  ├─ WorkPreferenceManagement.tsx (希望シフト承認) │    │
│  │  └─ StaffManagement.tsx (職員管理、休憩時間設定)  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ↕ tRPC API
┌─────────────────────────────────────────────────────────┐
│                   バックエンド                              │
│  ┌─────────────────────────────────────────────────┐    │
│  │ server/routers.ts (tRPCルーター)                   │    │
│  │  ├─ shifts.*                                      │    │
│  │  ├─ leaveRequests.*                               │    │
│  │  ├─ workPreferences.*                             │    │
│  │  └─ employees.*                                   │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ server/simpleShiftGenerator.ts ★新規              │    │
│  │  ├─ Phase 1: ハード制約確定                       │    │
│  │  ├─ Phase 2: 基本配置                            │    │
│  │  └─ Phase 3: 統計計算                            │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │ server/utils/ ★新規ユーティリティ群                │    │
│  │  ├─ breakTimeCalculator.ts (休憩時間計算)        │    │
│  │  ├─ shiftStatsCalculator.ts (統計計算)           │    │
│  │  └─ pdfGenerator.ts (PDF生成)                    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ↕ Drizzle ORM
┌─────────────────────────────────────────────────────────┐
│                   データベース (MySQL)                      │
│  ├─ employees (breakTimeRule追加) ★拡張               │
│  ├─ shifts                                            │
│  ├─ shiftDetails                                      │
│  ├─ leaveRequests                                     │
│  ├─ workPreferences                                   │
│  └─ workflowHistory (ステータス履歴) ★既存            │
└─────────────────────────────────────────────────────────┘
```

### 4.2 削除対象ファイル

```bash
# 精度が低いため削除
rm server/phaseBasedShiftGenerator.ts
rm server/aiShiftGenerator.ts
rm server/improvedShiftGenerator.ts
rm -rf server/archived-generators/

# 旧ShiftEditorは保持（比較用、最終的に削除検討）
# client/src/components/ShiftEditor.tsx → ShiftEditor.old.tsx にリネーム
```

---

## 5. データベース設計

### 5.1 拡張対象: `employees` テーブル

**追加フィールド:**

| フィールド名 | 型 | NULL | デフォルト | 説明 |
|------------|-----|------|----------|------|
| breakTimeRule | JSON | YES | NULL | 休憩時間ルール（固定/条件付き/なし） |

**breakTimeRule JSONスキーマ:**

```typescript
interface BreakTimeRule {
  type: 'fixed' | 'conditional' | 'none';
  duration?: number;        // 固定時間（時間単位、例: 1 = 60分）
  threshold?: number;       // 条件閾値（時間単位、例: 6 = 6時間）
  conditionDuration?: number; // 条件を満たした場合の休憩時間（時間単位）
}
```

**具体例:**

```json
// 髙野幹成（固定60分）
{"type": "fixed", "duration": 1}

// 上条やえ子（6時間以上で60分）
{"type": "conditional", "threshold": 6, "conditionDuration": 1}

// 平井英子（6時間以上で30分）
{"type": "conditional", "threshold": 6, "conditionDuration": 0.5}

// 海野はるか（5時間以上で30分）
{"type": "conditional", "threshold": 5, "conditionDuration": 0.5}

// 野仲彩香（休憩なし）
{"type": "none"}
```

### 5.2 マイグレーションSQL

**ファイル:** `drizzle/0016_add_break_time_rule.sql`

```sql
-- 休憩時間ルールフィールドを追加
ALTER TABLE employees
ADD COLUMN breakTimeRule JSON
COMMENT '休憩時間ルール（固定/条件付き/なし）';

-- インデックスは不要（JSON検索はしない）
```

**Drizzleスキーマ更新:** `drizzle/schema.ts`

```typescript
export const employees = mysqlTable("employees", {
  // ... 既存フィールド
  breakTime: int("breakTime").default(60).notNull(), // 旧フィールド（互換性維持）
  breakTimeRule: json("breakTimeRule").$type<BreakTimeRule>(), // ★新フィールド
  // ...
});

// 型定義
export interface BreakTimeRule {
  type: 'fixed' | 'conditional' | 'none';
  duration?: number;
  threshold?: number;
  conditionDuration?: number;
}
```

### 5.3 データ移行スクリプト

**ファイル:** `scripts/migrate-break-time-rules.ts`

```typescript
import { db } from '../server/db';
import { employees } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

// 12月システムのハードコードデータをマッピング
const BREAK_TIME_MAPPING: Record<number, any> = {
  1: { type: "fixed", duration: 1 },           // 髙野幹成
  2: { type: "fixed", duration: 1 },           // 山口夕香里
  3: { type: "fixed", duration: 1 },           // 馬渕尊至
  4: { type: "fixed", duration: 1 },           // 杉山美佳子
  5: { type: "fixed", duration: 1 },           // 梅田英津子
  6: { type: "fixed", duration: 1 },           // 松嵜愛梨
  7: { type: "fixed", duration: 1 },           // 大橋健一
  8: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 上条やえ子
  9: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 若森直子
  10: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 足立洋子
  11: { type: "none" },                        // 野仲彩香
  12: { type: "none" },                        // 桂川美幸
  13: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 加藤広大
  14: { type: "conditional", threshold: 5, conditionDuration: 0.5 }, // 海野はるか
  15: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 湯本智子
  16: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 楠美佐
  17: { type: "conditional", threshold: 6, conditionDuration: 0.5 }, // 平井英子
  18: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 山田明美
  19: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 足立豊子
  20: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 関田あゆみ
  21: { type: "none" },                        // 長山真梨奈
  22: { type: "none" },                        // 伊藤美穂
  23: { type: "none" },                        // 近藤由美子
  24: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 大堀シェリー
  25: { type: "none" },                        // 宝本龍騎
  26: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 岩崎亜友美
  27: { type: "conditional", threshold: 6, conditionDuration: 1 }, // 淺野穂菜美
};

async function migrateBreakTimeRules() {
  console.log('=== 休憩時間ルールのマイグレーション開始 ===');

  for (const [employeeId, rule] of Object.entries(BREAK_TIME_MAPPING)) {
    try {
      await db.update(employees)
        .set({ breakTimeRule: rule })
        .where(eq(employees.id, Number(employeeId)));

      console.log(`✅ 職員ID ${employeeId}: ${JSON.stringify(rule)}`);
    } catch (error) {
      console.error(`❌ 職員ID ${employeeId} の更新失敗:`, error);
    }
  }

  console.log('=== マイグレーション完了 ===');
}

migrateBreakTimeRules()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('マイグレーションエラー:', error);
    process.exit(1);
  });
```

### 5.4 既存テーブルの活用

**変更なし:**
- `shifts` - ステータスフィールドは既に8段階対応済み
- `shiftDetails` - displayText, isFixed, sourceType など既存フィールドで対応可能
- `leaveRequests` - そのまま使用
- `workPreferences` - そのまま使用
- `workflowHistory` - ステータス遷移履歴記録に使用

---

## 6. フロントエンド設計

### 6.1 職員側UI/UX改善

#### 6.1.1 希望休登録（VacationRequest.tsx）

**現状:** 既存コンポーネントあり、改善点のみ実装

**改善点:**
1. ✅ カレンダーUIは既存を流用
2. ✅ 承認状態の可視化を強化
   - 「申請中」（黄色）
   - 「承認済み」（緑色）
   - 「却下」（赤色）
3. ✅ 確定シフトとの連携
   - 承認済み希望休は確定シフトカレンダーに自動反映
   - ロックアイコン表示

**UIスケッチ:**

```
┌─────────────────────────────────────────────────┐
│ 希望休登録 - 2026年1月                            │
│ 締切: 2025/12/15 23:59                           │
├─────────────────────────────────────────────────┤
│  カレンダー                                       │
│   月  火  水  木  金  土  日                        │
│         1   2   3   4   5                        │
│        [休][  ][  ][  ][  ]                      │
│         ✓申請中                                   │
│                                                  │
│   6   7   8   9  10  11  12                      │
│  [  ][有休][  ][  ][  ][  ][  ]                  │
│        ✓承認済                                    │
│                                                  │
│  13  14  15  16  17  18  19                      │
│  [  ][休][  ][  ][  ][  ][  ]                    │
│       ✗却下                                       │
└─────────────────────────────────────────────────┘
│ [保存して提出]                                    │
└─────────────────────────────────────────────────┘
```

#### 6.1.2 希望シフト登録（WorkPreferenceRequest.tsx）

**現状:** 既存コンポーネントあり、改善点のみ実装

**改善点:**
1. ✅ 時間選択UIを改善（12月システムのボタン式を参考）
2. ✅ 承認状態の可視化
3. ✅ よく使う時間帯のプリセットボタン追加
   - [9～13] [9～15] [13～17] など

**UIスケッチ:**

```
┌─────────────────────────────────────────────────┐
│ 希望シフト登録 - 2026年1月5日（日）               │
├─────────────────────────────────────────────────┤
│ 勤務可能時間帯を選択してください                  │
│                                                  │
│ プリセット:                                       │
│ [9～13] [9～15] [13～17] [カスタム]              │
│                                                  │
│ 開始: [09:00 ▼]  終了: [13:00 ▼]                │
│                                                  │
│ 理由（任意）:                                     │
│ ┌─────────────────────────────────────────┐    │
│ │ 子供の用事で午後は無理です                 │    │
│ └─────────────────────────────────────────┘    │
│                                                  │
│ [登録] [キャンセル]                               │
└─────────────────────────────────────────────────┘
```

#### 6.1.3 確定シフト閲覧（ShiftView.tsx）

**現状:** 既存コンポーネントあり、改善点のみ実装

**改善点:**
1. ✅ 仮確定/確定の区別を明確化
2. ✅ PDF閲覧・ダウンロードボタン追加
3. ✅ 統計情報表示（勤務日数、総時間、夜勤回数など）

---

### 6.2 管理側UI全面刷新

#### 6.2.1 新シフトエディタ（ShiftEditorV2.tsx）★新規作成

**設計思想:** 12月システムのUIを踏襲しつつ、データベース駆動に変更

**主要機能:**
1. ✅ 職員×日付のマトリクス表示（12月システムと同様）
2. ✅ 右側統計列（日数・時間・夜勤・休日・有給）
3. ✅ セル編集ポップアップ（時間指定ボタン、カスタム時間入力）
4. ✅ ロック機能（希望休・希望シフト由来のセルはロック、編集不可）
5. ✅ 段階的配置ボタン（Phase 1-3を順次実行）
6. ✅ AI修正ボタン（任意）
7. ✅ ステータス管理（仮確定、確定、PDF出力）

**UIレイアウト:**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ← 年間ビューに戻る    2026年1月シフト編集    [下書き]                            │
├────────────────────────────────────────────────────────────────────────────────┤
│ [段階的配置] [AI修正] [仮確定] [PDF出力] [確定]                                   │
├───────┬──┬──┬──┬──┬──┬──┬──┬────┬────┬────┬────┬────┐
│ 職員  │ 1│ 2│ 3│ 4│ 5│..│31│日数│時間│夜勤│休日│有給│
├───────┼──┼──┼──┼──┼──┼──┼──┼────┼────┼────┼────┼────┤
│髙野幹成│夜│明│休│9～│13│  │  │ 20 │140 │  8 │  8 │  2 │
│       │🔒│  │🔒│15│～│  │  │    │    │    │    │    │
│山口夕香│  │  │  │  │17│  │  │ 22 │165 │  5 │  7 │  1 │
│       │  │  │🔒│  │🔒│  │  │    │    │    │    │    │
│...    │  │  │  │  │  │  │  │    │    │    │    │    │
└───────┴──┴──┴──┴──┴──┴──┴──┴────┴────┴────┴────┴────┘

凡例:
🔒 = 希望休・希望シフト由来（編集不可）
夜 = 夜勤（21:00～翌9:00、15時間カウント）
明 = 明け（勤務日数のみカウント、時間は夜勤に吸収）
休 = 休日
有休 = 有給休暇
9～15 = 時間指定勤務
```

**セル編集ポップアップ（12月システムと同様）:**

```
┌─────────────────────────────────────────┐
│ 2026/1/5 - 髙野幹成                      │
├─────────────────────────────────────────┤
│ 時間指定:                                │
│ [9～13] [9～15] [13～17] [夜勤] [明け]  │
│                                          │
│ カスタム時間:                            │
│ 開始: [09:00 ▼]  終了: [15:00 ▼]       │
│                                          │
│ 休み:                                    │
│ [休] [有休]                              │
│                                          │
│ [保存] [キャンセル]                      │
└─────────────────────────────────────────┘
```

#### 6.2.2 希望承認画面（VacationManagement.tsx、WorkPreferenceManagement.tsx）

**改善点:**
1. ✅ 一括承認ボタン追加
2. ✅ 承認時に自動的にシフトに反映（isFixed=true, sourceType='leave_request'）
3. ✅ 承認済み件数の表示

**UIスケッチ:**

```
┌────────────────────────────────────────────────────────┐
│ 希望休承認 - 2026年1月                                  │
│ 未承認: 15件 / 承認済み: 42件                          │
├────────────────────────────────────────────────────────┤
│ [全て承認] [全て却下]                                   │
├────┬────────┬────────┬────────┬────────┬────────┐
│職員│開始日  │終了日  │種類    │ステータス│操作    │
├────┼────────┼────────┼────────┼────────┼────────┤
│髙野│2026/1/3│2026/1/3│休      │申請中   │[承認][却下]│
│山口│2026/1/5│2026/1/7│有休    │申請中   │[承認][却下]│
│...│        │        │        │         │            │
└────┴────────┴────────┴────────┴────────┴────────┘
```

---

## 7. バックエンドAPI設計

### 7.1 新規ユーティリティ

#### 7.1.1 breakTimeCalculator.ts

**ファイル:** `server/utils/breakTimeCalculator.ts`

```typescript
import type { BreakTimeRule } from '../../drizzle/schema';

/**
 * 休憩時間を計算
 * @param workHours 勤務時間（時間単位）
 * @param rule 休憩時間ルール
 * @returns 休憩時間（時間単位）
 */
export function calculateBreakTime(
  workHours: number,
  rule: BreakTimeRule | null
): number {
  // ルールが未設定の場合はデフォルト（6時間超なら1時間）
  if (!rule) {
    return workHours > 6 ? 1 : 0;
  }

  switch (rule.type) {
    case 'fixed':
      // 固定時間（例: 常に1時間）
      return rule.duration || 0;

    case 'conditional':
      // 条件付き（例: 6時間超なら1時間）
      const threshold = rule.threshold || 6;
      const duration = rule.conditionDuration || 1;
      return workHours > threshold ? duration : 0;

    case 'none':
      // 休憩なし
      return 0;

    default:
      // デフォルト
      return workHours > 6 ? 1 : 0;
  }
}

/**
 * 職員の休憩時間ルールを取得
 * @param employeeId 職員ID
 * @returns 休憩時間ルール
 */
export async function getEmployeeBreakTimeRule(
  employeeId: number
): Promise<BreakTimeRule | null> {
  const db = await import('../db');
  const employee = await db.getEmployeeById(employeeId);
  return employee?.breakTimeRule || null;
}
```

#### 7.1.2 shiftStatsCalculator.ts

**ファイル:** `server/utils/shiftStatsCalculator.ts`

```typescript
import { calculateBreakTime } from './breakTimeCalculator';
import type { BreakTimeRule } from '../../drizzle/schema';

export interface ShiftStats {
  days: number;        // 勤務日数
  hours: number;       // 総勤務時間（休憩時間控除後）
  nightCount: number;  // 夜勤回数
  holidays: number;    // 休日数
  paidHolidays: number; // 有給休暇数
}

/**
 * シフト統計を計算
 * @param shiftDetails シフト詳細データ
 * @param breakTimeRule 休憩時間ルール
 * @param year 年
 * @param month 月
 * @returns 統計情報
 */
export function calculateShiftStats(
  shiftDetails: any[],
  breakTimeRule: BreakTimeRule | null,
  year: number,
  month: number
): ShiftStats {
  let days = 0;
  let hours = 0;
  let nightCount = 0;
  let holidays = 0;
  let paidHolidays = 0;

  // 対象月のみフィルタリング
  const targetDetails = shiftDetails.filter(detail => {
    const date = new Date(detail.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });

  for (const detail of targetDetails) {
    const { displayText, status, leaveType, startTime, endTime } = detail;

    // 休日のカウント
    if (status === 'requested_off' || status === 'off') {
      if (leaveType === '有休') {
        paidHolidays++;
      } else {
        holidays++;
      }
      continue;
    }

    // 勤務日のみカウント（明けも含む）
    if (status === 'working') {
      days++;

      // 夜勤の処理
      if (displayText === '夜' || displayText === 'NIGHT') {
        nightCount++;
        hours += 15; // 夜勤は15時間（休憩2時間控除済み）
        continue;
      }

      // 明けの処理（勤務日数のみカウント、時間は夜勤に吸収）
      if (displayText === '明') {
        continue;
      }

      // 時間指定勤務の処理
      if (startTime && endTime) {
        const grossHours = parseTimeToHours(endTime) - parseTimeToHours(startTime);
        const breakTime = calculateBreakTime(grossHours, breakTimeRule);
        const netHours = grossHours - breakTime;
        hours += netHours > 0 ? netHours : 0;
      }
    }
  }

  return { days, hours, nightCount, holidays, paidHolidays };
}

/**
 * 時刻文字列（HH:MM）を時間（小数）に変換
 * @param timeStr 時刻文字列（例: "09:30"）
 * @returns 時間（例: 9.5）
 */
function parseTimeToHours(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
}
```

#### 7.1.3 pdfGenerator.ts

**ファイル:** `server/utils/pdfGenerator.ts`

```typescript
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export interface PDFShiftData {
  year: number;
  month: number;
  employees: Array<{
    id: number;
    name: string;
    shifts: Array<{
      date: string;
      displayText: string;
    }>;
    stats: {
      days: number;
      hours: number;
      nightCount: number;
      holidays: number;
      paidHolidays: number;
    };
  }>;
}

/**
 * シフトPDFを生成（A3横、職員×日付マトリクス）
 * @param data シフトデータ
 * @returns PDFストリーム
 */
export async function generateShiftPDF(data: PDFShiftData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A3',
      layout: 'landscape',
      margin: 20
    });

    const buffers: Buffer[] = [];
    const stream = new PassThrough();

    stream.on('data', (chunk) => buffers.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
    stream.on('error', reject);

    doc.pipe(stream);

    // タイトル
    doc.fontSize(18)
       .text(`${data.year}年${data.month}月 シフト表`, { align: 'center' });
    doc.moveDown();

    // マトリクステーブル
    const daysInMonth = new Date(data.year, data.month, 0).getDate();
    const cellWidth = 25;
    const cellHeight = 20;
    const startX = 50;
    const startY = 100;

    // ヘッダー行（日付）
    doc.fontSize(8);
    for (let day = 1; day <= daysInMonth; day++) {
      doc.text(
        day.toString(),
        startX + 100 + (day - 1) * cellWidth,
        startY,
        { width: cellWidth, align: 'center' }
      );
    }

    // 統計列ヘッダー
    const statsX = startX + 100 + daysInMonth * cellWidth;
    doc.text('日数', statsX, startY, { width: 40, align: 'center' });
    doc.text('時間', statsX + 40, startY, { width: 40, align: 'center' });
    doc.text('夜勤', statsX + 80, startY, { width: 40, align: 'center' });

    // 各職員の行
    data.employees.forEach((employee, index) => {
      const y = startY + (index + 1) * cellHeight;

      // 職員名
      doc.text(employee.name, startX, y, { width: 90, align: 'left' });

      // 各日のシフト
      for (let day = 1; day <= daysInMonth; day++) {
        const shift = employee.shifts.find(s => {
          const date = new Date(s.date);
          return date.getDate() === day;
        });

        const text = shift ? shift.displayText : '';
        doc.text(
          text,
          startX + 100 + (day - 1) * cellWidth,
          y,
          { width: cellWidth, align: 'center' }
        );
      }

      // 統計
      doc.text(employee.stats.days.toString(), statsX, y, { width: 40, align: 'center' });
      doc.text(employee.stats.hours.toFixed(1), statsX + 40, y, { width: 40, align: 'center' });
      doc.text(employee.stats.nightCount.toString(), statsX + 80, y, { width: 40, align: 'center' });
    });

    doc.end();
  });
}
```

---

### 7.2 新規シフト生成器

#### 7.2.1 simpleShiftGenerator.ts

**ファイル:** `server/simpleShiftGenerator.ts`

```typescript
/**
 * シンプルシフト生成器（12月ロジック踏襲）
 *
 * Phase 1: ハード制約確定（希望休・希望シフト）
 * Phase 2: 基本配置（夜勤・日勤）
 * Phase 3: 統計計算
 */

import * as db from './db';
import { calculateBreakTime } from './utils/breakTimeCalculator';
import { calculateShiftStats } from './utils/shiftStatsCalculator';

/**
 * Phase 1: ハード制約確定
 * 承認済みの希望休・希望シフトをシフトに配置
 */
export async function phase1_confirmHardConstraints(
  shiftId: number,
  year: number,
  month: number
): Promise<any[]> {
  console.log('\n=== Phase 1: ハード制約確定 ===');

  const confirmedShifts: any[] = [];
  const employees = await db.getAllEmployees();
  const leaveRequests = await db.getLeaveRequestsByShift(shiftId);
  const workPreferences = await db.getWorkPreferencesByShift(shiftId);

  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    for (const employee of employees) {
      // 希望休チェック（承認済みのみ）
      const leave = leaveRequests.find(lr =>
        lr.employeeId === employee.id &&
        lr.status === 'approved' &&
        isDateInRange(date, lr.startDate, lr.endDate)
      );

      if (leave) {
        confirmedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'requested_off',
          timeSlotId: null,
          leaveType: leave.leaveType,
          displayText: leave.leaveType,
          isFixed: true,
          sourceType: 'leave_request',
          sourceId: leave.id,
        });
        console.log(`  ${date} ${employee.name}: ${leave.leaveType}（ロック）`);
        continue;
      }

      // 希望シフトチェック（承認済みのみ）
      const workPref = workPreferences.find(wp =>
        wp.employeeId === employee.id &&
        wp.status === 'approved' &&
        isDateInRange(date, wp.startDate, wp.endDate)
      );

      if (workPref) {
        confirmedShifts.push({
          shiftId,
          employeeId: employee.id,
          date,
          status: 'working',
          timeSlotId: null,
          startTime: workPref.startTime,
          endTime: workPref.endTime,
          displayText: `${workPref.startTime.substring(0, 2)}～${workPref.endTime.substring(0, 2)}`,
          isFixed: true,
          sourceType: 'work_preference',
          sourceId: workPref.id,
        });
        console.log(`  ${date} ${employee.name}: ${workPref.startTime}-${workPref.endTime}（ロック）`);
      }
    }
  }

  console.log(`\nPhase 1完了: ${confirmedShifts.length}件のハード制約を確定`);
  return confirmedShifts;
}

/**
 * Phase 2: 基本配置
 * 夜勤・日勤を職員条件・職場条件で配置
 */
export async function phase2_basicPlacement(
  shiftId: number,
  year: number,
  month: number,
  confirmedShifts: any[]
): Promise<any[]> {
  console.log('\n=== Phase 2: 基本配置 ===');

  // TODO: 12月ロジックを参考に実装
  // - 夜勤可能職員を抽出
  // - 連続勤務チェック
  // - 必要人数充足
  // - 公平性考慮

  console.log('Phase 2は今後実装（12月ロジック踏襲）');
  return [];
}

/**
 * Phase 3: 統計計算
 * 全職員の勤務統計を計算
 */
export async function phase3_calculateStats(
  shiftId: number,
  year: number,
  month: number,
  allShifts: any[]
): Promise<void> {
  console.log('\n=== Phase 3: 統計計算 ===');

  const employees = await db.getAllEmployees();

  for (const employee of employees) {
    const employeeShifts = allShifts.filter(s => s.employeeId === employee.id);
    const stats = calculateShiftStats(
      employeeShifts,
      employee.breakTimeRule,
      year,
      month
    );

    console.log(`  ${employee.name}: 日数=${stats.days}, 時間=${stats.hours.toFixed(1)}, 夜勤=${stats.nightCount}`);
  }

  console.log('Phase 3完了');
}

// ヘルパー関数
function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}
```

---

### 7.3 tRPCルーター拡張

**ファイル:** `server/routers.ts`

**追加エンドポイント:**

```typescript
// シフト関連
shifts: {
  // ... 既存エンドポイント

  // 段階的配置実行
  generatePhased: protectedProcedure
    .input(z.object({ shiftId: z.number() }))
    .mutation(async ({ input }) => {
      const shift = await db.getShiftById(input.shiftId);
      if (!shift) throw new Error('Shift not found');

      // Phase 1-3を順次実行
      const phase1 = await simpleShiftGenerator.phase1_confirmHardConstraints(
        shift.id, shift.year, shift.month
      );

      await db.bulkInsertShiftDetails(phase1);

      // ステータスを更新
      await db.updateShiftStatus(shift.id, 'ai_generated');

      return { success: true, count: phase1.length };
    }),

  // 仮確定
  setTentative: protectedProcedure
    .input(z.object({ shiftId: z.number() }))
    .mutation(async ({ input }) => {
      await db.updateShiftStatus(input.shiftId, 'tentative');
      await db.recordWorkflowHistory(input.shiftId, 'ai_generated', 'tentative');

      // PDF生成（バックグラウンド）
      // TODO: PDF生成処理

      return { success: true };
    }),

  // 確定
  confirmShift: protectedProcedure
    .input(z.object({ shiftId: z.number() }))
    .mutation(async ({ input }) => {
      await db.updateShiftStatus(input.shiftId, 'confirmed');
      await db.recordWorkflowHistory(input.shiftId, 'tentative_revised', 'confirmed');

      // 職員全員に通知送信
      // TODO: メール通知処理

      return { success: true };
    }),

  // PDF生成
  generatePDF: protectedProcedure
    .input(z.object({ shiftId: z.number() }))
    .query(async ({ input }) => {
      const shiftData = await db.getShiftWithDetails(input.shiftId);
      const pdf = await pdfGenerator.generateShiftPDF(shiftData);

      // S3にアップロード
      const url = await uploadPDFToS3(pdf, `shift-${input.shiftId}.pdf`);

      return { url };
    }),
},

// 希望休承認
leaveRequests: {
  // ... 既存エンドポイント

  // 一括承認
  approveAll: protectedProcedure
    .input(z.object({ shiftId: z.number() }))
    .mutation(async ({ input }) => {
      const requests = await db.getLeaveRequestsByShift(input.shiftId);
      const pending = requests.filter(r => r.status === 'pending');

      for (const request of pending) {
        await db.updateLeaveRequestStatus(request.id, 'approved');

        // シフトに自動反映
        await db.insertShiftDetail({
          shiftId: input.shiftId,
          employeeId: request.employeeId,
          date: request.startDate,
          status: 'requested_off',
          leaveType: request.leaveType,
          displayText: request.leaveType,
          isFixed: true,
          sourceType: 'leave_request',
          sourceId: request.id,
        });
      }

      return { success: true, count: pending.length };
    }),
},

// 希望シフト承認（同様に実装）
workPreferences: {
  // ...
},
```

---

## 8. 実装フェーズ

### フェーズ1: データベース拡張（12月26日～12月28日）

**期間:** 3日
**担当:** バックエンド
**影響:** なし（12月システムは触らない）

#### タスク一覧
- [ ] 1.1 マイグレーションSQL作成（`drizzle/0016_add_break_time_rule.sql`）
- [ ] 1.2 Drizzleスキーマ更新（`drizzle/schema.ts`）
- [ ] 1.3 マイグレーションスクリプト作成（`scripts/migrate-break-time-rules.ts`）
- [ ] 1.4 ローカル環境でテスト実行
- [ ] 1.5 27名全職員のデータ投入確認

**完了条件:**
- ✅ `employees.breakTimeRule` フィールドが追加済み
- ✅ 全27名の休憩時間ルールがDB に格納済み
- ✅ 既存機能に影響なし（テスト確認）

---

### フェーズ2: バックエンドリファクタリング（12月29日～1月3日）

**期間:** 6日
**担当:** バックエンド
**影響:** なし（新規ファイル作成のみ）

#### タスク一覧
- [ ] 2.1 旧ロジック削除
  - `server/phaseBasedShiftGenerator.ts`
  - `server/aiShiftGenerator.ts`
  - `server/improvedShiftGenerator.ts`
  - `server/archived-generators/`
- [ ] 2.2 ユーティリティ作成
  - `server/utils/breakTimeCalculator.ts`
  - `server/utils/shiftStatsCalculator.ts`
  - `server/utils/pdfGenerator.ts`
- [ ] 2.3 新シフト生成器作成
  - `server/simpleShiftGenerator.ts` (Phase 1のみ実装)
- [ ] 2.4 tRPCルーター拡張
  - `shifts.generatePhased`
  - `shifts.setTentative`
  - `shifts.confirmShift`
  - `shifts.generatePDF`
  - `leaveRequests.approveAll`
  - `workPreferences.approveAll`
- [ ] 2.5 ユニットテスト作成

**完了条件:**
- ✅ 休憩時間計算ロジックがDB駆動で動作
- ✅ Phase 1（ハード制約確定）が正常動作
- ✅ 統計計算が正確（夜勤15時間、明けカウント、休憩時間控除）
- ✅ テストカバレッジ80%以上

---

### フェーズ3: 職員側UI/UX改善（1月4日～1月7日）

**期間:** 4日
**担当:** フロントエンド
**影響:** なし（既存コンポーネント改善）

#### タスク一覧
- [ ] 3.1 VacationRequest.tsx改善
  - 承認状態の可視化（申請中/承認済み/却下）
  - 確定シフトとの連携表示
- [ ] 3.2 WorkPreferenceRequest.tsx改善
  - 時間選択UIを改善（プリセットボタン追加）
  - 承認状態の可視化
- [ ] 3.3 ShiftView.tsx改善
  - 仮確定/確定の区別明確化
  - PDF閲覧・ダウンロードボタン追加
  - 統計情報表示
- [ ] 3.4 レスポンシブ対応確認（スマホ最適化）

**完了条件:**
- ✅ 職員が希望休・希望シフトを簡単に登録できる
- ✅ 承認状態が一目で分かる
- ✅ 確定シフトがスマホで見やすい

---

### フェーズ4: 管理側新UI実装（1月8日～1月14日）

**期間:** 7日
**担当:** フロントエンド
**影響:** なし（新規コンポーネント作成）

#### タスク一覧
- [ ] 4.1 ShiftEditorV2.tsx作成
  - 職員×日付マトリクス表示
  - 右側統計列（日数・時間・夜勤・休日・有給）
  - セル編集ポップアップ（時間指定ボタン、カスタム時間）
  - ロック機能（希望休・希望シフト由来はロック）
- [ ] 4.2 段階的配置ボタン実装
  - Phase 1実行ボタン
  - 進捗表示
  - エラーハンドリング
- [ ] 4.3 ステータス管理UI
  - 仮確定ボタン
  - 確定ボタン
  - ステータス表示バッジ
- [ ] 4.4 VacationManagement.tsx改善
  - 一括承認ボタン
  - 承認済み件数表示
- [ ] 4.5 WorkPreferenceManagement.tsx改善
  - 一括承認ボタン
- [ ] 4.6 AdminApp.tsx統合
  - ルーティング追加
  - ShiftEditorV2への遷移

**完了条件:**
- ✅ 12月システムと同等のUI/UXを実現
- ✅ 希望承認→自動反映フローが動作
- ✅ 段階的配置が正常動作
- ✅ 統計列が正確に表示

---

### フェーズ5: PDF出力・通知機能（1月15日～1月18日）

**期間:** 4日
**担当:** バックエンド + フロントエンド
**影響:** なし（新規機能追加）

#### タスク一覧
- [ ] 5.1 PDF生成処理実装
  - `server/utils/pdfGenerator.ts`の完成
  - A3横、職員×日付マトリクス、統計列
  - 凡例、タイトル、日付表示
- [ ] 5.2 S3アップロード処理
  - Cloudflare R2 or AWS S3
  - 署名付きURL生成
- [ ] 5.3 メール通知処理
  - Resend API統合
  - テンプレート作成（仮確定通知、確定通知）
  - 一斉送信処理
- [ ] 5.4 フロントエンドにPDFボタン追加
  - 「PDF出力」ボタン
  - プレビュー表示
  - ダウンロードボタン

**完了条件:**
- ✅ PDF生成が正常動作
- ✅ 職員全員にメール送信できる
- ✅ PDFダウンロードが可能

---

### フェーズ6: 本番デプロイとテスト（1月19日～1月25日）

**期間:** 7日
**担当:** 全員
**影響:** なし（1月シフトのみ）

#### タスク一覧
- [ ] 6.1 本番DBマイグレーション
  - `pnpm run db:push`
  - `pnpm tsx scripts/migrate-break-time-rules.ts`
- [ ] 6.2 ステージング環境デプロイ
- [ ] 6.3 統合テスト（E2Eテスト）
  - 希望休登録 → 承認 → 自動反映
  - 希望シフト登録 → 承認 → 自動反映
  - 段階的配置実行 → 統計計算確認
  - 仮確定 → PDF出力 → メール送信
  - 手動修正 → 確定 → メール送信
- [ ] 6.4 本番環境デプロイ
- [ ] 6.5 1月シフト作成（実運用テスト）
- [ ] 6.6 フィードバック収集・修正

**完了条件:**
- ✅ 全ワークフローが正常動作
- ✅ 統計計算が正確
- ✅ PDF出力が正常
- ✅ メール通知が正常
- ✅ 職員・管理者から問題報告なし

---

## 9. テスト計画

### 9.1 ユニットテスト

**対象:**
- `server/utils/breakTimeCalculator.ts`
- `server/utils/shiftStatsCalculator.ts`
- `server/simpleShiftGenerator.ts`

**ツール:** Vitest

**テストケース例:**

```typescript
// breakTimeCalculator.test.ts
describe('calculateBreakTime', () => {
  it('固定時間の場合、常に同じ時間を返す', () => {
    const rule = { type: 'fixed', duration: 1 };
    expect(calculateBreakTime(5, rule)).toBe(1);
    expect(calculateBreakTime(8, rule)).toBe(1);
  });

  it('条件付きの場合、閾値を超えたら休憩時間を返す', () => {
    const rule = { type: 'conditional', threshold: 6, conditionDuration: 1 };
    expect(calculateBreakTime(5, rule)).toBe(0);
    expect(calculateBreakTime(7, rule)).toBe(1);
  });

  it('休憩なしの場合、常に0を返す', () => {
    const rule = { type: 'none' };
    expect(calculateBreakTime(8, rule)).toBe(0);
  });
});
```

### 9.2 統合テスト

**対象:**
- 希望休承認 → シフト自動反映フロー
- 段階的配置実行 → 統計計算フロー
- PDF生成 → S3アップロードフロー

**ツール:** Vitest + Playwright

### 9.3 E2Eテスト

**シナリオ:**
1. 職員が希望休を登録
2. 管理者が承認
3. シフトに自動反映されることを確認
4. 管理者が段階的配置を実行
5. 統計列が正確に表示されることを確認
6. 仮確定してPDF出力
7. 確定してメール送信

**ツール:** Playwright

---

## 10. デプロイ計画

### 10.1 デプロイ戦略

**方式:** ブルーグリーンデプロイ

**手順:**
1. ステージング環境デプロイ
2. 統合テスト実行
3. 本番環境デプロイ（Railwayの新インスタンス）
4. 動作確認
5. トラフィック切り替え
6. 旧インスタンス停止

### 10.2 ロールバックプラン

**トリガー:**
- 重大なバグ発見
- ステータス遷移が正常動作しない
- PDF生成失敗
- メール送信失敗

**手順:**
1. トラフィックを旧インスタンスに戻す
2. DBマイグレーションをロールバック（可能なら）
3. ログ収集・原因調査
4. 修正後に再デプロイ

### 10.3 監視項目

**アプリケーション:**
- エラー率（Sentry）
- レスポンス時間
- API成功率

**データベース:**
- 接続数
- クエリ実行時間
- デッドロック発生回数

**ビジネスメトリクス:**
- シフト作成完了率
- 希望承認処理時間
- PDF生成成功率
- メール送信成功率

---

## 11. リスク管理

### 11.1 技術的リスク

| リスク | 影響度 | 発生確率 | 対策 |
|-------|-------|---------|------|
| DBマイグレーション失敗 | 高 | 低 | ステージング環境で事前テスト、ロールバック手順準備 |
| PDF生成処理が重い | 中 | 中 | バックグラウンドジョブ化、キャッシュ活用 |
| メール送信が遅延 | 中 | 低 | キュー処理導入、リトライ機能実装 |
| 統計計算のバグ | 高 | 中 | ユニットテスト徹底、手動検証 |
| フロントエンドのパフォーマンス低下 | 中 | 低 | 仮想スクロール導入、レンダリング最適化 |

### 11.2 運用リスク

| リスク | 影響度 | 発生確率 | 対策 |
|-------|-------|---------|------|
| 職員・管理者が新UIに慣れない | 中 | 中 | 操作マニュアル作成、研修実施 |
| 12月システムとの混同 | 低 | 低 | 明確な区別表示、12月は専用システムのみ使用 |
| データ移行ミス | 高 | 低 | バックアップ取得、検証スクリプト実行 |

---

## 12. 成功指標

### 12.1 定量指標

| 指標 | 目標値 | 測定方法 |
|-----|-------|---------|
| シフト作成時間 | 50%削減（12月比較） | タイマー計測 |
| 希望承認処理時間 | 1件あたり10秒以内 | ログ分析 |
| PDF生成時間 | 30秒以内 | ログ分析 |
| エラー率 | 1%以下 | Sentry監視 |
| 職員満足度 | 4.5/5.0以上 | アンケート |
| 管理者満足度 | 4.5/5.0以上 | アンケート |

### 12.2 定性指標

- ✅ 職員が希望休・希望シフトを簡単に登録できる
- ✅ 管理者がシフト作成を効率的に行える
- ✅ PDFの品質が高く、印刷して使いやすい
- ✅ メール通知が確実に届く
- ✅ システムが安定稼働している

---

## 付録A: 実装チェックリスト

### フェーズ1: データベース拡張
- [ ] マイグレーションSQL作成
- [ ] Drizzleスキーマ更新
- [ ] マイグレーションスクリプト作成
- [ ] ローカル環境テスト
- [ ] データ投入確認

### フェーズ2: バックエンドリファクタリング
- [ ] 旧ロジック削除
- [ ] breakTimeCalculator.ts作成
- [ ] shiftStatsCalculator.ts作成
- [ ] pdfGenerator.ts作成
- [ ] simpleShiftGenerator.ts作成（Phase 1）
- [ ] tRPCルーター拡張
- [ ] ユニットテスト作成

### フェーズ3: 職員側UI/UX改善
- [ ] VacationRequest.tsx改善
- [ ] WorkPreferenceRequest.tsx改善
- [ ] ShiftView.tsx改善
- [ ] レスポンシブ対応確認

### フェーズ4: 管理側新UI実装
- [ ] ShiftEditorV2.tsx作成
- [ ] 段階的配置ボタン実装
- [ ] ステータス管理UI実装
- [ ] VacationManagement.tsx改善
- [ ] WorkPreferenceManagement.tsx改善
- [ ] AdminApp.tsx統合

### フェーズ5: PDF出力・通知機能
- [ ] PDF生成処理実装
- [ ] S3アップロード処理実装
- [ ] メール通知処理実装
- [ ] フロントエンドにPDFボタン追加

### フェーズ6: 本番デプロイとテスト
- [ ] 本番DBマイグレーション
- [ ] ステージング環境デプロイ
- [ ] 統合テスト実行
- [ ] 本番環境デプロイ
- [ ] 1月シフト作成（実運用テスト）
- [ ] フィードバック収集・修正

---

## 付録B: 参考資料

### 既存システムファイル一覧

**12月専用システム（触らない）:**
- `client/src/components/DecemberShiftGeneration.tsx`
- `client/src/components/DecemberShiftSelectionModal.tsx`
- `server/routes/externalShifts.ts`
- `data/december-shifts/december-2025.json`

**既存コンポーネント（改善対象）:**
- `client/src/components/VacationRequest.tsx`
- `client/src/components/WorkPreferenceRequest.tsx`
- `client/src/components/ShiftView.tsx`
- `client/src/components/VacationManagement.tsx`
- `client/src/components/WorkPreferenceManagement.tsx`
- `client/src/components/StaffManagement.tsx`

**削除対象:**
- `server/phaseBasedShiftGenerator.ts`
- `server/aiShiftGenerator.ts`
- `server/improvedShiftGenerator.ts`
- `server/archived-generators/`

**データベーススキーマ:**
- `drizzle/schema.ts`

**tRPCルーター:**
- `server/routers.ts`

---

## 付録C: 用語集

| 用語 | 説明 |
|-----|------|
| 希望休 | 職員が休みを希望する日（休/有休） |
| 希望シフト | 職員が特定の時間帯で勤務を希望する日 |
| 段階的配置 | Phase 1-3の順次処理でシフトを生成する方式 |
| ハード制約 | 必ず守らなければならない制約（希望休など） |
| ソフト制約 | できるだけ守るべき制約（公平性など） |
| 仮確定 | 職員に確認してもらうための仮のシフト |
| 確定 | 変更不可の最終シフト |
| ロック | 編集不可の状態（希望休・希望シフト由来） |
| 統計列 | 勤務日数・総時間・夜勤回数などの集計 |
| 明け | 夜勤翌日の日中（勤務日数のみカウント） |

---

## 改訂履歴

| 版 | 日付 | 変更内容 | 作成者 |
|----|------|---------|-------|
| 1.0 | 2025-12-26 | 初版作成 | Claude Code |

---

**以上、完璧な実装計画書の完成です。**

次のステップ: フェーズ1（データベース拡張）の実装を開始しますか？
