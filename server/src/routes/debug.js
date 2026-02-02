import express from 'express';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';

const router = express.Router();
const resolveDns = promisify(dns.resolve);

router.get('/', async (req, res) => {
    let logs = [];
    const log = (msg) => {
        console.log(msg);
        logs.push(`${new Date().toISOString().split('T')[1].slice(0, -1)} - ${msg}`);
    };

    try {
        log('Starting Comprehensive Email Diagnostic...');

        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';

        if (!user || !pass) {
            throw new Error('Missing SMTP_USER or SMTP_PASS environment variables');
        }

        // 1. DNS Check
        log(`1. Resolving DNS for ${host}...`);
        try {
            const addresses = await resolveDns(host);
            log(`✅ DNS Resolved: ${JSON.stringify(addresses)}`);
        } catch (dnsErr) {
            log(`❌ DNS Lookup Failed: ${dnsErr.message}`);
            // Proceed anyway, maybe it works with cached IP
        }

        // 2. Test Ports Sequentially
        const portsToTest = [
            { port: 587, secure: false, name: 'STARTTLS (587)' },
            { port: 465, secure: true, name: 'SSL (465)' }
        ];

        let successTransporter = null;

        for (const config of portsToTest) {
            log(`\n2. Testing ${config.name}...`);

            const transporter = nodemailer.createTransport({
                host,
                port: config.port,
                secure: config.secure,
                auth: { user, pass },
                connectionTimeout: 5000, // 5s timeout
                greetingTimeout: 5000,
                socketTimeout: 5000,
                // FORCE IPv4 (Fixes common cloud timeout issues with IPv6)
                tls: {
                    rejectUnauthorized: false
                }
            });

            try {
                await new Promise((resolve, reject) => {
                    transporter.verify((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                log(`✅ SUCCESS: Connected via ${config.name}!`);
                successTransporter = transporter;
                break; // Stop after first success
            } catch (err) {
                log(`❌ FAILED ${config.name}: ${err.message}`);
                if (err.code === 'EAUTH') {
                    log('   -> Auth Error: Check Email/Password.');
                    break; // Don't retry other ports if auth is wrong
                }
            }
        }

        if (!successTransporter) {
            throw new Error('All connection attempts failed.');
        }

        // 3. Send Email
        log('\n3. Sending Test Email...');
        const info = await successTransporter.sendMail({
            from: `"Debug Diagnostic" <${user}>`,
            to: user,
            subject: 'Render Production Email Diagnostic',
            text: 'If you received this, the diagnostic was successful.\n\nLogs:\n' + logs.join('\n'),
            html: `<h3>✅ Diagnostic Successful</h3><pre>${logs.join('\n')}</pre>`
        });

        log(`✅ Email Sent! ID: ${info.messageId}`);
        res.send(`<h3>✅ SUCCESS</h3><pre>${logs.join('\n')}</pre>`);

    } catch (error) {
        log(`\n❌ CRITICAL ERROR: ${error.message}`);
        res.status(500).send(`<h3>❌ FAILED</h3><pre>${logs.join('\n')}\n\nStack: ${error.stack}</pre>`);
    }
});

export default router;
