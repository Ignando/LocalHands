/*
  Safe, idempotent migration for existing LocalHandsDB databases.
  Creates the request-to-hour association table and index, and updates the
  booking status procedure. It does not change existing booking data.
*/
USE LocalHandsDB;
GO

IF OBJECT_ID(N'dbo.ServiceRequestSlots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ServiceRequestSlots (
        RequestId INT NOT NULL,
        SlotId INT NOT NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ServiceRequestSlots_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_ServiceRequestSlots PRIMARY KEY (RequestId, SlotId),
        CONSTRAINT FK_ServiceRequestSlots_Request FOREIGN KEY (RequestId) REFERENCES dbo.ServiceRequests(RequestId),
        CONSTRAINT FK_ServiceRequestSlots_Slot FOREIGN KEY (SlotId) REFERENCES dbo.AvailabilitySlots(SlotId)
    );
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'IX_ServiceRequestSlots_SlotId' AND object_id = OBJECT_ID(N'dbo.ServiceRequestSlots')
)
    CREATE INDEX IX_ServiceRequestSlots_SlotId ON dbo.ServiceRequestSlots(SlotId) INCLUDE (RequestId);
GO

CREATE OR ALTER PROCEDURE dbo.usp_SetServiceRequestStatus
    @RequestId INT,
    @NewStatus NVARCHAR(10),
    @ChangedByUserId INT = NULL,
    @ChangeNote NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @NewStatus NOT IN (N'Accepted', N'Declined', N'Completed', N'Cancelled')
        THROW 50011, 'Invalid request status.', 1;

    DECLARE @OldStatus NVARCHAR(10);
    DECLARE @SlotId INT;
    DECLARE @WorkerId INT;

    BEGIN TRANSACTION;
        SELECT @OldStatus = Status, @SlotId = SlotId, @WorkerId = WorkerId
        FROM dbo.ServiceRequests WITH (UPDLOCK, ROWLOCK)
        WHERE RequestId = @RequestId;

        IF @OldStatus IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50012, 'Service request was not found.', 1;
        END;

        IF @ChangedByUserId IS NULL OR NOT EXISTS (
            SELECT 1
            FROM dbo.ServiceRequests r
            INNER JOIN dbo.Users u ON u.UserId = @ChangedByUserId AND u.IsActive = 1
            INNER JOIN dbo.Workers w ON w.WorkerId = r.WorkerId
            WHERE r.RequestId = @RequestId
              AND ((@NewStatus = N'Cancelled' AND u.Role = N'Customer' AND r.CustomerId = u.UserId)
                OR (@NewStatus <> N'Cancelled' AND u.Role = N'Worker' AND w.UserId = u.UserId))
        )
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50014, 'The signed-in account cannot update this request.', 1;
        END;

        IF NOT (
            (@OldStatus = N'Pending' AND @NewStatus IN (N'Accepted', N'Declined', N'Cancelled'))
            OR (@OldStatus = N'Accepted' AND @NewStatus IN (N'Completed', N'Cancelled'))
        )
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50013, 'That status transition is not allowed.', 1;
        END;

        UPDATE dbo.ServiceRequests
        SET Status = @NewStatus,
            UpdatedAt = SYSUTCDATETIME(),
            CompletedAt = CASE WHEN @NewStatus = N'Completed' THEN SYSUTCDATETIME() ELSE CompletedAt END,
            CancelledAt = CASE WHEN @NewStatus = N'Cancelled' THEN SYSUTCDATETIME() ELSE CancelledAt END
        WHERE RequestId = @RequestId;

        IF @NewStatus IN (N'Declined', N'Cancelled')
        BEGIN
            UPDATE slot
            SET SlotStatus = CASE
                WHEN slot.StartsAt > SYSUTCDATETIME() AND EXISTS (
                    SELECT 1
                    FROM dbo.WeeklyHours wh
                    WHERE wh.WorkerId = @WorkerId
                      AND wh.IsAvailable = 1
                      AND wh.DayOfWeek = CONVERT(TINYINT, (DATEDIFF(DAY, CONVERT(DATE, '19000101'), CONVERT(DATE, localTime.LocalStartsAt)) % 7) + 1)
                      AND CONVERT(TIME(0), localTime.LocalStartsAt) >= wh.StartTime
                      AND CONVERT(TIME(0), localTime.LocalEndsAt) <= wh.EndTime
                ) THEN N'Available'
                ELSE N'Blocked'
            END
            FROM dbo.AvailabilitySlots slot
            CROSS APPLY (
                SELECT
                    (slot.StartsAt AT TIME ZONE 'UTC') AT TIME ZONE 'South Africa Standard Time' AS LocalStartsAt,
                    (slot.EndsAt AT TIME ZONE 'UTC') AT TIME ZONE 'South Africa Standard Time' AS LocalEndsAt
            ) localTime
            WHERE slot.SlotId = @SlotId
               OR EXISTS (
                    SELECT 1 FROM dbo.ServiceRequestSlots requestSlot
                    WHERE requestSlot.RequestId = @RequestId
                      AND requestSlot.SlotId = slot.SlotId
               );
        END;

        IF @NewStatus = N'Completed'
        BEGIN
            UPDATE dbo.Workers SET JobsCompleted = JobsCompleted + 1 WHERE WorkerId =
                (SELECT WorkerId FROM dbo.ServiceRequests WHERE RequestId = @RequestId);
        END;

        INSERT dbo.BookingStatusHistory (RequestId, OldStatus, NewStatus, ChangedByUserId, ChangeNote)
        VALUES (@RequestId, @OldStatus, @NewStatus, @ChangedByUserId, @ChangeNote);
    COMMIT TRANSACTION;
END;
GO
