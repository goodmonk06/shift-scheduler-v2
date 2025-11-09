# サーバー統計APIエンドポイント実装ガイド

このドキュメントでは、サーバー管理画面で使用する統計APIエンドポイント（`/api/server/stats`）の実装方法と注意点を説明します。

## 📋 実装するエンドポイント

```
GET /api/server/stats
```

### レスポンス形式

```typescript
interface ServerStats {
  storage: {
    used: number;        // MB
    total: number;       // MB
    percentage: number;  // 0-100
  };
  memory: {
    used: number;        // MB
    total: number;       // MB
    percentage: number;  // 0-100
  };
  database: {
    tables: number;
    totalRecords: number;
    lastBackup: string;  // ISO 8601形式
  };
  security: {
    sslEnabled: boolean;
    ipWhitelistEnabled: boolean;
    lastPasswordChange: string; // YYYY-MM-DD
  };
}
```

## ⚠️ 実装時の重要な注意点

### 1. Aivenのメトリクスは直接取得できない

**問題**: Aivenのストレージ使用率やメモリ使用率は、Aiven APIを通じてのみ取得可能です。データベースクエリでは取得できません。

**解決策の選択肢**:

#### オプションA: Aiven APIを使用（推奨だが複雑）

**メリット**:
- 正確なストレージ・メモリ使用率を取得可能
- リアルタイムのメトリクスが取得可能

**デメリット**:
- Aiven APIキーの設定が必要
- API呼び出しの頻度制限がある
- 実装が複雑

**実装例**:

```typescript
// server/routes/server.ts
import { Router } from "express";
import axios from "axios";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    // Aiven APIキーが必要（環境変数から取得）
    const aivenApiKey = process.env.AIVEN_API_KEY;
    const aivenProject = process.env.AIVEN_PROJECT;
    const aivenServiceName = process.env.AIVEN_SERVICE_NAME;

    if (!aivenApiKey || !aivenProject || !aivenServiceName) {
      throw new Error("Aiven credentials not configured");
    }

    // Aiven APIからメトリクスを取得
    const response = await axios.get(
      `https://api.aiven.io/v1/project/${aivenProject}/service/${aivenServiceName}/metrics`,
      {
        headers: {
          Authorization: `aivenv1 ${aivenApiKey}`,
        },
      }
    );

    const metrics = response.data.metrics;

    // メトリクスからストレージとメモリを抽出
    const storageMetric = metrics.find((m: any) => m.name === "disk_usage");
    const memoryMetric = metrics.find((m: any) => m.name === "memory_usage");

    const stats = {
      storage: {
        used: storageMetric?.value || 298,
        total: 1024,
        percentage: (storageMetric?.value || 298) / 1024 * 100,
      },
      memory: {
        used: memoryMetric?.value || 492,
        total: 1024,
        percentage: (memoryMetric?.value || 492) / 1024 * 100,
      },
      database: await getDatabaseStats(req.db),
      security: getSecurityStats(),
    };

    res.json(stats);
  } catch (error) {
    console.error("Failed to fetch server stats:", error);
    res.status(500).json({ error: "Failed to fetch server stats" });
  }
});

export default router;
```

**必要な環境変数**:

```bash
# .env に追加
AIVEN_API_KEY=your-aiven-api-key
AIVEN_PROJECT=your-project-name
AIVEN_SERVICE_NAME=shift-scheduler-kinyu000-c42a
```

**Aiven APIキーの取得方法**:
1. https://console.aiven.io/ にログイン
2. User Information → Authentication
3. "Generate token" でAPIキーを生成
4. `.env` に追加

**注意**: Aiven API呼び出しには頻度制限があります。キャッシュを実装することを推奨します（5分〜10分毎に更新）。

#### オプションB: 固定値 + データベース統計のみ（シンプル、推奨）

**メリット**:
- 実装が簡単
- 追加の認証情報不要
- パフォーマンスが良い

**デメリット**:
- ストレージ・メモリ使用率は固定値または推定値
- リアルタイムではない

**実装例**:

```typescript
// server/routes/server.ts
import { Router } from "express";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database connection failed" });
    }

    // データベース統計を取得
    const databaseStats = await getDatabaseStats(db);

    const stats = {
      storage: {
        // 固定値（Aivenの現在の値）
        used: 298,
        total: 1024,
        percentage: 29.1,
      },
      memory: {
        // 固定値（Aivenの現在の値）
        used: 492,
        total: 1024,
        percentage: 48.0,
      },
      database: databaseStats,
      security: {
        sslEnabled: true,
        ipWhitelistEnabled: false, // Aiven管理画面で確認して手動更新
        lastPasswordChange: "2025-01-15",
      },
    };

    res.json(stats);
  } catch (error) {
    console.error("Failed to fetch server stats:", error);
    res.status(500).json({ error: "Failed to fetch server stats" });
  }
});

