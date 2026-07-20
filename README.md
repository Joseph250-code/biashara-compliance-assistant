# Biashara Compliance Assistant

Biashara Compliance Assistant is an independent web platform that helps Kenyan business owners prepare for common registration, licensing and compliance requirements.

The user selects a county, enters or chooses a business activity, and receives a practical checklist of likely licences, supporting documents, renewal considerations and verification notes.

## Live Website

[Open Biashara Compliance Assistant](https://biashara-compliance-assistant.onrender.com)

Backend API:

[View API health status](https://biashara-compliance-assistant-api.onrender.com/health)

## What the Platform Does

The application helps users:

* Select from Kenya’s 47 counties.
* Choose a suggested business category.
* Type a business activity manually when it is not listed.
* Generate a checklist based on the selected county and business type.
* View likely permits, registrations and supporting documents.
* See whether a requirement is national, county-wide or business-specific.
* Review renewal and fee guidance.
* Open available official-source links.
* Print a prepared compliance checklist.
* Clearly identify information that still requires official verification.

The application does not require a user account for the initial checklist.

## How It Works

### 1. Enter the business details

The user provides:

* An optional business name.
* The county where the business operates.
* The type of business or commercial activity.

The business-type field supports both suggested categories and manually typed activities.

### 2. Match the applicable requirements

The backend checks the compliance database and identifies:

* General requirements that apply to businesses across Kenya.
* County-wide requirements.
* Requirements associated with a known business type.
* Requirements associated with a particular business type in a particular county.

When a user enters a business type that is not yet in the database, the application returns the available general national and county requirements. It also advises the user to confirm any sector-specific obligations separately.

### 3. Generate the checklist

The application presents a structured checklist containing:

* Requirement title.
* Category.
* Description.
* Documents to prepare.
* Renewal guidance.
* Fee guidance.
* Area of application.
* Verification status.
* Official-source link, where available.
* Date the information was last checked, where available.

## Popular Business Categories

The current database includes suggested categories such as:

* Retail shops.
* Restaurants and food businesses.
* Salons and beauty businesses.
* Bars and alcoholic-drink businesses.
* Workshops.
* Landlords and property businesses.
* Professional-service businesses.

Users are not limited to these categories and may enter another business activity manually.

## Important Disclaimer

Biashara Compliance Assistant is an independent information platform.

It is not affiliated with KRA, any county government, the national government or another regulatory authority.

Licensing requirements, application forms, fees, renewal periods and official procedures may change. Users should confirm the current position directly with the responsible authority before submitting an application or making a payment.

The platform is intended to support preparation and organisation. It does not provide legal, tax or regulatory advice.

## Technology Used

### Frontend

* HTML5.
* CSS3.
* Vanilla JavaScript.
* Responsive desktop and mobile layout.
* Searchable business-type suggestions.
* Scroll and interface animations.
* Printable checklist output.

### Backend

* Python.
* Flask.
* Gunicorn.
* REST API endpoints.
* CORS support for the deployed frontend.

### Database

* Supabase.
* PostgreSQL.
* Supabase Data REST API.

### Hosting

* Render Web Service for the backend.
* Render Static Site for the frontend.

## Project Structure

```text
biashara-compliance-assistant/
├── backend/
│   ├── app.py
│   ├── database.py
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── .gitignore
└── README.md
```

## API Endpoints

### Health check

```text
GET /health
```

Example:

```text
https://biashara-compliance-assistant-api.onrender.com/health
```

### Available counties and business types

```text
GET /api/options
```

Example:

```text
https://biashara-compliance-assistant-api.onrender.com/api/options
```

### Generate a compliance checklist

```text
POST /api/checklist
```

Example request:

```json
{
  "business_name": "Central Hardware",
  "county": "Nairobi",
  "business_type": "shop"
}
```

A manually entered activity can also be submitted:

```json
{
  "business_name": "Bright Future Academy",
  "county": "Kiambu",
  "business_type": "Private school"
}
```

## Run the Backend Locally

Open Git Bash in the project directory:

```bash
cd biashara-compliance-assistant/backend
```

Create a virtual environment:

```bash
py -m venv venv
```

Activate it:

```bash
source venv/Scripts/activate
```

Install the required packages:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder:

```env
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_PRIVATE_SECRET_KEY
ALLOWED_ORIGIN=http://127.0.0.1:5500
```

Start the Flask application:

```bash
py app.py
```

Test it at:

```text
http://127.0.0.1:5000/health
```

## Run the Frontend Locally

Open a second Git Bash window:

```bash
cd biashara-compliance-assistant/frontend
```

Start a local static server:

```bash
py -m http.server 5500
```

Open:

```text
http://127.0.0.1:5500
```

When running locally, the frontend connects to:

```text
http://127.0.0.1:5000
```

When deployed, it connects to:

```text
https://biashara-compliance-assistant-api.onrender.com
```

## Environment Variables

The backend requires:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
ALLOWED_ORIGIN
```

The Supabase secret key must only be stored in the backend environment.

It must never be:

* Added to `frontend/script.js`.
* Committed to GitHub.
* Included in the README.
* Exposed through browser developer tools.
* Stored in a public Render Static Site environment.

The `.env` file should remain listed in `.gitignore`.

## Deployment

### Backend

The backend is deployed as a Render Web Service using:

```text
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120
Health Check Path: /health
```

### Frontend

The frontend is deployed as a Render Static Site using:

```text
Root Directory: frontend
Build Command: echo "No build required"
Publish Directory: .
```

Both services automatically redeploy when changes are pushed to the connected GitHub branch.

## Data and Privacy

The current checklist form does not require an account.

The frontend does not intentionally store the business details entered into the checklist form. Information is submitted to the backend only for the purpose of generating the requested checklist.

Future versions involving saved profiles or reminders will require a separate privacy and account-management framework.

## Planned Improvements

Future development may include:

1. More business categories and sector-specific requirements.
2. Verified county fee schedules.
3. Additional official-source links.
4. Clearer application steps for each requirement.
5. User accounts and saved business profiles.
6. Renewal dates and deadline reminders.
7. Downloadable PDF checklists.
8. Email, SMS or WhatsApp reminders.
9. Multilingual guidance.
10. Administrative tools for reviewing and updating compliance records.

## Current Status

The project is an active MVP.

It currently provides preliminary compliance guidance and a structured checklist. The accuracy and usefulness of the platform will improve as more official county and sector-specific information is added and verified.
