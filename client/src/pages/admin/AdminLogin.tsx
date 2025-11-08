import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Shield } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("メールアドレスを入力してください");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("管理者としてログインしました");
        setLocation("/");
      } else {
        toast.error(data.error || "ログインに失敗しました");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-800 p-4">
      <Card className="w-full max-w-md border-blue-200 dark:border-blue-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              {APP_LOGO && (
                <img src={APP_LOGO} alt={APP_TITLE} className="h-16 w-auto" />
              )}
              <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1">
                <Shield className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl">{APP_TITLE}</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 text-blue-600" />
            管理者ログイン
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                管理者メールアドレス
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? "ログイン中..." : "管理者としてログイン"}
            </Button>
            <div className="text-center text-sm text-muted-foreground mt-4">
              <a href="/employee/login" className="text-blue-600 hover:underline">
                職員ログインはこちら
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
