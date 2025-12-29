import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

async function updateEmployee() {
  const connection = await mysql.createConnection(connectionString);

  try {
    // まず現在の最大displayOrderを取得
    const [maxOrder] = await connection.execute(
      'SELECT MAX(displayOrder) as maxOrder FROM employees WHERE isArchived = FALSE'
    );

    const newDisplayOrder = (maxOrder[0].maxOrder || 0) + 100; // 一番下に配置

    console.log(`新しいdisplayOrder: ${newDisplayOrder}`);

    // 宮崎伸子様のレコードを更新
    const [result] = await connection.execute(`
      UPDATE employees
      SET
        employeeId = ?,
        displayOrder = ?,
        updatedAt = NOW()
      WHERE name = '宮崎 伸子'
    `, ['0044', newDisplayOrder]);

    if (result.affectedRows > 0) {
      console.log('\n✓ 宮崎 伸子様の情報を更新しました');
      console.log(`  職員ID: 0044`);
      console.log(`  displayOrder: ${newDisplayOrder} (一番下)`);
    } else {
      console.log('\n✗ 宮崎 伸子様のレコードが見つかりませんでした');
    }

    // 確認のため更新後のデータを表示
    const [employee] = await connection.execute(
      'SELECT id, employeeId, name, displayOrder FROM employees WHERE name = ?',
      ['宮崎 伸子']
    );

    console.log('\n更新後のデータ:');
    console.log(employee[0]);

  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

updateEmployee().catch(console.error);
