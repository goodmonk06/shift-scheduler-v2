import { ENV } from "../_core/env";
import nodemailer from "nodemailer";

/**
 * メール送信サービス
 * Resend または SMTP を使用してメールを送信します
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Resend API を使用してメールを送信
 */
async function sendViaResend(params: SendEmailParams) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.resendApiKey}`,
    },
    body: JSON.stringify({
      from: ENV.smtpFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

/**
 * SMTP を使用してメールを送信
 */
async function sendViaSMTP(params: SendEmailParams) {
  const transporter = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: ENV.smtpFrom,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  return info;
}

/**
 * メールを送信（Resend または SMTP）
 */
export async function sendEmail(params: SendEmailParams) {
  // Resend API キーが設定されている場合は Resend を使用
  if (ENV.resendApiKey) {
    return await sendViaResend(params);
  }

  // SMTP 設定がある場合は SMTP を使用
  if (ENV.smtpHost && ENV.smtpUser && ENV.smtpPass) {
    return await sendViaSMTP(params);
  }

  throw new Error(
    "Email is not configured. Please set RESEND_API_KEY or SMTP_* environment variables."
  );
}

/**
 * テンプレート: 仮確定シフト公開通知
 */
export function createTentativeShiftNotification(employeeName: string, month: string) {
  return {
    subject: `【シフト】${month}の仮確定シフトが公開されました`,
    html: `
      <h2>仮確定シフトが公開されました</h2>
      <p>${employeeName}様</p>
      <p>${month}の仮確定シフトが公開されました。</p>
      <p>システムにログインして確認してください。</p>
      <p>変更提案の期限は3日後です。</p>
    `,
    text: `仮確定シフトが公開されました\n\n${employeeName}様\n\n${month}の仮確定シフトが公開されました。\nシステムにログインして確認してください。\n変更提案の期限は3日後です。`,
  };
}

/**
 * テンプレート: 確定シフト公開通知
 */
export function createConfirmedShiftNotification(employeeName: string, month: string) {
  return {
    subject: `【シフト】${month}の確定シフトが公開されました`,
    html: `
      <h2>確定シフトが公開されました</h2>
      <p>${employeeName}様</p>
      <p>${month}の確定シフトが公開されました。</p>
      <p>システムにログインして確認してください。</p>
    `,
    text: `確定シフトが公開されました\n\n${employeeName}様\n\n${month}の確定シフトが公開されました。\nシステムにログインして確認してください。`,
  };
}
