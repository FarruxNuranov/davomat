import "dotenv/config";
import { Telegraf } from "telegraf";
import { api } from "./api.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error(
    "BOT_TOKEN не задан. Скопируйте .env.example в .env и укажите токен от @BotFather."
  );
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start((ctx) =>
  ctx.reply(
    `Привет, ${ctx.from.first_name || "коллега"}! 👋\n` +
      "Это бот системы давомата.\n\n" +
      "Команды:\n/help — справка\n/ping — проверка связи\n/health — проверка API"
  )
);

bot.help((ctx) =>
  ctx.reply(
    "Доступные команды:\n" +
      "/start — начало\n" +
      "/ping — проверка бота\n" +
      "/health — проверка связи с API давомата\n\n" +
      "Остальная логика — в разработке."
  )
);

bot.command("ping", (ctx) => ctx.reply("pong 🏓"));

// Заготовка обращения к API давомата.
bot.command("health", async (ctx) => {
  try {
    await api.get("/settings/work-schedule");
    await ctx.reply("API отвечает ✅ (потребуется авторизация для данных).");
  } catch (err) {
    const code = err.response?.status;
    // 401 = API живой, но нужна авторизация — это ок для проверки связи.
    await ctx.reply(code === 401 ? "API доступен ✅ (нужна авторизация)." : "API недоступен ❌");
  }
});

bot.on("text", (ctx) => ctx.reply("Не понял команду. Наберите /help"));

bot.catch((err) => console.error("Ошибка бота:", err));

bot.launch();
console.log("🤖 Davomat bot запущен (long polling)");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
