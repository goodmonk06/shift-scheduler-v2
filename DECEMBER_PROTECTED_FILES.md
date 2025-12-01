# 12月シフトシステム - 保護対象ファイル

> **重要**: 以下のファイルは12月シフト生成システムの中核であり、1月以降の開発で**絶対に変更しないでください**。
> バックアップブランチ: `december-freeze`

## 保護対象ファイル一覧

### フロントエンド

| ファイル | 説明 |
|---------|------|
| `client/src/components/DecemberShiftGeneration.tsx` | 12月シフト生成メインコンポーネント（スタンドアロン） |
| `client/src/components/DecemberShiftSelectionModal.tsx` | 12月シフト選択モーダル |

### 共通コンポーネント（変更時は慎重に）

以下のファイルは12月システムと他のシステムで共有されています。変更する場合は12月システムに影響がないことを確認してください。

| ファイル | 用途 |
|---------|------|
| `client/src/AdminApp.tsx` | 管理画面ナビゲーション |
| `client/src/components/ui/*` | UIコンポーネント（shadcn/ui） |

## 1月シフト開発時のガイドライン

1. **新規ファイルを作成する**: `JanuaryShiftGeneration.tsx` など、新しいファイルを作成
2. **DecemberShiftGeneration.tsx をコピーして開始**: ロジックを流用する場合は、コピーして新ファイルを作成
3. **共通化は後回し**: 最初は独立して開発し、動作確認後に必要であれば共通化を検討

## バックアップブランチ

万が一、12月システムに問題が発生した場合：

```bash
# december-freezeブランチから復元
git checkout december-freeze -- client/src/components/DecemberShiftGeneration.tsx
```

---
作成日: 2025-12-01
