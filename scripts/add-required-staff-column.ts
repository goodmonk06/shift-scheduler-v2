/**
 * workTimeSlotsテーブルにrequiredStaffカラムを追加するマイグレーション
 */

import mysql from 'mysql2/promise';

async function addRequiredStaffColumn() {
  const conn = await mysql.createConnection(
    process.env.DATABASE_URL!.replace(/[?&]ssl-mode=[^&]*/g, '')
  );

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 requiredStaffカラム追加マイグレーション');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. カラムを追加（デフォルト値 3）
    console.log('1️⃣ カラムを追加中...\n');
    await conn.query(`
      ALTER TABLE workTimeSlots
      ADD COLUMN requiredStaff INT NOT NULL DEFAULT 3
      COMMENT '必要人数'
    `);

    // 2. 各時間枠に適切な必要人数を設定
    console.log('2️⃣ 必要人数を設定中...\n');

    const staffRequirements = [
      { id: 5, name: '夜勤明け', requiredStaff: 2 },   // 夜勤明けは2人
      { id: 7, name: '早番', requiredStaff: 4 },       // 早番は4人
      { id: 8, name: '日勤A', requiredStaff: 5 },      // 日勤Aは5人
      { id: 9, name: '日勤B', requiredStaff: 5 },      // 日勤Bは5人
      { id: 10, name: '遅番', requiredStaff: 4 },      // 遅番は4人
      { id: 4, name: '夜勤(16-00)', requiredStaff: 2 }, // 夜勤は2人
      { id: 6, name: '夜勤(16-09)', requiredStaff: 2 }, // 夜勤は2人
    ];

    for (const slot of staffRequirements) {
      await conn.query(
        'UPDATE workTimeSlots SET requiredStaff = ? WHERE id = ?',
        [slot.requiredStaff, slot.id]
      );
      console.log(`   ✓ ID:${slot.id} ${slot.name} → ${slot.requiredStaff}人`);
    }

    console.log('\n3️⃣ 設定結果を確認...\n');
    const [results] = await conn.query(`
      SELECT id, name, startTime, endTime, requiredStaff
      FROM workTimeSlots
      ORDER BY startTime
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('時間枠 | 時間 | 必要人数');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    (results as any[]).forEach((row) => {
      console.log(
        `${row.name.padEnd(12)} | ${row.startTime}-${row.endTime} | ${row.requiredStaff}人`
      );
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ マイグレーション完了\n');
  } finally {
    await conn.end();
  }
}

addRequiredStaffColumn().catch(console.error);
