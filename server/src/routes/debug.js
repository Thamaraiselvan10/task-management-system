import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = process.env.SMTP_PORT || 587;

        let status = `<h3>Configuration Check</h3>
        <ul>
            <li><strong>SMTP_USER:</strong> ${user ? user : '❌ MISSING'}</li>
            <li><strong>SMTP_PASS:</strong> ${pass ? '✅ SET (' + pass.length + ' chars)' : '❌ MISSING'}</li>
            <li><strong>SMTP_HOST:</strong> ${host}</li>
            <li><strong>SMTP_PORT:</strong> ${port}</li>
        </ul>`;

        if (!user || !pass) {
            return res.send(status + '<h3>❌ Error: Missing Credentials</h3><p>Please check Render Environment Variables.</p>');
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: false,
            auth: { user, pass }
        });

        status += '<h3>Connection Test</h3>';

        await transporter.verify();
        status += '<p>✅ SMTP Connection Verified!</p>';

        const info = await transporter.sendMail({
            from: `"Debug Test" <${user}>`,
            to: user, // Send to self
            subject: 'Render Production Email Test',
            text: 'It works!',
            html: '<b>It works!</b> Your email configuration on Render is correct.'
        });

        status += `<p>✅ Email Sent Successfully!</p>
        <p>Message ID: ${info.messageId}</p>`;

        res.send(status);

    } catch (error) {
        console.error('Debug Email Error:', error);
        res.status(500).send(`<h3>❌ FAILED</h3>
        <pre>${error.stack}</pre>
        <hr>
        <h4>Error Details:</h4>
        <pre>${JSON.stringify(error, null, 2)}</pre>`);
    }
});

export default router;
