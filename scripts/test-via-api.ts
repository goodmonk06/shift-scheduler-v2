// ローカルサーバー経由でAPIをテストするスクリプト

async function testViaAPI() {
  try {
    console.log('🧪 API経由で全従業員をテスト中...\n');

    // ログインしてトークン取得
    console.log('📝 ログイン中...');
    const loginRes = await fetch('http://localhost:3000/api/trpc/auth.login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: { username: 'admin', password: 'admin123' }
      })
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.result?.data?.json?.token;

    if (!token) {
      throw new Error('No token received');
    }

    console.log('✅ ログイン成功\n');

    // 全従業員を取得
    console.log('📋 全従業員を取得中...');
    const employeesRes = await fetch('http://localhost:3000/api/trpc/employees.getAll', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!employeesRes.ok) {
      throw new Error(`Failed to get employees: ${employeesRes.status}`);
    }

    const employeesData = await employeesRes.json();
    const employees = employeesData.result?.data?.json || [];

    console.log(`✅ ${employees.length}名の従業員を取得\n`);

    // 職位グループを取得
    const groupsRes = await fetch('http://localhost:3000/api/trpc/positionGroups.getAll', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const groupsData = await groupsRes.json();
    const groups = groupsData.result?.data?.json || [];

    console.log('=== 全27名の従業員一覧 ===\n');

    let fullTimeCount = 0;
    let partTimeCount = 0;
    let configuredCount = 0;

    for (const emp of employees) {
      const group = groups.find((g: any) => g.id === emp.positionGroupId);
      const isFullTime = group?.employmentType === 'fulltime';

      if (isFullTime) fullTimeCount++;
      else partTimeCount++;

      const hasConstraints = emp.additionalConstraints !== null &&
                            emp.additionalConstraints !== undefined &&
                            Object.keys(emp.additionalConstraints || {}).length > 0;

      if (hasConstraints) configuredCount++;

      const icon = hasConstraints ? '✅' : (isFullTime ? '  ' : '⚠️ ');
      const typeLabel = isFullTime ? '正社員' : 'パート';

      console.log(`${icon} ${emp.name} (${typeLabel})`);
      console.log(`   休憩時間: ${emp.breakTime}分`);
      console.log(`   夜勤可能: ${emp.canWorkNightShift ? 'はい' : 'いいえ'}`);

      if (hasConstraints) {
        const constraints = emp.additionalConstraints;
        console.log(`   個別条件:`);

        if (constraints.weeklyFixed && constraints.weeklyFixed.length > 0) {
          console.log(`     - 毎週固定パターン: ${constraints.weeklyFixed.length}件`);
          constraints.weeklyFixed.forEach((fixed: any) => {
            const days = ['日', '月', '火', '水', '木', '金', '土'];
            console.log(`       ${days[fixed.dayOfWeek]}: ${fixed.type}${fixed.startTime ? ` (${fixed.startTime}-${fixed.endTime})` : ''}`);
          });
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
          console.log(`     - 月間勤務日数: ${constraints.monthlyDays.target || constraints.monthlyDays.min}日`);
        }
        if (constraints.weeklyDays) {
          console.log(`     - 週間勤務日数: ${constraints.weeklyDays}日`);
        }
        if (constraints.workTimeRange) {
          console.log(`     - 勤務可能時間: ${constraints.workTimeRange.startTime}-${constraints.workTimeRange.endTime} (${constraints.workTimeRange.duration}時間)`);
        }
      } else if (!isFullTime) {
        console.log(`   ⚠️  個別条件が未設定`);
      }

      console.log('');
    }

    console.log('=== サマリー ===\n');
    console.log(`総従業員数: ${employees.length}名`);
    console.log(`  - 正社員: ${fullTimeCount}名`);
    console.log(`  - パート: ${partTimeCount}名`);
    console.log(`\n個別条件設定済み: ${configuredCount}名`);
    console.log(`個別条件未設定: ${employees.length - configuredCount}名`);

    if (configuredCount >= 20) {
      console.log('\n✅ ほとんどのパート従業員に個別条件が設定されています！');
    } else {
      console.log(`\n⚠️  ${20 - configuredCount}名以上のパート従業員の条件が未設定です`);
      console.log('\n次のステップ: scripts/register-employee-constraints.ts を実行して個別条件を登録してください');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    console.error('\n確認事項:');
    console.error('1. ローカルサーバーが起動しているか（pnpm dev）');
    console.error('2. http://localhost:3000 にアクセスできるか');
    process.exit(1);
  }
}

testViaAPI();
