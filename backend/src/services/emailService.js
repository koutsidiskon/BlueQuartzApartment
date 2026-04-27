import { Resend } from 'resend';
import nodemailer from 'nodemailer';

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function createSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }
  });
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildConfirmationHtml({ fullName, email, phoneCountryCode, phone, checkIn, checkOut, guests, message }) {
  const checkInFormatted  = formatDate(checkIn);
  const checkOutFormatted = formatDate(checkOut);

  const checkInDate  = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const nightsLabel = nights === 1 ? '1 night' : `${nights} nights`;

  const phoneRow = phone
    ? `
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px;width:130px;">Phone</td>
        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${phoneCountryCode || ''} ${phone.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
      </tr>`
    : '';

  const messageRow = message
    ? `
      <tr>
        <td style="padding:6px 0;color:#6b7280;font-size:14px;vertical-align:top;width:130px;">Message</td>
        <td style="padding:6px 0;color:#111827;font-size:14px;vertical-align:top;">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Booking Inquiry Received</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;border-radius:10px 10px 0 0;padding:36px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#a5b4c8;">BlueQuartz Apartment</p>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">We received your inquiry!</h1>
              <p style="margin:12px 0 0;font-size:14px;color:#94a3b8;">Thank you for your interest. We'll be in touch with you shortly.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 40px;">

              <p style="margin:0 0 24px;font-size:16px;color:#374151;">
                Dear <strong style="color:#111827;">${fullName.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</strong>,
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;">
                Thank you for reaching out to us. We have successfully received your booking inquiry and our team will review it promptly. You can expect to hear back from us within <strong>24&ndash;48 hours</strong>.
              </p>

              <!-- Booking summary card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:24px;margin-bottom:28px;">
                <tr>
                  <td>
                    <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;">Your Inquiry Summary</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;width:130px;">Check-in</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${checkInFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Check-out</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${checkOutFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Duration</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${nightsLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Guests</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${guests}</td>
                      </tr>${phoneRow}${messageRow}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:15px;color:#4b5563;line-height:1.7;">
                If you have any questions in the meantime, feel free to reply to this email and we'll be happy to assist you.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.7;">
                We look forward to welcoming you to BlueQuartz Apartment!
              </p>

              <p style="margin:0;font-size:15px;color:#374151;">
                Warm regards,<br>
                <strong style="color:#1a1a2e;">The BlueQuartz Apartment Team</strong>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">This is an automated confirmation email. Please do not reply directly to this message.</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} BlueQuartz Apartment. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

function buildAdminNotificationHtml({ fullName, email, phoneCountryCode, phone, checkIn, checkOut, guests, message }) {
  const checkInFormatted = formatDate(checkIn);
  const checkOutFormatted = formatDate(checkOut);
  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
  const nightsLabel = nights === 1 ? '1 night' : `${nights} nights`;

  const phoneRow = phone
    ? `<tr>
        <td style="padding:10px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;width:120px;">Phone</td>
        <td style="padding:10px 16px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #f3f4f6;">${phoneCountryCode || ''} ${phone.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
      </tr>`
    : '';

  const messageRow = message
    ? `<tr>
        <td style="padding:10px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;width:120px;">Message</td>
        <td style="padding:10px 16px;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="background-color:#1a1a2e;border-radius:10px 10px 0 0;padding:28px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#a5b4c8;">BlueQuartz Apartment</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">New Booking Inquiry</h1>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:32px 40px;">
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;">A new inquiry has been submitted. Here are the details:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:10px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;width:120px;">Name</td>
                  <td style="padding:10px 16px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #f3f4f6;">${fullName.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Email</td>
                  <td style="padding:10px 16px;font-size:14px;border-bottom:1px solid #f3f4f6;"><a href="mailto:${email}" style="color:#3b82f6;text-decoration:none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Check-in</td>
                  <td style="padding:10px 16px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #f3f4f6;">${checkInFormatted}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Check-out</td>
                  <td style="padding:10px 16px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #f3f4f6;">${checkOutFormatted}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Duration</td>
                  <td style="padding:10px 16px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #f3f4f6;">${nightsLabel}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;color:#6b7280;font-size:14px;${(phone || message) ? 'border-bottom:1px solid #f3f4f6;' : ''}">Guests</td>
                  <td style="padding:10px 16px;color:#111827;font-size:14px;font-weight:600;${(phone || message) ? 'border-bottom:1px solid #f3f4f6;' : ''}">${guests}</td>
                </tr>
                ${phoneRow}${messageRow}
              </table>
              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Log in to the admin panel to manage this inquiry.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:16px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; ${new Date().getFullYear()} BlueQuartz Apartment. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendViaResend({ from, to, subject, html }) {
  const resend = getResendClient();
  if (!resend) return false;
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return true;
}

async function sendViaSmtp({ from, to, subject, html }) {
  const transporter = createSmtpTransporter();
  if (!transporter) return false;
  await transporter.sendMail({ from, to, subject, html });
  return true;
}

async function sendEmail({ from, to, subject, html }) {
  try {
    const sent = await sendViaResend({ from, to, subject, html });
    if (sent) return;
  } catch (err) {
    console.error('[email] Resend failed, falling back to SMTP:', err.message);
  }
  await sendViaSmtp({ from, to, subject, html });
}

export async function sendInquiryConfirmation({ fullName, email, phoneCountryCode, phone, checkIn, checkOut, guests, message }) {
  const from = process.env.EMAIL_FROM || `BlueQuartz Apartment <${process.env.SMTP_USER}>`;
  await sendEmail({
    from,
    to: email,
    subject: 'Inquiry Confirmation — Blue Quartz Apartment Limenas Thassos',
    html: buildConfirmationHtml({ fullName, email, phoneCountryCode, phone, checkIn, checkOut, guests, message })
  });
}

export async function sendAdminNotification({ fullName, email, phoneCountryCode, phone, checkIn, checkOut, guests, message }) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  const from = process.env.EMAIL_FROM || `BlueQuartz Apartment <${process.env.SMTP_USER}>`;
  const checkInFormatted = formatDate(checkIn);
  await sendEmail({
    from,
    to: adminEmail,
    subject: `🔔 New Inquiry — ${fullName} (${checkInFormatted})`,
    html: buildAdminNotificationHtml({ fullName, email, phoneCountryCode, phone, checkIn, checkOut, guests, message })
  });
}
