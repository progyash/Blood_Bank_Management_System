-- Create Database
CREATE DATABASE BloodBankManagementSystem;
USE BloodBankManagementSystem;

-- ============================================
-- Table: BloodType
-- ============================================
CREATE TABLE BloodType (
    Blood_Type_ID VARCHAR(10) PRIMARY KEY,
    Name          VARCHAR(100) NOT NULL
);

-- Display BloodType Table Structure
DESC BloodType;

-- Display All Records from BloodType Table
SELECT * FROM BloodType;

-- ============================================
-- Table: Hospital
-- (New table to store hospital details)
-- ============================================
CREATE TABLE Hospital (
    Hospital_ID    VARCHAR(10) PRIMARY KEY,
    Name           VARCHAR(100) NOT NULL,
    Address        VARCHAR(255),
    Contact_Number VARCHAR(15) NOT NULL
);

-- Display Hospital Table Structure
DESC Hospital;

-- Display All Records from Hospital Table
SELECT * FROM Hospital;

-- ============================================
-- Table: Donor
-- ============================================
CREATE TABLE Donor (
    Donor_ID        VARCHAR(10) PRIMARY KEY,
    Name            VARCHAR(100) NOT NULL,
    Contact_Number  VARCHAR(15) NOT NULL,
    Blood_Type_ID   VARCHAR(10),
    Donor_Card_ID   VARCHAR(10),
    FOREIGN KEY (Blood_Type_ID) REFERENCES BloodType(Blood_Type_ID),
    CHECK (Age >= 18) -- Ensures only 18+ donors can be added
);

-- Display Donor Table Structure
DESC Donor;

-- Display All Records from Donor Table
SELECT * FROM Donor;

-- ============================================
-- Table: DonationCard
-- ============================================
CREATE TABLE DonationCard (
    Card_ID  VARCHAR(10) PRIMARY KEY,
    Donor_ID VARCHAR(10),
    FOREIGN KEY (Donor_ID) REFERENCES Donor(Donor_ID)
);

-- Display DonationCard Table Structure
DESC DonationCard;

-- Display All Records from DonationCard Table
SELECT * FROM DonationCard;

-- ============================================
-- Table: DonorTransactions
-- (Now includes Hospital_ID to indicate the hospital where the donation took place)
-- ============================================
CREATE TABLE DonorTransactions (
    Donor_Trans_ID        VARCHAR(10) PRIMARY KEY,
    Donor_ID              VARCHAR(10),
    Donation_Confirmation VARCHAR(50),
    Health_Condition      VARCHAR(50),
    Date                  VARCHAR(15),
    Hospital_ID           VARCHAR(10),  -- New column for hospital reference
    FOREIGN KEY (Donor_ID)   REFERENCES Donor(Donor_ID),
    FOREIGN KEY (Hospital_ID) REFERENCES Hospital(Hospital_ID)
);

-- Display DonorTransactions Table Structure
DESC DonorTransactions;

-- Display All Records from DonorTransactions Table
SELECT * FROM DonorTransactions;

-- ============================================
-- Table: Recipient
-- ============================================
CREATE TABLE Recipient (
    Recipient_ID   VARCHAR(10) PRIMARY KEY,
    Name           VARCHAR(100) NOT NULL,
    Contact_Number VARCHAR(15) NOT NULL,
    Blood_Type_ID  VARCHAR(10),
    Donor_ID       VARCHAR(10),
    FOREIGN KEY (Blood_Type_ID) REFERENCES BloodType(Blood_Type_ID),
    FOREIGN KEY (Donor_ID) REFERENCES Donor(Donor_ID)
);

-- Display Recipient Table Structure
DESC Recipient;

-- Display All Records from Recipient Table
SELECT * FROM Recipient;

-- ============================================
-- Table: RecipientTransactions
-- (Now includes Hospital_ID to record the hospital where the transfusion/transaction occurred)
-- ============================================
CREATE TABLE RecipientTransactions (
    Recipient_Trans_ID VARCHAR(10) PRIMARY KEY,
    Recipient_ID       VARCHAR(10),
    Recipient_Request  VARCHAR(255),
    Date               VARCHAR(15),
    Donor_Card_ID      VARCHAR(10),
    Blood_Type_ID      VARCHAR(10),
    Hospital_ID        VARCHAR(10),  -- New column for hospital reference
    FOREIGN KEY (Recipient_ID)   REFERENCES Recipient(Recipient_ID),
    FOREIGN KEY (Donor_Card_ID)    REFERENCES DonationCard(Card_ID),
    FOREIGN KEY (Blood_Type_ID)    REFERENCES BloodType(Blood_Type_ID),
    FOREIGN KEY (Hospital_ID)      REFERENCES Hospital(Hospital_ID)
);

-- Display RecipientTransactions Table Structure
DESC RecipientTransactions;

-- Display All Records from RecipientTransactions Table
SELECT * FROM RecipientTransactions;
