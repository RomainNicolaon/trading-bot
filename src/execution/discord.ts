import { DISCORD_WEBHOOK_URL } from "../config.js";

export const sendDiscordMessage = (message: string, emoji: string) => {
  if (!DISCORD_WEBHOOK_URL) {
    console.error("ERROR: Discord webhook URL not set");
    return;
  }

  switch (emoji) {
    case "ETH":
      emoji = "<a:ETH:1436094373149282425>";
      break;
    case "BTC":
      emoji = "<a:BTC:1436094434872659988>";
      break;
    default:
      emoji = "";
      break;
  }

  const payload = {
    content: emoji + " " + message,
  };

  fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("Message sent to Discord");
    })
    .catch((error) => {
      console.error("Error sending message to Discord:", error);
    });
};
