import { useState } from "react";
import { LogIn, Sparkles, Shield, Mail } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

interface AdminLoginProps {
  onLoginSuccess: (email: string) => void | Promise<void>;
  onSwitchToEmployee?: () => void;
}

export function AdminLogin({ onLoginSuccess, onSwitchToEmployee }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // デフォルトカラー（固定値）
  const defaultColors = {
    primary: '#2B3A55',
    secondary: '#C8BFE7',
    warning: '#FBC9A4',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("入力エラー", {
        description: "管理者IDを入力してください",
      });
      return;
    }

    setLoading(true);

    try {
      await onLoginSuccess(email.trim());
      toast.success("ログイン成功", {
        description: "管理者画面へようこそ！",
      });
    } catch (error) {
      console.error("Login error:", error);
      toast.error("ログイン失敗", {
        description: error instanceof Error ? error.message : "ログインに失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex items-center justify-center"
      style={{
        background: `linear-gradient(to bottom right, ${defaultColors.primary}33, ${defaultColors.primary}1A, #FDFDF9)`
      }}
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-24 right-24 text-6xl opacity-10 animate-float">⚙️</div>
      <div className="absolute bottom-28 left-20 text-5xl opacity-10 animate-float-delayed">📊</div>
      <div className="absolute top-1/3 left-1/4 text-4xl opacity-10 animate-float">✨</div>
      <div className="absolute bottom-1/4 right-1/3 text-5xl opacity-10 animate-float-delayed">🛡️</div>

      {/* Floating Gradient Orbs */}
      <div 
        className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-50 animate-pulse"
        style={{
          background: `linear-gradient(to bottom right, ${defaultColors.primary}33, ${defaultColors.primary}1A)`
        }}
      />
      <div 
        className="absolute bottom-1/3 left-1/3 w-80 h-80 rounded-full blur-3xl opacity-40 animate-pulse"
        style={{
          background: `linear-gradient(to bottom right, ${defaultColors.primary}26, ${defaultColors.primary}0D)`,
          animationDelay: '1s'
        }}
      />

      <div className="relative w-full max-w-md px-6">
        {/* Logo & Title Area */}
        <div className="text-center mb-8 space-y-4">
          {/* Logo */}
          <div 
            className="inline-flex items-center justify-center w-20 h-20 rounded-full shadow-2xl mb-4 relative"
            style={{
              background: `linear-gradient(to bottom right, ${defaultColors.primary}, ${defaultColors.primary}CC, ${defaultColors.primary}99)`
            }}
          >
            <Shield className="w-10 h-10 text-white drop-shadow-lg" />
            <div 
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(to bottom right, ${defaultColors.warning}, ${defaultColors.warning}B3)`
              }}
            >
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 style={{ color: defaultColors.primary }}>シフトスケジューラー</h1>
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-6 h-6" style={{ color: defaultColors.primary }} />
              <h2 style={{ color: defaultColors.primary }}>管理者ログイン</h2>
              <Sparkles className="w-5 h-5" style={{ color: defaultColors.warning }} />
            </div>
            <p className="text-muted-foreground">
              管理者IDでログイン
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card
          className="p-8 bg-white/95 backdrop-blur-sm border-2 shadow-2xl rounded-3xl"
          style={{ borderColor: `${defaultColors.primary}4D` }}
        >
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Admin ID Field */}
            <div className="space-y-3">
              <Label htmlFor="email" className="flex items-center gap-2" style={{ color: defaultColors.primary }}>
                <Mail className="w-4 h-4" style={{ color: defaultColors.primary }} />
                管理者ID（メールアドレス）
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-2xl border-2 px-4 text-lg"
                style={{
                  borderColor: `${defaultColors.primary}4D`,
                  '--tw-ring-color': defaultColors.primary,
                } as React.CSSProperties}
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Login Button */}
            <div className="relative pt-2">
              <div 
                className="absolute inset-0 rounded-2xl blur-xl"
                style={{
                  background: `linear-gradient(to right, ${defaultColors.primary}66, ${defaultColors.primary}4D)`
                }}
              />
              <Button
                type="submit"
                disabled={loading}
                className="relative w-full h-14 rounded-2xl shadow-xl text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(to right, ${defaultColors.primary}, ${defaultColors.primary}CC)`
                }}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ログイン中...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    管理者としてログイン
                    <Shield className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Bottom Info */}
        <div className="mt-8 space-y-4">
          {/* Demo Info Card */}
          <Card 
            className="p-4 border-2 rounded-2xl"
            style={{
              background: `linear-gradient(to bottom right, ${defaultColors.warning}1A, ${defaultColors.warning}0D)`,
              borderColor: `${defaultColors.warning}4D`
            }}
          >
            <div className="flex gap-3">
              <div className="text-2xl">💡</div>
              <div className="space-y-1">
                <h4 className="text-sm">デモ用ログイン</h4>
                <p className="text-xs text-muted-foreground">
                  任意のメールアドレスを入力してログインできます
                </p>
                <p className="text-xs text-muted-foreground">
                  例: <code className="px-1.5 py-0.5 rounded bg-muted">admin@example.com</code>
                </p>
              </div>
            </div>
          </Card>

          {/* Employee Login Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              職員の方はこちら
            </p>
            <Button
              variant="ghost"
              className="rounded-xl mt-1"
              style={{
                color: defaultColors.secondary,
              }}
              onClick={() => {
                if (onSwitchToEmployee) {
                  onSwitchToEmployee();
                } else {
                  toast.info("画面上部のタブから「職員ログイン」を選択してください");
                }
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              職員ログインはこちら
            </Button>
          </div>
        </div>

        {/* Security Notice */}
        <Card 
          className="mt-6 p-4 border-2 rounded-2xl"
          style={{
            background: `linear-gradient(to bottom right, ${defaultColors.primary}0D, ${defaultColors.primary}00)`,
            borderColor: `${defaultColors.primary}33`
          }}
        >
          <div className="flex gap-3">
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: defaultColors.primary }} />
            <div className="space-y-1">
              <h4 className="text-sm" style={{ color: defaultColors.primary }}>セキュアな接続</h4>
              <p className="text-xs text-muted-foreground">
                このシステムは安全に保護されています。ログイン情報は暗号化されて送信されます。
              </p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" style={{ color: defaultColors.primary }} />
            安全なシフト管理システム
            <Sparkles className="w-3 h-3" style={{ color: defaultColors.warning }} />
          </p>
        </div>
      </div>
    </div>
  );
}
