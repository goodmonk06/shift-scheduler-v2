import { useState } from "react";
import { Settings as SettingsIcon, Palette, Image as ImageIcon, Check, Sparkles, Type, Info, Phone, Mail, BookOpen, LogOut, AlertCircle, Home, Calendar, Users } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Separator } from "./ui/separator";

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface HeaderImage {
  id: string;
  name: string;
  url: string;
}

export interface FontSize {
  id: string;
  name: string;
  description: string;
  size: string;
}

export const themes: Theme[] = [
  {
    id: "default",
    name: "ラベンダー＆ネイビー",
    description: "デフォルトの温かみのある配色",
    colors: {
      primary: "hsl(240, 60%, 25%)",
      secondary: "hsl(280, 60%, 75%)",
      accent: "hsl(160, 40%, 70%)",
    },
  },
  {
    id: "sakura",
    name: "桜ピンク",
    description: "優しいピンク系の配色",
    colors: {
      primary: "hsl(340, 50%, 40%)",
      secondary: "hsl(350, 70%, 85%)",
      accent: "hsl(30, 60%, 80%)",
    },
  },
  {
    id: "ocean",
    name: "オーシャンブルー",
    description: "爽やかな海のような配色",
    colors: {
      primary: "hsl(210, 70%, 35%)",
      secondary: "hsl(200, 60%, 75%)",
      accent: "hsl(180, 50%, 70%)",
    },
  },
  {
    id: "forest",
    name: "フォレストグリーン",
    description: "落ち着いた森の配色",
    colors: {
      primary: "hsl(150, 50%, 30%)",
      secondary: "hsl(140, 40%, 70%)",
      accent: "hsl(45, 60%, 75%)",
    },
  },
  {
    id: "sunset",
    name: "サンセットオレンジ",
    description: "温かみのある夕焼け配色",
    colors: {
      primary: "hsl(20, 60%, 40%)",
      secondary: "hsl(30, 70%, 75%)",
      accent: "hsl(350, 60%, 80%)",
    },
  },
];

