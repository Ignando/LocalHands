# LocalHands automated test suite

This suite implements the approved ten browser/system scenarios (TC-01–TC-10) and five SQL Server integration scenarios (DB-A–DB-E). Playwright drives the existing React/TanStack Start application in Chromium; the database tests use `mssql/msnodesqlv8` against a separate database. The tests do not use Express or a public REST API.

## Prerequisites

- Node.js/npm compatible with the project lockfile.
- SQL Server 2019 or newer reachable from this Windows machine.
- SSMS 22 for manual creation/setup of the isolated database.
- Windows ODBC driver named in `LH_TEST_DB_DRIVER` (the example uses ODBC Driver 18 for SQL Server).
- Chromium installed for browser tests: `npx playwright install chromium`.
- A local `.env` containing the test-only settings below. Do not put real credentials in `.env.example` or reports.

The application uses TanStack Start server functions, SQL Server, the `mssql` package, and the `msnodesqlv8` driver with Windows Trusted Authentication. `playwright.config.ts` maps the `LH_TEST_DB_*` settings to the app's normal `DB_*` variables only for the Playwright-managed server. Tests fail closed unless the configured database name is exactly `LocalHandsDB_Test`; they never fall back to `DB_DATABASE` from normal development configuration.

## 1. Create the isolated database in SSMS 22

1. Open SSMS 22 and connect to the intended local SQL Server **test/development instance** using Windows Authentication. Verify the server/instance shown in Object Explorer; setup requires permission to create a database and run DDL.
2. Open `database/tests/setup-test-database.sql` and review the whole script before execution. This is a single ordered setup script containing the isolated database schema, current multi-hour booking objects, and fictional Playwright fixtures. It targets `LocalHandsDB_Test`; it does not drop or reset an existing database.
3. Execute the entire script in SSMS (including its `GO` batch separators). Do not substitute `database/LocalHandsDB.sql` or run the production-targeted migration against `LocalHandsDB` for these tests. The test setup includes the schema objects from the current master schema and multi-hour migration.
4. Verify in a new SSMS query window connected to the same instance:

   ```sql
   SELECT DB_NAME() AS CurrentDatabase;
   SELECT name FROM sys.databases WHERE name = N'LocalHandsDB_Test';
   SELECT Email, Role FROM LocalHandsDB_Test.dbo.Users
   WHERE Email LIKE N'pw.%@localhands.test' ORDER BY Email;
   SELECT OBJECT_ID(N'LocalHandsDB_Test.dbo.ServiceRequestSlots', N'U') AS ServiceRequestSlotsObjectId;
   ```

   Confirm the database name is exactly `LocalHandsDB_Test`, expected fixtures exist, and the multi-hour slot table exists. The setup script leaves seeded passwords NULL; the Playwright global setup sets fresh scrypt hashes only for these four synthetic accounts after checking `SELECT DB_NAME()`.

5. The script is designed for safe, idempotent setup of schema and named seed fixtures; rerunning it does not reset requests, applications, or test data. The suite's fixture reset deletes only records tied to the named `pw.*@localhands.test` accounts / `pw-worker`, and it performs a fresh database-name check immediately before cleanup.

If the test database already exists with a different or incomplete schema, stop and inspect it before rerunning setup. The setup file contains schema-evolution DDL (including removal of the obsolete unique constraint on nullable legacy `SlotId`) and should only be run against the dedicated test database. There is no automated database drop/reset command.

## 2. Configure local test environment

Copy the placeholders from `.env.example` into the untracked local `.env` (do not overwrite an existing `.env`). Set these variables to values for the isolated test SQL Server instance:

```dotenv
LH_TEST_DB_SERVER=YOUR_TEST_SQL_SERVER_INSTANCE
LH_TEST_DB_DATABASE=LocalHandsDB_Test
LH_TEST_DB_DRIVER=ODBC Driver 18 for SQL Server
LH_TEST_CUSTOMER_PASSWORD=use-a-private-test-only-password-12-chars-minimum
LH_TEST_WORKER_PASSWORD=use-a-private-test-only-password-12-chars-minimum
LH_TEST_ADMIN_PASSWORD=use-a-private-test-only-password-12-chars-minimum
```

Use separate synthetic test-only passwords, 12–128 characters each. The applicant account uses the customer test password. Do not set usernames, SQL passwords, or machine-specific credentials: SQL access uses Windows Trusted Authentication. The server and driver values must match the SSMS/ODBC installation. Keep test and normal `DB_*` values separate; the Playwright-managed app server is explicitly redirected to `LocalHandsDB_Test`.

Before the first run, verify these environment variable names without printing their values, and independently confirm the target from SSMS. Running tests modifies test-fixture rows in `LocalHandsDB_Test` only. Never set `LH_TEST_DB_DATABASE` to `LocalHandsDB`.

## 3. Commands

Run from the project root:

```sh
npm run test:system
npm run test:database
npm run test:all
npm run test:ui
npm run test:report
npm run test:typecheck
```

