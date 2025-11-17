import { getDb } from "../server/db";
import { workTimeSlots, employees, positionGroups, workplaceRules, shifts, shiftDetails } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function checkRuleGenData() {
  const db = await getDb();

  if (!db) {
    console.error("❌ Database connection failed");
    return;
  }

  console.log("=== ルールベース生成データチェック ===\n");

  try {
    // 1. 勤務時間枠の確認
    console.log("📌 勤務時間枠 (workTimeSlots):");
    const timeSlotsData = await db.select().from(workTimeSlots);
    console.log("総数:", timeSlotsData.length);
    timeSlotsData.forEach((slot: any) => {
      console.log(`  ID:${slot.id} ${slot.name} (${slot.startTime}-${slot.endTime}) 必要人数:${slot.requiredStaff} 夜勤:${slot.isNightShift ? '○' : '×'}`);
    });

    // 2. 職員データの確認
    console.log("\n📌 職員データ:");
    const employeesData = await db.select().from(employees);
    console.log("総数:", employeesData.length);

    // 職員の勤務区分分布
    const positionGroupsData = await db.select().from(positionGroups);
    console.log("\n勤務区分:");
    positionGroupsData.forEach((group: any) => {
      const count = employeesData.filter((emp: any) => emp.positionGroupId === group.id).length;
      console.log(`  ${group.name}: ${count}名 (最低休日数: ${group.minDaysOffPerMonth}日)`);
    });

    // 夜勤資格者数
    const nightCapable = employeesData.filter((emp: any) => emp.canWorkNightShift).length;
    console.log(`\n夜勤資格者: ${nightCapable}/${employeesData.length}名`);

    // 3. 職場ルールの確認
    console.log("\n📌 職場ルール (workplaceRules):");
    const rulesData = await db.select().from(workplaceRules);
    rulesData.forEach((rule: any) => {
      console.log(`  ${rule.ruleName}: ${JSON.stringify(rule.ruleValue)}`);
    });

    // 4. 12月シフトの状態確認
    console.log("\n📌 12月シフト (ID:8) の状態:");
    const shiftsData = await db.select().from(shifts).where(eq(shifts.id, 8));
    if (shiftsData.length > 0) {
      const shift = shiftsData[0];
      console.log(`  ステータス: ${shift.status}`);
      console.log(`  年月: ${shift.year}年${shift.month}月`);

      // シフト詳細数
      const shiftDetailsData = await db.select().from(shiftDetails).where(eq(shiftDetails.shiftId, 8));
      console.log(`  シフト詳細数: ${shiftDetailsData.length}`);

      // generatedBy別の集計
      const byGenerator: any = {};
      shiftDetailsData.forEach((detail: any) => {
        const gen = detail.generatedBy || "manual";
        byGenerator[gen] = (byGenerator[gen] || 0) + 1;
      });
      console.log("  生成元別:");
      Object.entries(byGenerator).forEach(([key, value]) => {
        console.log(`    ${key}: ${value}件`);
      });
    }

    // 5. 職員の制約情報サンプル
    console.log("\n📌 職員制約サンプル (最初の3名):");
    for (let i = 0; i < Math.min(3, employeesData.length); i++) {
      const emp = employeesData[i];
      console.log(`\n  ${emp.name} (ID:${emp.id}):`);

      if (emp.additionalConstraints) {
        const constraints = JSON.parse(emp.additionalConstraints);

        if (constraints.workConstraints) {
          console.log("    勤務制約:");
          constraints.workConstraints.forEach((c: any) => {
            if (c.isActive) {
              console.log(`      - ${c.description}`);
            }
          });
        }

        if (constraints.leaveAllowances) {
          console.log("    休暇残高:");
          if (constraints.leaveAllowances.paidLeave) {
            console.log(`      - 有給休暇: ${constraints.leaveAllowances.paidLeave.remainingDays}日`);
          }
        }
      } else {
        console.log("    制約設定なし");
      }
    }

  } catch (error) {
    console.error("❌ エラー:", error);
  } finally {
    process.exit(0);
  }
}

checkRuleGenData();