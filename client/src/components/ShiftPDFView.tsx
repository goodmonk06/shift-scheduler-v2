import React from 'react';
import type { ShiftAssignment, Employee } from '../types/shiftTypes';

interface ShiftPDFViewProps {
  viewYear: number;
  viewMonth: number;
  assignments: ShiftAssignment[];
  employees: Employee[];
  facilityName?: string;
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

// デフォルト色設定
const defaultColorSettings: ColorSettings = {
  night: "#0ea3db",      // 夜勤系（青）
  early: "#739058",      // 早番系（緑）
  off: "#e38c82",        // 休暇系（赤ピンク）
  saturday: "#e3f2fd",   // 土曜背景（薄青）
  sunday: "#ffebee",     // 日曜背景（薄赤）
  border: "#c8c8ca",     // 罫線
  default: "#fcfcfc",    // デフォルト背景
  event: "#e7c00d",      // 行事予定列
  headerBg: "#e7e4e6",   // ヘッダー背景
  textGray: "#9ea4a5"    // 補助テキスト
};

export function ShiftPDFView({
  viewYear,
  viewMonth,
  assignments,
  employees,
  facilityName = "グループホーム"
}: ShiftPDFViewProps) {
  const colorSettings = defaultColorSettings;

  // その月の日数を取得
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // 曜日を取得
  const getDayOfWeek = (day: number) => {
    const date = new Date(viewYear, viewMonth - 1, day);
    const dayOfWeek = date.getDay();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return { name: weekdays[dayOfWeek], index: dayOfWeek };
  };

  // シフトに応じた背景色を取得
  const getShiftColor = (shift: string | undefined, isVacationRequest: boolean, dayOfWeek: number): string => {
    if (!shift) return colorSettings.default;

    // 曜日による背景色（優先度低）
    let baseColor = colorSettings.default;
    if (dayOfWeek === 6) baseColor = colorSettings.saturday; // 土曜
    if (dayOfWeek === 0) baseColor = colorSettings.sunday;   // 日曜

    // 希望休の場合（薄い赤色）
    if (isVacationRequest) return '#ffcdd2';  // 薄い赤色

    // シフト内容による背景色（優先度高）
    if (shift === '夜') return '#5c6bc0';      // 夜勤（インディゴ）
    if (shift === '明') return '#9fa8da';      // 夜明け（薄いインディゴ）
    if (shift === '早') return '#64b5f6';      // 早番（薄い青）
    if (shift === '日A') return '#81c784';     // 日勤A（薄い緑）
    if (shift === '日B') return '#4db6ac';     // 日勤B（薄いエメラルド）
    if (shift === '遅') return '#ffb74d';      // 遅番（薄いオレンジ）
    if (shift === '休' || shift === '有休') return colorSettings.off;
    if (shift.includes('-')) return '#ce93d8'; // 時間指定（薄い紫）

    return baseColor;
  };

  // 今日の日付を取得
  const today = new Date();
  const updateDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 更新`;

  // スタッフ数に応じたフォントサイズを計算
  const staffCount = employees.length;
  const baseFontSize = staffCount <= 5 ? '11px' :
                       staffCount <= 8 ? '10px' :
                       staffCount <= 12 ? '9px' : '8px';

  // 職員ごとのシフトデータを整理
  const getEmployeeShifts = (employeeDbId: number) => {
    const shiftsMap: Record<number, { name: string; isVacationRequest: boolean }> = {};
    assignments
      .filter(a => a.employeeDbId === employeeDbId)
      .forEach(a => {
        const day = parseInt(a.date.split('-')[2]);
        shiftsMap[day] = {
          name: a.timeSlotName || '',
          isVacationRequest: a.isVacationRequest || false
        };
      });
    return shiftsMap;
  };

  // ダミーデータ：行事予定（後でバックエンドから取得）
  const events: Record<number, string> = {
    3: "避難訓練",
    15: "誕生会",
    25: "クリスマス会"
  };

  // ダミーデータ：人数不足エラー日（後でバックエンドから取得）
  const errorDays: number[] = [3, 15, 22];

  return (
    <div className="shift-pdf-container" style={{
      '--base-font-size': baseFontSize,
      '--border-color': colorSettings.border,
      '--header-bg': colorSettings.headerBg,
      '--event-bg': colorSettings.event,
      '--text-gray': colorSettings.textGray
    } as React.CSSProperties}>
      {/* ヘッダー */}
      <div className="shift-pdf-header">
        <div className="shift-pdf-title">
          <div className="shift-pdf-title-main">{facilityName}</div>
          <div className="shift-pdf-title-sub">{viewYear}年{viewMonth}月 勤務表</div>
        </div>
        <div className="shift-pdf-update-date">{updateDate}</div>
      </div>

      {/* テーブル */}
      <table className="shift-pdf-table">
        <thead>
          <tr>
            <th className="pdf-col-name" rowSpan={3}>氏名</th>
            {days.map((day) => {
              const event = events[day] || '';
              const isError = errorDays.includes(day);
              return (
                <th
                  key={`event-${day}`}
                  className="pdf-col-event-row"
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
              return (
                <th
                  key={`day-${day}`}
                  className="pdf-col-day"
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
                  className="pdf-col-weekday"
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
          {employees.map((employee) => {
            const shifts = getEmployeeShifts(employee.dbId);
            return (
              <tr key={`staff-${employee.dbId}`}>
                <td className="pdf-cell-name">{employee.name}</td>
                {days.map((day) => {
                  const shiftData = shifts[day];
                  const shift = shiftData?.name || '';
                  const isVacationRequest = shiftData?.isVacationRequest || false;
                  const { index } = getDayOfWeek(day);
                  return (
                    <td
                      key={`shift-${employee.dbId}-${day}`}
                      className="pdf-cell-shift"
                      style={{
                        backgroundColor: getShiftColor(shift, isVacationRequest, index)
                      }}
                    >
                      {shift}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}