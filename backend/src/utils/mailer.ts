import nodemailer from 'nodemailer';

function createTransporter() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_PASS?.trim();
  if (!user || !pass) {
    throw new Error('Email service is not configured (EMAIL_USER / EMAIL_PASS missing).');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  frontendOrigin?: string,
) => {
  const vitePort = process.env.VITE_PORT || '5174';
  const apiUrlFallback =
    process.env.VITE_API_URL && /^https?:\/\//i.test(process.env.VITE_API_URL)
      ? process.env.VITE_API_URL
      : '';
  const rawUrl =
    frontendOrigin ||
    process.env.FRONTEND_URL ||
    apiUrlFallback ||
    `http://localhost:${vitePort}`;
  const frontendUrl = rawUrl.replace(/\/+$/, '');
  const rawBasePath = (process.env.VITE_BASE_PATH || '')
    .trim()
    .replace(/\/+$/, '');
  const normalizedBase =
    rawBasePath && rawBasePath !== '/'
      ? rawBasePath.startsWith('/')
        ? rawBasePath
        : `/${rawBasePath}`
      : '';
  const alreadyHasBase =
    normalizedBase !== '' &&
    frontendUrl.toLowerCase().endsWith(normalizedBase.toLowerCase());
  const resetLink = `${frontendUrl}${alreadyHasBase ? '' : normalizedBase}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"AGAP Portal" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>You recently requested to reset your password for your AGAP Portal account.</p>
        <p>Click the button below to reset it. This link is valid for 1 hour.</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; margin: 20px 0; background-color: #022851; color: #ffffff; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #999999;">If you're having trouble clicking the password reset button, copy and paste the URL below into your web browser:</p>
        <p style="font-size: 12px; color: #0a6fa6; word-break: break-all;">${resetLink}</p>
      </div>
    `,
  };

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};
