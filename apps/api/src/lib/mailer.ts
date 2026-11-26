import nodemailer from 'nodemailer';

export type Mail = { to: string; subject: string; text: string; html: string };

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export class SmtpMailer implements Mailer {
  private readonly transport;

  constructor(
    host: string,
    port: number,
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport({ host, port, secure: false });
  }

  async send(mail: Mail): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...mail });
  }
}

/** Para pruebas: guarda los correos en memoria. */
export class MemoryMailer implements Mailer {
  readonly sent: Mail[] = [];
  async send(mail: Mail): Promise<void> {
    this.sent.push(mail);
  }
  last(to?: string): Mail | undefined {
    return [...this.sent].reverse().find((m) => !to || m.to === to);
  }
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function layout(title: string, body: string, link?: { url: string; label: string }) {
  const button = link
    ? `<p><a href="${escapeHtml(link.url)}" style="background:#f59e0b;color:#0f172a;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(link.label)}</a></p><p style="font-size:12px;color:#64748b">Si el botón no funciona, copia este enlace: ${escapeHtml(link.url)}</p>`
    : '';
  return `<div style="font-family:system-ui,sans-serif;max-width:480px"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p>${button}<p style="font-size:12px;color:#64748b">Bóveda TCG</p></div>`;
}

export const mailTemplates = {
  verifyEmail(name: string, url: string): Omit<Mail, 'to'> {
    const body = `Hola ${name}, confirma tu correo para activar tu cuenta. El enlace vence en 24 horas.`;
    return {
      subject: 'Confirma tu correo en Bóveda TCG',
      text: `${body}\n\n${url}`,
      html: layout('Confirma tu correo', body, { url, label: 'Confirmar correo' }),
    };
  },
  resetPassword(name: string, url: string): Omit<Mail, 'to'> {
    const body = `Hola ${name}, recibimos una solicitud para restablecer tu contraseña. El enlace vence en 30 minutos. Si no fuiste tú, ignora este correo.`;
    return {
      subject: 'Restablece tu contraseña de Bóveda TCG',
      text: `${body}\n\n${url}`,
      html: layout('Restablecer contraseña', body, { url, label: 'Elegir nueva contraseña' }),
    };
  },
  passwordChanged(name: string): Omit<Mail, 'to'> {
    const body = `Hola ${name}, tu contraseña se cambió y cerramos todas tus sesiones. Si no fuiste tú, restablécela de inmediato.`;
    return { subject: 'Tu contraseña cambió', text: body, html: layout('Contraseña actualizada', body) };
  },
  sessionReuse(name: string): Omit<Mail, 'to'> {
    const body = `Hola ${name}, detectamos el uso de un token de sesión antiguo, posible robo de sesión. Por seguridad cerramos todas tus sesiones. Vuelve a entrar y considera cambiar tu contraseña.`;
    return { subject: 'Cerramos tus sesiones por seguridad', text: body, html: layout('Alerta de seguridad', body) };
  },
};
