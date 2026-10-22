# LocalHands

LocalHands is a local services marketplace prototype developed as a final-year software engineering project.

## Overview

The platform is designed to connect customers with independent local service providers across Cape Town.

## Features

- Browse SQL-backed worker listings, profiles, reviews and available booking slots.
- Create a customer account and sign in with an email and password.
- Submit worker applications and review them as an admin.
- Create and manage bookings, worker profiles and listings; workers can set weekly availability that generates bookable slots for the next 30 days, and accepted bookings appear on their dashboard calendar.
- Assign customer, worker and admin access from the database account role.

## Technology stack

- Frontend: React and TypeScript
- Routing: TanStack Router / TanStack Start
- Styling: Tailwind CSS
- Build tooling: Vite
- Database: Microsoft SQL Server (accounts, sessions, applications, bookings, workers and reviews)

## Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The development server's local URL will be shown in the terminal.

## Database

Run `database/LocalHandsDB.sql` in SQL Server Management Studio to create or update the schema. The script adds password/session storage, removes only the old known fictional application and booking seed rows, and seeds fictional demo worker profiles. Demo workers start with zero reviews and completed jobs; those figures are recorded only through real database workflows. Database access uses the Windows ODBC driver through `msnodesqlv8` and Windows trusted authentication.

Set these environment variables before starting the app:

- `DB_SERVER`: SQL Server host and instance, for example `localhost\SQLEXPRESS`
- `DB_DATABASE`: normally `LocalHandsDB`
- `DB_DRIVER`: installed ODBC driver name, for example `ODBC Driver 18 for SQL Server`

Verify the ODBC driver in Windows PowerShell with:

```powershell
Get-OdbcDriver -Name "*SQL Server*"
```

The database connection is required for the app. Application, booking, admin and worker changes are validated and written through server-side SQL queries; authorization is checked against the signed-in database account.

## Authentication setup

The SQL seed creates `admin.demo@localhands.example` and worker demo accounts without passwords. Set an account password once the database is ready. In PowerShell, set the account email and run the password setup command; it prompts for a password without echoing it:

```powershell
$env:LOCALHANDS_ACCOUNT_EMAIL = "admin.demo@localhands.example"
npm run auth:set-password
Remove-Item Env:LOCALHANDS_ACCOUNT_EMAIL
```

Repeat with an existing worker email (for example `thabo.demo@localhands.example`) if you want to sign in as a worker. Customers can create accounts from the sign-in screen. Worker applicants start as customers; an admin approval creates their worker profile and changes their database role. The app uses HTTP-only database-backed sessions; no default passwords are committed.

Password reset/email verification are not implemented yet. This remains a prototype and should not be exposed publicly without additional production security controls.