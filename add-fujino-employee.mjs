import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

async function addEmployee() {
  const connection = await mysql.createConnection(connectionString);

  try {
    // 既存チェック（同名あれば終了）
    const [existing] = await connection.execute(
      "SELECT id, name, isArchived FROM employees WHERE name = ?",
      ['藤野 麻紀子']
    );
    if (existing.length > 0) {
      console.log('既に藤野 麻紀子様が存在します:', existing[0]);
      // 休職からの復職なら isArchived=0 に戻す
      if (existing[0].isArchived) {
        await connection.execute(
          "UPDATE employees SET isArchived = 0, updatedAt = NOW() WHERE id = ?",
          [existing[0].id]
        );
        console.log(`  → 復職: isArchived を 0 に更新しました (DB ID: ${existing[0].id})`);
      }
      return;
    }

    // 「パート」positionGroup を取得
    const [positionGroups] = await connection.execute(
      'SELECT id, name FROM positionGroups'
    );
    const partGroup = positionGroups.find(pg => pg.name === 'パート');
    if (!partGroup) throw new Error('パート position group not found');

    // displayOrder は一番下
    const [maxOrder] = await connection.execute(
      'SELECT MAX(displayOrder) AS maxOrder FROM employees WHERE isArchived = FALSE'
    );
    const newDisplayOrder = (maxOrder[0].maxOrder || 0) + 100;

    // 職員ID（他スクリプトと同じ EMP + タイムスタンプ下6桁）
    const employeeId = `EMP${Date.now().toString().slice(-6)}`;

    const [result] = await connection.execute(`
      INSERT INTO employees (
        employeeId, name, positionGroupId, skillLevel,
        canWorkNightShift, isServiceManager, isOfficeStaff,
        displayOrder, notificationEnabled, isArchived,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      employeeId,
      '藤野 麻紀子',
      partGroup.id,
      100,       // skillLevel
      false,     // canWorkNightShift
      false,     // isServiceManager
      false,     // isOfficeStaff
      newDisplayOrder,
      true,      // notificationEnabled
      false      // isArchived (復職)
    ]);

    console.log('\n✓ 藤野 麻紀子様を追加しました');
    console.log(`  データベースID: ${result.insertId}`);
    console.log(`  職員ID: ${employeeId}`);
    console.log(`  displayOrder: ${newDisplayOrder}`);
    console.log(`  役職グループ: パート`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('既に同じ職員IDが存在します');
    } else {
      throw error;
    }
  } finally {
    await connection.end();
  }
}

addEmployee().catch(console.error);
