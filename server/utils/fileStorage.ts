/**
 * ファイルストレージユーティリティ
 * Cloudflare R2 / AWS S3へのPDFアップロード
 *
 * Phase 5.2: スタブ実装
 * TODO: 本番環境では実際のR2/S3クレデンシャルを設定する
 */

export interface UploadResult {
  key: string;
  url: string;
  signedUrl?: string;
}

/**
 * PDFをクラウドストレージにアップロード（スタブ実装）
 *
 * 本番実装時に必要な設定:
 * - Cloudflare R2:
 *   - CLOUDFLARE_ACCOUNT_ID
 *   - CLOUDFLARE_R2_ACCESS_KEY_ID
 *   - CLOUDFLARE_R2_SECRET_ACCESS_KEY
 *   - CLOUDFLARE_R2_BUCKET_NAME
 *
 * - AWS S3:
 *   - AWS_ACCESS_KEY_ID
 *   - AWS_SECRET_ACCESS_KEY
 *   - AWS_REGION
 *   - AWS_S3_BUCKET_NAME
 *
 * @param buffer PDFバッファ
 * @param filename ファイル名（例: "shift_2026-01.pdf"）
 * @returns アップロード結果
 */
export async function uploadPDF(
  buffer: Buffer,
  filename: string
): Promise<UploadResult> {
  // TODO: 本番実装時にR2/S3 SDKを使用
  // 例: Cloudflare R2の場合
  // import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
  // import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  //
  // const s3Client = new S3Client({
  //   region: 'auto',
  //   endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  //   credentials: {
  //     accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
  //     secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  //   },
  // });
  //
  // const key = `shifts/${new Date().getFullYear()}/${filename}`;
  // await s3Client.send(new PutObjectCommand({
  //   Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  //   Key: key,
  //   Body: buffer,
  //   ContentType: 'application/pdf',
  // }));
  //
  // const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
  //   Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  //   Key: key,
  // }), { expiresIn: 3600 * 24 * 7 }); // 7日間有効

  // スタブ実装: モックURLを返す
  const key = `shifts/${new Date().getFullYear()}/${filename}`;
  const mockUrl = `https://storage.example.com/${key}`;
  const mockSignedUrl = `${mockUrl}?signature=mock_signature_${Date.now()}`;

  console.log(`[STUB] uploadPDF called: filename=${filename}, size=${buffer.length} bytes`);
  console.log(`[STUB] Returning mock URL: ${mockUrl}`);

  return {
    key,
    url: mockUrl,
    signedUrl: mockSignedUrl,
  };
}

/**
 * 署名付きURL生成（スタブ実装）
 *
 * @param key ストレージキー
 * @param expiresIn 有効期限（秒）デフォルト: 7日間
 * @returns 署名付きURL
 */
export async function getSignedUrl(
  key: string,
  expiresIn: number = 3600 * 24 * 7
): Promise<string> {
  // TODO: 本番実装時にR2/S3 SDKを使用
  // const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
  //   Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  //   Key: key,
  // }), { expiresIn });

  // スタブ実装: モック署名付きURLを返す
  const mockSignedUrl = `https://storage.example.com/${key}?signature=mock_signature_${Date.now()}&expires=${expiresIn}`;

  console.log(`[STUB] getSignedUrl called: key=${key}, expiresIn=${expiresIn}s`);
  console.log(`[STUB] Returning mock signed URL: ${mockSignedUrl}`);

  return mockSignedUrl;
}

/**
 * ファイル削除（スタブ実装）
 *
 * @param key ストレージキー
 * @returns 削除成功したか
 */
export async function deleteFile(key: string): Promise<boolean> {
  // TODO: 本番実装時にR2/S3 SDKを使用
  // await s3Client.send(new DeleteObjectCommand({
  //   Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  //   Key: key,
  // }));

  // スタブ実装: 常に成功を返す
  console.log(`[STUB] deleteFile called: key=${key}`);
  console.log(`[STUB] File deletion simulated`);

  return true;
}

/**
 * ファイル一覧取得（スタブ実装）
 *
 * @param prefix プレフィックス（例: "shifts/2026/"）
 * @returns ファイルキーの配列
 */
export async function listFiles(prefix: string): Promise<string[]> {
  // TODO: 本番実装時にR2/S3 SDKを使用
  // const response = await s3Client.send(new ListObjectsV2Command({
  //   Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  //   Prefix: prefix,
  // }));
  // return response.Contents?.map(obj => obj.Key!) || [];

  // スタブ実装: モックリストを返す
  console.log(`[STUB] listFiles called: prefix=${prefix}`);
  const mockFiles = [
    `${prefix}shift_2026-01.pdf`,
    `${prefix}shift_2026-02.pdf`,
  ];

  console.log(`[STUB] Returning mock file list:`, mockFiles);

  return mockFiles;
}
