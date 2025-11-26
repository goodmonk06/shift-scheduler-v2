/**
 * メール通知ユーティリティ
 * Resend APIを使用したシフトPDF通知送信
 *
 * Phase 5.3: スタブ実装
 * TODO: 本番環境では実際のResend APIキーを設定する
 */

export interface EmailRecipient {
  email: string;
  name: string;
}

export interface SendShiftEmailOptions {
  recipients: EmailRecipient[];
  shiftName: string;
  year: number;
  month: number;
  pdfUrl: string;
  isConfirmed: boolean; // true: 確定版, false: 仮確定版
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * シフトPDF通知メールを送信（スタブ実装）
 *
 * 本番実装時に必要な設定:
 * - RESEND_API_KEY: Resend APIキー
 * - FROM_EMAIL: 送信元メールアドレス（例: "noreply@yourdomain.com"）
 *
 * @param options メール送信オプション
 * @returns 送信結果
 */
export async function sendShiftNotification(
  options: SendShiftEmailOptions
): Promise<EmailSendResult[]> {
  // TODO: 本番実装時にResend SDKを使用
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  //
  // const results: EmailSendResult[] = [];
  // for (const recipient of options.recipients) {
  //   try {
  //     const { data, error } = await resend.emails.send({
  //       from: process.env.FROM_EMAIL!,
  //       to: recipient.email,
  //       subject: `【${options.isConfirmed ? '確定' : '仮確定'}】${options.year}年${options.month}月 ${options.shiftName}`,
  //       html: generateEmailHTML(options, recipient),
  //     });
  //
  //     if (error) {
  //       results.push({ success: false, error: error.message });
  //     } else {
  //       results.push({ success: true, messageId: data.id });
  //     }
  //   } catch (error: any) {
  //     results.push({ success: false, error: error.message });
  //   }
  // }
  // return results;

  // スタブ実装: モック送信結果を返す
  console.log(`[STUB] sendShiftNotification called:`);
  console.log(`  - Recipients: ${options.recipients.length}名`);
  console.log(`  - Shift: ${options.year}年${options.month}月 ${options.shiftName}`);
  console.log(`  - PDF URL: ${options.pdfUrl}`);
  console.log(`  - Status: ${options.isConfirmed ? '確定版' : '仮確定版'}`);

  const results: EmailSendResult[] = options.recipients.map((recipient) => {
    console.log(`  [STUB] Email to: ${recipient.name} (${recipient.email})`);
    return {
      success: true,
      messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  });

  console.log(`[STUB] All emails sent successfully (simulated)`);

  return results;
}

/**
 * メールHTML本文を生成
 *
 * @param options メール送信オプション
 * @param recipient 受信者情報
 * @returns HTML本文
 */
function generateEmailHTML(
  options: SendShiftEmailOptions,
  recipient: EmailRecipient
): string {
  const statusText = options.isConfirmed ? '確定版' : '仮確定版';
  const statusColor = options.isConfirmed ? '#10b981' : '#f59e0b';

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>シフト通知</title>
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
    <h1 style="color: white; margin: 0; font-size: 24px;">シフト通知</h1>
  </div>

  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 10px 0; font-size: 16px;">
      ${recipient.name} 様
    </p>
    <p style="margin: 0; font-size: 14px; color: #6b7280;">
      ${options.year}年${options.month}月のシフトをお知らせします。
    </p>
  </div>

  <div style="background: white; border: 2px solid ${statusColor}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <span style="background: ${statusColor}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: bold;">
        ${statusText}
      </span>
    </div>

    <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #1f2937;">
      ${options.year}年${options.month}月 ${options.shiftName}
    </h2>

    ${options.isConfirmed
      ? `<p style="margin: 0; font-size: 14px; color: #059669; font-weight: bold;">
           このシフトは確定版です。表示されている日時に勤務してください。
         </p>`
      : `<p style="margin: 0; font-size: 14px; color: #d97706;">
           このシフトは仮確定版です。変更希望がある場合は管理者にご連絡ください。
         </p>`
    }
  </div>

  <div style="text-align: center; margin-bottom: 30px;">
    <a href="${options.pdfUrl}"
       style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
      PDFをダウンロード
    </a>
  </div>

  <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #1e40af;">
      📋 確認事項
    </p>
    <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #1e3a8a;">
      <li>シフト内容を確認してください</li>
      <li>変更希望がある場合は早めにご連絡ください</li>
      <li>勤務日時を忘れずにメモしてください</li>
    </ul>
  </div>

  <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
      このメールは自動送信されています。返信しないでください。
    </p>
    <p style="margin: 10px 0 0 0; font-size: 12px; color: #9ca3af;">
      © ${new Date().getFullYear()} シフト管理システム
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * テストメール送信（開発用）
 *
 * @param testEmail テスト送信先メールアドレス
 * @returns 送信結果
 */
export async function sendTestEmail(testEmail: string): Promise<EmailSendResult> {
  // TODO: 本番実装時にResend SDKを使用
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // const { data, error } = await resend.emails.send({
  //   from: process.env.FROM_EMAIL!,
  //   to: testEmail,
  //   subject: 'テストメール - シフト管理システム',
  //   html: '<p>これはテストメールです。</p>',
  // });

  // スタブ実装
  console.log(`[STUB] sendTestEmail called: to=${testEmail}`);
  console.log(`[STUB] Test email sent successfully (simulated)`);

  return {
    success: true,
    messageId: `mock_test_msg_${Date.now()}`,
  };
}

/**
 * 一括メール送信（バッチ処理）
 *
 * @param emailBatch メール送信バッチ
 * @returns 送信結果の配列
 */
export async function sendBatchEmails(
  emailBatch: SendShiftEmailOptions[]
): Promise<EmailSendResult[][]> {
  // TODO: 本番実装時にResend SDKのバッチ送信を使用
  // const results: EmailSendResult[][] = [];
  // for (const batch of emailBatch) {
  //   const batchResults = await sendShiftNotification(batch);
  //   results.push(batchResults);
  // }
  // return results;

  // スタブ実装
  console.log(`[STUB] sendBatchEmails called: ${emailBatch.length} batches`);

  const results: EmailSendResult[][] = [];
  for (const batch of emailBatch) {
    const batchResults = await sendShiftNotification(batch);
    results.push(batchResults);
  }

  return results;
}
