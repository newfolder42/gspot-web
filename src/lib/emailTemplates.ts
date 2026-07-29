/**
 * Email copy and markup. Transport lives in ./email — this file only builds content.
 *
 * Styles are inline because most mail clients strip <style> blocks, and the hidden
 * preheader controls the preview line shown in the inbox list.
 */

export const FROM_NAME = "G'Spot";
export const SITE_URL = 'https://gspot.ge';

const TEXT_FOOTER = `--
${FROM_NAME} · ${SITE_URL}
ეს წერილი ავტომატურად იგზავნება, პასუხის გაცემა არ არის საჭირო.`;

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(preheader: string, body: string, footerExtra = ''): string {
  return `<!DOCTYPE html>
<html lang="ka">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background:#f6f6f6;">
    <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
    <div style="max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.6;color:#333333;">
      <div style="padding-bottom:20px;border-bottom:1px solid #eeeeee;">
        <span style="font-size:20px;font-weight:bold;color:#111111;">${FROM_NAME}</span>
      </div>
      <div style="padding:28px 0;">
${body}
      </div>
      <div style="padding-top:20px;border-top:1px solid #eeeeee;font-size:13px;color:#888888;">
        ${footerExtra}
        <p style="margin:0 0 6px;">ეს წერილი ავტომატურად იგზავნება, პასუხის გაცემა არ არის საჭირო.</p>
        <p style="margin:0;">&copy; ${new Date().getFullYear()} ${FROM_NAME} · <a href="${SITE_URL}" style="color:#888888;">gspot.ge</a></p>
      </div>
    </div>
  </body>
</html>`;
}

export function otpEmail(code: string): EmailContent {
  const html = layout(
    `კოდის ვადაა 10 წუთი.`,
    `        <p style="margin:0 0 16px;">გამარჯობა!</p>
        <p style="margin:0 0 20px;">შენი ვერიფიკაციის კოდი ${FROM_NAME}-ზე:</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center;margin:0 0 20px;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111111;font-family:'Courier New',monospace;">${escapeHtml(code)}</span>
        </div>
        <p style="margin:0 0 20px;">კოდის ვადაა <strong>10 წუთი</strong>.</p>
        <p style="margin:0 0 8px;color:#777777;font-size:14px;">თუ ეს კოდი შენ არ მოგითხოვია, უბრალოდ დააიგნორე ეს წერილი.</p>
        <p style="margin:0;color:#777777;font-size:14px;">If you didn't request this code, you can safely ignore this email.</p>`
  );

  const text = `გამარჯობა!

შენი ვერიფიკაციის კოდი ${FROM_NAME}-ზე: ${code}

კოდის ვადაა 10 წუთი.

თუ ეს კოდი შენ არ მოგითხოვია, უბრალოდ დააიგნორე ეს წერილი.
If you didn't request this code, you can safely ignore this email.

${TEXT_FOOTER}`;

  return {
    subject: `ვერიფიკაციის კოდი: ${code}`,
    html,
    text,
  };
}

export function welcomeEmail(name: string): EmailContent {
  const html = layout(
    `შენი ანგარიში აქტიურია.`,
    `        <p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#111111;">კეთილი იყოს შენი მობრძანება!</p>
        <p style="margin:0 0 16px;">გამარჯობა, ${escapeHtml(name)}!</p>
        <p style="margin:0 0 20px;">შენი ანგარიში წარმატებით გააქტიურდა.</p>
        <p style="margin:0 0 24px;">
          <a href="${SITE_URL}" style="display:inline-block;padding:12px 24px;background:#111111;color:#ffffff;text-decoration:none;border-radius:6px;">ავტორიზაცია</a>
        </p>
        <p style="margin:0;">მადლობა, რომ შემოგვიერთდი!</p>`
  );

  const text = `კეთილი იყოს შენი მობრძანება!

გამარჯობა, ${name}!

შენი ანგარიში წარმატებით გააქტიურდა.

გაიარე ავტორიზაცია: ${SITE_URL}

მადლობა, რომ შემოგვიერთდი!

${TEXT_FOOTER}`;

  return {
    subject: `კეთილი იყოს შენი მობრძანება ${FROM_NAME}-ზე`,
    html,
    text,
  };
}
