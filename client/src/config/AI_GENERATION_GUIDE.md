# 介護シフトAI自動生成 - ChatGPT 4 mini統合ガイド

**対象者**: バックエンド開発者、AIロジック実装者  
**作成日**: 2025年11月8日  
**最終更新**: 2025年11月8日  
**バージョン**: 2.0.0

このドキュメントは、ChatGPT 4 miniを使った介護シフト自動生成システムのAIロジックを実装するための詳細ガイドです。

---

## 📋 目次

1. [システム概要](#システム概要)
2. [シフト生成フロー](#シフト生成フロー)
3. [OpenAI API統合](#openai-api統合)
4. [プロンプト設計](#プロンプト設計)
5. [制約条件の処理](#制約条件の処理)
6. [レスポンス処理](#レスポンス処理)
7. [エラーハンドリング](#エラーハンドリング)
8. [コスト管理](#コスト管理)
9. [テストケース](#テストケース)
10. [実装例](#実装例)

---

## システム概要

### 目的
介護施設における月次シフトの自動生成を行い、管理者の手作業を80%以上削減する。

### 使用技術
- **AI**: ChatGPT 4 mini (gpt-4o-mini)
- **API**: OpenAI Chat Completions API
- **出力形式**: JSON形式（structured outputs）
- **実行タイミング**: 管理者が「AI自動生成」ボタンをクリック

### AIの役割
1. 職員の希望休を最大限尊重
2. 必須人員数を満たすシフトを生成
3. 職場ルール（連勤制限、夜勤間隔など）を考慮
4. 制約違反がある場合は警告を出力

---

## シフト生成フロー

```
① 希望休収集（draft）
   ↓
② AI自動生成 ← このステップでAIを使用
   ↓
③ 仮確定（tentative）
   ↓
④ 仮確定改（tentative_revised）
   ↓
⑤ 最終確定（confirmed）
   ↓
⑥ 実績報告（actual）
```

AIは **② AI自動生成** の段階で実行されます。

---

## OpenAI API統合

### 環境変数設定

```bash
# .env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3  # 低めで一貫性を重視
```

### 基本実装

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateShift(input: ShiftGenerationInput) {
  const prompt = buildPrompt(input);
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });
  
  const response = JSON.parse(completion.choices[0].message.content);
  return response;
}
```

---

## プロンプト設計

### システムプロンプト

```typescript
const SYSTEM_PROMPT = `あなたは介護施設のシフト作成の専門家です。
以下の制約条件を守りながら、最適なシフトを生成してください。

# 重要な原則
1. 職員の希望休は最優先で尊重する
2. 各時間帯の必須人員数を満たす
3. 公平性: 職員間で勤務日数・夜勤回数に大きな偏りを作らない
4. 連続勤務制限を守る
5. 夜勤後は必ず休みを入れる

# 出力形式
JSON形式で以下の構造で返してください：
{
  "shifts": [
    {
      "employeeId": 1,
      "date": "2025-11-01",
      "shiftType": "早番",
      "startTime": "08:00",
      "endTime": "17:00"
    },
    ...
  ],
  "warnings": [
    {
      "severity": "high" | "medium" | "low",
      "message": "警告メッセージ",
      "affectedDates": ["2025-11-15"],
      "affectedEmployees": [1, 2]
    }
  ],
  "statistics": {
    "totalShifts": 100,
    "早番": 40,
    "遅番": 35,
    "夜勤": 25
  }
}`;
```

### ユーザープロンプト構築

```typescript
function buildPrompt(input: ShiftGenerationInput): string {
  const { year, month, employees, leaveRequests, requiredStaffing, workplaceRules, positionGroups } = input;
  
  const daysInMonth = new Date(year, month, 0).getDate();
  
  return `
# シフト生成依頼

## 基本情報
- 対象月: ${year}年${month}月（${daysInMonth}日間）
- 職員数: ${employees.length}名

## 職員情報
${employees.map(emp => `
### ${emp.name}（ID: ${emp.id}）
- 役職: ${emp.position}
- 勤務可能シフト: ${emp.availableShifts.join(', ')}
- 制約: ${emp.constraints || 'なし'}
`).join('\n')}

## 希望休
${formatLeaveRequests(leaveRequests)}

## 必須人員数（日付・時間帯別）
${formatRequiredStaffing(requiredStaffing)}

## 職場ルール
- 最大連続勤務日数: ${workplaceRules.maxConsecutiveDays}日
- 夜勤後の最低休息日数: ${workplaceRules.minDaysBetweenNightShifts}日
- 月間最大夜勤回数: ${workplaceRules.maxNightShiftsPerMonth}回
${workplaceRules.customRules ? `- その他: ${workplaceRules.customRules}` : ''}

## 職位グループ（配置優先度）
${positionGroups.map(group => `
- ${group.groupName}（優先度: ${group.priority}）
  メンバー: ${group.members.map(id => employees.find(e => e.id === id)?.name).join(', ')}
`).join('\n')}

## 追加指示
${input.additionalInstructions || 'なし'}

上記の情報をもとに、最適なシフトを生成してください。
`;
}

function formatLeaveRequests(requests: LeaveRequest[]): string {
  const grouped = groupBy(requests, 'employeeId');
  
  return Object.entries(grouped).map(([employeeId, reqs]) => {
    const employeeName = employees.find(e => e.id === Number(employeeId))?.name;
    return `
### ${employeeName}の希望休
${reqs.map(r => `- ${r.startDate}: ${r.leaveType}${r.startTime ? ` (${r.startTime}〜${r.endTime})` : ''}`).join('\n')}
`;
  }).join('\n');
}

function formatRequiredStaffing(staffing: RequiredStaffing[]): string {
  return staffing.map(s => `
- ${s.date}: 早番${s.早番}名、遅番${s.遅番}名、夜勤${s.夜勤}名
`).join('\n');
}
```

---

## 制約条件の処理

### 1. 希望休の考慮

```typescript
// AIに渡す前に希望休を整形
function preprocessLeaveRequests(requests: LeaveRequest[]): string {
  return requests.map(req => {
    if (req.leaveType === '時間指定') {
      return `${req.employeeId}: ${req.startDate} ${req.startTime}〜${req.endTime}の間は休み`;
    } else {
      return `${req.employeeId}: ${req.startDate} 終日休み（${req.leaveType}）`;
    }
  }).join('\n');
}
```

### 2. 必須人員数の検証

```typescript
// AI生成後に人員数が足りているか検証
function validateStaffing(
  generatedShifts: ShiftDetail[],
  requiredStaffing: RequiredStaffing[]
): ValidationResult {
  const warnings: Warning[] = [];
  
  for (const requirement of requiredStaffing) {
    const shiftsOnDate = generatedShifts.filter(s => s.date === requirement.date);
    
    const counts = {
      早番: shiftsOnDate.filter(s => s.shiftType === '早番').length,
      遅番: shiftsOnDate.filter(s => s.shiftType === '遅番').length,
      夜勤: shiftsOnDate.filter(s => s.shiftType === '夜勤').length,
    };
    
    if (counts.早番 < requirement.早番) {
      warnings.push({
        severity: 'high',
        message: `${requirement.date}: 早番が${requirement.早番 - counts.早番}名不足`,
        affectedDates: [requirement.date],
        affectedEmployees: [],
      });
    }
    
    // 遅番、夜勤も同様にチェック
  }
  
  return { isValid: warnings.length === 0, warnings };
}
```

### 3. 連続勤務制限の検証

```typescript
function validateConsecutiveDays(
  shifts: ShiftDetail[],
  maxConsecutiveDays: number
): Warning[] {
  const warnings: Warning[] = [];
  const employeeShifts = groupBy(shifts, 'employeeId');
  
  for (const [employeeId, empShifts] of Object.entries(employeeShifts)) {
    const sorted = empShifts.sort((a, b) => a.date.localeCompare(b.date));
    let consecutiveCount = 0;
    let consecutiveDates: string[] = [];
    
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0 || isConsecutiveDay(sorted[i - 1].date, sorted[i].date)) {
        consecutiveCount++;
        consecutiveDates.push(sorted[i].date);
        
        if (consecutiveCount > maxConsecutiveDays) {
          warnings.push({
            severity: 'medium',
            message: `職員ID${employeeId}が${consecutiveCount}日連続勤務（上限${maxConsecutiveDays}日）`,
            affectedDates: consecutiveDates,
            affectedEmployees: [Number(employeeId)],
          });
        }
      } else {
        consecutiveCount = 1;
        consecutiveDates = [sorted[i].date];
      }
    }
  }
  
  return warnings;
}

function isConsecutiveDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
  return diff === 1;
}
```

### 4. 夜勤後の休息日

```typescript
function validateNightShiftRest(
  shifts: ShiftDetail[],
  minDaysBetweenNightShifts: number
): Warning[] {
  const warnings: Warning[] = [];
  const employeeShifts = groupBy(shifts, 'employeeId');
  
  for (const [employeeId, empShifts] of Object.entries(employeeShifts)) {
    const sorted = empShifts.sort((a, b) => a.date.localeCompare(b.date));
    
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].shiftType === '夜勤') {
        // 夜勤の翌日以降をチェック
        const nextDate = addDays(sorted[i].date, 1);
        const nextShift = sorted.find(s => s.date === nextDate);
        
        if (nextShift && nextShift.shiftType !== '休み') {
          warnings.push({
            severity: 'high',
            message: `職員ID${employeeId}が夜勤の翌日も勤務しています`,
            affectedDates: [sorted[i].date, nextDate],
            affectedEmployees: [Number(employeeId)],
          });
        }
      }
    }
  }
  
  return warnings;
}
```

---

## レスポンス処理

### AIレスポンスのパース

```typescript
interface AIResponse {
  shifts: {
    employeeId: number;
    date: string;
    shiftType: string;
    startTime: string;
    endTime: string;
  }[];
  warnings: Warning[];
  statistics: {
    totalShifts: number;
    [key: string]: number;
  };
}

async function processAIResponse(
  aiResponse: string,
  input: ShiftGenerationInput
): Promise<ProcessedShiftData> {
  let parsed: AIResponse;
  
  try {
    parsed = JSON.parse(aiResponse);
  } catch (error) {
    throw new Error('AI応答のJSON解析に失敗しました');
  }
  
  // バリデーション
  const validationResult = validateGeneratedShifts(parsed.shifts, input);
  
  // データベース形式に変換
  const shiftDetails = parsed.shifts.map(shift => ({
    shiftId: input.shiftId,
    employeeId: shift.employeeId,
    date: shift.date,
    shiftType: shift.shiftType,
    startTime: shift.startTime,
    endTime: shift.endTime,
  }));
  
  // 警告をマージ
  const allWarnings = [
    ...parsed.warnings,
    ...validationResult.warnings,
  ];
  
  return {
    shiftDetails,
    warnings: allWarnings,
    statistics: parsed.statistics,
    aiPrompt: input.prompt, // デバッグ用に保存
    aiResponse: parsed,
  };
}
```

### データベースへの保存

```typescript
async function saveGeneratedShift(
  shiftId: number,
  processedData: ProcessedShiftData
): Promise<void> {
  await db.$transaction(async (tx) => {
    // 既存のShiftDetailを削除（再生成の場合）
    await tx.shiftDetail.deleteMany({
      where: { shiftId },
    });
    
    // 新しいShiftDetailを作成
    await tx.shiftDetail.createMany({
      data: processedData.shiftDetails,
    });
    
    // Shiftテーブルを更新
    await tx.shift.update({
      where: { id: shiftId },
      data: {
        status: 'tentative', // AI生成後は仮確定
        generatedBy: 'ai',
        aiPrompt: processedData.aiPrompt,
        aiResponse: processedData.aiResponse,
      },
    });
  });
}
```

---

## エラーハンドリング

### 1. OpenAI APIエラー

```typescript
async function generateShiftWithRetry(
  input: ShiftGenerationInput,
  maxRetries: number = 3
): Promise<AIResponse> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await openai.chat.completions.create({
        // ... 設定
      });
      
      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      lastError = error;
      
      if (error instanceof OpenAI.APIError) {
        // レート制限エラー
        if (error.status === 429) {
          const waitTime = Math.pow(2, i) * 1000; // 指数バックオフ
          await sleep(waitTime);
          continue;
        }
        
        // その他のAPIエラー
        if (error.status >= 500) {
          // サーバーエラーの場合はリトライ
          continue;
        }
      }
      
      // リトライ不可能なエラー
      throw error;
    }
  }
  
  // 全てのリトライが失敗
  throw new Error(`AI生成が${maxRetries}回とも失敗しました: ${lastError.message}`);
}
```

### 2. フォールバック処理

```typescript
async function generateShift(input: ShiftGenerationInput): Promise<ProcessedShiftData> {
  try {
    // AI生成を試みる
    const aiResponse = await generateShiftWithRetry(input);
    return processAIResponse(aiResponse, input);
  } catch (error) {
    console.error('AI生成に失敗しました。手動ベースを作成します。', error);
    
    // フォールバック: 手動ベースのシフトを作成
    return generateManualBaseShift(input);
  }
}

