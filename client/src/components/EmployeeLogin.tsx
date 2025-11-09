import { useState } from "react";
import { LogIn, Sparkles, Heart, User } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

interface EmployeeLoginProps {
  onLoginSuccess: (email: string, password: string) => void | Promise<void>;
  onSwitchToAdmin?: () => void;
}

export function EmployeeLogin({ onLoginSuccess, onSwitchToAdmin }: EmployeeLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // デフォルトカラー（固定値）
  const defaultColors = {
    primary: '#2B3A55',
    secondary: '#C8BFE7',
    accent: '#F2B5D4',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("入力エラー", {
        description: "メールアドレスを入力してください",
      });
      return;
    }

    if (!password.trim()) {
      toast.error("入力エラー", {
        description: "パスワードを入力してください",
      });
      return;
    }

    setLoading(true);

    try {
      await onLoginSuccess(email.trim(), password);
      toast.success("ログイン成功", {
        description: "職員画面へようこそ！",
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
        background: `linear-gradient(to bottom right, ${defaultColors.secondary}4D, ${defaultColors.accent}33, #FDFDF9)`
      }}
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-20 right-20 text-6xl opacity-10 animate-float">🌸</div>
      <div className="absolute bottom-32 left-16 text-5xl opacity-10 animate-float-delayed">💐</div>
      <div className="absolute top-1/3 left-1/4 text-4xl opacity-10 animate-float">🌼</div>
      <div className="absolute bottom-1/4 right-1/3 text-5xl opacity-10 animate-float-delayed">✨</div>

      {/* Floating Gradient Orbs */}
      <div 
        className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-50 animate-pulse"
        style={{
          background: `linear-gradient(to bottom right, ${defaultColors.secondary}4D, ${defaultColors.accent}4D)`
        }}
      />
      <div 
        className="absolute bottom-1/3 left-1/3 w-80 h-80 rounded-full blur-3xl opacity-40 animate-pulse"
        style={{
          background: `linear-gradient(to bottom right, ${defaultColors.accent}33, ${defaultColors.secondary}33)`,
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
              background: `linear-gradient(to bottom right, ${defaultColors.secondary}, ${defaultColors.accent}, ${defaultColors.secondary}99)`
            }}
          >
            <Heart className="w-10 h-10 text-white fill-white drop-shadow-lg" />
            <div 
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(to bottom right, ${defaultColors.accent}, #FBC9A4)`
              }}
            >
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 style={{ color: defaultColors.primary }}>シフトスケジューラー</h1>
            <div className="flex items-center justify-center gap-2">
              <User className="w-6 h-6" style={{ color: defaultColors.secondary }} />
              <h2 style={{ color: defaultColors.secondary }}>職員ログイン</h2>
              <Sparkles className="w-5 h-5" style={{ color: defaultColors.accent }} />
            </div>
            <p className="text-muted-foreground">
              メールアドレスとパスワードでログイン
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card 
          className="p-8 bg-white/95 backdrop-blur-sm border-2 shadow-2xl rounded-3xl"
          style={{ borderColor: `${defaultColors.secondary}4D` }}
        >
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-3">
              <Label htmlFor="email" className="flex items-center gap-2" style={{ color: defaultColors.primary }}>
                <User className="w-4 h-4" style={{ color: defaultColors.secondary }} />
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="例: email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 rounded-2xl border-2 px-4"
                style={{
                  borderColor: `${defaultColors.secondary}4D`,
                  '--tw-ring-color': defaultColors.secondary,
                } as React.CSSProperties}
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-3">
              <Label htmlFor="password" className="flex items-center gap-2" style={{ color: defaultColors.primary }}>
                <User className="w-4 h-4" style={{ color: defaultColors.secondary }} />
                パスワード
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワードを入力"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 rounded-2xl border-2 px-4"
                style={{
                  borderColor: `${defaultColors.secondary}4D`,
                  '--tw-ring-color': defaultColors.secondary,
                } as React.CSSProperties}
                disabled={loading}
              />
            </div>

            {/* Login Button */}
            <div className="relative pt-2">
              <div 
                className="absolute inset-0 rounded-2xl blur-xl"
                style={{
                  background: `linear-gradient(to right, ${defaultColors.secondary}66, ${defaultColors.accent}66)`
                }}
              />
              <Button
                type="submit"
                disabled={loading}
                className="relative w-full h-14 rounded-2xl shadow-xl text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(to right, ${defaultColors.secondary}, ${defaultColors.secondary}E6, ${defaultColors.accent})`
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
                    ログイン
                    <Heart className="w-5 h-5 ml-2 fill-white" />
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
              background: `linear-gradient(to bottom right, ${defaultColors.accent}1A, ${defaultColors.secondary}0D)`,
              borderColor: `${defaultColors.accent}4D`
            }}
          >
            <div className="flex gap-3">
              <div className="text-2xl">💡</div>
              <div className="space-y-1">
                <h4 className="text-sm">デモ用ログイン</h4>
                <p className="text-xs text-muted-foreground">
                  任意の文字列を入力してログインできます
                </p>
                <p className="text-xs text-muted-foreground">
                  例: <code className="px-1.5 py-0.5 rounded bg-muted">EMP00001</code>
                </p>
              </div>
            </div>
          </Card>

          {/* Admin Login Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              管理者の方はこちら
            </p>
            <Button
              variant="ghost"
              className="rounded-xl mt-1"
              style={{
                color: defaultColors.primary,
              }}
              onClick={() => {
                if (onSwitchToAdmin) {
                  onSwitchToAdmin();
                } else {
                  toast.info("画面上部のタブから「管理者ログイン」を選択してください");
                }
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              管理者ログインはこちら
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Heart className="w-3 h-3" style={{ fill: defaultColors.accent, color: defaultColors.accent }} />
            温かみのあるシフト管理
            <Sparkles className="w-3 h-3" style={{ color: defaultColors.secondary }} />
          </p>
        </div>
      </div>
    </div>
  );
}
