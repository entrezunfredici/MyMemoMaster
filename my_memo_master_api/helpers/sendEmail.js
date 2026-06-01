const nodemailer = require('nodemailer');

module.exports = async (subject = '', text = '', to = '', from = process.env.EMAIL_FROM) => {
    if (!subject || !text || !to || !from) throw new Error('Missing email parameters');

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({ from, to, subject, text });
};
