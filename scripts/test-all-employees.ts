import * as db from '../server/db';

// 全27名の個別条件を定義
const EMPLOYEE_CONDITIONS = {
  '高野 幹成': { type: '正社員', conditions: '社長' },
  '山口 夕香里': { type: '正社員', conditions: '公休9日/月' },
  '馬渕 尊至': { type: '正社員', conditions: '管理者兼サ責' },
  '松嵜 愛梨': { type: '正社員', conditions: '条件なし、夜勤可' },
  '杉山 美佳子': { type: 'パート', conditions: '毎週金曜日は休み又は夜勤' },
  '梅田 英津子': { type: 'パート', conditions: '遅番なし、夜勤・早番・日勤のみ' },
  '大橋 健一': { type: 'パート', conditions: '毎週金曜日夜勤無、夜勤多め(月9-10回)' },
  '上条 やえ子': { type: 'パート', conditions: '8-16時月16日、9-15時月2日、合計月18日' },
  '若森 直子': { type: 'パート', conditions: '8-14時月12日、8-10時月1日、合計月13日' },
  '足立 洋子': { type: 'パート', conditions: '月曜9-16時、木曜8-16時のみ' },
  '野仲 彩香': { type: 'パート', conditions: '基本8:30-13:30' },
  '桂川 美幸': { type: 'パート', conditions: '月水金日18-20時のみ' },
  '加藤 広大': { type: 'パート', conditions: '水土11-20時、火曜休み' },
  '湯本 智子': { type: 'パート', conditions: '8-18時の間で8時間、週4日' },
  '楠 美佐': { type: 'パート', conditions: '土日祝休み、12月より毎週火曜休み、本人希望シフト' },
  '平井 英子': { type: 'パート', conditions: '毎週水金10-16時のみ' },
  '海野 はるか': { type: 'パート', conditions: '土日祝休み、9-14時' },
  '山田 明美': { type: 'パート', conditions: '9-15時で月14-15日' },
  '足立 豊子': { type: 'パート', conditions: '9-17時月18日、土日出勤したら翌週休み、連勤最大3日' },
  '関田 あゆみ': { type: 'パート', conditions: '土日祝休み、月火木9-15時、水金9-16時' },
  '長山 真梨奈': { type: 'パート', conditions: '土日祝休み、平日9-13:30' },
  '伊藤 美穂': { type: 'パート', conditions: '毎週火木土11:30-17時のみ（休職中）' },
  '近藤 由美子': { type: 'パート', conditions: '週1日9-13時、本人希望シフト' },
  '大堀 シェリー': { type: 'パート', conditions: '土日祝休み、週4日9-18時、本人希望シフト' },
  '宝本 龍騎': { type: 'パート', conditions: '曜日不定10-14時(15時)、本人希望シフト' },
  '岩崎 亜友美': { type: 'パート', conditions: '8-18時の間で8時間、週4日、毎週水土日休み' },
  '淺野 穂菜美': { type: 'パート', conditions: '木土日祝休み、8-16:30' },
};

async function testAllEmployees() {
  try {
    console.log('🧪 全27名の従業員をテスト中...\n');

    const employees = await db.getAllEmployees();
    console.log(`✅ データベースから${employees.length}名の従業員を取得\n`);

    console.log('=== 従業員一覧と個別条件 ===\n');

    let fullTimeCount = 0;
    let partTimeCount = 0;
    let configuredCount = 0;

    const positionGroups = await db.getAllPositionGroups();

    for (const emp of employees) {
      const group = positionGroups.find(g => g.id === emp.positionGroupId);
      const isFullTime = group?.employmentType === 'fulltime';

      if (isFullTime) fullTimeCount++;
      else partTimeCount++;

      const expectedCondition = EMPLOYEE_CONDITIONS[emp.name as keyof typeof EMPLOYEE_CONDITIONS];
      const hasConstraints = emp.additionalConstraints !== null && emp.additionalConstraints !== undefined;

      if (hasConstraints) configuredCount++;

      const icon = hasConstraints ? '✅' : '⚠️ ';
      const typeLabel = isFullTime ? '正社員' : 'パート';

      console.log(`${icon} ${emp.name} (${typeLabel})`);

      if (expectedCondition) {
        console.log(`   期待される条件: ${expectedCondition.conditions}`);
      }

      if (hasConstraints) {
        const constraints = emp.additionalConstraints as any;
        console.log(`   設定済み制約:`);

        if (constraints.weeklyFixed) {
          console.log(`     - 毎週固定パターン: ${constraints.weeklyFixed.length}件`);
        }
        if (constraints.holidaysOff) {
          console.log(`     - 土日祝休み: はい`);
        }
        if (constraints.noLateShift) {
          console.log(`     - 遅番なし: はい`);
        }
        if (constraints.defaultWorkTime) {
          console.log(`     - デフォルト勤務時間: ${constraints.defaultWorkTime.startTime}-${constraints.defaultWorkTime.endTime}`);
        }
        if (constraints.monthlyDays) {
          console.log(`     - 月間勤務日数: ${constraints.monthlyDays.min || constraints.monthlyDays.target}日`);
        }
      } else if (!isFullTime) {
        console.log(`   ⚠️  個別条件が未設定`);
      }

      console.log(`   休憩時間: ${emp.breakTime}分`);
      console.log(`   夜勤可能: ${emp.canWorkNightShift ? 'はい' : 'いいえ'}`);
      console.log('');
    }

    console.log('=== サマリー ===\n');
    console.log(`総従業員数: ${employees.length}名`);
    console.log(`  - 正社員: ${fullTimeCount}名`);
    console.log(`  - パート: ${partTimeCount}名`);
    console.log(`\n個別条件設定済み: ${configuredCount}名`);
    console.log(`個別条件未設定: ${employees.length - configuredCount}名`);

    const expectedConfigured = Object.keys(EMPLOYEE_CONDITIONS).filter(
      name => EMPLOYEE_CONDITIONS[name as keyof typeof EMPLOYEE_CONDITIONS].type === 'パート'
    ).length;

    console.log(`\n期待されるパート条件設定数: ${expectedConfigured}名`);

    if (configuredCount >= expectedConfigured) {
      console.log('✅ すべてのパート従業員に個別条件が設定されています！');
    } else {
      console.log(`⚠️  ${expectedConfigured - configuredCount}名のパート従業員の条件が未設定です`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

testAllEmployees();
