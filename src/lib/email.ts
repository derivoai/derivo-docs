import { escapeHtml } from "./markdown";

export interface EmailDispatchResult {
  sent: boolean;
  provider: "resend" | "local-preview";
  messageId?: string;
  error?: string;
}

export function getAppBaseUrl(originOverride?: string): string {
  // 1. Explicit production / canonical URL via environment variables (HIGHEST PRIORITY)
  const envUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).trim();

  // If NEXT_PUBLIC_APP_URL or APP_URL is explicitly set to a live domain (not localhost), ALWAYS prefer it
  if (
    envUrl &&
    envUrl.startsWith("http") &&
    !envUrl.includes("localhost") &&
    !envUrl.includes("127.0.0.1")
  ) {
    return envUrl.replace(/\/$/, "");
  }

  // 2. Railway public domain if provided by Railway environment
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (railwayDomain) {
    const proto = railwayDomain.startsWith("http") ? "" : "https://";
    return `${proto}${railwayDomain}`.replace(/\/$/, "");
  }

  // 3. If origin override is provided from request headers and is a live public domain (not localhost/internal container IP)
  if (originOverride && originOverride.startsWith("http")) {
    const isLocal =
      originOverride.includes("localhost") ||
      originOverride.includes("127.0.0.1") ||
      originOverride.includes("0.0.0.0") ||
      originOverride.includes(".railway.internal");
    if (!isLocal) {
      return originOverride.replace(/\/$/, "");
    }
  }

  // 4. In production mode (e.g. deployed on Railway without explicit NEXT_PUBLIC_APP_URL), default to https://derivo.in
  if (process.env.NODE_ENV === "production") {
    return "https://derivo.in";
  }

  // 5. If envUrl is set even for local dev
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl.replace(/\/$/, "");
  }

  // 6. Local development fallback
  return originOverride && originOverride.startsWith("http")
    ? originOverride.replace(/\/$/, "")
    : "http://localhost:3000";
}

