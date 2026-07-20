# Biashara Compliance Assistant

A small MVP that turns a county and business type into a practical compliance checklist.

## What this first version does

- Lets the user select a county.
- Lets the user select a business type.
- Generates likely licences, documents and review notes.
- Marks every unverified requirement clearly.
- Avoids showing legal fees until an official source is confirmed.

## Run the backend locally

```bash
cd backend
py -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
py app.py
```

Test the backend at:

```text
http://127.0.0.1:5000/health
```

## Run the frontend locally

Open a second Git Bash window:

```bash
cd frontend
py -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500
```

## Before deployment

Replace this placeholder in `frontend/script.js`:

```javascript
"https://YOUR-BACKEND-NAME.onrender.com";
```

with the real Render backend URL.

## Next stages

1. Add all 47 counties.
2. Add official source links and last-verified dates.
3. Add verified county fee schedules.
4. Add user accounts and saved business profiles.
5. Add renewal dates and in-app reminders.
6. Add email, SMS or WhatsApp only after the free MVP is stable.
