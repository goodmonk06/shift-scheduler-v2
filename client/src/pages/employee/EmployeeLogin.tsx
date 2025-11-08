import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function EmployeeLogin() {
  const [, setLocation] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identifier.trim()) {
      toast.error("職員IDまたはメールアドレスを入力してください");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/simple-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("ログインしました");
        setLocation("/employee");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {APP_LOGO && (
            <div className="flex justify-center mb-4">
              <img src={APP_LOGO} alt={APP_TITLE} className="h-16 w-auto" />
            </div>
          )}
          <CardTitle className="text-2xl">{APP_TITLE}</CardTitle>
          <CardDescription>職員ログイン</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium">
                職員IDまたはメールアドレス
              </label>
              <Input
                id="identifier"
                type="text"
                placeholder="例: EMP00001 または email@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
