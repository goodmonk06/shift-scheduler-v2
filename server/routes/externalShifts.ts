import { Router } from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import OpenAI from 'openai';
import { SHIFT_CHECK_SYSTEM_PROMPT } from '../ai/shiftCheckPrompt';

const router = Router();
const DATA_DIR = join(process.cwd(), 'data', 'december-shifts');
const BACKUP_DIR = join(DATA_DIR, 'backups');
const DECEMBER_FILE = join(DATA_DIR, 'december-2025.json');

// バックアップを作成する関数
async function createBackup(data: any) {
  try {
    // バックアップディレクトリが存在しない場合は作成
    await mkdir(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = join(BACKUP_DIR, `december-2025_${timestamp}.json`);

    await writeFile(backupFile, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[Backup] Created backup: ${backupFile}`);

    return backupFile;
  } catch (error) {
    console.error('[Backup] Failed to create backup:', error);
    // バックアップ失敗してもメイン処理は続行
    return null;
  }
}

// 12月シフトデータを取得
router.get('/december', async (req, res) => {
  try {
    const data = await readFile(DECEMBER_FILE, 'utf-8');
    const shiftData = JSON.parse(data);
    res.json(shiftData);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // ファイルが存在しない場合は空のデータを返す
      res.json({ year: 2025, month: 12, shifts: [] });
    } else {
      console.error('Error reading december shifts:', error);
      res.status(500).json({ error: 'Failed to read shift data' });
    }
  }
});

// 12月シフトデータを保存
router.post('/december', async (req, res) => {
  try {
    const shiftData = req.body;

    // バックアップを作成
    await createBackup(shiftData);

    // メインファイルを保存
    await writeFile(DECEMBER_FILE, JSON.stringify(shiftData, null, 2), 'utf-8');

    res.json({
      success: true,
      message: 'Shift data saved successfully',
      backup: true
    });
  } catch (error) {
    console.error('Error saving december shifts:', error);
    res.status(500).json({ error: 'Failed to save shift data' });
  }
});

// 12月シフトデータをアップロード（既存データを上書き）
router.put('/december/upload', async (req, res) => {
  try {
    const shiftData = req.body;

    // データ検証
    if (!shiftData.year || !shiftData.month || !Array.isArray(shiftData.shifts)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    // バックアップを作成
    await createBackup(shiftData);

    // メインファイルを保存
    await writeFile(DECEMBER_FILE, JSON.stringify(shiftData, null, 2), 'utf-8');

    res.json({
      success: true,
      message: `Uploaded ${shiftData.shifts.length} shift records`,
      count: shiftData.shifts.length,
      backup: true
    });
  } catch (error) {
    console.error('Error uploading december shifts:', error);
    res.status(500).json({ error: 'Failed to upload shift data' });
  }
});

// AIでシフトをチェック
router.post('/december/ai-check', async (req, res) => {
  try {
    const shiftData = req.body;

    // データ検証
    if (!shiftData || !shiftData.shifts) {
      return res.status(400).json({ error: 'Invalid shift data' });
    }

    // OpenAI APIキーの確認
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'OPENAI_API_KEY is not configured',
        message: '環境変数OPENAI_API_KEYが設定されていません'
      });
    }

    console.log('[AI Check] Starting shift validation...');
    console.log(`[AI Check] Shift data: ${shiftData.shifts.length} records`);

    // OpenAI APIクライアントを初期化
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // シフトデータをJSON文字列に変換
    const shiftDataJson = JSON.stringify(shiftData, null, 2);

    // OpenAI APIを呼び出し
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SHIFT_CHECK_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `以下の12月シフトデータを分析してください:\n\n${shiftDataJson}`
        }
      ],
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: "json_object" }
    });

    console.log('[AI Check] Received response from OpenAI API');

    // レスポンスからテキストを取得
    const responseText = completion.choices[0].message.content || '';

    // JSONレスポンスをパース
    let aiCheckResult;
    try {
      // JSONブロックを抽出（```json ... ``` の形式の場合）
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      aiCheckResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[AI Check] Failed to parse JSON response:', parseError);
      return res.status(500).json({
        error: 'Failed to parse AI response',
        rawResponse: responseText
      });
    }

    console.log('[AI Check] Validation complete');
    console.log(`[AI Check] Violations found: ${aiCheckResult.violations?.length || 0}`);

    res.json({
      success: true,
      result: aiCheckResult,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens || 0,
        completion_tokens: completion.usage?.completion_tokens || 0,
        total_tokens: completion.usage?.total_tokens || 0,
      }
    });

  } catch (error: any) {
    console.error('[AI Check] Error:', error);
    res.status(500).json({
      error: 'AI check failed',
      message: error.message || 'Unknown error'
    });
  }
});

export default router;
