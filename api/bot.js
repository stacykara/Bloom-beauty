// ═══════════════════════════════════════════════
const TOKEN   = "8702981635:AAFwO76YWHR4CmwLjATr0YwBHpE-1n1JqEs";
const APP_URL = "https://bloom-beauty-app.vercel.app";
const LOGO_URL = "https://raw.githubusercontent.com/stacykara/Bloom-beauty/main/logo.png";
// ═══════════════════════════════════════════════

const API = `https://api.telegram.org/bot${TOKEN}`;

const WELCOME = `🌸 *Добро пожаловать в Bloom — бьюти калькулятор!*

Вы тратите время и деньги на каждого клиента — но знаете ли Вы, сколько реально зарабатываете после всех расходов?

*Bloom считает за Вас:*
💅 Себестоимость каждой услуги
🧴 Расход и остатки материалов
🏠 Аренду рабочего места
👩‍🎨 Стоимость Вашего труда
💰 Рекомендует цену чтобы Вы всегда были в плюсе

Неважно — маникюр, брови, ресницы или косметология. Bloom подойдёт любому мастеру.

✨ *Попробуйте прямо сейчас — бесплатно!*`;

const NOTIFY_TEXT = `📬 *Хотите получать ежедневное напоминание?*

Каждый вечер Bloom будет напоминать внести услуги дня — чтобы статистика всегда была актуальной.`;

const openAppBtn = () => ({
  inline_keyboard: [[
    { text: "Открыть Bloom 🌸", web_app: { url: APP_URL } }
  ]]
});

const notifyKbd = () => ({
  inline_keyboard: [
    [{ text: "✅ Да, хочу напоминания", callback_data: "notify_yes" }],
    [{ text: "Нет, спасибо",            callback_data: "notify_no"  }]
  ]
});

const timeKbd = () => ({
  inline_keyboard: [
    [
      { text: "18:00", callback_data: "time_18" },
      { text: "19:00", callback_data: "time_19" },
      { text: "20:00", callback_data: "time_20" }
    ],
    [
      { text: "21:00", callback_data: "time_21" },
      { text: "22:00", callback_data: "time_22" }
    ]
  ]
});

async function apiCall(method, data) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function handle(update) {
  if (update.message) {
    const chatId = update.message.chat.id;
    const text   = update.message.text || "";

    if (text === "/start") {
      await apiCall("sendPhoto", {
        chat_id:      chatId,
        photo:        LOGO_URL,
        caption:      WELCOME,
        parse_mode:   "Markdown",
        reply_markup: openAppBtn()
      });
      await apiCall("sendMessage", {
        chat_id:      chatId,
        text:         NOTIFY_TEXT,
        parse_mode:   "Markdown",
        reply_markup: notifyKbd()
      });

    } else if (text === "/app") {
      await apiCall("sendMessage", {
        chat_id:      chatId,
        text:         "Открывайте Bloom 👇",
        reply_markup: openAppBtn()
      });

    } else {
      await apiCall("sendMessage", {
        chat_id:      chatId,
        text:         "Нажмите кнопку ниже чтобы открыть Bloom 🌸",
        reply_markup: openAppBtn()
      });
    }

  } else if (update.callback_query) {
    const cb     = update.callback_query;
    const chatId = cb.message.chat.id;
    const data   = cb.data;

    if (data === "notify_yes") {
      await apiCall("sendMessage", {
        chat_id:      chatId,
        text:         "🕐 *В какое время удобно получать напоминание?*",
        parse_mode:   "Markdown",
        reply_markup: timeKbd()
      });

    } else if (data === "notify_no") {
      await apiCall("sendMessage", {
        chat_id:      chatId,
        text:         "Хорошо! Открывайте Bloom когда удобно 🌸",
        reply_markup: openAppBtn()
      });

    } else if (data.startsWith("time_")) {
      const hour = data.split("_")[1];
      await apiCall("sendMessage", {
        chat_id:      chatId,
        text:         `✅ Отлично! Буду напоминать каждый день в ${hour}:00 🌸\n\nА пока — открывайте Bloom и добавляйте свои материалы!`,
        reply_markup: openAppBtn()
      });
    }

    await apiCall("answerCallbackQuery", { callback_query_id: cb.id });
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).send("Bloom bot is running! 🌸");
  }
  if (req.method === "POST") {
    try {
      await handle(req.body);
    } catch (e) {
      console.error(e);
    }
    return res.status(200).send("ok");
  }
  res.status(405).send("Method not allowed");
}