function generateManualBaseShift(input: ShiftGenerationInput): ProcessedShiftData {
  // 希望休のみを入れた空のシフトを作成
  const shiftDetails = [];
  
  for (const leaveRequest of input.leaveRequests) {
    if (leaveRequest.status === 'approved') {
      shiftDetails.push({
        shiftId: input.shiftId,
        employeeId: leaveRequest.employeeId,
        date: leaveRequest.startDate,
        shiftType: '休み',
        startTime: null,
        endTime: null,
      });
    }
  }
  
  return {
    shiftDetails,
    warnings: [{
      severity: 'high',
      message: 'AI生成に失敗したため、希望休のみ反映されています。手動でシフトを入力してください。',
      affectedDates: [],
      affectedEmployees: [],
    }],
    statistics: {
      totalShifts: shiftDetails.length,
    },
    aiPrompt: null,
    aiResponse: null,
  };
}
```

---

## コスト管理

### トークン数の見積もり

```typescript
// おおよそのトークン数計算
function estimateTokens(input: ShiftGenerationInput): number {
  const promptLength = buildPrompt(input).length;
  const inputTokens = Math.ceil(promptLength / 4); // 1トークン≈4文字
  const outputTokens = 2000; // 最大出力トークン数
  
  return inputTokens + outputTokens;
}

