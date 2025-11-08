import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "../_core/env";

/**
 * S3互換ストレージサービス（Cloudflare R2 / AWS S3）
 */

let s3Client: S3Client | null = null;

/**
 * S3クライアントの初期化
 */
function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client;
  }

  if (!ENV.s3Bucket || !ENV.s3AccessKeyId || !ENV.s3SecretAccessKey) {
    throw new Error(
      "S3 storage is not configured. Please set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY."
    );
  }

  s3Client = new S3Client({
    region: ENV.awsRegion,
    endpoint: ENV.s3Endpoint || undefined,
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  });

  return s3Client;
}

/**
 * ファイルをアップロードするための署名付きURL を生成
 */
export async function getUploadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * ファイルをダウンロードするための署名付きURL を生成
 */
export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * ファイルを直接アップロード（小さいファイル向け）
 */
export async function uploadFile(key: string, body: Buffer | string, contentType?: string) {
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: ENV.s3Bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  return await client.send(command);
}

/**
 * アーカイブ用のPDFをS3にアップロード
 */
export async function uploadArchivePDF(year: number, month: number, pdfBuffer: Buffer): Promise<string> {
  const key = `archives/${year}/${year}-${String(month).padStart(2, "0")}.pdf`;
  await uploadFile(key, pdfBuffer, "application/pdf");
  return key;
}