export function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";

  if (
    host &&
    !host.includes("localhost") &&
    !host.includes("127.0.0.1") &&
    !host.includes("0.0.0.0") &&
    !host.includes(".railway.internal")
  ) {
    return `${proto}://${host}`;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function getSenderAddress(): string {
  const fromName = process.env.RESEND_FROM_NAME?.trim() || "No-reply Derivo";
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || "no-reply@derivo.in";
  return `${fromName} <${fromEmail}>`;
}

/**
 * Builds the Derivo Docs Studio-themed HTML email template.
 * Matches the landing page aesthetic:
 * - Light gray #EFEFEF canvas
 * - Crisp white #FFFFFF rounded-2xl (24px) card with subtle studio shadow
 * - Pill-style top bar with circular #111827 SVG emblem and numbered pill badge
 * - Signature orange #F26522 rounded-full CTA button with white arrow circle
 */
export function buildClaudeStyleEditorialEmailHtml(params: {
  preheader: string;
  eyebrow: string;
  heading: string;
  greetingName?: string;
  bodyParagraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  expirationNote: string;
  securityNote: string;
  badgeNumber?: string;
}): string {
  const safePreheader = escapeHtml(params.preheader);
  const safeEyebrow = escapeHtml(params.eyebrow);
  const safeHeading = escapeHtml(params.heading);
  const safeGreeting = params.greetingName
    ? `Hi ${escapeHtml(params.greetingName)},`
    : "Hello,";
  const safeCtaLabel = escapeHtml(params.ctaLabel);
  const safeCtaUrl = escapeHtml(params.ctaUrl);
  const safeExpiration = escapeHtml(params.expirationNote);
  const safeSecurity = escapeHtml(params.securityNote);
  const badgeNumber = escapeHtml(params.badgeNumber || "1");

  const paragraphsHtml = params.bodyParagraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.65; color: #4B5563;">${escapeHtml(
          p
        )}</p>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${safeHeading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #EFEFEF; color: #111827; -webkit-font-smoothing: antialiased;">
  <!-- Hidden inbox preview text -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px;">
    ${safePreheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #EFEFEF; width: 100%; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Pill Navbar Header (Matches Landing Page Pill Bar) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border-radius: 9999px; margin-bottom: 16px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);">
          <tr>
            <td style="padding: 8px 16px 8px 10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="middle" style="width: 34px; height: 34px; background-color: #111827; border-radius: 9999px; text-align: center;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.03em;">D</span><span style="color: #F26522; font-weight: 900; font-size: 14px;">.</span>
                        </td>
                        <td valign="middle" style="padding-left: 10px;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #111827; letter-spacing: -0.02em;">Derivo Docs</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 4px 12px; background-color: #F5F5F5; border: 1px solid #E5E7EB; border-radius: 9999px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 500; color: #4B5563;">
                      derivo.in
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Main Studio White Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 40px 40px 36px 40px;">
              <!-- Numbered Circle + Pill Eyebrow Badge Row -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 22px;">
                <tr>
                  <td valign="middle" style="width: 24px; height: 24px; background-color: #111827; color: #FFFFFF; border-radius: 9999px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600;">
                    ${badgeNumber}
                  </td>
                  <td valign="middle" style="padding-left: 10px;">
                    <span style="display: inline-block; padding: 4px 14px; border: 1px solid #E5E7EB; border-radius: 9999px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 500; color: #111827;">
                      ${safeEyebrow}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Main Heading -->
              <h1 style="margin: 0 0 22px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 30px; font-weight: 500; line-height: 1.12; color: #111827; letter-spacing: -0.03em;">
                ${safeHeading}
              </h1>

              <!-- Greeting -->
              <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #111827; font-weight: 600;">
                ${safeGreeting}
              </p>

              <!-- Body Paragraphs -->
              ${paragraphsHtml}

              <!-- Signature Orange Pill CTA Button (#F26522) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0 30px 0;">
                <tr>
                  <td align="center" bgcolor="#F26522" style="border-radius: 9999px; background-color: #F26522;">
                    <a href="${safeCtaUrl}" target="_blank" style="display: inline-block; padding: 10px 12px 10px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 500; color: #FFFFFF; text-decoration: none; border-radius: 9999px;">
                      <span style="vertical-align: middle; margin-right: 12px;">${safeCtaLabel}</span>
                      <span style="display: inline-block; width: 26px; height: 26px; line-height: 26px; text-align: center; background-color: #FFFFFF; color: #F26522; border-radius: 9999px; font-weight: 700; vertical-align: middle;">&rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #6B7280;">
                ${safeExpiration} Or copy and paste this direct link into your browser:
              </p>

              <!-- Rounded Light Gray Link Box (#F5F5F5) -->
              <div style="padding: 14px 16px; background-color: #F5F5F5; border: 1px solid #E5E7EB; border-radius: 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.5; color: #111827; word-break: break-all;">
                <a href="${safeCtaUrl}" style="color: #111827; text-decoration: underline;">${safeCtaUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Bottom Studio Card Footer -->
          <tr>
            <td style="padding: 24px 40px 28px 40px; background-color: #F5F5F5; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.55; color: #6B7280;">
                ${safeSecurity}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 500; color: #9CA3AF;">
                      Derivo Docs &bull; Evidence-first repository intelligence
                    </span>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 2px 8px; background-color: #111827; color: #FFFFFF; border-radius: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600;">
                      Verified
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailDispatchResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (
    !apiKey ||
    apiKey === "re_your_resend_api_key" ||
    process.env.NODE_ENV === "test"
  ) {
    return {
      sent: false,
      provider: "local-preview",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getSenderAddress(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      return {
        sent: false,
        provider: "resend",
        error: `Resend API HTTP ${response.status}${errBody ? `: ${errBody.slice(0, 180)}` : ""}`,
      };
    }

    const data = (await response.json()) as { id?: string };
    return {
      sent: true,
      provider: "resend",
      messageId: data.id,
    };
  } catch (err) {
    return {
      sent: false,
      provider: "resend",
      error: err instanceof Error ? err.message : "Email dispatch failed",
    };
  }
}

export async function sendVerificationEmail(params: {
  toEmail: string;
  fullName: string;
  verificationToken: string;
  originUrl?: string;
}): Promise<EmailDispatchResult> {
  const baseUrl = getAppBaseUrl(params.originUrl);
  const verifyLink = `${baseUrl}/verify-email?token=${encodeURIComponent(
    params.verificationToken
  )}`;

  const html = buildClaudeStyleEditorialEmailHtml({
    preheader:
      "Verify your email address to start documenting public GitHub repositories in Derivo Docs.",
    eyebrow: "Email Verification",
    heading: "Verify your email to unlock workspace analysis.",
    greetingName: params.fullName,
    badgeNumber: "1",
    bodyParagraphs: [
      "Welcome to Derivo Docs. Confirm your email address below to activate your studio workspace and start analyzing public GitHub repositories.",
      "Once verified, you can generate 18-section architectural documentation previews, answer targeted code clarifications, and export clean Markdown.",
    ],
    ctaLabel: "Verify email address",
    ctaUrl: verifyLink,
    expirationNote: "This verification link is active for 24 hours.",
    securityNote:
      "If you did not create a Derivo Docs account with this address, you can safely disregard this message.",
  });

  const text = [
    `Verify your email address — Derivo Docs`,
    "",
    `Hi ${params.fullName},`,
    "",
    "Welcome to Derivo Docs. Please verify your email address by opening the link below:",
    "",
    verifyLink,
    "",
    "This verification link is valid for 24 hours.",
    "If you did not create a Derivo Docs account, you can safely disregard this message.",
  ].join("\n");

  return sendResendEmail({
    to: params.toEmail,
    subject: "Verify your email address — Derivo Docs",
    html,
    text,
  });
}

export async function sendPasswordResetEmail(params: {
  toEmail: string;
  resetToken: string;
  originUrl?: string;
}): Promise<EmailDispatchResult> {
  const baseUrl = getAppBaseUrl(params.originUrl);
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(
    params.resetToken
  )}`;

  const html = buildClaudeStyleEditorialEmailHtml({
    preheader: "Reset your Derivo Docs account password.",
    eyebrow: "Password Recovery",
    heading: "Reset your Derivo Docs password.",
    badgeNumber: "2",
    bodyParagraphs: [
      "We received a request to reset the password for the Derivo Docs workspace associated with this email address.",
      "Click the button below to set a new password. All of your analyzed repositories, saved clarifications, and Markdown exports remain untouched.",
    ],
    ctaLabel: "Set a new password",
    ctaUrl: resetLink,
    expirationNote: "This password reset link expires in 60 minutes.",
    securityNote:
      "If you did not request a password reset, no changes have been made to your account and you can safely ignore this email.",
  });

  const text = [
    "Reset your Derivo Docs password",
    "",
    "We received a request to reset the password for your Derivo Docs account.",
    "Open the link below within 60 minutes to choose a new password:",
    "",
    resetLink,
    "",
    "If you did not request a password reset, you can safely ignore this email.",
  ].join("\n");

  return sendResendEmail({
    to: params.toEmail,
    subject: "Reset your Derivo Docs password",
    html,
    text,
  });
}
