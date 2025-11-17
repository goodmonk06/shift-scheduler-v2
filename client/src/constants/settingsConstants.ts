import type { Theme, HeaderImage, FontSize } from "../types/settingsTypes";

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
