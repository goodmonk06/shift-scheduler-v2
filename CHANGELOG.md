# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-15

### Added
- 🎉 **施設イベント管理機能**: 管理者が施設イベントを登録・編集・削除可能
  - 全職員のカレンダーに自動反映
  - イベントがある日には🎉マークで表示
  - データベース: `facilityEvents` テーブル追加
  - API: `trpc.facilityEvents.*` エンドポイント追加
  - 管理者UI: `FacilityEventManagement.tsx` コンポーネント追加
- 📅 **祝日データ対応**: 2025年の全祝日データを実装
  - 職員ホーム画面のカレンダーで祝日名を表示
  - 希望休申請カレンダーで土日祝日の色分け表示
  - 日曜・祝日: 赤色、土曜: 青色
- ♻️ **施設イベント自動更新**: ページ可視化時・5分間隔で自動更新

### Fixed
- 🐛 **Critical: API無限ループ修正**
  - `ShiftTableView.tsx` の useEffect 依存配列の問題を修正
  - `workTimeSlots.list` APIが無限に呼び出されていた問題を解決
  - サーバーリソースとデータベースへの過負荷を防止
- 🐛 **Critical: useEffect インポートエラー修正**
  - `EmployeeHome.tsx` で useEffect がインポートされていなかった問題を修正
  - "cant find variable: useEffect" エラーで職員がホーム画面にアクセスできない問題を解決

### Changed
- 📝 **ベストプラクティス追加**: useEffect 依存配列の注意事項をドキュメント化
  - toast、navigate等のフック返り値を依存配列に含めないガイドライン

### Deprecated
- なし

### Removed
- 🗑️ **施設イベントモックデータ削除**: APIから取得するように変更

### Security
- なし

## [1.0.0] - 2025-11-14

### Added
- 初期リリース
- 職員ログイン機能（簡易認証）
- 管理者ログイン機能
- シフト管理機能
- 希望休申請機能
- 職員管理機能
- 役職グループ管理
- 勤務時間枠管理
- 変更提案管理
- 緊急通知機能

---

## バージョニングについて

- **Major (X.0.0)**: 破壊的変更を含むアップデート
- **Minor (1.X.0)**: 新機能追加（後方互換性あり）
- **Patch (1.1.X)**: バグ修正やマイナーな改善

## 関連リンク

- [本番環境](https://shift-scheduler-v2-production.up.railway.app)
- [GitHub Repository](https://github.com/goodmonk06/shift-scheduler-v2)
