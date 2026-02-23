import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const OAuth2 = google.auth.OAuth2;

async function testGmail() {
    console.log('--- Gmail API Diagnostic ---');

    const clientId = process.env.GMAIL_CLIENT_ID?.trim();
    const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
    const user = process.env.EMAIL_USER?.trim();

    if (!clientId || !clientSecret || !refreshToken || !user) {
        console.error('❌ Missing credentials in .env');
        process.exit(1);
    }

    console.log(`Checking token for: ${user}`);

    const oauth2Client = new OAuth2(
        clientId,
        clientSecret,
        "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    try {
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const res = await gmail.users.getProfile({ userId: 'me' });
        console.log('✅ Success! Connection established.');
        console.log('Profile Data:', res.data);
    } catch (error) {
        console.error('❌ Failed to connect to Gmail API:');
        console.error(error.message);
        if (error.message.includes('invalid_grant')) {
            console.error('💡 This usually means the refresh token is expired or revoked.');
        }
    }
}

testGmail();
