import express from 'express';
import { Resend } from 'resend';

const router = express.Router();

router.get('/', async (req, res) => {
    let logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
    };

    try {
        log('Starting Resend API Diagnostic...');

        const apiKey = process.env.RESEND_API_KEY;

        if (!apiKey) {
            throw new Error('Missing RESEND_API_KEY environment variable');
        }

        log(`API Key found: ${apiKey.slice(0, 5)}...`);

        const resend = new Resend(apiKey);
        const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

        // Note: With 'onboarding@resend.dev', you can ONLY send to the email address 
        // you used to sign up for Resend.
        // If you want to send to others, you must verify a domain in Resend.
        const to = process.env.SMTP_USER || 'thamaraiselvanvcb@gmail.com';

        log(`Sending test email From: ${from} To: ${to}`);

        const { data, error } = await resend.emails.send({
            from,
            to: [to],
            subject: 'Render Production Email (via Resend)',
            html: '<h3>✅ It Works!</h3><p>Your app is now using Resend API to bypass SMTP blocks.</p>'
        });

        if (error) {
            log(`❌ Resend API Error: ${error.message} (${error.name})`);
            throw new Error(error.message);
        }

        log(`✅ Email Sent! ID: ${data.id}`);
        res.send(`<h3>✅ SUCCESS</h3><pre>${logs.join('\n')}</pre>`);

    } catch (error) {
        log(`\n❌ ERROR: ${error.message}`);
        res.status(500).send(`<h3>❌ FAILED</h3><pre>${logs.join('\n')}</pre>`);
    }
});

export default router;
