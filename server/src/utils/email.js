import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Resend
// Note: It's okay if RESEND_API_KEY is not set immediately, but sendEmail will fail.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Send email helper
export const sendEmail = async ({ to, subject, html, text }) => {
    // Validation
    if (!process.env.RESEND_API_KEY) {
        console.error('❌ Resend API Key is missing');
        return null;
    }

    if (!resend) {
        console.error('❌ Resend client is not initialized');
        return null;
    }

    try {
        const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

        console.log(`📧 Sending email via Resend to: ${to}`);

        const { data, error } = await resend.emails.send({
            from,
            to: Array.isArray(to) ? to : [to],
            subject,
            html: html || text,
            text: text || ''
        });

        if (error) {
            console.error('❌ Resend Error:', error);
            throw new Error(error.message);
        }

        console.log('✅ Email sent successfully via Resend. ID:', data.id);
        return data;
    } catch (error) {
        console.error('❌ Failed to send email:', error.message);
        // Important: Don't crash the server, but log the error clearly
        // Re-throw if you want the caller to handle it
        throw error;
    }
};

export default { sendEmail };
