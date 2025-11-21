import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * 12月シフトデータをアップロードするスクリプト
 *
 * 使い方:
 * 1. data/december-shifts/december-2025.json にデータを配置
 * 2. このスクリプトを実行: pnpm tsx scripts/upload-december-shifts.ts
 */

async function uploadDecemberShifts() {
  const dataFile = join(process.cwd(), 'data', 'december-shifts', 'december-2025.json');
  const apiUrl = process.env.API_URL || 'http://localhost:3000';

  try {
    console.log('📂 Reading shift data from:', dataFile);
    const data = await readFile(dataFile, 'utf-8');
    const shiftData = JSON.parse(data);

    console.log(`📊 Found ${shiftData.shifts?.length || 0} shift records`);
    console.log(`📅 Year: ${shiftData.year}, Month: ${shiftData.month}`);

    console.log(`\n🚀 Uploading to ${apiUrl}/api/external-shifts/december/upload`);

    const response = await fetch(`${apiUrl}/api/external-shifts/december/upload`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shiftData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    console.log('\n✅ Upload successful!');
    console.log('📊 Result:', result);

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error('❌ Error: december-2025.json not found');
      console.error('📝 Please create the file at:', dataFile);
      console.error('💡 You can copy december-2025.sample.json as a template');
    } else {
      console.error('❌ Upload failed:', error.message);
    }
    process.exit(1);
  }
}

uploadDecemberShifts();
