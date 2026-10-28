/*
  Safe, idempotent migration for databases created before rolling availability.
  Run against the LocalHands database after taking the usual database backup.
  This script does not delete or rewrite service requests or slot history.
*/
USE [LocalHandsDB];
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.ServiceRequests', N'U') IS NULL
    THROW 51001, 'dbo.ServiceRequests does not exist; apply the base schema first.', 1;

IF EXISTS (
    SELECT 1
    FROM dbo.ServiceRequests
    WHERE SlotId IS NOT NULL
      AND Status IN (N'Pending', N'Accepted', N'Rescheduling')
    GROUP BY SlotId
    HAVING COUNT_BIG(*) > 1
)
    THROW 51002, 'Multiple active requests already reserve the same slot; resolve these rows before migrating.', 1;

IF COL_LENGTH(N'dbo.ServiceRequests', N'ReservationKey') IS NULL
BEGIN
    ALTER TABLE dbo.ServiceRequests ADD ReservationKey AS (
        CASE
            WHEN SlotId IS NOT NULL AND Status IN (N'Pending', N'Accepted', N'Rescheduling') THEN SlotId
            ELSE -RequestId
        END
    ) PERSISTED;
END;

IF EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = N'UQ_ServiceRequests_Slot'
      AND parent_object_id = OBJECT_ID(N'dbo.ServiceRequests')
)
    ALTER TABLE dbo.ServiceRequests DROP CONSTRAINT UQ_ServiceRequests_Slot;

IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_ServiceRequests_SlotId_NotNull'
      AND object_id = OBJECT_ID(N'dbo.ServiceRequests')
)
    DROP INDEX UX_ServiceRequests_SlotId_NotNull ON dbo.ServiceRequests;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_ServiceRequests_ReservationKey'
      AND object_id = OBJECT_ID(N'dbo.ServiceRequests')
)
    CREATE UNIQUE INDEX UX_ServiceRequests_ReservationKey
      ON dbo.ServiceRequests (ReservationKey);

COMMIT TRANSACTION;
