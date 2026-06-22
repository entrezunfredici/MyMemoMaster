const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

module.exports = async (subject = '', text = '', to = '', from = process.env.EMAIL_FROM) => {
  if (!subject || !text || !to || !from) throw new Error('Missing email parameters')
  await transporter.sendMail({ from, to, subject, text })
}
