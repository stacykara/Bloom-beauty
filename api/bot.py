from http.server import BaseHTTPRequestHandler
import json, urllib.request

# ═══════════════════════════════════════════════════
TOKEN   = "8702981635:AAFwO76YWHR4CmwLjATr0YwBHpE-1n1JqEs"
APP_URL = "https://bloom-beauty-app.vercel.app"
LOGO_URL = "https://raw.githubusercontent.com/stacykara/Bloom-beauty/main/logo.png"
# ═══════════════════════════════════════════════════

API = f"https://api.telegram.org/bot{TOKEN}"

WELCOME = """🌸 *Добро пожаловать в Bloom — бьюти калькулятор!*

Вы тратите время и деньги на каждого клиента — но знаете ли Вы, сколько реально зарабатываете после всех расходов?

*Bloom считает за Вас:*
💅 Себестоимость каждой услуги
🧴 Расход и остатки материалов
🏠 Аренду рабочего места
👩‍🎨 Стоимость Вашего труда
💰 Рекомендует цену чтобы Вы всегда были в плюсе

Неважно — маникюр, брови, ресницы или косметология. Bloom подойдёт любому мастеру.

✨ *Попробуйте прямо сейчас — бесплатно!*"""

NOTIFY_TEXT = """📬 *Хотите получать ежедневное напоминание?*

Каждый вечер Bloom будет напоминать внести услуги дня — чтобы статистика всегда была актуальной."""

REMINDER_TEXT = """🌸 *Bloom напоминает!*

Сегодня были клиенты? Внесите услуги пока всё свежо в памяти — это займёт меньше минуты.

Ваши материалы и остатки обновятся автоматически 💅"""

def api_call(method, data):
    req = urllib.request.Request(
        f"{API}/{method}",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req)
    except Exception as e:
        print(f"API error {method}:", e)

def open_app_btn():
    return {"inline_keyboard": [[
        {"text": "Открыть Bloom 🌸", "web_app": {"url": APP_URL}}
    ]]}

def notify_kbd():
    return {"inline_keyboard": [
        [{"text": "✅ Да, хочу напоминания", "callback_data": "notify_yes"}],
        [{"text": "Нет, спасибо",            "callback_data": "notify_no"}]
    ]}

def time_kbd():
    return {"inline_keyboard": [
        [{"text":"18:00","callback_data":"time_18"},{"text":"19:00","callback_data":"time_19"},{"text":"20:00","callback_data":"time_20"}],
        [{"text":"21:00","callback_data":"time_21"},{"text":"22:00","callback_data":"time_22"}]
    ]}

def handle(update):
    if "message" in update:
        msg     = update["message"]
        chat_id = msg["chat"]["id"]
        text    = msg.get("text","")

        if text == "/start":
            # Фото с логотипом + приветствие + кнопка
            api_call("sendPhoto", {
                "chat_id": chat_id,
                "photo": LOGO_URL,
                "caption": WELCOME,
                "parse_mode": "Markdown",
                "reply_markup": json.dumps(open_app_btn())
            })
            # Вопрос про уведомления
            api_call("sendMessage", {
                "chat_id": chat_id,
                "text": NOTIFY_TEXT,
                "parse_mode": "Markdown",
                "reply_markup": json.dumps(notify_kbd())
            })

        elif text == "/app":
            api_call("sendMessage", {
                "chat_id": chat_id,
                "text": "Открывайте Bloom 👇",
                "reply_markup": json.dumps(open_app_btn())
            })

        else:
            api_call("sendMessage", {
                "chat_id": chat_id,
                "text": "Нажмите кнопку ниже чтобы открыть Bloom 🌸",
                "reply_markup": json.dumps(open_app_btn())
            })

    elif "callback_query" in update:
        cb      = update["callback_query"]
        chat_id = cb["message"]["chat"]["id"]
        data    = cb["data"]

        if data == "notify_yes":
            api_call("sendMessage", {
                "chat_id": chat_id,
                "text": "🕐 *В какое время удобно получать напоминание?*",
                "parse_mode": "Markdown",
                "reply_markup": json.dumps(time_kbd())
            })
        elif data == "notify_no":
            api_call("sendMessage", {
                "chat_id": chat_id,
                "text": "Хорошо! Вы всегда можете открыть Bloom по кнопке ниже 🌸",
                "reply_markup": json.dumps(open_app_btn())
            })
        elif data.startswith("time_"):
            hour = data.split("_")[1]
            api_call("sendMessage", {
                "chat_id": chat_id,
                "text": f"✅ Отлично! Буду напоминать каждый день в {hour}:00 🌸\n\nА пока — открывайте Bloom и добавляйте свои материалы!",
                "reply_markup": json.dumps(open_app_btn())
            })

        api_call("answerCallbackQuery", {"callback_query_id": cb["id"]})

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body   = self.rfile.read(length)
        try:
            handle(json.loads(body))
        except Exception as e:
            print("Error:", e)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"Bloom bot is running! 🌸")

    def log_message(self, *args):
        pass
