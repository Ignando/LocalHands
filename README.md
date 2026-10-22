# LocalHands

LocalHands is a local services marketplace prototype developed as a final-year software engineering project.

## Overview

The platform is designed to connect customers with independent local service providers across Cape Town.

## Planned features

- Browse service categories and available workers.
- View worker profiles, descriptions, and reviews.
- Submit applications to become a service provider.
- Manage worker profiles and service requests.
- Provide administrative tools for managing workers.

## Technology stack

- Frontend: React and TypeScript
- Routing: TanStack Router / TanStack Start
- Styling: Tailwind CSS
- Build tooling: Vite
- Database: Microsoft SQL Server (worker listings, profiles and reviews are read server-side)

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

Run `database/LocalHandsDB.sql` in SQL Server Management Studio to create and seed the database. The server-side worker and review queries use the Windows ODBC driver through `msnodesqlv8` and Windows trusted authentication.

Set these environment variables before starting the app:

- `DB_SERVER`: SQL Server host and instance, for example `localhost\SQLEXPRESS`
- `DB_DATABASE`: normally `LocalHandsDB`
- `DB_DRIVER`: installed ODBC driver name, for example `ODBC Driver 18 for SQL Server`

Verify the ODBC driver in Windows PowerShell with:

```powershell
Get-OdbcDriver -Name "*SQL Server*"
```

The database connection is required for the app routes that load marketplace data. Application submissions, bookings, and admin/worker updates are still prototype state and have not yet been moved to SQL Server.

## Project status

This project is under active development. Marketplace worker listings, profiles and reviews are loaded from SQL Server; application submissions, bookings and admin/worker updates are still prototype-only.