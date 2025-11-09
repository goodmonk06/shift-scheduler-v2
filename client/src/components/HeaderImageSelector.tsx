import { Image as ImageIcon, Check } from "lucide-react";
import { Card } from "./ui/card";
import { headerImages } from "../constants/settingsConstants";
import type { HeaderImageSelectorProps } from "../types/settingsTypes";

export function HeaderImageSelector({ selectedImage, onImageChange }: HeaderImageSelectorProps) {
  return (
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
  );
}
