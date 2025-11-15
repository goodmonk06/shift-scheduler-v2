import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// グローバルエラーハンドラー
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

// PWAスタンドアロンモード検出
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                     (window.navigator as any).standalone ||
                     document.referrer.includes('android-app://');

console.log('[Main] Starting app, standalone mode:', isStandalone);
console.log('[Main] Current URL:', window.location.href);

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  createRoot(rootElement).render(<App />);
  console.log('[Main] App rendered successfully');
} catch (error) {
  console.error('[Main] Failed to render app:', error);
  // フォールバック: エラーメッセージを表示
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1 style="color: #8B5CF6;">アプリの起動に失敗しました</h1>
      <p>エラーが発生しました。ページを再読み込みしてください。</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; background: #8B5CF6; color: white; border: none; border-radius: 8px; font-size: 16px;">
        再読み込み
      </button>
      <details style="margin-top: 20px;">
        <summary>エラー詳細</summary>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error}</pre>
      </details>
    </div>
  `;
}
  