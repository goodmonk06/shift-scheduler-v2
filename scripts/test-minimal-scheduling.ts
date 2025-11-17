#!/usr/bin/env tsx

/**
 * Test script to verify minimal scheduling for 髙野 幹成
 */

import * as db from '../server/db';
import { generateShiftRuleBased } from '../server/ruleBasedShiftGeneratorApi';

async function testMinimalScheduling() {
  console.log('\n========================================');
  console.log('Testing Minimal Scheduling for 髙野 幹成');
  console.log('========================================\n');

  try {
    // Get December 2025 shift
    const shift = await db.getShiftByYearMonth(2025, 12);
    if (!shift) {
      console.error('December 2025 shift not found');
      return;
    }

    console.log(`Found shift ID: ${shift.id}, Status: ${shift.status}`);
    console.log('Running rule-based generation with minimal scheduling constraint...\n');

    // Clear existing non-vacation shift details for testing
    const existingDetails = await db.getShiftDetailsByShiftId(shift.id);
    const vacationDetails = existingDetails.filter(d => d.generatedBy === 'leave_request');
    const generatedDetails = existingDetails.filter(d => d.generatedBy !== 'leave_request');

    if (generatedDetails.length > 0) {
      console.log(`Clearing ${generatedDetails.length} existing generated assignments...`);
      for (const detail of generatedDetails) {
        await db.deleteShiftDetail(detail.id);
      }
    }

    // Run rule-based generation
    await generateShiftRuleBased({
      shiftId: shift.id,
      year: 2025,
      month: 12,
    });

    // Analyze results
    console.log('\n========================================');
    console.log('Analysis Results');
    console.log('========================================\n');

    const newDetails = await db.getShiftDetailsByShiftId(shift.id);
    const generatedAssignments = newDetails.filter(d => d.generatedBy !== 'leave_request');

    // Count assignments per employee
    const assignmentCounts = new Map<number, { name: string; count: number }>();

    for (const detail of generatedAssignments) {
      const employee = await db.getEmployeeById(detail.employeeId);
      if (!employee) continue;

      if (!assignmentCounts.has(detail.employeeId)) {
        assignmentCounts.set(detail.employeeId, { name: employee.name, count: 0 });
      }
      assignmentCounts.get(detail.employeeId)!.count++;
    }

    // Sort by count and display
    const sorted = Array.from(assignmentCounts.entries())
      .sort((a, b) => b[1].count - a[1].count);

    console.log('Shift Assignments by Employee:');
    console.log('------------------------------');

    let takanoCount = 0;
    let takanoRank = 0;

    sorted.forEach(([id, data], index) => {
      const marker = data.name === '髙野 幹成' ? ' ⬅️ TARGET (Should be minimal)' : '';
      console.log(`${(index + 1).toString().padStart(2)}. ${data.name.padEnd(12)} : ${data.count.toString().padStart(2)} shifts${marker}`);

      if (data.name === '髙野 幹成') {
        takanoCount = data.count;
        takanoRank = index + 1;
      }
    });

    console.log('\n========================================');
    console.log('Verification Results');
    console.log('========================================\n');

    const avgCount = generatedAssignments.length / sorted.length;
    const takanoData = assignmentCounts.get(17); // ID 17 is 髙野 幹成

    if (takanoData) {
      console.log(`✅ 髙野 幹成 assignments: ${takanoData.count} shifts`);
      console.log(`   Average per employee: ${avgCount.toFixed(1)} shifts`);
      console.log(`   Ranking: ${takanoRank}/${sorted.length} (${takanoRank === sorted.length ? 'LAST' : `${sorted.length - takanoRank} employees have fewer`})`);
      console.log(`   Reduction: ${((1 - takanoData.count / avgCount) * 100).toFixed(1)}% below average`);

      if (takanoData.count <= Math.ceil(avgCount * 0.3)) {
        console.log('\n🎉 SUCCESS: 髙野 幹成 is scheduled minimally (≤30% of average)');
      } else if (takanoData.count <= Math.ceil(avgCount * 0.5)) {
        console.log('\n⚠️ PARTIAL SUCCESS: 髙野 幹成 has reduced shifts but could be lower');
      } else {
        console.log('\n❌ NEEDS ADJUSTMENT: 髙野 幹成 still has too many shifts');
      }
    } else {
      console.log('🎉 PERFECT: 髙野 幹成 has NO assignments!');
    }

    console.log('\n========================================\n');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testMinimalScheduling().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});