// コスト計算
function estimateCost(tokens: number): number {
  // GPT-4 mini: $0.15/1Mトークン（入力）、$0.60/1Mトークン（出力）
  const inputCost = (tokens * 0.5) * 0.15 / 1000000; // 入力50%と仮定
  const outputCost = (tokens * 0.5) * 0.60 / 1000000;
  
  return inputCost + outputCost;
}
```

### 使用量モニタリング

```typescript
// 生成回数と使用量の記録
interface AIUsageLog {
  id: number;
  shiftId: number;
  userId: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  createdAt: Date;
}

async function logAIUsage(
  shiftId: number,
  userId: number,
  usage: OpenAI.CompletionUsage
): Promise<void> {
  const cost = calculateCost(usage);
  
  await db.aiUsageLog.create({
    data: {
      shiftId,
      userId,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cost,
    },
  });
}

function calculateCost(usage: OpenAI.CompletionUsage): number {
  const inputCost = usage.prompt_tokens * 0.15 / 1000000;
  const outputCost = usage.completion_tokens * 0.60 / 1000000;
  return inputCost + outputCost;
}
```

---

## テストケース

### 1. 正常系テスト

```typescript
describe('AI Shift Generation', () => {
  it('希望休を考慮したシフトを生成できる', async () => {
    const input: ShiftGenerationInput = {
      year: 2025,
      month: 11,
      employees: mockEmployees,
      leaveRequests: [
        { employeeId: 1, date: '2025-11-10', leaveType: '休' },
      ],
      requiredStaffing: mockRequiredStaffing,
      workplaceRules: mockRules,
    };
    
    const result = await generateShift(input);
    
    // 希望休の日に勤務が入っていないことを確認
    const shift = result.shiftDetails.find(
      s => s.employeeId === 1 && s.date === '2025-11-10'
    );
    expect(shift?.shiftType).toBe('休み');
  });
  
  it('必須人員数を満たすシフトを生成できる', async () => {
    // ...
  });
});
```

### 2. 異常系テスト

```typescript
describe('Error Handling', () => {
  it('AI APIエラー時は手動ベースにフォールバックする', async () => {
    // OpenAI APIをモックしてエラーを発生させる
    jest.spyOn(openai.chat.completions, 'create').mockRejectedValue(
      new Error('API Error')
    );
    
    const result = await generateShift(mockInput);
    
    // 警告があることを確認
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        severity: 'high',
        message: expect.stringContaining('AI生成に失敗'),
      })
    );
  });
});
```

---

## 実装例

完全な実装例：

```typescript
// services/aiShiftGenerator.ts

