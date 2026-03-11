import nodemailer from 'nodemailer';
import path from 'path';

export async function sendApprovalEmail(toEmail: string, role: string, baseUrl?: string) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not found in environment variables. Email will not be sent, but simulating success.');
        console.log(`[Email Simulation] To: ${toEmail} | Tu cuenta ha sido aprobada con el rol: ${role}`);
        return { success: true };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass, // Use an App Password, not the main account password
            },
        });

        const mailOptions = {
            from: `"Admin SIVCA" <${user}>`,
            to: toEmail,
            subject: '¡Tu cuenta SIVCA ha sido aprobada!',
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 12px; border: 1px solid #eaeaea; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <img src="cid:sivcalogo" alt="SIVCA Logo" style="width: 120px; height: auto;">
                    </div>
                    
                    <h1 style="color: #111827; font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 16px; margin-top: 0;">¡Tu acceso ha sido aprobado!</h1>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
                        Nos complace informarte que tu solicitud de acceso al sistema de <strong>SIVCA</strong> ha sido revisada y aprobada.
                    </p>

                    <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
                        <span style="color: #6b7280; font-size: 13px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Rol Asignado</span>
                        <div style="margin-top: 6px; font-size: 18px; font-weight: 700; color: #111827;">
                            ${role.toUpperCase()}
                        </div>
                    </div>
                    
                    <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 30px; text-align: center;">
                        Ya puedes ingresar al panel administrativo utilizando el formato de autenticación que empleaste en tu registro inicial.
                    </p>

                    <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://admin-five-eta-52.vercel.app'}/login" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.02em;">Ingresar al Panel</a>
                    </div>

                    <hr style="border: none; border-top: 1px solid #eaeaea; margin-bottom: 20px;">
                    
                    <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; text-align: center; margin: 0;">
                        Este es un mensaje automático generado por el SIVCA Auth Service.<br>
                        Si crees que esto es un error o el correo no pertenece a ti, puedes ignorarlo.
                    </p>
                </div>
            `,
            attachments: [
                {
                    filename: 'logo_sivca.png',
                    path: path.join(process.cwd(), 'public', 'logo_sivca.png'),
                    cid: 'sivcalogo' // Identificador interno en el correo
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);

        return { success: true, data: info };
    } catch (err) {
        console.error('Unexpected error sending email with Gmail/Nodemailer:', err);
        return { success: false, error: err };
    }
}

export async function sendInspectionNotification(requestId: string, inspectorName: string, inspectorSurname: string, toEmail: string, baseUrl?: string) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
        console.warn('GMAIL_USER or GMAIL_APP_PASSWORD not found in environment variables. Notification email will not be sent.');
        return { success: true };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass,
            },
        });

        const mailOptions = {
            from: `"SIVCA Notificaciones" <${user}>`,
            to: toEmail,
            subject: '🔔 Nueva Inspección Recibida - SIVCA',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb; text-align: center;">Nueva Inspección de Fachada</h2>
                    <p>Se ha recibido un nuevo reporte de inspección en el sistema.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>ID de Solicitud:</strong> ${requestId}</p>
                        <p><strong>Inspector:</strong> ${inspectorName} ${inspectorSurname}</p>
                        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://admin-five-eta-52.vercel.app'}/admin/billing/fachada/${requestId}" 
                           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                           Ver Detalles en el Panel
                        </a>
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, data: info };
    } catch (err) {
        console.error('Error sending inspection notification:', err);
        return { success: false, error: err };
    }
}

