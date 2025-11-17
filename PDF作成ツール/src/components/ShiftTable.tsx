interface ShiftData {
  facilityName: string;
  month: number;
  year: number;
  events?: Record<number, string>; // 日付ごとの行事予定
  errorDays?: number[]; // 人数不足エラーがある日付の配列（例: [3, 15, 22]）
  staff: Array<{
    name: string;
    position: string;
    shifts: Record<number, string>;
  }>;
}

interface ColorSettings {
  night: string;
  early: string;
  off: string;
  saturday: string;
  sunday: string;
  border: string;
  default: string;
  event: string;
  headerBg: string;
  textGray: string;
}

interface ShiftTableProps {
  data: ShiftData;
  colorSettings: ColorSettings;
}

export function ShiftTable({ data, colorSettings }: ShiftTableProps) {
  const { facilityName, month, year, events, errorDays, staff } = data;

  // その月の日数を取得
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 曜日を取得
  const getDayOfWeek = (day: number) => {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return { name: weekdays[dayOfWeek], index: dayOfWeek };
  };

  // シフトに応じた背景色を取得
  const getShiftColor = (shift: string | undefined, dayOfWeek: number): string => {
    if (!shift) return colorSettings.default;

    // 曜日による背景色（優先度低）
    let baseColor = colorSettings.default;
    if (dayOfWeek === 6) baseColor = colorSettings.saturday; // 土曜
    if (dayOfWeek === 0) baseColor = colorSettings.sunday;   // 日曜

    // シフト内容による背景色（優先度高）
    if (shift.includes('夜') || shift.includes('明')) return colorSettings.night;
    if (shift.includes('早')) return colorSettings.early;
    if (shift.includes('休') || shift.includes('有')) return colorSettings.off;

    return baseColor;
  };

  // 今日の日付を取得
  const today = new Date();
  const updateDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 更新`;

  // スタッフ数に応じたフォントサイズを計算
  const staffCount = staff.length;
  const baseFontSize = staffCount <= 5 ? '11px' : 
                       staffCount <= 8 ? '10px' : 
                       staffCount <= 12 ? '9px' : '8px';

  return (
    <div className="shift-table-container" style={{
      '--base-font-size': baseFontSize,
      '--border-color': colorSettings.border,
      '--header-bg': colorSettings.headerBg,
      '--event-bg': colorSettings.event,
      '--text-gray': colorSettings.textGray
    } as React.CSSProperties}>
      {/* ヘッダー */}
      <div className="shift-header">
        <div className="shift-title">
          <div className="shift-title-main">{facilityName}</div>
          <div className="shift-title-sub">{year}年{month}月 勤務表</div>
        </div>
        <div className="shift-update-date">{updateDate}</div>
      </div>

      {/* テーブル */}
      <table className="shift-table">
        <thead>
          <tr>
            <th className="col-name" rowSpan={3}>氏名</th>
            {days.map((day) => {
              const event = events?.[day] || '';
              const isError = errorDays?.includes(day) || false;
              return (
                <th 
                  key={`event-${day}`} 
                  className="col-event-row"
                  style={{
                    backgroundColor: isError ? '#fff59d' : '#ffffff'
                  }}
                >
                  {event}
                </th>
              );
            })}
          </tr>
          <tr>
            {days.map((day) => {
              const { name, index } = getDayOfWeek(day);
              const isWeekend = index === 0 || index === 6;
              return (
                <th 
                  key={`day-${day}`} 
                  className="col-day"
                  style={{
                    backgroundColor: index === 6 ? colorSettings.saturday : 
                                   index === 0 ? colorSettings.sunday : 
                                   colorSettings.headerBg
                  }}
                >
                  {day}
                </th>
              );
            })}
          </tr>
          <tr>
            {days.map((day) => {
              const { name, index } = getDayOfWeek(day);
              return (
                <th 
                  key={`weekday-${day}`} 
                  className="col-weekday"
                  style={{
                    backgroundColor: index === 6 ? colorSettings.saturday : 
                                   index === 0 ? colorSettings.sunday : 
                                   colorSettings.headerBg,
                    color: index === 0 ? '#d32f2f' : index === 6 ? '#1976d2' : '#000'
                  }}
                >
                  {name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {staff.map((person, personIndex) => (
            <tr key={`staff-${personIndex}`}>
              <td className="cell-name">{person.name}</td>
              {days.map((day) => {
                const shift = person.shifts[day];
                const { index } = getDayOfWeek(day);
                return (
                  <td 
                    key={`shift-${personIndex}-${day}`}
                    className="cell-shift"
                    style={{
                      backgroundColor: getShiftColor(shift, index)
                    }}
                  >
                    {shift || ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}