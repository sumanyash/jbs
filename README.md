# Yash Job Match Portal

Apify-powered job search dashboard tailored to Yash Suman's AI voice, telecom, SIP, VoIP and infrastructure resume.

## Run

```bash
cp .env.example .env
# edit .env and add APIFY_API_KEY + APIFY_TASK_ID
node server.js
```

Open:

```text
http://localhost:4173
```

## What It Does

- Runs an Apify actor, Apify task, or reads an existing Apify dataset.
- Reads Apify key and default search configuration from server `.env`.
- Provides one-click Auto match using the server-side Apify setup.
- Normalizes mixed job-result formats into one dashboard.
- Scores jobs against Yash's resume keywords and target companies.
- Boosts AI voice, SIP, VoIP, Asterisk, CPaaS, Linux, cloud, and founding engineer roles.
- Saves shortlisted jobs in browser storage.
- Exports ranked results as CSV.

## Apify Setup

Recommended first path:

1. Create an Apify job scraper task for LinkedIn, Naukri, Indeed, Wellfound, or your preferred actor.
2. Paste your Apify API key into the portal.
3. Paste the task ID, for example `username~my-linkedin-job-task`.
4. Run search.

For custom actors, use Actor mode and edit the JSON input. Different actors expect different input shapes, so keep the actor's Apify input schema open while filling this.

## Security

Production mode should use `.env`:

```text
APIFY_API_KEY=...
APIFY_TASK_ID=...
DEFAULT_APIFY_MODE=task
```

The real `.env` file must stay only on the server and should never be committed to GitHub.
