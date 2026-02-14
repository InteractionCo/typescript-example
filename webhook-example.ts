import { Poke } from "poke";

const poke = new Poke(); // uses POKE_API_KEY env var or poke login credentials

// Send a direct message to your agent
await poke.sendMessage("Remind me when the Closing Ceremony starts on Sunday");

// Create a webhook — your agent will act on incoming data
const webhook = await poke.createWebhook({
  condition: "When a teammate pushes code",
  action: "Send me a summary of what changed",
});

console.log("Webhook URL:", webhook.webhookUrl);
console.log("Webhook Token:", webhook.webhookToken);

// Fire the webhook (e.g. from a CI/CD pipeline, GitHub Action, etc.)
await poke.sendWebhook({
  webhookUrl: webhook.webhookUrl,
  webhookToken: webhook.webhookToken,
  data: {
    event: "push",
    repo: "treehacks-project",
    author: "alice",
    message: "Add real-time collaboration feature",
    files_changed: 12,
  },
});
