/*
 LocalHandsDB - master setup script
 Target engine: SQL Server 2019+ (tested design intended to work on SQL Server 2025)
 Run in SSMS using a login allowed to create databases.
 IMPORTANT: This script creates the database only if it does not exist. It does not drop
 an existing database. Seed data is inserted only when the corresponding tables are empty.
 Demo data is fictional. Do not store real passwords, ID numbers, or payment credentials here.
*/

USE master;
GO

IF DB_ID(N'LocalHandsDB') IS NULL
BEGIN
    CREATE DATABASE LocalHandsDB;
END;
GO

USE LocalHandsDB;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

/* =========================================================
   1. CORE REFERENCE TABLES
   ========================================================= */

IF OBJECT_ID(N'dbo.Suburbs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Suburbs (
        SuburbId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Suburbs PRIMARY KEY,
        Name NVARCHAR(60) NOT NULL CONSTRAINT UQ_Suburbs_Name UNIQUE,
        IsActive BIT NOT NULL CONSTRAINT DF_Suburbs_IsActive DEFAULT (1)
    );
END;
GO

IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories (
        CategoryId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Categories PRIMARY KEY,
        Slug NVARCHAR(40) NOT NULL CONSTRAINT UQ_Categories_Slug UNIQUE,
        Name NVARCHAR(80) NOT NULL CONSTRAINT UQ_Categories_Name UNIQUE,
        Description NVARCHAR(150) NOT NULL,
        IconKey NVARCHAR(30) NULL,
        RegulatedNotice NVARCHAR(300) NULL,
        SortOrder TINYINT NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Categories_IsActive DEFAULT (1),
        CONSTRAINT CK_Categories_SortOrder CHECK (SortOrder BETWEEN 1 AND 99)
    );
END;
GO

/* =========================================================
   2. USERS AND WORKER PROFILES
   ========================================================= */

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        UserId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
        FullName NVARCHAR(100) NOT NULL,
        Email NVARCHAR(254) NOT NULL,
        Phone NVARCHAR(20) NULL,
        Role NVARCHAR(10) NOT NULL CONSTRAINT DF_Users_Role DEFAULT (N'Customer'),
        SuburbId INT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NULL,
        CONSTRAINT UQ_Users_Email UNIQUE (Email),
        CONSTRAINT CK_Users_Role CHECK (Role IN (N'Customer', N'Worker', N'Admin')),
        CONSTRAINT FK_Users_Suburbs FOREIGN KEY (SuburbId) REFERENCES dbo.Suburbs(SuburbId)
    );
END;
GO

IF OBJECT_ID(N'dbo.Workers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Workers (
        WorkerId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Workers PRIMARY KEY,
        PublicId NVARCHAR(40) NOT NULL,
        UserId INT NOT NULL,
        CategoryId INT NOT NULL,
        SuburbId INT NOT NULL,
        YearsExperience TINYINT NOT NULL,
        StartingPrice DECIMAL(10,2) NOT NULL,
        TravelFee DECIMAL(10,2) NOT NULL CONSTRAINT DF_Workers_TravelFee DEFAULT (0),
        About NVARCHAR(500) NULL,
        PhotoUrl NVARCHAR(300) NULL,
        QualifiedTitle NVARCHAR(150) NULL,
        IsIdentityVerified BIT NOT NULL CONSTRAINT DF_Workers_IdentityVerified DEFAULT (0),
        IsExperienceVerified BIT NOT NULL CONSTRAINT DF_Workers_ExperienceVerified DEFAULT (0),
        IsQualified BIT NOT NULL CONSTRAINT DF_Workers_IsQualified DEFAULT (0),
        AvailabilityStatus NVARCHAR(12) NOT NULL CONSTRAINT DF_Workers_AvailabilityStatus DEFAULT (N'Available'),
        ListingStatus NVARCHAR(10) NOT NULL CONSTRAINT DF_Workers_ListingStatus DEFAULT (N'Live'),
        RatingAverage DECIMAL(3,2) NOT NULL CONSTRAINT DF_Workers_RatingAverage DEFAULT (0),
        ReviewCount INT NOT NULL CONSTRAINT DF_Workers_ReviewCount DEFAULT (0),
        JobsCompleted INT NOT NULL CONSTRAINT DF_Workers_JobsCompleted DEFAULT (0),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Workers_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NULL,
        CONSTRAINT UQ_Workers_PublicId UNIQUE (PublicId),
        CONSTRAINT UQ_Workers_UserId UNIQUE (UserId),
        CONSTRAINT FK_Workers_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_Workers_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(CategoryId),
        CONSTRAINT FK_Workers_Suburbs FOREIGN KEY (SuburbId) REFERENCES dbo.Suburbs(SuburbId),
        CONSTRAINT CK_Workers_Experience CHECK (YearsExperience BETWEEN 0 AND 60),
        CONSTRAINT CK_Workers_StartingPrice CHECK (StartingPrice >= 0),
        CONSTRAINT CK_Workers_TravelFee CHECK (TravelFee >= 0),
        CONSTRAINT CK_Workers_Availability CHECK (AvailabilityStatus IN (N'Available', N'NextWeek')),
        CONSTRAINT CK_Workers_ListingStatus CHECK (ListingStatus IN (N'Live', N'Removed')),
        CONSTRAINT CK_Workers_Rating CHECK (RatingAverage BETWEEN 0 AND 5),
        CONSTRAINT CK_Workers_ReviewCount CHECK (ReviewCount >= 0),
        CONSTRAINT CK_Workers_JobsCompleted CHECK (JobsCompleted >= 0)
    );
END;
GO

IF OBJECT_ID(N'dbo.WorkerServices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WorkerServices (
        ServiceId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WorkerServices PRIMARY KEY,
        WorkerId INT NOT NULL,
        ServiceName NVARCHAR(120) NOT NULL,
        StartingPrice DECIMAL(10,2) NOT NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_WorkerServices_IsActive DEFAULT (1),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_WorkerServices_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_WorkerServices_Workers FOREIGN KEY (WorkerId) REFERENCES dbo.Workers(WorkerId),
        CONSTRAINT UQ_WorkerServices_Worker_Service UNIQUE (WorkerId, ServiceName),
        CONSTRAINT CK_WorkerServices_Price CHECK (StartingPrice >= 0)
    );
