import "dotenv/config";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { setupBot } from "./bot/index.js";

const port = Number(process.env["PORT"] ?? 3000);

app.listen(port, () => {
  logger.info({ port }, "Server ishga tushdi");
});

const token = process.env["TELEGRAM_BOT_TOKEN"];
if (!token) {
  logger.warn("TELEGRAM_BOT_TOKEN yo'q — bot ishlamaydi");
} else {
  const bot = setupBot(token);
  bot.launch({ dropPendingUpdates: true }).then(() => {
    logger.info("Mafia Klan boti ishga tushdi!");
  }).catch((err: unknown) => {
    logger.error({ err }, "Bot ishga tushmadi");
  });

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
