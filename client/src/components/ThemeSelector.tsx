import { Palette, Check } from "lucide-react";
import { Card } from "./ui/card";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { themes } from "../constants/settingsConstants";
import type { ThemeSelectorProps } from "../types/settingsTypes";

export function ThemeSelector({ selectedTheme, onThemeChange }: ThemeSelectorProps) {
  return (
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
              <div key={theme.id} className="relative">
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
  );
}
