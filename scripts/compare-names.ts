import * as db from '../server/db';

// Frontend staff names from DecemberShiftGeneration.tsx
const frontendStaff = [
  { id: '1', name: '高野 幹成' },
  { id: '2', name: '山口 夕香里' },
  { id: '3', name: '馬渕 尊至' },
  { id: '4', name: '松嵜 愛梨' },
  { id: '5', name: '杉山 美佳子' },
  { id: '6', name: '梅田 英津子' },
  { id: '7', name: '大橋 健一' },
  { id: '8', name: '上条 やえ子' },
  { id: '9', name: '若森 直子' },
  { id: '10', name: '足立 洋子' },
  { id: '11', name: '野仲 彩香' },
  { id: '12', name: '桂川 美幸' },
  { id: '13', name: '加藤 広大' },
  { id: '14', name: '湯本 智子' },
  { id: '15', name: '楠 美佐' },
  { id: '16', name: '平井 英子' },
  { id: '17', name: '海野 はるか' },
  { id: '18', name: '山田 明美' },
  { id: '19', name: '足立 豊子' },
  { id: '20', name: '関田 あゆみ' },
  { id: '21', name: '長山 真梨奈' },
  { id: '22', name: '近藤 由美子' },
  { id: '23', name: '大堀 シェリー' },
  { id: '24', name: '伊藤 美穂' },
  { id: '25', name: '宝本 龍騎' },
  { id: '26', name: '岩崎 亜友美' },
  { id: '27', name: '淺野 穂菜美' },
];

async function compareNames() {
  try {
    const dbEmployees = await db.getAllEmployees();

    console.log('🔍 名前の比較\n');
    console.log('========================================');

    let matchCount = 0;
    let mismatchCount = 0;

    for (const staff of frontendStaff) {
      const dbMatch = dbEmployees.find(e => e.name === staff.name);
      if (dbMatch) {
        matchCount++;
        console.log(`✅ "${staff.name}" -> DB ID: ${dbMatch.id}`);
      } else {
        mismatchCount++;
        console.log(`❌ "${staff.name}" -> NOT FOUND in DB`);

        // Try to find similar names
        const similar = dbEmployees.filter(e =>
          e.name.includes(staff.name.split(' ')[0]) ||
          staff.name.includes(e.name.split(' ')[0])
        );
        if (similar.length > 0) {
          similar.forEach(s => {
            console.log(`   候補: DB ID ${s.id}: "${s.name}"`);
          });
        }
      }
    }

    console.log('========================================');
    console.log(`\n一致: ${matchCount}件`);
    console.log(`不一致: ${mismatchCount}件`);

    console.log('\n\nDB側で見つからない従業員:');
    for (const dbEmp of dbEmployees) {
      const frontendMatch = frontendStaff.find(s => s.name === dbEmp.name);
      if (!frontendMatch) {
        console.log(`  DB ID ${dbEmp.id}: "${dbEmp.name}"`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

compareNames();
