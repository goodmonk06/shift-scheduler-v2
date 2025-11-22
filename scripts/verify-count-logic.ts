// 人数カウントロジックの検証スクリプト

// parseShiftTime関数のテスト
const parseShiftTime = (text: string, type: string): { start: number; end: number } | null => {
  // null/undefinedは休みとして扱う
  if (!text) return null;

  // 夜勤は16時～24時（翌日0時～9時は前日夜勤チェックでカウント）
  if (text === '夜' || type === 'NIGHT') return { start: 16, end: 24 };
  // 「明」は表記のみで時間カウントなし（前日の夜勤でカウント済み）
  if (text === '休' || type === 'OFF' || text === '' || text === '有' || text === '冬' || text === '明' || text === '研修') return null;

  if (text === '日' || type === 'DAY') return { start: 9, end: 18 };
  if (text === '日A') return { start: 8, end: 17 };
  if (text === '日B') return { start: 9, end: 18 };
  if (text === '早' || type === 'EARLY') return { start: 7, end: 16 };
  if (text === '遅' || type === 'LATE') return { start: 10, end: 19 };

  const match = text.match(/(\d+)(?:半)?～(\d+)(?:半)?/);
  if (match) {
    let start = parseInt(match[1]);
    if (text.includes(match[1] + '半')) start += 0.5;
    let end = parseInt(match[2]);
    if (text.includes(match[2] + '半')) end += 0.5;
    return { start, end };
  }
  return { start: 9, end: 18 };
};

console.log('=== parseShiftTime関数のテスト ===\n');

const testCases = [
  { text: null, type: 'DAY', expected: null, description: 'null → 休み' },
  { text: undefined, type: 'DAY', expected: null, description: 'undefined → 休み' },
  { text: '', type: 'DAY', expected: null, description: '空文字 → 休み' },
  { text: '休', type: 'DAY', expected: null, description: '休 → 休み' },
  { text: '有', type: 'DAY', expected: null, description: '有 → 休み' },
  { text: '冬', type: 'DAY', expected: null, description: '冬 → 休み' },
  { text: '明', type: 'DAY', expected: null, description: '明 → 休み（前日夜勤でカウント済み）' },
  { text: '研修', type: 'DAY', expected: null, description: '研修 → 休み' },
  { text: '夜', type: 'DAY', expected: { start: 16, end: 24 }, description: '夜 → 16-24' },
  { text: '早', type: 'DAY', expected: { start: 7, end: 16 }, description: '早 → 7-16' },
  { text: '遅', type: 'DAY', expected: { start: 10, end: 19 }, description: '遅 → 10-19' },
  { text: '日', type: 'DAY', expected: { start: 9, end: 18 }, description: '日 → 9-18' },
  { text: '日A', type: 'DAY', expected: { start: 8, end: 17 }, description: '日A → 8-17' },
  { text: '日B', type: 'DAY', expected: { start: 9, end: 18 }, description: '日B → 9-18' },
  { text: '9～18', type: 'DAY', expected: { start: 9, end: 18 }, description: '9～18 → 9-18' },
  { text: '8～16', type: 'DAY', expected: { start: 8, end: 16 }, description: '8～16 → 8-16' },
  { text: '8半～12半', type: 'DAY', expected: { start: 8.5, end: 12.5 }, description: '8半～12半 → 8.5-12.5' },
  { text: '18～20', type: 'DAY', expected: { start: 18, end: 20 }, description: '18～20 → 18-20' },
];

let allPass = true;

testCases.forEach(test => {
  const result = parseShiftTime(test.text as any, test.type);
  const pass = JSON.stringify(result) === JSON.stringify(test.expected);

  if (pass) {
    console.log(`✓ ${test.description}`);
  } else {
    console.log(`✗ ${test.description}`);
    console.log(`  期待値: ${JSON.stringify(test.expected)}`);
    console.log(`  実際値: ${JSON.stringify(result)}`);
    allPass = false;
  }
});

console.log('\n=== スロット計算のテスト ===\n');

