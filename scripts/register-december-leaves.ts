import * as db from '../server/db';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LeaveRequestData {
  employeeName: string;
  date: string;
  leaveType: '休' | '有休';
  reason?: string;
}

interface WorkPreferenceData {
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

interface DecemberData {
  leaveRequests: LeaveRequestData[];
  workPreferences: WorkPreferenceData[];
}

async function registerDecemberLeaves() {
  try {
    console.log('📋 12月の希望休データを読み込み中...\n');

    // データ読み込み
    const dataPath = path.join(__dirname, 'december-leave-requests.json');
    const jsonData = await fs.readFile(dataPath, 'utf-8');
    const decemberData: DecemberData = JSON.parse(jsonData);

    console.log(`✅ 希望休${decemberData.leaveRequests.length}件、勤務希望${decemberData.workPreferences.length}件を読み込みました\n`);

    // 全従業員を取得
    const allEmployees = await db.getAllEmployees();
    console.log(`✅ データベースから${allEmployees.length}名の従業員を取得\n`);

    // 従業員名マッピング（スペース除去して比較）
    const normalizeeName = (name: string) => name.replace(/\s+/g, '');
    const employeeMap = new Map(
      allEmployees.map(e => [normalizeeName(e.name), e])
    );

    // 2025年12月のシフトを作成または取得
    console.log('📅 2025年12月のシフトを確認中...\n');
    const existingShifts = await db.getShiftsByMonth(2025, 12);

    let shiftId: number;
    if (existingShifts.length > 0) {
      shiftId = existingShifts[0].id;
      console.log(`✅ 既存のシフト (ID: ${shiftId}) を使用します\n`);
    } else {
      console.log('📝 新しいシフトを作成中...\n');
      const newShift = await db.createShift({
        year: 2025,
        month: 12,
        name: '2025年12月シフト（段階的生成）',
        status: 'vacation_only',
        generatedBy: 'manual',
        leaveRequestDeadline: new Date('2025-11-20T23:59:59'),
      });
      shiftId = newShift.id;
      console.log(`✅ 新しいシフト (ID: ${shiftId}) を作成しました\n`);
    }

    // 希望休を登録
    let leaveSuccessCount = 0;
    let leaveNotFoundCount = 0;
    let leaveErrorCount = 0;

    console.log('📝 希望休を登録中...\n');
    for (const leave of decemberData.leaveRequests) {
      const employee = employeeMap.get(normalizeeName(leave.employeeName));

      if (!employee) {
        console.log(`⚠️  従業員が見つかりません: ${leave.employeeName}`);
        leaveNotFoundCount++;
        continue;
      }

      try {
        // 既存の希望休をチェック
        const existingLeaves = await db.getLeaveRequestsByShift(shiftId);
        const isDuplicate = existingLeaves.some(
          l => l.employeeId === employee.id && l.startDate === leave.date && l.endDate === leave.date
        );

        if (isDuplicate) {
          console.log(`   ${leave.employeeName} ${leave.date}: スキップ（既存）`);
          continue;
        }

        await db.createLeaveRequest({
          employeeId: employee.id,
          shiftId: shiftId,
          startDate: leave.date,
          endDate: leave.date,
          leaveType: leave.leaveType,
          reason: leave.reason || '',
          status: 'approved', // 自動承認
        });

        console.log(`✅ ${leave.employeeName} ${leave.date}: ${leave.leaveType} (${leave.reason || ''})`);
        leaveSuccessCount++;
      } catch (error) {
        console.log(`❌ ${leave.employeeName} ${leave.date}: エラー - ${error}`);
        leaveErrorCount++;
      }
    }

    // 勤務希望を登録
    let prefSuccessCount = 0;
    let prefNotFoundCount = 0;
    let prefErrorCount = 0;

    if (decemberData.workPreferences.length > 0) {
      console.log('\n📝 勤務希望を登録中...\n');
      for (const pref of decemberData.workPreferences) {
        const employee = employeeMap.get(normalizeeName(pref.employeeName));

        if (!employee) {
          console.log(`⚠️  従業員が見つかりません: ${pref.employeeName}`);
          prefNotFoundCount++;
          continue;
        }

        try {
          // 既存の勤務希望をチェック
          const existingPrefs = await db.getWorkPreferencesByShift(shiftId);
          const isDuplicate = existingPrefs.some(
            p => p.employeeId === employee.id && p.startDate === pref.date && p.endDate === pref.date
          );

          if (isDuplicate) {
            console.log(`   ${pref.employeeName} ${pref.date}: スキップ（既存）`);
            continue;
          }

          await db.createWorkPreference({
            employeeId: employee.id,
            shiftId: shiftId,
            startDate: pref.date,
            endDate: pref.date,
            startTime: pref.startTime,
            endTime: pref.endTime,
            reason: pref.reason || '',
            status: 'approved', // 自動承認
          });

          console.log(`✅ ${pref.employeeName} ${pref.date}: ${pref.startTime}-${pref.endTime}`);
          prefSuccessCount++;
        } catch (error) {
          console.log(`❌ ${pref.employeeName} ${pref.date}: エラー - ${error}`);
          prefErrorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('完了サマリー:');
    console.log('='.repeat(60));
    console.log(`希望休: 成功${leaveSuccessCount}件、未発見${leaveNotFoundCount}件、エラー${leaveErrorCount}件`);
    if (decemberData.workPreferences.length > 0) {
      console.log(`勤務希望: 成功${prefSuccessCount}件、未発見${prefNotFoundCount}件、エラー${prefErrorCount}件`);
    }
    console.log(`シフトID: ${shiftId}`);
    console.log('='.repeat(60));

    if (leaveNotFoundCount > 0 || prefNotFoundCount > 0) {
      console.log('\n⚠️  未発見の従業員がいます。データベースの従業員名を確認してください。');
      console.log('データベース内の従業員名（正規化後）:');
      for (const emp of allEmployees.slice(0, 10)) {
        console.log(`  - ${emp.name} → ${normalizeeName(emp.name)}`);
      }
      if (allEmployees.length > 10) {
        console.log(`  ... 他${allEmployees.length - 10}名`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

registerDecemberLeaves();
