import { google } from 'googleapis';
import dotenv from 'dotenv';
import { Buffer } from 'buffer';

dotenv.config();

const OAuth2 = google.auth.OAuth2;

const createGmailClient = () => {
    const oauth2Client = new OAuth2(
        process.env.GMAIL_CLIENT_ID?.trim(),
        process.env.GMAIL_CLIENT_SECRET?.trim(),
        "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN?.trim()
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
};

const makeBody = (to, from, subject, message) => {
    const str = [
        `To: ${to}`,
        `From: ${from}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        message
    ].join('\n');

    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

export const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const gmail = createGmailClient();
        const user = process.env.EMAIL_USER?.trim();

        if (!user) {
            throw new Error('EMAIL_USER is not defined in .env');
        }

        const raw = makeBody(to, `"Task Management System" <${user}>`, subject, html || text);

        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: raw
            }
        });

        console.log('✅ Email sent via Gmail REST API:', response.data.id);
        return response.data;
    } catch (error) {
        console.error('❌ Failed to send email via REST API:', error.message);
        throw error;
    }
};

export default { sendEmail };
