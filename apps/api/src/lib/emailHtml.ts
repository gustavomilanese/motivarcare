export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeHtmlAttr(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export type EmailCta = {
  label: string;
  href: string;
};

export type EmailDetailRow = {
  label: string;
  value: string;
  valueIsHtml?: boolean;
};

export function buildEmailDetailCard(rows: EmailDetailRow[]): string {
  const rowHtml = rows
    .map((row) => {
      const value = row.valueIsHtml ? row.value : escapeHtml(row.value);
      return `<tr>
  <td style="padding:10px 0;border-bottom:1px solid #e8edf5;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:#94a3b8;">${escapeHtml(row.label)}</p>
    <p style="margin:6px 0 0;font-size:15px;line-height:1.45;font-weight:600;color:#0f1731;">${value}</p>
  </td>
</tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e8edf5;">
<tr><td style="padding:16px 18px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
${rowHtml}
</table>
</td></tr>
</table>`;
}

export function buildEmailNoteBox(content: string, variant: "info" | "warning" = "info"): string {
  const styles =
    variant === "warning"
      ? "background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;"
      : "background:#f1f5ff;border:1px solid #dbe4ff;color:#3d4a63;";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="${styles}border-radius:12px;">
<tr><td style="padding:14px 16px;">
<p style="margin:0;font-size:14px;line-height:1.55;">${content}</p>
</td></tr>
</table>`;
}

export function buildEmailButton(cta: EmailCta, variant: "primary" | "secondary" = "primary"): string {
  const href = escapeHtmlAttr(cta.href);
  const label = escapeHtml(cta.label);
  const style =
    variant === "primary"
      ? "display:inline-block;padding:14px 32px;background-color:#5f44eb;color:#ffffff;text-decoration:none;border-radius:14px;font-size:16px;font-weight:700;box-shadow:0 8px 24px rgba(95,68,235,0.35);"
      : "display:inline-block;padding:12px 24px;background-color:#ffffff;color:#5f44eb;text-decoration:none;border-radius:14px;font-size:15px;font-weight:700;border:1px solid #d8d0ff;";

  return `<a href="${href}" style="${style}">${label}</a>`;
}

export type MotivarCareEmailLayoutParams = {
  lang?: string;
  badge?: string;
  headline: string;
  greetingName?: string;
  introParagraphs?: string[];
  bodyHtml?: string;
  primaryCta?: EmailCta;
  secondaryCta?: EmailCta;
  footnote?: string;
  fallbackLink?: string;
  maxWidth?: number;
};

export function buildMotivarCareEmailLayout(params: MotivarCareEmailLayoutParams): string {
  const lang = params.lang ?? "es";
  const maxWidth = params.maxWidth ?? 520;
  const greetingName = escapeHtml(params.greetingName?.trim() || "Hola");
  const badge = params.badge?.trim()
    ? `<p style="margin:12px 0 0;display:inline-block;padding:6px 12px;background:#f1f5ff;color:#5f44eb;border-radius:999px;font-size:12px;font-weight:700;">${escapeHtml(params.badge)}</p>`
    : "";
  const intro = (params.introParagraphs ?? [])
    .map(
      (paragraph) =>
        `<p style="margin:14px 0 0 0;font-size:16px;line-height:1.55;color:#3d4a63;">${escapeHtml(paragraph)}</p>`
    )
    .join("");
  const greeting = params.greetingName
    ? `<p style="margin:0;font-size:16px;line-height:1.55;color:#3d4a63;">Hola ${greetingName},</p>`
    : "";
  const body = params.bodyHtml ? `<div style="margin:20px 0 0 0;">${params.bodyHtml}</div>` : "";
  const primaryCta = params.primaryCta
    ? `<div style="margin:24px 0 0 0;text-align:center;">${buildEmailButton(params.primaryCta, "primary")}</div>`
    : "";
  const secondaryCta = params.secondaryCta
    ? `<div style="margin:12px 0 0 0;text-align:center;">${buildEmailButton(params.secondaryCta, "secondary")}</div>`
    : "";
  const footnote = params.footnote
    ? `<p style="margin:20px 0 0 0;font-size:13px;line-height:1.5;color:#62708a;text-align:center;">${escapeHtml(params.footnote)}</p>`
    : "";
  const fallbackLink = params.fallbackLink
    ? `<p style="margin:16px 0 0 0;font-size:12px;line-height:1.45;color:#94a3b8;word-break:break-all;text-align:center;">Si el botón no funciona, copiá este enlace en el navegador:<br><span style="color:#5f44eb;">${escapeHtml(params.fallbackLink)}</span></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${escapeHtmlAttr(lang)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef0f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef0f9;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:${maxWidth}px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 40px rgba(56,52,92,0.1);">
<tr><td style="padding:28px 28px 0 28px;text-align:center;">
<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.06em;color:#5f44eb;text-transform:uppercase;">MotivarCare</p>
${badge}
</td></tr>
<tr><td style="padding:16px 28px 8px 28px;text-align:center;">
<h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:800;color:#0f1731;">${escapeHtml(params.headline)}</h1>
</td></tr>
<tr><td style="padding:8px 28px 24px 28px;">
${greeting}
${intro}
${body}
${primaryCta}
${secondaryCta}
${footnote}
${fallbackLink}
</td></tr>
</table>
<p style="margin:20px 0 0 0;font-size:12px;color:#94a3b8;text-align:center;">© MotivarCare · Terapia online</p>
</td></tr>
</table>
</body>
</html>`;
}
