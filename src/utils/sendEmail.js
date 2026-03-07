const sgMail = require('@sendgrid/mail');

const sendEmail = async (options) => {
    try {
        require('dotenv').config(); // Guarantee .env is freshly loaded if omitted
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const emailFrom = process.env.EMAIL_FROM;
        if (!emailFrom) {
            console.error('CRITICAL: EMAIL_FROM is undefined in environment variables.');
        }

        const msg = {
            to: options.to,
            from: emailFrom || 'tushar.buildsweb@gmail.com', // Safe fallback to known verified sender
            subject: options.subject,
            html: options.html,
        };

        await sgMail.send(msg);
        console.log(`Email successfully dispatched via SendGrid to: ${options.to}`);
        return true;
    } catch (error) {
        console.error('SendGrid Error sending email:', error);
        if (error.response) {
            console.error(error.response.body);
        }
        return false;
    }
};

module.exports = sendEmail;
