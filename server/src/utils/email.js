import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter only if SMTP is configured
let transporter = null;

const getTransporter = () => {
    if (!transporter && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 465,
            secure: true, // Use SSL
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000
        });
    }
    return transporter;
};

// Send email helper
export const sendEmail = async ({ to, subject, html, text }) => {
    // Skip if SMTP not configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('📧 Email skipped (SMTP not configured):', { to, subject });
        return null;
    }

    const mailer = getTransporter();
    if (!mailer) {
        console.log('📧 Email skipped (transporter not available):', { to, subject });
        return null;
    }

    try {
        const info = await mailer.sendMail({
            from: `"Task Management System" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text: text || '',
            html: html || ''
        });

        console.log('📧 Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('📧 Email failed:', error.message);
        throw error;
    }
};

export default { sendEmail };