// データベース統計を取得するヘルパー関数
async function getDatabaseStats(db: any) {
  // テーブル数を取得
  const tablesResult = await db.execute(
    "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'defaultdb'"
  );
  const tableCount = tablesResult[0]?.count || 0;

  // 総レコード数を取得（主要テーブルのみ）
  const users = await db.select().from(schema.users);
  const employees = await db.select().from(schema.employees);
  const shifts = await db.select().from(schema.shifts);
  const shiftDetails = await db.select().from(schema.shiftDetails);
  const leaveRequests = await db.select().from(schema.leaveRequests);

  const totalRecords =
    users.length +
    employees.length +
    shifts.length +
    shiftDetails.length +
    leaveRequests.length;

  return {
    tables: tableCount,
    totalRecords,
    lastBackup: new Date().toISOString(), // Aivenは自動バックアップ
  };
}

export default router;
```

#### オプションC: データサイズから推定（中間案）

**メリット**:
- Aivenへの依存なし
- ある程度動的

**デメリット**:
- 精度が低い
- テーブルサイズの取得に時間がかかる可能性

**実装例**:

```typescript
async function getStorageEstimate(db: any) {
  // テーブルサイズを取得
  const sizeResult = await db.execute(`
    SELECT
      SUM(data_length + index_length) / 1024 / 1024 AS size_mb
    FROM information_schema.tables
    WHERE table_schema = 'defaultdb'
  `);

  const usedMB = Math.round(sizeResult[0]?.size_mb || 0);
  const totalMB = 1024; // 1GB

  return {
    used: usedMB,
    total: totalMB,
    percentage: (usedMB / totalMB) * 100,
  };
}
```

## 🎯 推奨実装（オプションB + 将来的にオプションA）

**フェーズ1（現在）**: オプションBを実装
- データベース統計のみ動的に取得
- ストレージ・メモリは固定値
- シンプルで安定

**フェーズ2（将来）**: オプションAに移行
- Aiven APIキーを取得
- リアルタイムメトリクスを取得
- キャッシュ機構を実装

## 📁 ファイル構成

```
server/
├── routes/
│   └── server.ts          # 新規作成: サーバー統計API
├── _core/
│   └── index.ts          # ルートを追加
└── db.ts                 # データベース接続（既存）
```

## 🔧 実装手順

### 1. サーバールートファイルを作成

```bash
touch server/routes/server.ts
```

### 2. ルートを実装（上記のオプションBを使用）

### 3. メインサーバーにルートを追加

```typescript
// server/_core/index.ts
import serverRouter from "../routes/server";

// 既存のルート設定の後に追加
app.use("/api/server", serverRouter);
```

### 4. フロントエンドでAPIを呼び出し

```typescript
// client/src/components/ServerManagement.tsx

const fetchStats = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/server/stats');
    const data = await response.json();
    setStats(data);
    setLastUpdated(new Date());
  } catch (error) {
    console.error("Failed to fetch server stats:", error);
  } finally {
    setLoading(false);
  }
};
```

## 🔐 セキュリティ考慮事項

### 1. 認証が必要

このエンドポイントは管理者のみアクセス可能にすべきです。

```typescript
// ミドルウェアで認証チェック
router.get("/stats", requireAdmin, async (req, res) => {
  // ...
});
```

### 2. レート制限

頻繁なリクエストを防ぐため、レート制限を実装:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 10, // 1分間に最大10リクエスト
});

router.get("/stats", limiter, async (req, res) => {
  // ...
});
```