export const headerImages: HeaderImage[] = [
  {
    id: "flowers",
    name: "パステルフラワー",
    url: "https://images.unsplash.com/photo-1709098165904-e9c5f9eec48a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBmbG93ZXJzJTIwc29mdHxlbnwxfHx8fDE3NjI1MDE0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: "nature",
    name: "自然の風景",
    url: "https://images.unsplash.com/photo-1603276730862-cbf79a742aae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuYXR1cmUlMjBsYW5kc2NhcGUlMjBjYWxtfGVufDF8fHx8MTc2MjU4ODY2MHww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: "ocean",
    name: "海とビーチ",
    url: "https://images.unsplash.com/photo-1705980109469-419a2ea0a181?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvY2VhbiUyMGJlYWNoJTIwcGVhY2VmdWx8ZW58MXx8fHwxNzYyNTg4NjYwfDA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: "sakura",
    name: "桜の花",
    url: "https://images.unsplash.com/photo-1651487064639-c0810ee4e342?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWt1cmElMjBjaGVycnklMjBibG9zc29tc3xlbnwxfHx8fDE3NjI1ODg2NjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: "mountain",
    name: "山と夕焼け",
    url: "https://images.unsplash.com/photo-1688733962106-092a78165f66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMHNreSUyMHN1bnNldHxlbnwxfHx8fDE3NjI1ODg2NjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
];

export const fontSizes: FontSize[] = [
  {
    id: "small",
    name: "小",
    description: "コンパクトに表示",
    size: "14px",
  },
  {
    id: "medium",
    name: "標準",
    description: "デフォルトのサイズ",
    size: "16px",
  },
  {
    id: "large",
    name: "大",
    description: "見やすい大きさ",
    size: "18px",
  },
  {
    id: "xlarge",
    name: "特大",
    description: "とても見やすい",
    size: "20px",
  },
];

interface SettingsProps {
  selectedTheme: string;
  selectedImage: string;
  selectedFontSize: string;
  onThemeChange: (themeId: string) => void;
  onImageChange: (imageId: string) => void;
  onFontSizeChange: (sizeId: string) => void;
  onLogout?: () => void;
}

export function Settings({ selectedTheme, selectedImage, selectedFontSize, onThemeChange, onImageChange, onFontSizeChange, onLogout }: SettingsProps) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    setShowLogout(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-secondary/20 via-accent/10 to-transparent" />
      <div className="absolute top-20 right-10 text-4xl opacity-20 animate-float">⚙️</div>
      <div className="absolute bottom-40 left-10 text-3xl opacity-20 animate-float-delayed">🎨</div>

      <div className="relative p-4 pb-24">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-primary" />
              設定
              <Sparkles className="w-5 h-5 text-accent" />
            </h2>
            <p className="text-muted-foreground">お好みのデザインにカスタマイズしましょう</p>
          </div>

          {/* Font Size Selection */}
          <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" />
                <h3>文字サイズ</h3>
              </div>
              <p className="text-sm text-muted-foreground">読みやすい文字サイズを選択できます</p>
              
              <RadioGroup value={selectedFontSize} onValueChange={onFontSizeChange}>
                <div className="space-y-3">
                  {fontSizes.map((fontSize) => (
                    <div key={fontSize.id} className="relative">
                      <Label
                        htmlFor={`font-${fontSize.id}`}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedFontSize === fontSize.id
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-secondary/30 hover:border-secondary/50 hover:bg-secondary/5"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <RadioGroupItem value={fontSize.id} id={`font-${fontSize.id}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: fontSize.size }}>{fontSize.name}</span>
                              {selectedFontSize === fontSize.id && (
                                <Badge className="bg-gradient-to-r from-primary to-primary/80">
                                  <Check className="w-3 h-3 mr-1" />
                                  選択中
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{fontSize.description}</p>
                          </div>
                        </div>
                        <div className="text-muted-foreground" style={{ fontSize: fontSize.size }}>
                          あ
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </Card>

          {/* Theme Selection */}
          <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <h3>カラーテーマ</h3>
              </div>
              <p className="text-sm text-muted-foreground">アプリ全体の配色を選択できます</p>
              
              <RadioGroup value={selectedTheme} onValueChange={onThemeChange}>
                <div className="space-y-3">
                  {themes.map((theme) => (
                    <div
                      key={theme.id}
                      className="relative"
                    >
                      <Label
                        htmlFor={`theme-${theme.id}`}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedTheme === theme.id
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-secondary/30 hover:border-secondary/50 hover:bg-secondary/5"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <RadioGroupItem value={theme.id} id={`theme-${theme.id}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span>{theme.name}</span>
                              {selectedTheme === theme.id && (
                                <Badge className="bg-gradient-to-r from-primary to-primary/80">
                                  <Check className="w-3 h-3 mr-1" />
                                  選択中
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: theme.colors.primary }}
                          />
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: theme.colors.secondary }}
                          />
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: theme.colors.accent }}
                          />
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>
          </Card>

          {/* Header Image Selection */}
          <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h3>ヘッダー画像</h3>
              </div>
              <p className="text-sm text-muted-foreground">ホーム画面の背景画像を選択できます</p>
              
              <div className="grid grid-cols-2 gap-3">
                {headerImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => onImageChange(image.id)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === image.id
                        ? "border-primary shadow-lg scale-105"
                        : "border-secondary/30 hover:border-secondary/50"
                    }`}
                  >
                    <div className="aspect-video relative">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      {selectedImage === image.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-white rounded-full p-2 shadow-lg">
                            <Check className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-xs text-white drop-shadow-lg">{image.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* App Info Section */}
          <Card className="p-6 bg-gradient-to-br from-white to-secondary/5 border-2 border-secondary/30 shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                <h3>アプリ情報</h3>
              </div>
              
              <div className="space-y-3">
                {/* Version */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-secondary flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm">バージョン</p>
                      <p className="text-xs text-muted-foreground">Version 1.0.0</p>
                    </div>
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm">お問い合わせ</p>
                      <p className="text-xs text-muted-foreground">0120-XXX-XXX</p>
                    </div>
                  </div>
                </div>

                {/* Contact Email */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/80 to-accent flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm">メールでのお問い合わせ</p>
                      <p className="text-xs text-muted-foreground">support@example.com</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Tutorial Button */}
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl border-2"
                  onClick={() => setShowTutorial(true)}
                >
                  <BookOpen className="w-5 h-5 mr-3" />
                  使い方ガイド
                </Button>

                {/* Logout Button */}
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl border-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowLogout(true)}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  ログアウト
                </Button>
              </div>
            </div>
          </Card>

          {/* Info Card */}
          <Card className="p-5 bg-gradient-to-br from-accent/20 via-accent/10 to-secondary/10 border-2 border-accent/40 shadow-lg">
            <div className="flex gap-4">
              <div className="text-4xl">✨</div>
              <div className="space-y-1">
                <h4>設定は自動保存されます</h4>
                <p className="text-sm text-muted-foreground">
                  変更した設定はすぐに反映され、次回アクセス時も保持されます。
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tutorial Dialog */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="max-w-md rounded-3xl border-2 border-secondary/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              使い方ガイド
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Home className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4>ホーム</h4>
                      <p className="text-sm text-muted-foreground">
                        次回のシフトや今月のスケジュールを確認できます。緊急連絡ボタンから管理者に連絡できます。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4>希望休</h4>
                      <p className="text-sm text-muted-foreground">
                        カレンダーから日付を選んで、休み・有休・時間指定の希望を入力できます。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4>シフト</h4>
                      <p className="text-sm text-muted-foreground">
                        確定したシフトを確認できます。
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <SettingsIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4>設定</h4>
                      <p className="text-sm text-muted-foreground">
                        文字サイズや色のテーマ、ヘッダー画像をカスタマイズできます。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              onClick={() => setShowTutorial(false)}
              className="w-full rounded-xl"
            >
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent className="rounded-3xl border-2 border-warning/50 max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-warning" />
              ログアウトしますか？
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  ログアウトすると、次回アクセス時に再度ログインが必要になります。
                </p>
                <div className="p-3 bg-accent/10 rounded-xl border-2 border-accent/30">
                  <p className="flex items-center gap-2 text-sm">
                    <span className="text-xl">💡</span>
                    <span>設定内容は保存されますのでご安心ください</span>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={() => setShowLogout(false)}
              className="rounded-xl border-2"
            >
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLogout}
              className="rounded-xl bg-gradient-to-r from-destructive to-destructive/80"
            >
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
