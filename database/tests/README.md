# Isolated LocalHands test database setup

## Target and safety

The single setup file, `database/tests/setup-test-database.sql`, creates/configures **only** `LocalHandsDB_Test`. It contains the test schema, current `ServiceRequestSlots` multi-hour booking table and booking status procedure, plus clearly fictional Playwright fixture accounts/worker/services. It never drops or truncates the test database. Do not run it against `LocalHandsDB` or point the Playwright environment at the demo database.

The setup script begins in `master` so it can create the database when missing, then switches to `LocalHandsDB_Test`. Run it in SSMS 22 against the dedicated local SQL Server instance selected in Object Explorer. The Windows account needs `CREATE DATABASE` permission if the database does not exist, plus permissions to create/alter objects and seed records in that database. Run the whole reviewed script so its `GO` batches are processed by SSMS; do not execute it from the application runner.

## SSMS 22 order

1. Review `setup-test-database.sql` and verify the target literal is `LocalHandsDB_Test`.
2. Connect in SSMS 22 to the intended test instance using Windows Authentication.
3. Open and execute the complete setup script. If creation fails for insufficient privileges, ask an administrator to create `LocalHandsDB_Test`, then rerun the reviewed script using an account permitted to configure that database.
4. Verify the current database and required objects:

   ```sql
   SELECT DB_NAME() AS CurrentDatabase;
   SELECT name FROM sys.databases WHERE name = N'LocalHandsDB_Test';
   SELECT Email, Role FROM LocalHandsDB_Test.dbo.Users
   WHERE Email LIKE N'pw.%@localhands.test' ORDER BY Email;
   SELECT OBJECT_ID(N'LocalHandsDB_Test.dbo.ServiceRequestSlots', N'U') AS ServiceRequestSlotsObjectId;
   SELECT OBJECT_ID(N'LocalHandsDB_Test.dbo.usp_SetServiceRequestStatus', N'P') AS RequestStatusProcedureObjectId;
   ```

   Check that `CurrentDatabase` (after selecting the test database in SSMS) is `LocalHandsDB_Test`, four `pw.*@localhands.test` accounts and the fictional `pw-worker` setup exist, and the multi-hour table/procedure IDs are non-NULL.
5. Add local `LH_TEST_DB_SERVER`, `LH_TEST_DB_DATABASE=LocalHandsDB_Test`, and `LH_TEST_DB_DRIVER` values to `.env`, plus private test-only passwords for customer, worker and admin. The applicant password is the customer password. Do not put credentials into this README or `.env.example`.
6. Run the TypeScript/Playwright suite using the commands in `tests/README.md`.

The browser app's database connection uses the project's existing `DB_SERVER`, `DB_DATABASE`, and `DB_DRIVER` names with ODBC Windows Trusted Authentication. Playwright maps these values from the separately configured `LH_TEST_DB_*` variables for its managed dev server only. Database tests connect directly using `mssql/msnodesqlv8` with the same `Trusted_Connection=yes`, `Encrypt=yes`, and `TrustServerCertificate=yes` settings. A preflight requires `LH_TEST_DB_DATABASE` to equal the exact test database name; every helper connection also verifies `SELECT DB_NAME()` before reads/writes and again before fixture cleanup. There is no fallback to normal `DB_DATABASE`.

## Rerun and cleanup

The schema/seed script uses guarded table/object creation and fixture inserts. Rerunning it is not a reset operation: it does not clear test requests, applications, sessions or generated browser test data. Playwright's `resetTestFixtures()` removes only records connected to the named fictional test accounts, `pw-worker`, and registered addresses beginning `pw.registered.`. The target database is checked before the cleanup transaction and again immediately inside it.

There is no automatic database drop, whole-database reset, truncation, or cleanup SQL script. Do not add such behavior to a normal test run. If you later decide to delete the disposable DB manually, verify the SQL Server instance and exact DB name in SSMS and review a separate administrative command before executing it.

## Troubleshooting

- **CREATE DATABASE denied:** Have a SQL Server administrator create `LocalHandsDB_Test` on the intended instance, then rerun the setup script. Never work around this by targeting `LocalHandsDB`.
- **Missing tables/procedures:** Run the whole setup script in SSMS 22, then verify the objects above. Inspect schema drift before rerunning; the setup includes compatibility DDL for the test database.
- **ODBC/connection failure:** Verify server/instance string, installed driver name, Windows SQL access, and encryption/trusted-auth settings.
- **Test target safety error:** Confirm `LH_TEST_DB_DATABASE` is exactly `LocalHandsDB_Test`, and `LH_TEST_DB_SERVER` is the instance used in SSMS.
- **Missing passwords:** Set the three local `LH_TEST_*_PASSWORD` values (12–128 characters). Password hashes are created by Playwright global setup only for the fictional test accounts.
- **Test setup output includes a known pricing assertion:** TC-05 detects that the UI estimate can use worker-level pricing while the server persists the selected service price. This is an application discrepancy, not a reason to change test data/expected values.

Never use real customer/student personal information as test data. The seed accounts and worker profile are explicitly fictional.