END;
GO

/* =========================================================
   3. WORKER APPLICATIONS AND REVIEW AUDIT
   ========================================================= */

IF OBJECT_ID(N'dbo.WorkerApplications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WorkerApplications (
        ApplicationId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WorkerApplications PRIMARY KEY,
        ApplicantUserId INT NULL,
        FullName NVARCHAR(100) NOT NULL,
        Email NVARCHAR(254) NOT NULL,
        Phone NVARCHAR(20) NOT NULL,
        CategoryId INT NOT NULL,
        SuburbId INT NOT NULL,
        MainService NVARCHAR(120) NOT NULL,
        YearsExperience TINYINT NOT NULL,
        SubmittedAt DATETIME2(0) NOT NULL CONSTRAINT DF_WorkerApplications_SubmittedAt DEFAULT (SYSUTCDATETIME()),
        IdentityStatus NVARCHAR(12) NOT NULL CONSTRAINT DF_WorkerApplications_IdentityStatus DEFAULT (N'Pending'),
        QualificationStatus NVARCHAR(12) NOT NULL CONSTRAINT DF_WorkerApplications_QualificationStatus DEFAULT (N'Not required'),
        ReferenceCount TINYINT NOT NULL CONSTRAINT DF_WorkerApplications_ReferenceCount DEFAULT (0),
        Description NVARCHAR(1000) NOT NULL,
        StartingPrice DECIMAL(10,2) NOT NULL,
        Status NVARCHAR(24) NOT NULL CONSTRAINT DF_WorkerApplications_Status DEFAULT (N'Application Submitted'),
        ReviewedAt DATETIME2(0) NULL,
        CreatedWorkerId INT NULL,
        CONSTRAINT FK_WorkerApplications_Users FOREIGN KEY (ApplicantUserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_WorkerApplications_Categories FOREIGN KEY (CategoryId) REFERENCES dbo.Categories(CategoryId),
        CONSTRAINT FK_WorkerApplications_Suburbs FOREIGN KEY (SuburbId) REFERENCES dbo.Suburbs(SuburbId),
        CONSTRAINT FK_WorkerApplications_CreatedWorker FOREIGN KEY (CreatedWorkerId) REFERENCES dbo.Workers(WorkerId),
        CONSTRAINT CK_WorkerApplications_Experience CHECK (YearsExperience BETWEEN 0 AND 60),
        CONSTRAINT CK_WorkerApplications_References CHECK (ReferenceCount BETWEEN 0 AND 10),
        CONSTRAINT CK_WorkerApplications_Identity CHECK (IdentityStatus IN (N'Pending', N'Verified', N'Rejected')),
        CONSTRAINT CK_WorkerApplications_Qualification CHECK (QualificationStatus IN (N'Verified', N'Pending', N'Not required', N'Rejected')),
        CONSTRAINT CK_WorkerApplications_Price CHECK (StartingPrice >= 0),
        CONSTRAINT CK_WorkerApplications_Status CHECK (Status IN (N'Application Submitted', N'Under Review', N'Interview Required', N'Approved', N'Rejected'))
    );
END;
GO

IF OBJECT_ID(N'dbo.AdminActions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdminActions (
        ActionId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AdminActions PRIMARY KEY,
        AdminId INT NOT NULL,
        ApplicationId INT NOT NULL,
        Action NVARCHAR(15) NOT NULL,
        Note NVARCHAR(300) NULL,
        ActionedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AdminActions_ActionedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_AdminActions_Admin FOREIGN KEY (AdminId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_AdminActions_Application FOREIGN KEY (ApplicationId) REFERENCES dbo.WorkerApplications(ApplicationId),
        CONSTRAINT CK_AdminActions_Action CHECK (Action IN (N'Approved', N'Rejected', N'Interview', N'UnderReview'))
    );
END;
GO

/* =========================================================
   4. WORKING HOURS AND BOOKABLE SLOTS
   ========================================================= */

IF OBJECT_ID(N'dbo.WeeklyHours', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WeeklyHours (
        WeeklyHoursId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WeeklyHours PRIMARY KEY,
        WorkerId INT NOT NULL,
        DayOfWeek TINYINT NOT NULL,
        StartTime TIME(0) NOT NULL,
        EndTime TIME(0) NOT NULL,
        IsAvailable BIT NOT NULL CONSTRAINT DF_WeeklyHours_IsAvailable DEFAULT (1),
        CONSTRAINT FK_WeeklyHours_Workers FOREIGN KEY (WorkerId) REFERENCES dbo.Workers(WorkerId),
        CONSTRAINT UQ_WeeklyHours_Worker_Day UNIQUE (WorkerId, DayOfWeek),
        CONSTRAINT CK_WeeklyHours_Day CHECK (DayOfWeek BETWEEN 1 AND 7),
        CONSTRAINT CK_WeeklyHours_Time CHECK (EndTime > StartTime)
    );
END;
GO

IF OBJECT_ID(N'dbo.AvailabilitySlots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AvailabilitySlots (
        SlotId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AvailabilitySlots PRIMARY KEY,
        WorkerId INT NOT NULL,
        StartsAt DATETIME2(0) NOT NULL,
        EndsAt DATETIME2(0) NOT NULL,
        SlotStatus NVARCHAR(12) NOT NULL CONSTRAINT DF_AvailabilitySlots_Status DEFAULT (N'Available'),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_AvailabilitySlots_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_AvailabilitySlots_Workers FOREIGN KEY (WorkerId) REFERENCES dbo.Workers(WorkerId),
        CONSTRAINT CK_AvailabilitySlots_Time CHECK (EndsAt > StartsAt),
        CONSTRAINT CK_AvailabilitySlots_Status CHECK (SlotStatus IN (N'Available', N'Booked', N'Blocked')),
        CONSTRAINT UQ_AvailabilitySlots_Worker_Start UNIQUE (WorkerId, StartsAt)
    );
END;
GO

/* =========================================================
   5. SERVICE REQUESTS AND REVIEWS
   ========================================================= */

IF OBJECT_ID(N'dbo.ServiceRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ServiceRequests (
        RequestId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ServiceRequests PRIMARY KEY,
        PublicReference NVARCHAR(20) NULL,
        CustomerId INT NOT NULL,
        WorkerId INT NOT NULL,
        ServiceId INT NOT NULL,
        SlotId INT NULL,
        JobNotes NVARCHAR(500) NULL,
        ServiceEstimate DECIMAL(10,2) NOT NULL,
        TravelFee DECIMAL(10,2) NOT NULL CONSTRAINT DF_ServiceRequests_TravelFee DEFAULT (0),
        TotalPrice AS (ServiceEstimate + TravelFee) PERSISTED,
        Status NVARCHAR(10) NOT NULL CONSTRAINT DF_ServiceRequests_Status DEFAULT (N'Pending'),
        ScheduledAt DATETIME2(0) NOT NULL,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_ServiceRequests_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0) NULL,
        CompletedAt DATETIME2(0) NULL,
        CancellationReason NVARCHAR(300) NULL,
        CancelledAt DATETIME2(0) NULL,
        CONSTRAINT FK_ServiceRequests_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_ServiceRequests_Worker FOREIGN KEY (WorkerId) REFERENCES dbo.Workers(WorkerId),
        CONSTRAINT FK_ServiceRequests_Service FOREIGN KEY (ServiceId) REFERENCES dbo.WorkerServices(ServiceId),
        CONSTRAINT FK_ServiceRequests_Slot FOREIGN KEY (SlotId) REFERENCES dbo.AvailabilitySlots(SlotId),
        CONSTRAINT UQ_ServiceRequests_PublicReference UNIQUE (PublicReference),
        CONSTRAINT CK_ServiceRequests_Estimate CHECK (ServiceEstimate >= 0),
        CONSTRAINT CK_ServiceRequests_TravelFee CHECK (TravelFee >= 0),
        CONSTRAINT CK_ServiceRequests_Status CHECK (Status IN (N'Pending', N'Accepted', N'Declined', N'Completed', N'Cancelled', N'Rescheduling'))
    );
END;
GO

/* A slot is unique only when one is actually assigned. Multiple historic/unassigned
   requests may have SlotId = NULL. Also migrate databases created by an earlier
   version of this script that used a regular UNIQUE constraint. */
IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = N'UQ_ServiceRequests_Slot'
      AND parent_object_id = OBJECT_ID(N'dbo.ServiceRequests')
)
BEGIN
    ALTER TABLE dbo.ServiceRequests DROP CONSTRAINT UQ_ServiceRequests_Slot;
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = N'UX_ServiceRequests_SlotId_NotNull'
      AND object_id = OBJECT_ID(N'dbo.ServiceRequests')
)
BEGIN
    CREATE UNIQUE INDEX UX_ServiceRequests_SlotId_NotNull
        ON dbo.ServiceRequests (SlotId)
        WHERE SlotId IS NOT NULL;
