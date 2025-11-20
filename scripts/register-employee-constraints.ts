import * as db from '../server/db';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface EmployeeConstraintData {
  name: string;
  breakTime: number;
  canWorkNightShift: boolean;
  additionalConstraints: any;
}

// 名前を正規化（スペースを削除）
function normalizeName(name: string): string {
  return name.replace(/\s+/g, '');
}

async function registerEmployeeConstraints() {
  try {
    console.log('📋 個別条件データを読み込み中...\n');

    const dataPath = path.join(__dirname, 'employee-constraints-data.json');
    const jsonData = await fs.readFile(dataPath, 'utf-8');
    const constraintsData: EmployeeConstraintData[] = JSON.parse(jsonData);

    console.log(`✅ ${constraintsData.length}名分のデータを読み込みました\n`);

    // 全従業員を取得
    const allEmployees = await db.getAllEmployees();
    console.log(`✅ データベースから${allEmployees.length}名の従業員を取得\n`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const constraintData of constraintsData) {
      // 名前で従業員を検索（スペースを無視）
      const normalizedSearchName = normalizeName(constraintData.name);
      const employee = allEmployees.find(e => normalizeName(e.name) === normalizedSearchName);

      if (!employee) {
        console.log(`⚠️  従業員が見つかりません: ${constraintData.name}`);
        notFoundCount++;
        continue;
      }

      // 従業員情報を更新
      await db.updateEmployee(employee.id, {
        breakTime: constraintData.breakTime,
        canWorkNightShift: constraintData.canWorkNightShift,
        additionalConstraints: constraintData.additionalConstraints,
      });

      console.log(`✅ ${employee.name}: 休憩${constraintData.breakTime}分、夜勤=${constraintData.canWorkNightShift}`);
      updatedCount++;
    }

    console.log(`\n完了: ${updatedCount}名更新、${notFoundCount}名未発見`);

    if (notFoundCount > 0) {
      console.log('\n未発見の従業員がいます。データベースの従業員名を確認してください。');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

registerEmployeeConstraints();
