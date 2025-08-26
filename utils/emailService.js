import nodemailer from 'nodemailer';
import dotenv from 'dotenv'
dotenv.config({ path: './config.env' });
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: `"kayceylon" <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            text: options.message,
            // include html body when provided
            ...(options.html ? { html: options.html } : {}),
            ...(options.bcc ? { bcc: options.bcc } : {}),
            ...(options.replyTo ? { replyTo: options.replyTo } : {})
        };

        const info = await transporter.sendMail(mailOptions);
        if (options.bcc) console.log(`[emailService] Sent email (subject: ${options.subject}) to ${options.email} with BCC count: ${options.bcc.split(',').length}`);
        return info;
    } catch (err) {
        console.log(err);
        throw new Error('Error sending email. Try again later!');

    }
}

export default sendEmail;