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

export interface SettingsProps {
  selectedTheme: string;
  selectedImage: string;
  selectedFontSize: string;
  onThemeChange: (themeId: string) => void;
  onImageChange: (imageId: string) => void;
  onFontSizeChange: (sizeId: string) => void;
  onLogout?: () => void;
}

export interface FontSizeSelectorProps {
  selectedFontSize: string;
  onFontSizeChange: (sizeId: string) => void;
}

export interface ThemeSelectorProps {
  selectedTheme: string;
  onThemeChange: (themeId: string) => void;
}

export interface HeaderImageSelectorProps {
  selectedImage: string;
  onImageChange: (imageId: string) => void;
}

export interface AppInfoCardProps {
  onShowTutorial: () => void;
  onShowLogout: () => void;
}

export interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
