"use server";

import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { logerror } from "./logger";

type EmailProvider = 'ses' | 'resend' | 'console';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

const SELECTED_PROVIDER: EmailProvider = (process.env.EMAIL_PROVIDER || 'console') as EmailProvider;
const FROM_EMAIL = 'auth@gspot.ge';
const FROM_NAME = "G'Spot";

function resolveProvider(): EmailProvider {
    if (SELECTED_PROVIDER === 'ses' && !(process.env.AWSSES_ACCESS_KEY_ID && process.env.AWSSES_SECRET_ACCESS_KEY)) {
        return 'console';
    }
    if (SELECTED_PROVIDER === 'resend' && !process.env.EMAIL_PROVIDER_KEY) {
        return 'console';
    }
    return SELECTED_PROVIDER;
}

async function sendViaConsole(options: EmailOptions): Promise<void> {
    console.log('📧 [EMAIL - Console Mode]');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('HTML:', options.html);
    console.log('Text:', options.text || '');
    console.log('---');
}

let sesClient: SESv2Client | null = null;

function getSESClient(): SESv2Client {
    if (!sesClient) {
        sesClient = new SESv2Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWSSES_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWSSES_SECRET_ACCESS_KEY!,
            },
        });
    }
    return sesClient;
}

async function sendViaSES(options: EmailOptions): Promise<void> {
    const command = new SendEmailCommand({
        FromEmailAddress: `${FROM_NAME} <${FROM_EMAIL}>`,
        Destination: {
            ToAddresses: [options.to],
        },
        Content: {
            Simple: {
                Subject: { Data: options.subject, Charset: 'UTF-8' },
                Body: {
                    Html: { Data: options.html, Charset: 'UTF-8' },
                    ...(options.text ? { Text: { Data: options.text, Charset: 'UTF-8' } } : {}),
                },
            },
        },
    });

    await getSESClient().send(command);
}

async function sendViaResend(options: EmailOptions): Promise<void> {
    const key = process.env.EMAIL_PROVIDER_KEY;

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: `${FROM_NAME} <${FROM_EMAIL}>`,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${error}`);
    }
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        switch (resolveProvider()) {
            case 'ses':
                await sendViaSES(options);
                break;
            case 'resend':
                await sendViaResend(options);
                break;
            case 'console':
            default:
                await sendViaConsole(options);
                break;
        }
        return true;
    } catch (err) {
        await logerror('sendEmail error', [err]);
        return false;
    }
}

export async function sendOTPEmail(email: string, code: string): Promise<boolean> {
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #f0f0f0; }
          .content { padding: 30px 0; }
          .code-box { background: #f5f5f5; border: 2px dashed #ccc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #000; font-family: 'Courier New', monospace; }
          .footer { text-align: center; padding: 20px 0; border-top: 2px solid #f0f0f0; font-size: 12px; color: #666; }
          .warning { color: #d32f2f; font-size: 14px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${FROM_NAME}</h1>
          </div>
          <div class="content">
            <h2>მეილის ვერიფიკაცია</h2>
            <p>გამოიყენე ვერიფიკაციის კოდი ${FROM_NAME}-ის ავტორიზაციის ფორმაზე:</p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <p>ვერიფიკაციის კოდის ვადა <strong>10 წთ</strong>.</p>
            <p class="warning">⚠️ თუ ეს კოდი შენ არ გამოგიგზავნია, დააიგნორე / If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>ესე მესიჯი არის ავტომატურად გენერირებული, გთხოვ არ გამოიყენო პასუხის გასაცემად / This is an automated message, please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

    const text = `
${FROM_NAME} - მეილის ვერიფიკაცია

გამოიყენე ვერიფიკაციის კოდი ${FROM_NAME}-ის ავტორიზაციის ფორმაზე: ${code}

ვერიფიკაციის კოდის ვადა 10 wT.

თუ ეს კოდი შენ არ გამოგიგზავნია, დააიგნორე / If you didn't request this code, please ignore this email.
  `;

    return sendEmail({
        to: email,
        subject: `${FROM_NAME} - მეილის ვერიფიკაცია`,
        html,
        text,
    });
}

/**
 * Sends welcome email after successful verification
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; }
          .content { padding: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>კეთილი იყოს შენი სრულუფლებიანი წევრობა ${FROM_NAME}-ზე! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>შენი მეილი წარმატებით დავერიფიცირდა!.</p>
            <p>მადლობა შემოერთებისთვის!</p>
          </div>
        </div>
      </body>
    </html>
  `;

    return sendEmail({
        to: email,
        subject: `რეგისტრაცია ${FROM_NAME}-ზე!`,
        html,
        text: `კეთილი იყოს შენი სრულუფლებიანი წევრობა ${name},\n\შენი მეილი წარმატებით დავერიფიცირდა!\n\მადლობა შემოერთებისთვის!`,
    });
}
