// Client-safe email constants — no nodemailer imports

export const SMTP_PRESETS: Record<string, { host: string; port: number; note: string }> = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    note: 'Use an App Password (not your regular password). Enable 2FA first at myaccount.google.com',
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    note: 'Use your Outlook/Hotmail password',
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 587,
    note: 'Generate an App Password in Yahoo account settings',
  },
  zoho: {
    host: 'smtp.zoho.com',
    port: 465,
    note: 'Use your Zoho email password',
  },
  custom: {
    host: '',
    port: 587,
    note: 'Enter your SMTP server details',
  },
};

// Interpolate template variables — client safe
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}
