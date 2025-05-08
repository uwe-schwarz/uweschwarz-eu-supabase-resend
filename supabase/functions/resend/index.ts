import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts'

const handler = async (request: Request): Promise<Response> => {
    // CORS
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    let body;
    try {
        body = await request.json();
    } catch (_e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const { name, email, message, verify } = body;

    // verify via Cloudflare Turnstile
    const verifyTestKey = Deno.env.get('VERIFY_TEST_KEY');
    if (!(verifyTestKey && verify === verifyTestKey)) {
        if (verify) {
            const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: Deno.env.get('TURNSTILE_SECRET_KEY'), response: verify }),
            });
            const data = await res.json();
            if (!data.success) {
                return new Response(JSON.stringify({ error: 'Invalid captcha' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        } else {
            return new Response(JSON.stringify({ error: 'Missing captcha' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    }

    if (!name || !email || !message) {
        return new Response(JSON.stringify({ error: 'Missing fields.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
  <head>
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
  </head>
  <body style="padding-top:40px;padding-bottom:40px;background-color:hsl(225, 25%, 12%)">
    <!--$-->
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">
      New contact form submission
      <div>
        <!-- Preview Text -->
      </div>
    </div>
    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-left:auto;margin-right:auto;padding:20px;max-width:600px;border-radius:8px;background-color:hsl(225, 25%, 16%)">
      <tbody>
        <tr style="width:100%">
          <td>
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
              <tbody>
                <tr>
                  <td>
                    <h1 style="font-size:24px;font-weight:700;margin-top:24px;margin-bottom:24px;color:hsl(210, 40%, 98%)">
                      New Contact Form Submission
                    </h1>
                    <p style="font-size:16px;margin-bottom:16px;line-height:24px;color:hsl(215, 20.2%, 65.1%);margin-top:16px">
                      You have received a new message from your website contact form.
                    </p>
                    <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-radius:8px;padding:16px;margin-top:24px;margin-bottom:24px;background-color:hsl(217.2, 32.6%, 17.5%)">
                      <tbody>
                        <tr>
                          <td>
                            <p style="font-size:14px;font-weight:700;margin-bottom:4px;line-height:24px;color:hsl(153, 65%, 65%);margin-top:16px">
                              From:
                            </p>
                            <p style="font-size:16px;margin-bottom:16px;line-height:24px;color:hsl(210, 40%, 98%);margin-top:16px">
                              <!-- EMAIL -->${email}<!-- /EMAIL -->
                            </p>
                            <p style="font-size:14px;font-weight:700;margin-bottom:4px;line-height:24px;color:hsl(153, 65%, 65%);margin-top:16px">
                              Name:
                            </p>
                            <p style="font-size:16px;margin-bottom:16px;line-height:24px;color:hsl(210, 40%, 98%);margin-top:16px">
                              <!-- NAME -->${name}<!-- /NAME -->
                            </p>
                            <p style="font-size:14px;font-weight:700;margin-bottom:4px;line-height:24px;color:hsl(153, 65%, 65%);margin-top:16px">
                              Message:
                            </p>
                            <p style="font-size:16px;line-height:24px;color:hsl(210, 40%, 98%);margin-bottom:16px;margin-top:16px">
                              <!-- MESSAGE -->${message.replace(/\n/g, '<br>')}<!-- /MESSAGE -->
                            </p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <a href="mailto:${email}" style="display:inline-block;padding:12px 20px;border-radius:4px;font-weight:bold;text-decoration:none;color:hsl(0, 0%, 30%);background:linear-gradient(to right, hsl(153, 65%, 65%), hsl(262, 61%, 74%));text-align:center;box-sizing:border-box;margin-bottom:16px;width:100%">Reply to this message</a>
                    <p style="font-size:14px;margin-top:32px;line-height:24px;color:hsl(215, 20.2%, 65.1%);margin-bottom:16px">
                      This email was sent to you because you received a submission from the contact form on your website.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
            <table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:32px;padding-top:32px;border-top-width:1px;border-top-style:solid;border-top-color:hsl(217.2, 32.6%, 17.5%)">
              <tbody>
                <tr>
                  <td>
                    <p style="font-size:12px;margin:0px;line-height:24px;color:hsl(215, 20.2%, 65.1%);margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                      © ${new Date().getFullYear()} Uwe Schwarz. All rights reserved.
                    </p>
                    <p style="font-size:12px;margin:0px;line-height:24px;color:hsl(215, 20.2%, 65.1%);margin-bottom:0px;margin-top:0px;margin-left:0px;margin-right:0px">
                      123 Main Street, City, Country
                    </p>
                    <p style="font-size:12px;margin-top:8px;line-height:24px;color:hsl(215, 20.2%, 65.1%);margin-bottom:16px">
                      <a href="#" style="color:hsl(262, 61%, 74%);text-decoration:none">Unsubscribe</a> from these alerts.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
    <!--7--><!--/$-->
  </body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`
        },
        body: JSON.stringify({
            from: 'uweschwarz-eu <uweschwarz-eu@oldman.cloud>',
            to: ['mail@uweschwarz.eu'],
            subject: 'Contact Form: uweschwarz.eu',
            html,
            reply_to: `${name} <${email}>`,
        })
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    });
};

serve(handler);