### 3. エラーハンドリング

詳細なエラー情報を返さない:

```typescript
} catch (error) {
  console.error("Server stats error:", error);
  // 詳細を隠す
  res.status(500).json({ error: "Internal server error" });
}
```

## 🚀 キャッシュの実装（推奨）

Aiven APIを使用する場合、キャッシュは必須です。

```typescript
// キャッシュの実装例
let cachedStats: ServerStats | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5分

router.get("/stats", async (req, res) => {
  const now = Date.now();

  // キャッシュが有効なら返す
  if (cachedStats && (now - cacheTimestamp) < CACHE_DURATION) {
    return res.json(cachedStats);
  }

  // 新しいデータを取得
  const stats = await fetchServerStats();
  cachedStats = stats;
  cacheTimestamp = now;

  res.json(stats);
});
```

## 📊 パフォーマンスの考慮

### データベースクエリの最適化

```typescript
// ❌ 悪い例: 全レコードを取得
const users = await db.select().from(schema.users);
const count = users.length;

// ✅ 良い例: COUNTクエリを使用
const result = await db.execute("SELECT COUNT(*) as count FROM users");
const count = result[0].count;
```

### 並列処理

```typescript
// 複数のテーブルを並列で取得
const [usersCount, employeesCount, shiftsCount] = await Promise.all([
  db.execute("SELECT COUNT(*) as count FROM users"),
  db.execute("SELECT COUNT(*) as count FROM employees"),
  db.execute("SELECT COUNT(*) as count FROM shifts"),
]);
```

## 🧪 テスト

```typescript
// server/__tests__/server.test.ts
import request from "supertest";
import app from "../_core/index";

describe("GET /api/server/stats", () => {
  it("should return server statistics", async () => {
    const response = await request(app)
      .get("/api/server/stats")
      .expect(200);

    expect(response.body).toHaveProperty("storage");
    expect(response.body).toHaveProperty("memory");
    expect(response.body).toHaveProperty("database");
    expect(response.body).toHaveProperty("security");
  });

  it("should require authentication", async () => {
    await request(app)
      .get("/api/server/stats")
      .expect(401); // 未認証
  });
});
```

## 📝 環境変数の設定（Aiven API使用時）

```bash
# .env
AIVEN_API_KEY=your-api-key-here
AIVEN_PROJECT=your-project-name
AIVEN_SERVICE_NAME=shift-scheduler-kinyu000-c42a
```

Railwayの環境変数にも設定:

```
Railway Dashboard → Variables →
AIVEN_API_KEY: your-api-key
AIVEN_PROJECT: your-project-name
AIVEN_SERVICE_NAME: shift-scheduler-kinyu000-c42a
```

## 🔍 デバッグとロギング

```typescript
router.get("/stats", async (req, res) => {
  const startTime = Date.now();

  try {
    console.log("[ServerStats] Fetching stats...");
    const stats = await fetchServerStats();

    const duration = Date.now() - startTime;
    console.log(`[ServerStats] Fetched in ${duration}ms`);

    res.json(stats);
  } catch (error) {
    console.error("[ServerStats] Error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});
```

## 📅 まとめ

### 推奨アプローチ

1. **初期実装（現在）**: オプションB（固定値 + データベース統計）
   - シンプルで安定
   - すぐに実装可能
   - 追加の認証不要

2. **将来的な改善**: オプションA（Aiven API）
   - リアルタイムメトリクス
   - キャッシュ必須
   - より正確

### 次のステップ

1. ✅ `server/routes/server.ts` を作成
2. ✅ データベース統計を取得する関数を実装
3. ✅ メインサーバーにルートを追加
4. ✅ 認証ミドルウェアを追加
5. ✅ レート制限を実装
6. ✅ フロントエンドでAPIを呼び出し
7. ⏳ テストを追加
8. ⏳ 本番環境でテスト

---

**更新日**: 2025年11月9日
**バージョン**: 1.0.0
