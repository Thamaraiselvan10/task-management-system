import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

router.get('/', async (req, res) => {
    let logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(`${new Date().toISOString().split('T')[1].slice(0, -1)} - ${msg}`);
    };

    try {
        log('Starting Debug (Attempt: service="gmail")...');

        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!user || !pass) {
            throw new Error('Missing SMTP_USER or SMTP_PASS environment variables');
        }

        // Using the built-in 'gmail' service preset
        // This automatically handles host, port, and security settings
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
            // Increase timeout to 20 seconds
            connectionTimeout: 20000,
            greetingTimeout: 20000,
            socketTimeout: 20000,
            debug: true, // Enable debug logs
            logger: true
        });

        log('Verifying connection (20s timeout)...');

        await new Promise((resolve, reject) => {
            transporter.verify((err, success) => {
                if (err) reject(err);
                else resolve(success);
            });
        });

        log('✅ Connection Verified!');

        // Send Email
        log('Sending Test Email...');
        const info = await transporter.sendMail({
            from: `"Debug Service" <${user}>`,
            to: user,
            subject: 'Render Production Email (Service Mode)',
            text: 'If you received this, the service: "gmail" configuration works.',
            html: `<h3>✅ Service Mode Successful</h3><p>Your email is working using the Gmail preset.</p>`
        });

        log(`✅ Email Sent! ID: ${info.messageId}`);
        res.send(`<h3>✅ SUCCESS</h3><pre>${logs.join('\n')}</pre>`);

    } catch (error) {
        log(`\n❌ ERROR: ${error.message}`);
        let code = error.code || 'N/A';
        res.status(500).send(`<h3>❌ FAILED</h3>
        <p><strong>Code:</strong> ${code}</p>
        <p><strong>Message:</strong> ${error.message}</p>
        <pre>${logs.join('\n')}</pre>
        <hr>
        <pre>${error.stack}</pre>`);
    }
});

export default router;