END;
GO

IF OBJECT_ID(N'dbo.Reviews', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Reviews (
        ReviewId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Reviews PRIMARY KEY,
        RequestId INT NOT NULL,
        CustomerId INT NOT NULL,
        WorkerId INT NOT NULL,
        Rating TINYINT NOT NULL,
        Comment NVARCHAR(1000) NULL,
        IsVisible BIT NOT NULL CONSTRAINT DF_Reviews_IsVisible DEFAULT (1),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Reviews_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_Reviews_Request FOREIGN KEY (RequestId) REFERENCES dbo.ServiceRequests(RequestId),
        CONSTRAINT FK_Reviews_Customer FOREIGN KEY (CustomerId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_Reviews_Worker FOREIGN KEY (WorkerId) REFERENCES dbo.Workers(WorkerId),
        CONSTRAINT UQ_Reviews_Request UNIQUE (RequestId),
        CONSTRAINT CK_Reviews_Rating CHECK (Rating BETWEEN 1 AND 5)
    );
END;
GO

/* =========================================================
   6. RECENTLY VIEWED AND FUTURE-FEATURE SUPPORT
   ========================================================= */

IF OBJECT_ID(N'dbo.RecentlyViewed', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RecentlyViewed (
        UserId INT NOT NULL,
        WorkerId INT NOT NULL,
        ViewedAt DATETIME2(0) NOT NULL CONSTRAINT DF_RecentlyViewed_ViewedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_RecentlyViewed PRIMARY KEY (UserId, WorkerId),
        CONSTRAINT FK_RecentlyViewed_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_RecentlyViewed_Worker FOREIGN KEY (WorkerId) REFERENCES dbo.Workers(WorkerId)
    );
END;
GO

IF OBJECT_ID(N'dbo.Notifications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Notifications (
        NotificationId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Notifications PRIMARY KEY,
        UserId INT NOT NULL,
        NotificationType NVARCHAR(40) NOT NULL,
        Title NVARCHAR(150) NOT NULL,
        Message NVARCHAR(1000) NOT NULL,
        RelatedRequestId INT NULL,
        IsRead BIT NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT (0),
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT (SYSUTCDATETIME()),
        ReadAt DATETIME2(0) NULL,
        CONSTRAINT FK_Notifications_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_Notifications_Request FOREIGN KEY (RelatedRequestId) REFERENCES dbo.ServiceRequests(RequestId)
    );
END;
GO

IF OBJECT_ID(N'dbo.WorkerDocuments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WorkerDocuments (
        DocumentId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_WorkerDocuments PRIMARY KEY,
        ApplicationId INT NULL,
        WorkerId INT NULL,
        DocumentType NVARCHAR(40) NOT NULL,
        FileName NVARCHAR(255) NOT NULL,
        StoragePath NVARCHAR(500) NOT NULL,
        VerificationStatus NVARCHAR(12) NOT NULL CONSTRAINT DF_WorkerDocuments_Status DEFAULT (N'Pending'),
        UploadedAt DATETIME2(0) NOT NULL CONSTRAINT DF_WorkerDocuments_UploadedAt DEFAULT (SYSUTCDATETIME()),
        VerifiedAt DATETIME2(0) NULL,
        CONSTRAINT FK_WorkerDocuments_Application FOREIGN KEY (ApplicationId) REFERENCES dbo.WorkerApplications(ApplicationId),
        CONSTRAINT FK_WorkerDocuments_Worker FOREIGN KEY (WorkerId) REFERENCES dbo.Workers(WorkerId),
        CONSTRAINT CK_WorkerDocuments_Owner CHECK (ApplicationId IS NOT NULL OR WorkerId IS NOT NULL),
        CONSTRAINT CK_WorkerDocuments_Status CHECK (VerificationStatus IN (N'Pending', N'Verified', N'Rejected'))
    );
END;
GO

IF OBJECT_ID(N'dbo.BookingStatusHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BookingStatusHistory (
        HistoryId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_BookingStatusHistory PRIMARY KEY,
        RequestId INT NOT NULL,
        OldStatus NVARCHAR(15) NULL,
        NewStatus NVARCHAR(15) NOT NULL,
        ChangedByUserId INT NULL,
        ChangeNote NVARCHAR(300) NULL,
        ChangedAt DATETIME2(0) NOT NULL CONSTRAINT DF_BookingStatusHistory_ChangedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT FK_BookingStatusHistory_Request FOREIGN KEY (RequestId) REFERENCES dbo.ServiceRequests(RequestId),
        CONSTRAINT FK_BookingStatusHistory_User FOREIGN KEY (ChangedByUserId) REFERENCES dbo.Users(UserId)
    );
END;
GO

IF OBJECT_ID(N'dbo.WorkerServiceAreas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WorkerServiceAreas (
        WorkerId INT NOT NULL,
        SuburbId INT NOT NULL,
        AdditionalTravelFee DECIMAL(10,2) NOT NULL CONSTRAINT DF_WorkerServiceAreas_TravelFee DEFAULT (0),
        CONSTRAINT PK_WorkerServiceAreas PRIMARY KEY (WorkerId, SuburbId),
        CONSTRAINT FK_WorkerServiceAreas_Worker FOREIGN KEY (WorkerId) REFERENCES dbo.Workers(WorkerId),
        CONSTRAINT FK_WorkerServiceAreas_Suburb FOREIGN KEY (SuburbId) REFERENCES dbo.Suburbs(SuburbId),
        CONSTRAINT CK_WorkerServiceAreas_TravelFee CHECK (AdditionalTravelFee >= 0)
    );
END;
GO

/* =========================================================
   7. INDEXES
   ========================================================= */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Workers_Category_Status' AND object_id = OBJECT_ID(N'dbo.Workers'))
    CREATE INDEX IX_Workers_Category_Status ON dbo.Workers(CategoryId, ListingStatus);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Workers_Suburb' AND object_id = OBJECT_ID(N'dbo.Workers'))
    CREATE INDEX IX_Workers_Suburb ON dbo.Workers(SuburbId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Applications_Status_SubmittedAt' AND object_id = OBJECT_ID(N'dbo.WorkerApplications'))
    CREATE INDEX IX_Applications_Status_SubmittedAt ON dbo.WorkerApplications(Status, SubmittedAt DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ServiceRequests_Worker_Status_Date' AND object_id = OBJECT_ID(N'dbo.ServiceRequests'))
    CREATE INDEX IX_ServiceRequests_Worker_Status_Date ON dbo.ServiceRequests(WorkerId, Status, ScheduledAt);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ServiceRequests_Customer_Date' AND object_id = OBJECT_ID(N'dbo.ServiceRequests'))
    CREATE INDEX IX_ServiceRequests_Customer_Date ON dbo.ServiceRequests(CustomerId, ScheduledAt DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AvailabilitySlots_Worker_Start_Status' AND object_id = OBJECT_ID(N'dbo.AvailabilitySlots'))
    CREATE INDEX IX_AvailabilitySlots_Worker_Start_Status ON dbo.AvailabilitySlots(WorkerId, StartsAt, SlotStatus);
GO
GO

/* =========================================================
   8. SEED DATA - INSERT ONLY IF TABLES ARE EMPTY
   ========================================================= */

IF NOT EXISTS (SELECT 1 FROM dbo.Suburbs)
BEGIN
    INSERT dbo.Suburbs (Name) VALUES
    (N'Cape Town CBD'), (N'Bellville'), (N'Goodwood'), (N'Durbanville'),
    (N'Parow'), (N'Milnerton'), (N'Table View'), (N'Observatory'), (N'Stellenbosch'),
    (N'Woodstock'), (N'Sea Point'), (N'Khayelitsha'), (N'Somerset West'), (N'Brackenfell');
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Categories)
BEGIN
    INSERT dbo.Categories (Slug, Name, Description, IconKey, RegulatedNotice, SortOrder) VALUES
    (N'garden', N'Garden & Landscaping', N'Lawns, hedges, full landscaping', N'🌿', NULL, 1),
    (N'cleaning', N'Cleaning', N'Homes, offices, deep cleans', N'🧽', NULL, 2),
    (N'it', N'IT & Technology', N'Repairs, Wi-Fi, setups', N'💻', NULL, 3),
    (N'electrical', N'Electrical & Energy', N'Lighting, solar, inverters', N'⚡', N'Electrical work must be done by a qualified, registered electrician.', 4),
    (N'tutoring', N'Tutoring & Education', N'Primary to university', N'📚', NULL, 5),
    (N'home-repairs', N'Home Repairs & Maintenance', N'Plumbing, painting, carpentry', N'🔧', N'Plumbing and gas work may require a registered professional.', 6),
    (N'automotive', N'Automotive', N'Mobile servicing & washes', N'🚗', N'Specialised mechanical work may require a qualified mechanic.', 7),
    (N'moving', N'Moving & Assistance', N'Small moves, removals', N'📦', NULL, 8);
END;
GO

/* Seed demo users and workers once. PublicId preserves frontend IDs like "thabo". */
IF NOT EXISTS (SELECT 1 FROM dbo.Workers)
BEGIN
    INSERT dbo.Users (FullName, Email, Phone, Role, SuburbId)
    SELECT v.FullName, v.Email, v.Phone, N'Worker', s.SuburbId
    FROM (VALUES
      (N'Thabo Mokoena',N'thabo.demo@localhands.example',N'074 555 0166',N'Bellville',N'thabo'),
      (N'Johan van Wyk',N'johan.demo@localhands.example',N'074 555 0167',N'Durbanville',N'johan'),
      (N'Sipho Dlamini',N'sipho.demo@localhands.example',N'074 555 0168',N'Goodwood',N'sipho'),
      (N'Zanele Khumalo',N'zanele.demo@localhands.example',N'074 555 0169',N'Table View',N'zanele'),
      (N'Naledi Mokoena',N'naledi.demo@localhands.example',N'074 555 0170',N'Parow',N'naledi'),
      (N'Fatima Adams',N'fatima.demo@localhands.example',N'074 555 0171',N'Observatory',N'fatima'),
      (N'Liam Jacobs',N'liam.demo@localhands.example',N'074 555 0172',N'Milnerton',N'liam'),
      (N'Keagan Fortuin',N'keagan.demo@localhands.example',N'074 555 0173',N'Cape Town CBD',N'keagan'),
      (N'Siyabonga Dlamini',N'siyabonga.demo@localhands.example',N'074 555 0174',N'Stellenbosch',N'siyabonga'),
      (N'Ayesha Khan',N'ayesha.demo@localhands.example',N'074 555 0175',N'Observatory',N'ayesha'),
      (N'Daniel Petersen',N'daniel.demo@localhands.example',N'074 555 0176',N'Goodwood',N'daniel'),
      (N'Pieter Botha',N'pieter.demo@localhands.example',N'074 555 0178',N'Durbanville',N'pieter'),
      (N'Musa Ndlovu',N'musa.demo@localhands.example',N'074 555 0179',N'Parow',N'musa'),
      (N'Bongani Zulu',N'bongani.demo@localhands.example',N'074 555 0180',N'Milnerton',N'bongani')
    ) v(FullName,Email,Phone,SuburbName,PublicId)
    JOIN dbo.Suburbs s ON s.Name = v.SuburbName
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.Email = v.Email);

    INSERT dbo.Workers
      (PublicId, UserId, CategoryId, SuburbId, YearsExperience, StartingPrice, TravelFee, About, PhotoUrl,
       QualifiedTitle, IsIdentityVerified, IsExperienceVerified, IsQualified, AvailabilityStatus, ListingStatus,
       RatingAverage, ReviewCount, JobsCompleted)
    SELECT v.PublicId, u.UserId, c.CategoryId, s.SuburbId, v.YearsExperience, v.StartingPrice, v.TravelFee,
           v.About, v.PhotoUrl, v.QualifiedTitle, v.IdentityVerified, v.ExperienceVerified, v.IsQualified,
           N'Available', N'Live', v.RatingAverage, v.ReviewCount, v.JobsCompleted
    FROM (VALUES
      (N'thabo',N'Thabo Mokoena',N'garden',N'Bellville',6,250,50,N'Independent gardener with 6 years of experience maintaining residential gardens around Cape Town. I bring my own mower and trimmer.',N'/assets/thabo.jpg',CAST(NULL AS NVARCHAR(150)),1,1,0,4.80,43,127),
      (N'johan',N'Johan van Wyk',N'garden',N'Durbanville',11,450,80,N'Landscaper focusing on water-wise gardens and drip irrigation for Cape summers.',NULL,NULL,1,1,0,4.90,61,188),
      (N'sipho',N'Sipho Dlamini',N'garden',N'Goodwood',3,200,40,N'Building my reputation one garden at a time. Reliable, punctual and passionate about veggie patches.',NULL,NULL,1,0,0,4.60,18,41),
      (N'zanele',N'Zanele Khumalo',N'garden',N'Table View',5,230,50,N'Weekly and fortnightly garden care along the West Coast suburbs.',NULL,NULL,0,0,0,4.70,29,84),
      (N'naledi',N'Naledi Mokoena',N'cleaning',N'Parow',8,220,40,N'Thorough, friendly home cleaner. I bring my own eco-friendly supplies.',N'/assets/naledi.jpg',NULL,1,1,0,4.90,94,260),
      (N'fatima',N'Fatima Adams',N'cleaning',N'Observatory',4,260,50,N'Small office and studio cleaning around Obs, Woodstock and the CBD.',NULL,NULL,1,0,0,4.70,37,96),
      (N'liam',N'Liam Jacobs',N'it',N'Milnerton',5,300,60,N'Computer technician — I will fix it at your kitchen table and explain what went wrong.',NULL,NULL,1,1,0,4.80,52,140),
      (N'keagan',N'Keagan Fortuin',N'it',N'Cape Town CBD',2,250,50,N'IT student offering affordable Wi-Fi mesh and smart home setups.',NULL,NULL,1,0,0,4.50,12,27),
      (N'siyabonga',N'Siyabonga Dlamini',N'electrical',N'Stellenbosch',9,550,100,N'Qualified electrician specialising in load-shedding backup: inverters, batteries and rooftop solar. COC issued.',NULL,N'Registered Electrician · Wireman''s Licence',1,1,1,4.90,48,112),
      (N'ayesha',N'Ayesha Khan',N'tutoring',N'Observatory',4,220,0,N'Maths and science tutor for Grades 8–12 and first-year university. Patient, structured and exam-focused.',N'/assets/ayesha.jpg',N'BSc Mathematics (UCT)',1,1,1,5.00,33,210),
      (N'daniel',N'Daniel Petersen',N'home-repairs',N'Goodwood',12,380,60,N'Burst pipes, geysers, leaking taps — same-day call-outs across the Northern Suburbs.',N'/assets/daniel.jpg',N'Qualified Plumber (PIRB registered)',1,1,1,4.80,71,305),
      (N'pieter',N'Pieter Botha',N'home-repairs',N'Durbanville',7,320,60,N'Neat, careful painter and handyman. Free quote on site.',NULL,NULL,1,1,0,4.60,25,78),
      (N'musa',N'Musa Ndlovu',N'automotive',N'Parow',3,180,30,N'Waterless mobile car wash and valet at your home or office.',NULL,NULL,1,0,0,4.70,40,150),
      (N'bongani',N'Bongani Zulu',N'moving',N'Milnerton',6,400,80,N'Bakkie and two strong hands. Small moves and removals anywhere in the metro.',NULL,NULL,1,1,0,4.80,56,190)
    ) v(PublicId,FullName,CategorySlug,SuburbName,YearsExperience,StartingPrice,TravelFee,About,PhotoUrl,QualifiedTitle,IdentityVerified,ExperienceVerified,IsQualified,RatingAverage,ReviewCount,JobsCompleted)
    JOIN dbo.Users u ON u.Email = LOWER(v.PublicId) + N'.demo@localhands.example'
    JOIN dbo.Categories c ON c.Slug = v.CategorySlug
    JOIN dbo.Suburbs s ON s.Name = v.SuburbName
    WHERE NOT EXISTS (SELECT 1 FROM dbo.Workers w WHERE w.PublicId = v.PublicId);
END;
GO

/* Worker services. Each service is linked to its worker, not stored as comma-separated text. */
IF NOT EXISTS (SELECT 1 FROM dbo.WorkerServices)
BEGIN
    INSERT dbo.WorkerServices (WorkerId, ServiceName, StartingPrice)
    SELECT w.WorkerId, x.ServiceName, w.StartingPrice
    FROM (VALUES
      (N'thabo',N'General Garden Maintenance'),(N'thabo',N'Lawn Cutting'),(N'thabo',N'Hedge & Tree Trimming'),(N'thabo',N'Garden Clean-up'),
      (N'johan',N'Landscaping'),(N'johan',N'Irrigation Installation'),(N'johan',N'Garden Design'),(N'johan',N'Water Features / Fountain Installation'),
      (N'sipho',N'General Garden Maintenance'),(N'sipho',N'Lawn Cutting'),(N'sipho',N'Vegetable Garden Installation'),
      (N'zanele',N'General Garden Maintenance'),(N'zanele',N'Hedge & Tree Trimming'),(N'zanele',N'Garden Clean-up'),
      (N'naledi',N'Regular Home Cleaning'),(N'naledi',N'Deep Cleaning'),(N'naledi',N'Oven & Fridge Detailing'),(N'naledi',N'Move-in / Move-out Cleaning'),
      (N'fatima',N'Office Cleaning'),(N'fatima',N'Window Cleaning'),(N'fatima',N'Carpet & Upholstery'),
      (N'liam',N'Computer Repair'),(N'liam',N'Laptop Screen Replacement'),(N'liam',N'Virus Removal'),(N'liam',N'Data Backup & Recovery'),
      (N'keagan',N'Wi-Fi & Network Setup'),(N'keagan',N'Smart Home Setup'),(N'keagan',N'Phone Repair'),
      (N'siyabonga',N'Solar Consultation'),(N'siyabonga',N'Solar Installation'),(N'siyabonga',N'Inverter Installation'),(N'siyabonga',N'Battery Backup Systems'),(N'siyabonga',N'Lighting Installation'),
      (N'ayesha',N'Mathematics'),(N'ayesha',N'Physical Sciences'),(N'ayesha',N'Exam Preparation'),
      (N'daniel',N'Plumbing'),(N'daniel',N'Gutter Repairs'),(N'daniel',N'Door Repairs'),(N'daniel',N'General Maintenance'),
      (N'pieter',N'Painting'),(N'pieter',N'Tiling'),(N'pieter',N'Basic Carpentry'),(N'pieter',N'Furniture Assembly'),
      (N'musa',N'Mobile Car Wash'),(N'musa',N'Interior Cleaning'),(N'musa',N'Battery Replacement'),
      (N'bongani',N'Small Moves'),(N'bongani',N'Furniture Moving'),(N'bongani',N'Garden Waste Removal'),(N'bongani',N'Small Deliveries')
    ) x(PublicId, ServiceName)
    JOIN dbo.Workers w ON w.PublicId = x.PublicId
    WHERE NOT EXISTS (SELECT 1 FROM dbo.WorkerServices ws WHERE ws.WorkerId = w.WorkerId AND ws.ServiceName = x.ServiceName);
END;
GO

/* Seed the six applications from the prototype queue, using fictional example details. */
IF NOT EXISTS (SELECT 1 FROM dbo.WorkerApplications)
BEGIN
    INSERT dbo.WorkerApplications
      (FullName, Email, Phone, CategoryId, SuburbId, MainService, YearsExperience, SubmittedAt,
       IdentityStatus, QualificationStatus, ReferenceCount, Description, StartingPrice, Status)
    SELECT v.FullName, v.Email, v.Phone, c.CategoryId, s.SuburbId, v.MainService, v.YearsExperience,
           v.SubmittedAt, v.IdentityStatus, v.QualificationStatus, v.ReferenceCount, v.Description, v.StartingPrice, v.Status
    FROM (VALUES
      (N'Lindiwe Mthembu',N'lindiwe.m@example.co.za',N'072 555 0141',N'cleaning',N'Bellville',N'Deep Cleaning',4,CONVERT(DATETIME2(0),'2026-10-02'),N'Verified',N'Not required',2,N'Experienced domestic cleaner looking for more weekly clients.',220,N'Application Submitted'),
      (N'Riaan Steyn',N'riaan.s@example.co.za',N'083 555 0177',N'electrical',N'Durbanville',N'Inverter Installation',7,CONVERT(DATETIME2(0),'2026-09-29'),N'Verified',N'Pending',3,N'Qualified electrician, recently went independent.',500,N'Under Review'),
      (N'Yusuf Hendricks',N'yusuf.h@example.co.za',N'061 555 0102',N'it',N'Observatory',N'Computer Repair',2,CONVERT(DATETIME2(0),'2026-09-27'),N'Pending',N'Not required',1,N'Final-year IT student offering repairs after hours.',200,N'Interview Required'),
      (N'Nomsa Shabalala',N'nomsa.s@example.co.za',N'079 555 0190',N'tutoring',N'Stellenbosch',N'English',3,CONVERT(DATETIME2(0),'2026-09-24'),N'Verified',N'Verified',2,N'B.Ed graduate tutoring languages for Grades 4–12.',180,N'Approved'),
      (N'Kyle Daniels',N'kyle.d@example.co.za',N'082 555 0123',N'automotive',N'Parow',N'Vehicle Diagnostics',1,CONVERT(DATETIME2(0),'2026-09-20'),N'Verified',N'Pending',0,N'Hobby mechanic wanting to start a mobile service.',300,N'Rejected'),
      (N'Thabo Mokoena',N'thabo.app@example.co.za',N'074 555 0166',N'garden',N'Bellville',N'General Garden Maintenance',6,CONVERT(DATETIME2(0),'2026-03-12'),N'Verified',N'Not required',3,N'Independent gardener, 6 years experience.',250,N'Approved')
    ) v(FullName,Email,Phone,CategorySlug,SuburbName,MainService,YearsExperience,SubmittedAt,IdentityStatus,QualificationStatus,ReferenceCount,Description,StartingPrice,Status)
    JOIN dbo.Categories c ON c.Slug = v.CategorySlug
    JOIN dbo.Suburbs s ON s.Name = v.SuburbName
    WHERE NOT EXISTS (SELECT 1 FROM dbo.WorkerApplications a WHERE a.Email = v.Email);
END;
GO

/* Demo customer and admin accounts (prototype accounts; no passwords are stored). */
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'customer.demo@localhands.example')
    INSERT dbo.Users (FullName, Email, Phone, Role) VALUES (N'Demo Customer', N'customer.demo@localhands.example', N'071 000 0001', N'Customer');
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Email = N'admin.demo@localhands.example')
    INSERT dbo.Users (FullName, Email, Phone, Role) VALUES (N'Demo Admin', N'admin.demo@localhands.example', N'071 000 0002', N'Admin');
GO

/* Weekly schedule for workers; weekday numbers use Monday=1 through Sunday=7. */
IF NOT EXISTS (SELECT 1 FROM dbo.WeeklyHours)
BEGIN
    INSERT dbo.WeeklyHours (WorkerId, DayOfWeek, StartTime, EndTime)
    SELECT w.WorkerId, x.DayOfWeek, x.StartTime, x.EndTime
    FROM (VALUES
      (N'thabo',1,'08:00','17:00'),(N'thabo',2,'08:00','17:00'),(N'thabo',4,'08:00','17:00'),(N'thabo',5,'08:00','15:00'),(N'thabo',6,'09:00','13:00'),
      (N'johan',1,'07:00','17:00'),(N'johan',2,'07:00','17:00'),(N'johan',3,'07:00','17:00'),(N'johan',4,'07:00','17:00'),(N'johan',5,'07:00','17:00'),
      (N'naledi',1,'07:00','17:00'),(N'naledi',2,'07:00','17:00'),(N'naledi',3,'07:00','17:00'),(N'naledi',4,'07:00','17:00'),(N'naledi',5,'07:00','17:00'),
      (N'daniel',1,'07:00','17:00'),(N'daniel',2,'07:00','17:00'),(N'daniel',3,'07:00','17:00'),(N'daniel',4,'07:00','17:00'),(N'daniel',5,'07:00','17:00')
    ) x(PublicId,DayOfWeek,StartTime,EndTime)
    JOIN dbo.Workers w ON w.PublicId = x.PublicId;
END;
GO

/* Future availability slots: a small set of explicit demo slots, not a full calendar generator. */
IF NOT EXISTS (SELECT 1 FROM dbo.AvailabilitySlots)
BEGIN
    INSERT dbo.AvailabilitySlots (WorkerId, StartsAt, EndsAt, SlotStatus)
    SELECT w.WorkerId, v.StartsAt, DATEADD(HOUR, 1, v.StartsAt), N'Available'
    FROM (VALUES
      (N'thabo',CONVERT(DATETIME2(0),'2026-11-02T09:00:00')),
      (N'thabo',CONVERT(DATETIME2(0),'2026-11-03T11:00:00')),
      (N'thabo',CONVERT(DATETIME2(0),'2026-11-05T09:00:00')),
      (N'naledi',CONVERT(DATETIME2(0),'2026-11-02T10:00:00')),
      (N'daniel',CONVERT(DATETIME2(0),'2026-11-03T14:00:00')),
      (N'ayesha',CONVERT(DATETIME2(0),'2026-11-04T16:00:00'))
    ) v(PublicId,StartsAt)
    JOIN dbo.Workers w ON w.PublicId = v.PublicId
    WHERE NOT EXISTS (SELECT 1 FROM dbo.AvailabilitySlots a WHERE a.WorkerId = w.WorkerId AND a.StartsAt = v.StartsAt);
END;
GO

/* Three demo requests, linked to real service rows. Slot linkage is nullable for historic jobs. */
IF NOT EXISTS (SELECT 1 FROM dbo.ServiceRequests)
BEGIN
    DECLARE @CustomerId INT = (SELECT UserId FROM dbo.Users WHERE Email = N'customer.demo@localhands.example');
    INSERT dbo.ServiceRequests
      (PublicReference, CustomerId, WorkerId, ServiceId, SlotId, JobNotes, ServiceEstimate, TravelFee, Status, ScheduledAt, CreatedAt, CompletedAt)
    SELECT v.PublicReference, @CustomerId, w.WorkerId, ws.ServiceId, NULL, v.JobNotes, v.ServiceEstimate, v.TravelFee, v.Status, v.ScheduledAt, v.CreatedAt, v.CompletedAt
    FROM (VALUES
      (N'SR-1038',N'thabo',N'Hedge & Tree Trimming',N'Please trim the front hedge as well.',350,50,N'Pending',CONVERT(DATETIME2(0),'2026-11-05T09:00:00'),CONVERT(DATETIME2(0),'2026-10-20'),CAST(NULL AS DATETIME2(0))),
      (N'SR-1031',N'thabo',N'Lawn Cutting',N'Please use the side gate.',250,50,N'Accepted',CONVERT(DATETIME2(0),'2026-11-06T11:00:00'),CONVERT(DATETIME2(0),'2026-10-18'),CAST(NULL AS DATETIME2(0))),
      (N'SR-1019',N'thabo',N'General Garden Maintenance',N'Routine garden maintenance.',300,50,N'Completed',CONVERT(DATETIME2(0),'2026-09-28T09:00:00'),CONVERT(DATETIME2(0),'2026-09-25'),CONVERT(DATETIME2(0),'2026-09-28T11:00:00'))
    ) v(PublicReference,PublicId,ServiceName,JobNotes,ServiceEstimate,TravelFee,Status,ScheduledAt,CreatedAt,CompletedAt)
    JOIN dbo.Workers w ON w.PublicId = v.PublicId
    JOIN dbo.WorkerServices ws ON ws.WorkerId = w.WorkerId AND ws.ServiceName = v.ServiceName;
END;
GO

/* =========================================================
   9. REPORTING VIEWS
   ========================================================= */

CREATE OR ALTER VIEW dbo.vw_CategoryCoverage
AS
    SELECT c.CategoryId, c.Slug, c.Name, COUNT(w.WorkerId) AS LiveWorkers
    FROM dbo.Categories AS c
    LEFT JOIN dbo.Workers AS w
      ON w.CategoryId = c.CategoryId AND w.ListingStatus = N'Live'
    GROUP BY c.CategoryId, c.Slug, c.Name;
GO

CREATE OR ALTER VIEW dbo.vw_WorkerSummary
AS
    SELECT
        w.WorkerId, w.PublicId, u.FullName, c.Slug AS CategorySlug, c.Name AS CategoryName,
        s.Name AS Suburb, w.YearsExperience, w.StartingPrice, w.TravelFee, w.About, w.PhotoUrl,
        w.QualifiedTitle, w.IsIdentityVerified, w.IsExperienceVerified, w.IsQualified,
        w.AvailabilityStatus, w.ListingStatus, w.RatingAverage, w.ReviewCount, w.JobsCompleted
    FROM dbo.Workers AS w
    INNER JOIN dbo.Users AS u ON u.UserId = w.UserId
    INNER JOIN dbo.Categories AS c ON c.CategoryId = w.CategoryId
    INNER JOIN dbo.Suburbs AS s ON s.SuburbId = w.SuburbId;
GO

CREATE OR ALTER VIEW dbo.vw_ServiceRequestSummary
AS
    SELECT
        r.RequestId, r.PublicReference, r.Status, r.ScheduledAt, r.CreatedAt, r.CompletedAt,
        customer.FullName AS CustomerName, worker.PublicId, workerUser.FullName AS WorkerName,
        ws.ServiceName, suburb.Name AS WorkerSuburb, r.ServiceEstimate, r.TravelFee, r.TotalPrice, r.JobNotes
    FROM dbo.ServiceRequests AS r
    INNER JOIN dbo.Users AS customer ON customer.UserId = r.CustomerId
    INNER JOIN dbo.Workers AS worker ON worker.WorkerId = r.WorkerId
    INNER JOIN dbo.Users AS workerUser ON workerUser.UserId = worker.UserId
    INNER JOIN dbo.WorkerServices AS ws ON ws.ServiceId = r.ServiceId
    INNER JOIN dbo.Suburbs AS suburb ON suburb.SuburbId = worker.SuburbId;
GO

/* =========================================================
   10. STORED PROCEDURES FOR SAFE WORKFLOW CHANGES
   ========================================================= */

CREATE OR ALTER PROCEDURE dbo.usp_SetApplicationStatus
    @ApplicationId INT,
    @AdminId INT,
    @NewStatus NVARCHAR(24),
    @Note NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @NewStatus NOT IN (N'Under Review', N'Interview Required', N'Approved', N'Rejected')
        THROW 50001, 'Invalid application status.', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserId = @AdminId AND Role = N'Admin' AND IsActive = 1)
        THROW 50002, 'An active admin account is required.', 1;

    BEGIN TRANSACTION;
        UPDATE dbo.WorkerApplications
        SET Status = @NewStatus, ReviewedAt = SYSUTCDATETIME()
        WHERE ApplicationId = @ApplicationId;

        IF @@ROWCOUNT = 0
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50003, 'Application was not found.', 1;
        END;

        INSERT dbo.AdminActions (AdminId, ApplicationId, Action, Note)
        VALUES (@AdminId, @ApplicationId,
            CASE @NewStatus
              WHEN N'Interview Required' THEN N'Interview'
              WHEN N'Under Review' THEN N'UnderReview'
              ELSE @NewStatus
            END,
            @Note);
    COMMIT TRANSACTION;
END;
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

    BEGIN TRANSACTION;
        SELECT @OldStatus = Status
        FROM dbo.ServiceRequests WITH (UPDLOCK, ROWLOCK)
        WHERE RequestId = @RequestId;

        IF @OldStatus IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            THROW 50012, 'Service request was not found.', 1;
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
            UPDATE dbo.AvailabilitySlots SET SlotStatus = N'Available'
            WHERE SlotId = (SELECT SlotId FROM dbo.ServiceRequests WHERE RequestId = @RequestId);
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

CREATE OR ALTER PROCEDURE dbo.usp_AddReview
    @RequestId INT,
    @CustomerId INT,
    @Rating TINYINT,
    @Comment NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Rating NOT BETWEEN 1 AND 5
        THROW 50021, 'Rating must be from 1 to 5.', 1;

    DECLARE @WorkerId INT;

    SELECT @WorkerId = WorkerId
    FROM dbo.ServiceRequests
    WHERE RequestId = @RequestId AND CustomerId = @CustomerId AND Status = N'Completed';

    IF @WorkerId IS NULL
        THROW 50022, 'Only the customer who owns a completed request may review it.', 1;

    BEGIN TRANSACTION;
        INSERT dbo.Reviews (RequestId, CustomerId, WorkerId, Rating, Comment)
        VALUES (@RequestId, @CustomerId, @WorkerId, @Rating, @Comment);

        UPDATE w
        SET ReviewCount = x.ReviewCount,
            RatingAverage = x.RatingAverage
        FROM dbo.Workers w
        CROSS APPLY (
            SELECT COUNT(*) AS ReviewCount, CAST(AVG(CAST(r.Rating AS DECIMAL(4,2))) AS DECIMAL(3,2)) AS RatingAverage
            FROM dbo.Reviews r WHERE r.WorkerId = w.WorkerId AND r.IsVisible = 1
        ) x
        WHERE w.WorkerId = @WorkerId;
    COMMIT TRANSACTION;
END;
GO

/* =========================================================
   11. VERIFICATION QUERIES
   ========================================================= */

SELECT N'Categories' AS TableName, COUNT(*) AS TotalRows FROM dbo.Categories
UNION ALL SELECT N'Suburbs', COUNT(*) FROM dbo.Suburbs
UNION ALL SELECT N'Users', COUNT(*) FROM dbo.Users
UNION ALL SELECT N'Workers', COUNT(*) FROM dbo.Workers
UNION ALL SELECT N'WorkerServices', COUNT(*) FROM dbo.WorkerServices
UNION ALL SELECT N'WorkerApplications', COUNT(*) FROM dbo.WorkerApplications
UNION ALL SELECT N'ServiceRequests', COUNT(*) FROM dbo.ServiceRequests;
GO

SELECT * FROM dbo.vw_CategoryCoverage ORDER BY CategoryId;
SELECT * FROM dbo.vw_WorkerSummary ORDER BY FullName;
SELECT * FROM dbo.vw_ServiceRequestSummary ORDER BY ScheduledAt DESC;
GO

