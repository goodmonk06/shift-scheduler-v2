import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { RotateCcw } from 'lucide-react';
import { defaultColorSettings } from '../App';

interface ColorSettingsProps {
  settings: typeof defaultColorSettings;
  onSettingsChange: (settings: typeof defaultColorSettings) => void;
}

export function ColorSettings({ settings, onSettingsChange }: ColorSettingsProps) {
  const handleColorChange = (key: keyof typeof defaultColorSettings, value: string) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const handleReset = () => {
    onSettingsChange(defaultColorSettings);
  };

  const colorOptions = [
    { key: 'night' as const, label: '夜勤系（夜・明）', description: '「夜」「明」を含むシフト' },
    { key: 'early' as const, label: '早番系（早）', description: '「早」を含むシフト' },
    { key: 'off' as const, label: '休暇系（休・有）', description: '「休」「有」を含むシフト' },
    { key: 'saturday' as const, label: '土曜日の背景色', description: '土曜日のセル背景' },
    { key: 'sunday' as const, label: '日曜日の背景色', description: '日曜日のセル背景' },
    { key: 'event' as const, label: '行事予定列', description: '行事予定列の背景色' },
    { key: 'headerBg' as const, label: 'ヘッダー背景', description: 'テーブルヘッダーの背景' },
    { key: 'border' as const, label: '罫線色', description: 'テーブルの罫線' },
    { key: 'default' as const, label: 'デフォルト背景', description: '通常シフトの背景色' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleReset}
          className="w-full"
        >
          <RotateCcw className="size-4 mr-2" />
          デフォルトに戻す
        </Button>
      </div>

      <div className="space-y-4">
        {colorOptions.map(({ key, label, description }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>
              {label}
              <span className="block text-xs text-gray-500 mt-0.5">
                {description}
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                id={key}
                type="color"
                value={settings[key]}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="w-20 h-10 cursor-pointer"
              />
              <Input
                type="text"
                value={settings[key]}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="#000000"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm text-gray-700 mb-2">自動判定ルール</h3>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• シフトに「夜」「明」が含まれる → 夜勤系の色</li>
          <li>• シフトに「早」が含まれる → 早番系の色</li>
          <li>• シフトに「休」「有」が含まれる → 休暇系の色</li>
          <li>• 上記以外 → 曜日による背景色 or デフォルト</li>
        </ul>
      </div>
    </div>
  );
}