// スロット計算のテスト
const timeToSlotTests = [
  { time: '7:00', hour: 7, min: 0, expectedSlot: 14, description: '7:00 → スロット14' },
  { time: '7:30', hour: 7, min: 30, expectedSlot: 15, description: '7:30 → スロット15' },
  { time: '8:00', hour: 8, min: 0, expectedSlot: 16, description: '8:00 → スロット16' },
  { time: '8:30', hour: 8, min: 30, expectedSlot: 17, description: '8:30 → スロット17' },
  { time: '9:00', hour: 9, min: 0, expectedSlot: 18, description: '9:00 → スロット18' },
  { time: '16:00', hour: 16, min: 0, expectedSlot: 32, description: '16:00 → スロット32' },
  { time: '18:00', hour: 18, min: 0, expectedSlot: 36, description: '18:00 → スロット36' },
];

timeToSlotTests.forEach(test => {
  const slot = Math.floor(test.hour * 2 + test.min / 30);
  const pass = slot === test.expectedSlot;

  if (pass) {
    console.log(`✓ ${test.description}`);
  } else {
    console.log(`✗ ${test.description}`);
    console.log(`  期待値: ${test.expectedSlot}`);
    console.log(`  実際値: ${slot}`);
    allPass = false;
  }
});

console.log('\n=== 時間範囲からスロット範囲へのテスト ===\n');

const rangeTests = [
  { start: 8, end: 16, expectedStartSlot: 16, expectedEndSlot: 32, description: '8:00-16:00 → スロット16-32（32は含まない）' },
  { start: 8.5, end: 12.5, expectedStartSlot: 17, expectedEndSlot: 25, description: '8:30-12:30 → スロット17-25（25は含まない）' },
  { start: 7, end: 16, expectedStartSlot: 14, expectedEndSlot: 32, description: '7:00-16:00 → スロット14-32' },
  { start: 18, end: 20, expectedStartSlot: 36, expectedEndSlot: 40, description: '18:00-20:00 → スロット36-40' },
];

rangeTests.forEach(test => {
  const startSlot = Math.floor(test.start * 2);
  const endSlot = Math.floor(test.end * 2);
  const pass = startSlot === test.expectedStartSlot && endSlot === test.expectedEndSlot;

  if (pass) {
    console.log(`✓ ${test.description}`);
    console.log(`  → ${endSlot - startSlot}スロット（${(endSlot - startSlot) * 0.5}時間）をカウント`);
  } else {
    console.log(`✗ ${test.description}`);
    console.log(`  期待値: ${test.expectedStartSlot}-${test.expectedEndSlot}`);
    console.log(`  実際値: ${startSlot}-${endSlot}`);
    allPass = false;
  }
});

console.log('\n=== 前日夜勤のカウントテスト ===\n');

console.log('前日夜勤（16:00-24:00）は、翌日0:00-9:00にカウントされる');
console.log('0:00-9:00 = スロット0-17（18スロット = 9時間）');
console.log('');

const nightShiftSlots = [];
for (let slot = 0; slot < 18; slot++) {
  nightShiftSlots.push(slot);
}
console.log(`前日夜勤でカウントされるスロット: ${nightShiftSlots.join(', ')}`);
console.log(`合計: ${nightShiftSlots.length}スロット（${nightShiftSlots.length * 0.5}時間）`);

console.log('\n=== 正社員チェックの範囲テスト ===\n');

console.log('9:00-16:00で正社員1名以上が必要');
console.log('9:00 = スロット18, 16:00 = スロット32');
console.log('チェック範囲: スロット18-31（slot >= 18 && slot < 32）');
console.log('');

const fullTimeSlots = [];
for (let slot = 18; slot < 32; slot++) {
  const hour = Math.floor(slot / 2);
  const min = (slot % 2) === 0 ? '00' : '30';
  fullTimeSlots.push(`${hour}:${min}`);
}
console.log(`正社員チェック対象時間: ${fullTimeSlots.join(', ')}`);

console.log('\n=== 総合結果 ===\n');

if (allPass) {
  console.log('✓ すべてのテストがパスしました');
} else {
  console.log('✗ 一部のテストが失敗しました');
}