- `test:system` runs TC-01 through TC-10 in Chromium and starts a fresh Vite/TanStack development server on `127.0.0.1:3000`. The port must be free; an existing server is not reused.
- `test:database` runs DB-A through DB-E without starting the browser app. It still requires SQL Server, the test-only environment, and the manual database setup.
- `test:all` runs both projects and starts the app server for system tests.
- `test:ui` opens Playwright UI mode for the system project and also needs the test database and app prerequisites.
- `test:report` opens the latest HTML report (a report must exist first).
- `test:typecheck` statically checks test code; it does not connect to SQL Server.

Existing `npm test` / `npm run test:watch` continue to run the project's Vitest unit tests and do not configure the SQL test database. Every Playwright scenario (TC-01–TC-10 and DB-A–DB-E) requires SQL Server access to `LocalHandsDB_Test`: system tests reset/inspect fixtures and the global setup prepares seeded account hashes. `npm run test:typecheck` and the existing Vitest unit tests can run without SQL Server; they are not substitutes for the Playwright/database evidence.

## 4. Fixtures, cleanup and reports

`tests/global-setup.ts` checks required tables, procedures and accounts, resets only test-owned fixture data, creates password hashes compatible with `src/lib/server/auth.server.ts`, and revokes old sessions for the seeded accounts. Each individual case also cleans test-owned rows before running, and `tests/global-teardown.ts` performs the same guarded fixture-only reset after the run. System scenarios that need SQL assertions use parameterized queries against the same checked test DB. Test accounts and test worker data are fictional. Booking helpers create future one-hour slot rows on days covered by the seeded weekly schedule.

Cleanup is intentionally limited to the fixture customer/applicant, the worker `pw-worker`, and generated registrations matching `pw.registered.%@localhands.test`. Do not broaden it to all rows or call it against any other database. The database is not dropped automatically. To remove the disposable test database manually, first verify the selected SSMS server and `DB_NAME()` and obtain a backup if needed; then use a separate reviewed administrative action. No cleanup/drop script is provided.

HTML results are written to `tests/reports/html/`; traces, failure screenshots, videos, and other artifacts are written under `tests/reports/test-results/`. These generated outputs are ignored by Git. The report may contain page content from fictional fixtures; do not add real personal data.

## 5. Scenario map

- `tests/system/TC-01`–`TC-10`: authentication/session, authorization, browsing, one-hour and multi-hour booking, stale-slot rejection, worker request actions, profile/availability persistence, application decisions, and literal/safe handling of SQL-like input.
- `tests/database/DB-A`–`DB-E`: schema constraints, computed booking totals, status/role enforcement, completion/cancellation slot behaviour, and application approval authorization/identity flag.

TC-05 deliberately compares the UI estimate with the server-persisted premium-service total. The current UI calculates the displayed service amount from the worker-level `StartingPrice`, while booking creation uses the selected `WorkerServices.StartingPrice`; this scenario should expose the known mismatch rather than normalize its expected value. TC-09 verifies the admin UI's current approve/reject workflow and records that listing removal is not exposed by the current Admin route even though a server function exists. TC-02 uses protected-page behavior; direct server-function invocation is not exposed as a supported public API, while DB-C/DB-E check stored-procedure authorization. TC-06 is a sequential stale-view test, not a simultaneous concurrency test.

Review the test output rather than treating a green code/build check as test evidence. A browser suite run requires both the manual database setup and Chromium; a database suite run requires SQL Server connectivity. No test is silently skipped because the database is unavailable.

## 6. Troubleshooting

- **Missing test database/schema/fixture account:** Execute and verify `database/tests/setup-test-database.sql` in SSMS 22 on the intended test instance; do not change the expected DB name.
- **Target database refused:** Set `LH_TEST_DB_DATABASE=LocalHandsDB_Test`; ensure test server and database are isolated. The suite refuses other names and checks `SELECT DB_NAME()`.
- **Trusted authentication / ODBC error:** Check Windows account access, SQL Server instance, ODBC driver installation/name, and encryption settings. The app and helper use `Trusted_Connection=yes`, `Encrypt=yes`, and `TrustServerCertificate=yes`.
- **Invalid account password:** Confirm all `LH_TEST_*_PASSWORD` values are private, 12–128 characters, and that the global setup can update the seeded synthetic accounts. It hashes the four accounts in the test DB only.
- **Chromium missing:** Run `npx playwright install chromium` in an environment with package/browser download access.
- **Port 3000 occupied:** Stop the process using the port before `test:system`, `test:all`, or `test:ui`; the runner does not attach to an existing server.
- **Vite/dev server startup error:** Confirm project dependencies are installed and `LH_TEST_DB_*` is valid. The app receives the test database values only through the configured Playwright server environment.
- **TC-05 mismatch:** This is an intentional price-consistency failure if the existing profile estimate remains worker-level rather than service-specific. Do not alter the test to force equality; resolve or document the application limitation separately.
- **TC-09 no listing-removal button:** This reflects the current UI; no test-only control is added. The test records the missing UI affordance and confirms approval itself leaves a listing Live.

## Limitations

The suite does not prove simultaneous booking concurrency (TC-06 is explicitly sequential), real payment/payout behavior, review submission, notifications, document upload, identity/qualification verification, or user-study/performance results. DB tests that call stored procedures validate database enforcement but do not substitute for invoking protected TanStack server functions through the UI. Keep those distinctions explicit in any dissertation results.
