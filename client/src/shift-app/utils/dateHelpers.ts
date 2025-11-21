// 日付範囲を生成
export const generateDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  let curr = new Date(start);
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

// ISO形式の日付文字列を取得
export const getIsoDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 休日かどうかを判定
export const isHoliday = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// 行事名を取得
export const getEventName = (date: Date): string => {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m === 12 && d === 8) return '給食委員会';
  if (m === 12 && d === 18) return '誕生日会';
  if (m === 12 && d === 25) return 'クリスマス会';
  if (m === 12 && d === 31) return '大晦日';
  if (m === 1 && d === 1) return '元旦';
  return '';
};

// 名字を取得
export const getSurname = (fullname: string): string => {
  const parts = fullname.split(/[\s　]+/);
  return parts[0];
};

// 曜日のスタイルを取得
export const getDayStyle = (day: number): { color: string; backgroundColor: string } => {
  if (day === 0) return { color: '#b91c1c', backgroundColor: '#fef2f2' };
  if (day === 6) return { color: '#1d4ed8', backgroundColor: '#eff6ff' };
  return { color: '#334155', backgroundColor: '#ffffff' };
};
