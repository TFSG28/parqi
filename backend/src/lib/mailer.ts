import nodemailer from 'nodemailer';
import 'dotenv/config';

export const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const baseEmailTemplate = (content: string, subject: string) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f7f7f7;
                color: #333;
                line-height: 1.6;
            }
            .container {
                max-width: 600px;
                background: #ffffff;
                margin: 20px auto;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                border: 1px solid #eaeaea;
            }
            .header {
                background: #3B6BFF;
                padding: 30px 20px;
                text-align: center;
                color: white;
            }
            .content {
                padding: 30px;
            }
            .footer {
                text-align: center;
                padding: 20px;
                background: #f8f8f8;
                color: #666;
                font-size: 14px;
                border-top: 1px solid #eaeaea;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>${subject}</h2>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p>© ${new Date().getFullYear()} Parqi. Todos os direitos reservados.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

export const sendEmail = async (to: string, subject: string, content: string) => {
    try {
        await transporter.sendMail({
            from: `Parqi <${process.env.EMAIL}>`,
            to: process.env.NODE_ENV === 'production' ? to : process.env.DEV_EMAIL,
            subject,
            html: baseEmailTemplate(content, subject)
        });
        return true;
    } catch (error) {
        console.error("Erro ao enviar email:", error);
        return false;
    }
};
