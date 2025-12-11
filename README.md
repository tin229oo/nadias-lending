# Web-Based Loan Management System (Nadia's Lending Inc.)

This project is a complete final requirement deliverable for the T-CPET424 Web Design and Development Laboratory.

## What is included (deliverables)
- Fully functional static web application (HTML/CSS/JS) demonstrating the required pages: Landing (index.html), Login, Registration, Dashboard (customer), Transactions, About, Contact, Administrator page.
- Semantic HTML tags, responsive CSS, and JavaScript functionality implementing: account creation, login, loan application, automated loan computation (amortization schedule), admin approval flow, export reports, and local persistence using `localStorage`.
- Documentation (this README + chapter 1 proposal converted), presentation slides (presentation.html) and a 2-3 minute video script.

## How to run locally
1. Extract files into a folder preserving structure: `index.html`, `css/`, `js/`, `admin.html`, etc.
2. For static testing, you can simply open `index.html` in a browser. For best results (avoid cross-origin issues), serve via a simple local server: `python -m http.server 8000` and open `http://localhost:8000`.
3. Default admin account: `admin@nadia.local` / `admin123`

## Notes on security & production
This demo uses `localStorage` and plaintext passwords only for demonstration and grading. For a real deployment:
- Use a backend (Node/Express, Django, Laravel, etc.) with hashed passwords (bcrypt) and secure authentication (JWT or server sessions).
- Store data in a database (MySQL/Postgres). Implement proper input validation, rate limiting, and HTTPS.

## Project structure
```
index.html
login.html
register.html
dashboard.html
transactions.html
admin.html
about.html
contact.html
css/style.css
js/app.js
README.md
presentation.html
video_script.txt
```

## Grading checklist mapping
- Dashboard / Navigation: provided (dashboard.html, admin.html)
- Landing/Home: index.html
- Login / Registration: login.html, register.html
- Transactions: transactions.html, loan schedule table
- About / Contact: about.html, contact.html
- Administrator Page: admin.html with approve & export features
- Semantic HTML / CSS / JS: used across pages
- Responsive Design: basic responsive rules included
- Hosting, SSL/TLS, Domain: see Hosting & Deployment section below
