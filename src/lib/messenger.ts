/**
 * Facebook Messenger Send API Integration
 * 
 * To activate this:
 * 1. Go to developers.facebook.com and create a Messenger app.
 * 2. Generate a Page Access Token for your Cindyrella page.
 * 3. Add it to your .env file:
 *    MESSENGER_PAGE_TOKEN="your_page_token_here"
 */

export async function sendMessengerMessage(recipientId: string, message: string) {
  const token = process.env.MESSENGER_PAGE_TOKEN;

  if (!token) {
    console.warn("Messenger API credentials missing. Skipping Messenger notification.");
    return false;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/me/messages?access_token=${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: {
          id: recipientId
        },
        message: {
          text: message
        },
        messaging_type: "MESSAGE_TAG",
        tag: "CONFIRMED_EVENT_UPDATE"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Messenger API Error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Messenger message:", error);
    return false;
  }
}
