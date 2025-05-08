import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// --- Configuration ---
const EMAIL_NAME = "Weekly Contact Test";
const EMAIL_ADDRESS = "weekly@iq42.de";

// --- Environment Variables ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const RESEND_FUNCTION_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/resend` : "";
const VERIFY_TEST_KEY = Deno.env.get("VERIFY_TEST_KEY");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// --- Gemini Configuration ---
const GEMINI_MODEL_NAME = "gemini-2.0-flash";

const PROMPT_TEXT = `Generiere eine lustige Nachricht zum wöchentlichen Test meines Kontaktformulars. Die Nachricht soll entweder einen Witz oder einen Fakt aus dem Bereich Physik, Chemie, Astronomie oder Computer enthalten. Bringe auf jeden Fall einige Emoji mit rein.
Gebe nur die Nachricht aus, keine sonstige Formatierung oder zusätzliche Anmerkungen. Verwende keine Markdown-Formatierung. Verwende keine HTML-Tags. Verwende Zeilenumbrüche in der Nachricht.`;

const handler = async (_request: Request): Promise<Response> => {
    // Check for required environment variables
    if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY environment variable.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
    if (!SUPABASE_URL || !RESEND_FUNCTION_URL) {
        return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL environment variable (needed for resend function URL).' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
    if (!VERIFY_TEST_KEY) {
        return new Response(JSON.stringify({ error: 'Missing VERIFY_TEST_KEY environment variable.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        return new Response(JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable.' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }

    let generatedMessage = "";

    try {
        // 1. Generate text using Gemini API
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
        
        const geminiPayload = {
            contents: [
                { role: "user", parts: [{ text: PROMPT_TEXT }] } 
            ],
            generationConfig: {
                response_mime_type: "text/plain",
            }
        };

        const geminiRes = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload),
        });

        if (!geminiRes.ok) {
            const errorBody = await geminiRes.text();
            console.error("Gemini API Error response:", errorBody);
            throw new Error(`Gemini API request failed: ${geminiRes.status} ${geminiRes.statusText}. Body: ${errorBody}`);
        }

        const geminiData = await geminiRes.json();

        if (geminiData.candidates && geminiData.candidates.length > 0 &&
            geminiData.candidates[0].content && geminiData.candidates[0].content.parts &&
            geminiData.candidates[0].content.parts.length > 0 && geminiData.candidates[0].content.parts[0].text) {
            generatedMessage = geminiData.candidates[0].content.parts[0].text.trim();
        } else {
            console.error("Unexpected Gemini API response structure:", JSON.stringify(geminiData, null, 2));
            throw new Error('Failed to parse generated message from Gemini API response.');
        }

        if (!generatedMessage) {
             throw new Error('Gemini API returned an empty message.');
        }

        // 2. Prepare payload for the resend function
        const resendPayload = {
            verify: VERIFY_TEST_KEY,
            name: EMAIL_NAME,
            email: EMAIL_ADDRESS,
            message: generatedMessage,
        };

        // 3. Call the resend function
        const res = await fetch(RESEND_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify(resendPayload)
        });

        if (!res.ok) {
            const errorBody = await res.text();
            console.error("Resend function call error response:", errorBody);
            throw new Error(`Calling resend function failed: ${res.status} ${res.statusText}. Body: ${errorBody}`);
        }
        
        const resendData = await res.json();

        return new Response(JSON.stringify({ 
            success: true, 
            source: "weekly-contact-test",
            geminiMessage: generatedMessage, 
            resendResponse: resendData 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error in weekly-contact-test function:", error);
        return new Response(JSON.stringify({ error: (error as Error).message, source: "weekly-contact-test" }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

serve(handler); 