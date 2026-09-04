/**
 * WhatsApp Cloud API Integration
 * 
 * To activate this:
 * 1. Go to developers.facebook.com and create a WhatsApp app.
 * 2. Get your System User Access Token and Phone Number ID.
 * 3. Add them to your .env file:
 *    WHATSAPP_TOKEN="your_token_here"
 *    WHATSAPP_PHONE_ID="your_phone_id_here"
 */

export async function sendWhatsAppMessage(toPhone: string, message: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    console.warn("WhatsApp API credentials missing. Skipping WhatsApp notification.");
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone.replace(/\D/g, ''), // Ensure phone is digits only
        type: "text",
        text: {
          body: message
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("WhatsApp API Error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    return false;
  }
}
