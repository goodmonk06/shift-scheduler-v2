import { Type, Check } from "lucide-react";
import { Card } from "./ui/card";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { fontSizes } from "../constants/settingsConstants";
import type { FontSizeSelectorProps } from "../types/settingsTypes";

export function FontSizeSelector({ selectedFontSize, onFontSizeChange }: FontSizeSelectorProps) {
  return (
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
  );
}
