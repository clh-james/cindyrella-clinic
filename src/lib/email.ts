import "server-only";
import { Resend } from "resend";

function isConfigured() {
  return !!process.env.RESEND_API_KEY;
}

function fromAddress() {
  // resend.dev works without a verified domain for testing; swap in your
  // own verified domain (e.g. bookings@cindyrelladrip.com) for production.
  return process.env.RESEND_FROM ?? "Cindyrella Medical Group <onboarding@resend.dev>";
}

export type EmailResult = { sent: boolean; reason?: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  if (!isConfigured()) {
    console.log("[email:skipped — Resend not configured]", params.to, params.subject);
    return { sent: false, reason: "not_configured" };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error("[email:failed]", error);
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email:failed]", err);
    return { sent: false, reason: "send_failed" };
  }
}

const wrapper = (body: string) => `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#eaf2fc;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      <div style="background:#174ea6;padding:24px 28px;">
        <span style="color:#ffffff;font-size:18px;font-weight:600;">Cindyrella Medical Group</span>
      </div>
      <div style="padding:28px;color:#0b1a33;font-size:14px;line-height:1.6;">
        ${body}
      </div>
    </div>
  </div>
`;

export function bookingConfirmationEmail(params: {
  treatmentName: string;
  branchName: string;
  date: string;
  time: string;
  referenceNumber: string;
  paymentUrl?: string;
}) {
  return wrapper(`
    <h2 style="margin:0 0 12px;font-size:20px;">Your session is booked</h2>
    <p style="margin:0 0 16px;color:#4a5b78;">Here are your details:</p>
    <table style="width:100%;font-size:14px;margin-bottom:16px;">
      <tr><td style="color:#4a5b78;padding:4px 0;">Treatment</td><td style="text-align:right;">${params.treatmentName}</td></tr>
      <tr><td style="color:#4a5b78;padding:4px 0;">Branch</td><td style="text-align:right;">${params.branchName}</td></tr>
      <tr><td style="color:#4a5b78;padding:4px 0;">Date & time</td><td style="text-align:right;">${params.date}, ${params.time}</td></tr>
      <tr><td style="color:#4a5b78;padding:4px 0;">Reference</td><td style="text-align:right;font-family:monospace;">${params.referenceNumber}</td></tr>
    </table>
    ${
      params.paymentUrl
        ? `<a href="${params.paymentUrl}" style="display:inline-block;background:#174ea6;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;">Complete payment</a>
           <p style="margin:12px 0 0;color:#4a5b78;font-size:12px;">Your slot is held, but please complete payment to confirm it.</p>`
        : `<p style="margin:0;color:#4a5b78;">See you at the clinic!</p>`
    }
  `);
}

export function paymentConfirmedEmail(params: { referenceNumber: string }) {
  return wrapper(`
    <h2 style="margin:0 0 12px;font-size:20px;">Payment received</h2>
    <p style="margin:0;color:#4a5b78;">
      Thanks — your payment for booking <span style="font-family:monospace;">${params.referenceNumber}</span>
      has been confirmed. We'll see you at your scheduled time.
    </p>
  `);
}

export function staffInviteEmail(params: { fullName: string; email: string; tempPassword: string }) {
  return wrapper(`
    <h2 style="margin:0 0 12px;font-size:20px;">Welcome, ${params.fullName}</h2>
    <p style="margin:0 0 16px;color:#4a5b78;">
      An account was created for you on the Cindyrella staff dashboard.
    </p>
    <table style="width:100%;font-size:14px;margin-bottom:16px;">
      <tr><td style="color:#4a5b78;padding:4px 0;">Email</td><td style="text-align:right;">${params.email}</td></tr>
      <tr><td style="color:#4a5b78;padding:4px 0;">Temporary password</td><td style="text-align:right;font-family:monospace;">${params.tempPassword}</td></tr>
    </table>
    <p style="margin:0;color:#4a5b78;font-size:12px;">Please sign in and change your password as soon as possible.</p>
  `);
}
