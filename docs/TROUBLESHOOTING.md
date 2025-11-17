# トラブルシューティングガイド

## tRPC関連のエラー

### 1. "Unable to transform response from server" エラー

**症状:**
- フロントエンドで `TRPCClientError: Unable to transform response from server` が発生
- API呼び出しは成功しているがレスポンスのパースに失敗

**原因:**
- クライアントとサーバーで異なる transformer 設定を使用している
- superjson のインポートで大文字小文字が異なる (`SuperJSON` vs `superjson`)
- Plain JSON モードなのに transformer が設定されている

**解決策:**
1. **クライアント側** (`client/src/lib/trpc.ts`):
   ```typescript
   export const trpcClient = createTRPCProxyClient<AppRouter>({
     // transformer削除: plain JSONを使用
     links: [
       httpBatchLink({
         url: `${import.meta.env.VITE_API_URL || ''}/api/trpc`,
         fetch(url, options) {
           return fetch(url, {
             ...options,
             credentials: 'include',
           });
         },
       }),
     ],
   });
   ```

2. **サーバー側** (`server/_core/trpc.ts`):
   ```typescript
   const t = initTRPC.context<TrpcContext>().create({
     // transformer削除: plain JSONを使用
   });
   ```

3. **Date型の扱い**:
   - Input: `z.string()` でISO文字列として受け取る
   - 処理: `new Date(isoString)` でDateに変換
   - Output: `new Date().toISOString()` で文字列に変換

### 2. "expected object, received undefined" エラー (400)

**症状:**
- POSTリクエストで 400 Bad Request
- ログに `expected object, received undefined` が表示

**原因:**
- フロントエンドがtRPCエンドポイントをRESTスタイルで呼び出している
- 例: `GET /api/trpc/endpoint?param=value` (誤)
- tRPCは `POST /api/trpc/endpoint?batch=1` + JSON body を期待

**解決策:**
```typescript
// ❌ 誤った実装 (REST風)
const response = await fetch('/api/trpc/endpoint?param=value', {
  method: 'GET'
});

// ✅ 正しい実装 (tRPCクライアント)
import { trpcClient } from '@/lib/trpc';
const result = await trpcClient.endpoint.query({ param: value });
```

### 3. "unstable_noTransformer is not a function" エラー

**症状:**
- サーバー起動時またはAPI呼び出し時にクラッシュ
- `TypeError: procedure.unstable_noTransformer is not a function`

**原因:**
- tRPC v11では `unstable_noTransformer()` メソッドが削除された
- transformer を無効化する正しい方法は、設定で transformer を指定しないこと

**解決策:**
```typescript
// ❌ 誤った実装
export const myProcedure = protectedProcedure
  .unstable_noTransformer() // これは存在しない
  .query(async () => { ... });

// ✅ 正しい実装
// transformer を create() で指定しなければ自動的に plain JSON
const t = initTRPC.context<TrpcContext>().create({
  // transformer なし
});
```

### 4. "Invalid insertId received: undefined" エラー

**症状:**
- データベースへの INSERT は成功するが、作成したレコードの取得に失敗
- `Invalid insertId received: undefined` エラー

**原因:**
- Drizzle ORM for MySQL2 の `insert()` 結果に `insertId` プロパティが含まれていない
- `result.insertId` を使った取得が失敗する

**解決策:**
```typescript
// ❌ 誤った実装
export async function createShift(data: InsertShift) {
  const result = await db.insert(shifts).values(data);
  const insertId = Number(result.insertId); // undefined になる
  return await getShiftById(insertId);
}

// ✅ 正しい実装 (一意制約を利用)
export async function createShift(data: InsertShift) {
  await db.insert(shifts).values(data);
  // year/month の組み合わせは一意なので安全
  const created = await getShiftByYearMonth(data.year, data.month);
  if (!created) {
    throw new Error(`Failed to retrieve created shift for ${data.year}/${data.month}`);
  }
  return created;
}
```

## Plain JSON vs superjson の選択

### Plain JSON を使うべき場合 (現在の実装)

**メリット:**
- シンプルで標準的
- デバッグが容易
- ネットワークタブで中身が見える
- 互換性が高い

**デメリット:**
- Date, Map, Set などの複雑な型を直接送信できない
- ISO文字列への変換が必要

**実装パターン:**
```typescript
// Input validation (server)
.input(z.object({
  deadline: z.string().optional(), // ISO文字列
}))
.mutation(async ({ input }) => {
  const data = {
    ...input,
    // ISO文字列をDateに変換
    deadline: input.deadline ? new Date(input.deadline) : undefined,
  };
  await db.create(data);
})

// Output (server)
.query(async () => {
  const data = await db.get();
  return {
    ...data,
    // DateをISO文字列に変換
    createdAt: data.createdAt.toISOString(),
  };
})
```

### superjson を使うべき場合

**メリット:**
- Date, Map, Set, undefined などを自動変換
- 手動変換が不要

**デメリット:**
- クライアント・サーバー両方で設定が必要
- デバッグが難しい (バイナリエンコード)
- import の大文字小文字に注意

**実装パターン:**
```typescript
// client/src/lib/trpc.ts
import superjson from 'superjson'; // 小文字

export const trpcClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [httpBatchLink({ url: '/api/trpc' })],
});

// server/_core/trpc.ts
import superjson from 'superjson'; // 小文字

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});
```

## ベストプラクティス

1. **transformer の一貫性**
   - クライアントとサーバーで必ず同じ設定を使用
   - Plain JSON か superjson のどちらかに統一

2. **Date型の扱い**
   - Plain JSON 使用時は必ず ISO 文字列に変換
   - zodスキーマは `z.string()` を使用
   - 変換を忘れずに: `new Date(str)` と `date.toISOString()`

3. **tRPCクライアントの使用**
   - 必ず `trpcClient.endpoint.query()` / `.mutate()` を使用
   - REST風の `fetch()` は使わない

4. **エラーハンドリング**
   - insertId に依存せず、一意制約を利用した取得を検討
   - エラーメッセージに詳細情報を含める

5. **型安全性**
   - zodスキーマとTypeScriptの型を一致させる
   - `.optional()` と `| undefined` の使い分けに注意

## 関連ファイル

- `client/src/lib/trpc.ts` - tRPCクライアント設定
- `server/_core/trpc.ts` - tRPCサーバー設定
- `server/routers.ts` - APIエンドポイント定義
- `server/db.ts` - データベース操作
- `client/src/lib/env.ts` - 環境変数管理

## 参考リンク

- [tRPC Documentation](https://trpc.io/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Zod Documentation](https://zod.dev/)
