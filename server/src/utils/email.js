import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
    try {
        const oauth2Client = new OAuth2(
            process.env.GMAIL_CLIENT_ID?.trim(),
            process.env.GMAIL_CLIENT_SECRET?.trim(),
            "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GMAIL_REFRESH_TOKEN?.trim()
        });

        const accessToken = await new Promise((resolve, reject) => {
            oauth2Client.getAccessToken((err, token) => {
                if (err) {
                    console.error('❌ Failed to create access token:', err);
                    reject(err);
                }
                resolve(token);
            });
        });

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER?.trim(),
                clientId: process.env.GMAIL_CLIENT_ID?.trim(),
                clientSecret: process.env.GMAIL_CLIENT_SECRET?.trim(),
                refreshToken: process.env.GMAIL_REFRESH_TOKEN?.trim(),
                accessToken: accessToken || '' // Sometimes redundant but good for debug
            }
        });

        return transporter;
    } catch (error) {
        console.error('❌ Error creating OAuth2 transporter:', error);
        return null;
    }
};

export const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transporter = await createTransporter();

        if (!transporter) {
            throw new Error('Failed to create email transporter');
        }

        const mailOptions = {
            from: `"Task Management System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text: text || '',
            html: html || text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent via Gmail OAuth2:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        throw error;
    }
};

export default { sendEmail };
