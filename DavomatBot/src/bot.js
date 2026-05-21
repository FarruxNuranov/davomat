import "dotenv/config";
import { Telegraf } from "telegraf";
import { authedGet } from "./api.js";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error(
    "BOT_TOKEN не задан. Скопируйте .env.example в .env и укажите токен от @BotFather."
  );
  process.exit(1);
}

const bot = new Telegraf(token);

// ===== Хелперы =====
const LABELS = {
  OnTime: "✅ Вовремя",
  Late: "🟠 Опоздал",
  Excused: "🔵 Отпросился",
  Absent: "🔴 Отсутствовал",
  LeftEarly: "🟣 Ушёл раньше",
  DayOff: "⚪ Выходной",
  Worked: "🟢 Отработано",
  ToWork: "🟡 Должен отработать",
};
const ORDER = Object.keys(LABELS);

const pad = (n) => String(n).padStart(2, "0");
const today = () => {
  const d = new Date();
  return { iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, human: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` };
};
const monthRange = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  return {
    from: `${y}-${pad(m + 1)}-01`,
    to: `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`,
    label: `${pad(m + 1)}.${y}`,
  };
};
const fullName = (e) => `${e.lastName} ${e.firstName}`.trim();
const time = (t) => (t ? t.slice(0, 5) : "");

// ===== Команды =====
bot.start((ctx) =>
  ctx.reply(
    `Привет, ${ctx.from.first_name || "коллега"}! 👋\n` +
      "Бот системы давомата.\n\n" +
      "Команды:\n/today — давомат за сегодня\n/late — кто опоздал сегодня\n/month — итоги за месяц\n/help — справка"
  )
);

bot.help((ctx) =>
  ctx.reply(
    "Команды:\n" +
      "/today — давомат за сегодня (итог + опоздавшие/отсутствующие)\n" +
      "/late — список опоздавших сегодня\n" +
      "/month — итоги за текущий месяц + топ опаздывающих\n" +
      "/ping — проверка бота"
  )
);

bot.command("ping", (ctx) => ctx.reply("pong 🏓"));

bot.command("today", async (ctx) => {
  try {
    const t = today();
    const { data: rows } = await authedGet("/attendance", { date: t.iso });

    const counts = {};
    let notMarked = 0;
    for (const r of rows) {
      if (r.status) counts[r.status] = (counts[r.status] || 0) + 1;
      else notMarked++;
    }
    const summary = ORDER.filter((k) => counts[k]).map((k) => `${LABELS[k]}: ${counts[k]}`);
    if (notMarked) summary.push(`⬜ Не отмечен: ${notMarked}`);

    let txt = `📋 Давомат — ${t.human}\n\n` + (summary.length ? summary.join("\n") : "Сотрудников нет.");

    const late = rows.filter((r) => r.status === "Late");
    if (late.length) {
      txt += "\n\n🟠 Опоздали:\n" + late.map((r) => `• ${fullName(r)}${r.arrivalTime ? ` (${time(r.arrivalTime)})` : ""}`).join("\n");
    }
    const absent = rows.filter((r) => r.status === "Absent");
    if (absent.length) {
      txt += "\n\n🔴 Отсутствуют:\n" + absent.map((r) => `• ${fullName(r)}`).join("\n");
    }
    await ctx.reply(txt);
  } catch (err) {
    await ctx.reply("Не удалось получить данные: " + (err.response?.data?.message || err.message));
  }
});

bot.command("late", async (ctx) => {
  try {
    const t = today();
    const { data: rows } = await authedGet("/attendance", { date: t.iso });
    const late = rows.filter((r) => r.status === "Late");
    if (!late.length) {
      await ctx.reply(`🟠 Опоздавших сегодня нет (${t.human}).`);
      return;
    }
    await ctx.reply(
      `🟠 Опоздали сегодня (${t.human}):\n` +
        late.map((r) => `• ${fullName(r)}${r.arrivalTime ? ` — ${time(r.arrivalTime)}` : ""}`).join("\n")
    );
  } catch (err) {
    await ctx.reply("Не удалось получить данные: " + (err.response?.data?.message || err.message));
  }
});

bot.command("month", async (ctx) => {
  try {
    const { from, to, label } = monthRange();
    const [recordsRes, empRes] = await Promise.all([
      authedGet("/attendance/range", { from, to }),
      authedGet("/employees"),
    ]);
    const records = recordsRes.data;
    const employees = empRes.data;
    const nameById = Object.fromEntries(employees.map((e) => [e.id, fullName(e)]));

    const counts = {};
    const lateByEmp = {};
    for (const r of records) {
      if (r.status) counts[r.status] = (counts[r.status] || 0) + 1;
      if (r.status === "Late") lateByEmp[r.employeeId] = (lateByEmp[r.employeeId] || 0) + 1;
    }
    const summary = ORDER.filter((k) => counts[k]).map((k) => `${LABELS[k]}: ${counts[k]}`);

    let txt = `📊 Итоги за ${label}\n\n` + (summary.length ? summary.join("\n") : "Отметок нет.");

    const top = Object.entries(lateByEmp).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length) {
      txt += "\n\n🏆 Чаще всех опаздывали:\n" + top.map(([id, n], i) => `${i + 1}. ${nameById[id] || "#" + id} — ${n}`).join("\n");
    }
    await ctx.reply(txt);
  } catch (err) {
    await ctx.reply("Не удалось получить данные: " + (err.response?.data?.message || err.message));
  }
});

bot.command("health", async (ctx) => {
  try {
    await authedGet("/settings/work-schedule");
    await ctx.reply("API отвечает ✅");
  } catch {
    await ctx.reply("API недоступен ❌");
  }
});

bot.on("text", (ctx) => ctx.reply("Не понял команду. Наберите /help"));

bot.catch((err) => console.error("Ошибка бота:", err));

bot.launch();
console.log("🤖 Davomat bot запущен (long polling)");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
