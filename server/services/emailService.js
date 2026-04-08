const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async (to, otp) => {
  const mailOptions = {
    from: `"ZeroDesk" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your ZeroDesk Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #111827; margin-bottom: 8px;">ZeroDesk Verification</h2>
        <p style="color: #6b7280; margin-bottom: 24px;">Use the code below to complete your sign-in. This code expires in 5 minutes.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827;">${otp}</span>
        </div>
        <p style="color: #9ca3af; font-size: 13px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const sendTaskAssignedEmail = async ({ to, assigneeName, createdByName, organizationName, task }) => {
  const createdAt = task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Not available';
  const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set';
  const description = task.description?.trim() || 'No description provided';

  const mailOptions = {
    from: `"ZeroDesk" <${process.env.SMTP_USER}>`,
    to,
    subject: `New task assigned: ${task.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 16px; background: #ffffff;">
        <p style="margin: 0 0 12px; color: #003aa0; font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">ZeroDesk Task Assignment</p>
        <h2 style="margin: 0 0 10px; color: #131b2e; font-size: 28px; line-height: 1.2;">Hi ${assigneeName || 'there'}, you’ve been assigned a new task</h2>
        <p style="margin: 0 0 24px; color: #565c84; font-size: 15px; line-height: 1.7;">
          ${createdByName || 'A teammate'} assigned this task to you in <strong style="color: #131b2e;">${organizationName || 'your organization'}</strong>.
        </p>

        <div style="border-radius: 16px; background: #f8f9ff; border: 1px solid #dbe1ff; padding: 20px 22px; margin-bottom: 24px;">
          <div style="margin-bottom: 14px;">
            <p style="margin: 0 0 6px; color: #565c84; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Task title</p>
            <p style="margin: 0; color: #131b2e; font-size: 20px; font-weight: 700;">${task.title}</p>
          </div>
          <div style="margin-bottom: 14px;">
            <p style="margin: 0 0 6px; color: #565c84; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Description</p>
            <p style="margin: 0; color: #131b2e; font-size: 15px; line-height: 1.7; white-space: pre-line;">${description}</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
            <div style="padding: 14px; border-radius: 12px; background: #ffffff; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 6px; color: #565c84; font-size: 12px; font-weight: 700; text-transform: uppercase;">Status</p>
              <p style="margin: 0; color: #131b2e; font-size: 15px; font-weight: 600;">${task.status || 'TODO'}</p>
            </div>
            <div style="padding: 14px; border-radius: 12px; background: #ffffff; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 6px; color: #565c84; font-size: 12px; font-weight: 700; text-transform: uppercase;">Due date</p>
              <p style="margin: 0; color: #131b2e; font-size: 15px; font-weight: 600;">${dueDate}</p>
            </div>
            <div style="padding: 14px; border-radius: 12px; background: #ffffff; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 6px; color: #565c84; font-size: 12px; font-weight: 700; text-transform: uppercase;">Created at</p>
              <p style="margin: 0; color: #131b2e; font-size: 15px; font-weight: 600;">${createdAt}</p>
            </div>
            <div style="padding: 14px; border-radius: 12px; background: #ffffff; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 6px; color: #565c84; font-size: 12px; font-weight: 700; text-transform: uppercase;">Assigned by</p>
              <p style="margin: 0; color: #131b2e; font-size: 15px; font-weight: 600;">${createdByName || 'Unknown'}</p>
            </div>
          </div>
        </div>

        <p style="margin: 0; color: #7d84a3; font-size: 13px; line-height: 1.6;">You’re receiving this email because a task was assigned to you in ZeroDesk.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail, sendTaskAssignedEmail };
