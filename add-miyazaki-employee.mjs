import mysql from 'mysql2/promise';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

async function addEmployee() {
  const connection = await mysql.createConnection(connectionString);

  try {
    // まず positionGroups から「パート」のIDを取得
    const [positionGroups] = await connection.execute(
      'SELECT id, name FROM positionGroups'
    );

    console.log('Available position groups:');
    positionGroups.forEach(pg => {
      console.log(`  ID ${pg.id}: ${pg.name}`);
    });

    const partGroup = positionGroups.find(pg => pg.name === 'パート');
    if (!partGroup) {
      throw new Error('パート position group not found');
    }

    console.log(`\nUsing position group: ${partGroup.name} (ID: ${partGroup.id})`);

    // 宮崎伸子様を追加
    const employeeId = `EMP${Date.now().toString().slice(-6)}`; // とりあえずの職員ID

    const [result] = await connection.execute(`
      INSERT INTO employees (
        employeeId,
        name,
        positionGroupId,
        skillLevel,
        canWorkNightShift,
        isServiceManager,
        isOfficeStaff,
        displayOrder,
        notificationEnabled,
        isArchived,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      employeeId,
      '宮崎 伸子',
      partGroup.id,
      100, // skillLevel: 100 (1人前)
      false, // canWorkNightShift
      false, // isServiceManager
      false, // isOfficeStaff
      0, // displayOrder (適切な値に後で調整可能)
      true, // notificationEnabled
      false // isArchived
    ]);

    console.log('\n✓ 宮崎 伸子様を追加しました');
    console.log(`  データベースID: ${result.insertId}`);
    console.log(`  職員ID: ${employeeId}`);
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
