import nodemailer from 'nodemailer';

// This service is responsible for sending emails related to booking inquiries, such as confirmation emails to users after they submit the contact form. 
// It uses nodemailer to send emails via SMTP, with configuration taken from environment variables. 
// The main function is sendInquiryConfirmation, which builds a nicely formatted HTML email summarizing the user's inquiry details and sends it to their email address.


// function to create a nodemailer transporter using SMTP configuration from environment variables
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

// helper function to format a date string into a more human-readable format for the confirmation email
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// function to build the HTML content of the inquiry confirmation email, including a summary of the booking details and a personalized message to the user
function buildConfirmationHtml({ fullName, email, checkIn, checkOut, guests, message }) {
  const checkInFormatted  = formatDate(checkIn);
  const checkOutFormatted = formatDate(checkOut);

  const checkInDate  = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const nightsLabel = nights === 1 ? '1 night' : `${nights} nights`;

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
                      </tr>${messageRow}
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

// function to send the inquiry confirmation email to the user after they submit the contact form, using the createTransporter and buildConfirmationHtml functions defined above
export async function sendInquiryConfirmation({ fullName, email, checkIn, checkOut, guests, message }) {
  const transporter = createTransporter();
  if (!transporter) return;

  const fromAddress = process.env.EMAIL_FROM || `"BlueQuartz Apartment" <${process.env.SMTP_USER}>`;

  await transporter.sendMail({
    from: fromAddress,
    to: email,
    subject: 'Inquiry Confirmation — Blue Quartz Apartment Limenas Thassos',
    html: buildConfirmationHtml({ fullName, email, checkIn, checkOut, guests, message })
  });
}

// function to send a notification email to the admin when a new inquiry is submitted
export async function sendAdminNotification({ fullName, email, checkIn, checkOut, guests, message }) {
  const transporter = createTransporter();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!transporter || !adminEmail) return;

  const fromAddress = process.env.EMAIL_FROM || `"BlueQuartz Apartment" <${process.env.SMTP_USER}>`;
  const checkInFormatted = formatDate(checkIn);
  const checkOutFormatted = formatDate(checkOut);

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const nightsLabel = nights === 1 ? '1 night' : `${nights} nights`;

  const messageRow = message
    ? `<tr>
        <td style="padding:10px 16px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;width:120px;">Message</td>
        <td style="padding:10px 16px;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
      </tr>`
    : '';

  await transporter.sendMail({
    from: fromAddress,
    to: adminEmail,
    subject: `🔔 New Inquiry — ${fullName} (${checkInFormatted})`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;border-radius:10px 10px 0 0;padding:28px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#a5b4c8;">BlueQuartz Apartment</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">New Booking Inquiry</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 40px;">
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;">A new inquiry has been submitted. Here are the details:</p>

              <!-- Details table -->
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
                  <td style="padding:10px 16px;color:#6b7280;font-size:14px;${message ? 'border-bottom:1px solid #f3f4f6;' : ''}">Guests</td>
                  <td style="padding:10px 16px;color:#111827;font-size:14px;font-weight:600;${message ? 'border-bottom:1px solid #f3f4f6;' : ''}">${guests}</td>
                </tr>
                ${messageRow}
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">Log in to the admin panel to manage this inquiry.</p>
            </td>
          </tr>

          <!-- Footer -->
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
</html>`
  });
}
