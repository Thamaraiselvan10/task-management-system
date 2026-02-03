import express from 'express';
import { google } from 'googleapis';
import { Buffer } from 'buffer';

const router = express.Router();
const OAuth2 = google.auth.OAuth2;

router.get('/', async (req, res) => {
    let logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        log('Starting Gmail REST API Diagnostic (HTTP Mode)...');

        const clientId = process.env.GMAIL_CLIENT_ID?.trim();
        const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
        const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
        const user = process.env.EMAIL_USER?.trim();

        if (!clientId || !clientSecret || !refreshToken || !user) {
            throw new Error('Missing Gmail OAuth credentials in .env');
        }

        log(`Client ID: "${clientId.slice(0, 5)}...${clientId.slice(-5)}"`);
        log(`User: ${user}`);

        // 1. Setup Client
        log('1. Setting up Google Client...');
        const oauth2Client = new OAuth2(
            clientId,
            clientSecret,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // 2. Prepare Email
        log('2. Preparing raw email content...');
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

        const raw = makeBody(user, `"Gmail Debug" <${user}>`, 'Render Production Email (REST API)', '<h3>✅ It works!</h3><p>This email was sent via Gmail REST API (Port 443).</p>');

        // 3. Send
        log('3. Sending via HTTP (users.messages.send)...');
        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: raw
            }
        });

        log(`✅ Email Sent! ID: ${response.data.id}`);
        res.send(`<h3>✅ SUCCESS</h3><pre>${logs.join('\n')}</pre>`);

    } catch (error) {
        log(`\n❌ ERROR: ${error.message}`);
        res.status(500).send(`<h3>❌ FAILED</h3><pre>${logs.join('\n')}</pre><hr><pre>${error.stack}</pre>`);
    }
});

export default router;
