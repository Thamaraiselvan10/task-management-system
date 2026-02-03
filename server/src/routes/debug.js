import express from 'express';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

const router = express.Router();
const OAuth2 = google.auth.OAuth2;

router.get('/', async (req, res) => {
    let logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        log('Starting Gmail OAuth2 Diagnostic...');

        const clientId = process.env.GMAIL_CLIENT_ID?.trim();
        const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
        const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
        const user = process.env.EMAIL_USER?.trim();

        if (!clientId || !clientSecret || !refreshToken || !user) {
            throw new Error('Missing Gmail OAuth credentials in .env');
        }

        log(`Client ID: "${clientId.slice(0, 5)}...${clientId.slice(-5)}" (Length: ${clientId.length})`);
        log(`Client Secret: "${clientSecret.slice(0, 3)}...${clientSecret.slice(-3)}" (Length: ${clientSecret.length})`);
        log(`Refresh Token: "${refreshToken.slice(0, 5)}...${refreshToken.slice(-5)}" (Length: ${refreshToken.length})`);
        log(`User: ${user}`);

        // 1. Get Access Token
        log('1. Fetching Access Token from Google...');
        const oauth2Client = new OAuth2(
            clientId,
            clientSecret,
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        const accessToken = await new Promise((resolve, reject) => {
            oauth2Client.getAccessToken((err, token) => {
                if (err) {
                    log(`❌ Access Token Error: ${err.message}`);
                    reject(err);
                } else {
                    log('✅ Access Token Generated!');
                    resolve(token);
                }
            });
        });

        // 2. Configure Nodemailer
        log('2. Configuring Transport...');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: user,
                clientId: clientId,
                clientSecret: clientSecret,
                refreshToken: refreshToken,
                accessToken: accessToken
            }
        });

        // 3. Verify
        log('3. Verifying SMTP Connection...');
        await transporter.verify();
        log('✅ Connection Verified!');

        // 4. Send Email
        log('4. Sending Test Email...');
        const info = await transporter.sendMail({
            from: `"Gmail OAuth Debug" <${user}>`,
            to: user, // Send to self
            subject: 'Render Production Email (Gmail API)',
            text: 'If you see this, Gmail OAuth2 is working perfectly via API!',
            html: '<h3>✅ Gmail OAuth2 Works!</h3><p>Your app is now authenticated directly with Google.</p>'
        });

        log(`✅ Email Sent! ID: ${info.messageId}`);
        res.send(`<h3>✅ SUCCESS</h3><pre>${logs.join('\n')}</pre>`);

    } catch (error) {
        log(`\n❌ ERROR: ${error.message}`);
        res.status(500).send(`<h3>❌ FAILED</h3><pre>${logs.join('\n')}</pre><hr><pre>${error.stack}</pre>`);
    }
});

export default router;