import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

export class AIShiftGenerator {
  private openai: OpenAI;
  private db: PrismaClient;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.db = new PrismaClient();
  }
  
  async generateShift(shiftId: number): Promise<GenerationResult> {
    // 1. データ取得
    const input = await this.prepareInput(shiftId);
    
    // 2. AI生成
    try {
      const aiResponse = await this.callOpenAI(input);
      const processed = await this.processResponse(aiResponse, input);
      
      // 3. バリデーション
      const validated = this.validateShifts(processed, input);
      
      // 4. データベース保存
      await this.saveShifts(shiftId, validated);
      
      return {
        success: true,
        data: validated,
      };
    } catch (error) {
      // 5. エラー時はフォールバック
      console.error('AI生成エラー:', error);
      const fallback = this.generateFallbackShift(input);
      await this.saveShifts(shiftId, fallback);
      
      return {
        success: false,
        data: fallback,
        error: error.message,
      };
    }
  }
  
  private async prepareInput(shiftId: number): Promise<ShiftGenerationInput> {
    const shift = await this.db.shift.findUnique({
      where: { id: shiftId },
      include: {
        leaveRequests: {
          where: { status: 'approved' },
        },
      },
    });
    
    const employees = await this.db.employee.findMany();
    const requiredStaffing = await this.getRequiredStaffing(shift.year, shift.month);
    const workplaceRules = await this.getWorkplaceRules();
    
    return {
      shiftId,
      year: shift.year,
      month: shift.month,
      employees,
      leaveRequests: shift.leaveRequests,
      requiredStaffing,
      workplaceRules,
    };
  }
  
  private async callOpenAI(input: ShiftGenerationInput): Promise<string> {
    const prompt = this.buildPrompt(input);
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });
    
    return completion.choices[0].message.content;
  }
  
  // ... その他のメソッド
}
```

---

**作成者**: フロントエンドチーム  
**作成日**: 2025年11月8日  
**最終更新**: 2025年11月8日  
**バージョン**: 2.0.0

---

## 参考資料

- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [GPT-4 mini Pricing](https://openai.com/pricing)
- [JSON Mode](https://platform.openai.com/docs/guides/text-generation/json-mode)
