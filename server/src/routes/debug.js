import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        // Try Port 465 (SSL) as it's often more reliable on cloud
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = 465;

        let status = `<h3>Configuration Check (Attempting Port 465 SSL)</h3>
        <ul>
            <li><strong>SMTP_USER:</strong> ${user ? user : '❌ MISSING'}</li>
            <li><strong>SMTP_PASS:</strong> ${pass ? '✅ SET (' + pass.length + ' chars)' : '❌ MISSING'}</li>
            <li><strong>SMTP_HOST:</strong> ${host}</li>
            <li><strong>SMTP_PORT:</strong> ${port} (Forced SSL)</li>
        </ul>`;

        if (!user || !pass) {
            return res.send(status + '<h3>❌ Error: Missing Credentials</h3>');
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: true, // true for 465
            auth: { user, pass },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });

        status += '<h3>Connection Test</h3>';

        // Wrap verify in a timeout promise
        const verifyPromise = new Promise((resolve, reject) => {
            transporter.verify((err, success) => {
                if (err) reject(err);
                else resolve(success);
            });
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timed out after 10 seconds. Check if Render is blocking outbound mail ports.')), 10000)
        );

        await Promise.race([verifyPromise, timeoutPromise]);
        status += '<p>✅ SMTP Connection Verified!</p>';

        const info = await transporter.sendMail({
            from: `"Debug Test" <${user}>`,
            to: user,
            subject: 'Render Production Email Test (SSL)',
            text: 'It works! Connected via Port 465 SSL.',
            html: '<b>It works!</b> Connected via Port 465 SSL.'
        });

        status += `<p>✅ Email Sent Successfully!</p>
        <p>Message ID: ${info.messageId}</p>`;

        res.send(status);

    } catch (error) {
        console.error('Debug Email Error:', error);
        res.status(500).send(`<h3>❌ FAILED</h3>
        <p><strong>Error:</strong> ${error.message}</p>
        <p><strong>Code:</strong> ${error.code || 'N/A'}</p>
        <pre>${error.stack}</pre>`);
    }
});

export default router;
