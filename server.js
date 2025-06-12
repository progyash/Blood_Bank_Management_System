// server.js

const express = require('express');
const mysql = require('mysql2/promise'); // Using promise-based version
const cors = require('cors');

const app = express();
const port = 3000;

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing for all routes
app.use(express.json()); // Parse incoming JSON requests

// --- Database Configuration ---
// Replace with your actual database credentials
const dbConfig = {
    host: 'localhost',
    user: 'root',            // Your MySQL username
    password: 'mysql@123',       // Your MySQL password (use environment variables in production!)
    database: 'BloodBankManagementSystem',
    waitForConnections: true,
    connectionLimit: 15,     // Adjust pool size based on expected load
    queueLimit: 0,           // Unlimited queue (or set a limit)
    connectTimeout: 10000    // 10 seconds connection timeout
};

// --- Database Connection Pool ---
let pool;
try {
    pool = mysql.createPool(dbConfig);
    console.log("MySQL Connection Pool created successfully.");
    // Optional: Test connection on startup to fail fast if DB is down
    pool.query('SELECT 1')
        .then(() => console.log("Database connection test successful."))
        .catch(err => {
            console.error("FATAL ERROR: Database connection test failed.", err);
            process.exit(1); // Exit if DB connection fails initially
        });
} catch (error) {
    console.error("FATAL ERROR: Could not create MySQL Connection Pool.", error);
    process.exit(1); // Exit if pool creation fails
}

// --- Error Handling Utility ---
const sendErrorResponse = (res, statusCode, message, error = null) => {
    // Log the detailed error on the server for debugging
    console.error("API Error:", message, error ? error.message || error : '');

    // Determine the message to send to the client
    // Avoid sending detailed internal errors in production
    const clientMessage = (statusCode >= 500 && process.env.NODE_ENV === 'production')
        ? 'An internal server error occurred. Please try again later.'
        : message; // Send the specific message in development or for client errors (4xx)

    res.status(statusCode).json({
        message: clientMessage,
        // Optionally include simplified error type in non-production for easier debugging
        errorType: (process.env.NODE_ENV !== 'production' && error) ? error.constructor.name : undefined
    });
};

// --- API Endpoints ---

// === Blood Types ===

// GET all Blood Types (Sorted by ID)
app.get('/api/blood-types', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM BloodType ORDER BY Blood_Type_ID ASC');
        res.json(rows);
    } catch (error) {
        sendErrorResponse(res, 500, 'Error fetching blood types.', error);
    }
});

// POST a new Blood Type
app.post('/api/blood-types', async (req, res) => {
    const { Blood_Type_ID, Name } = req.body;
    if (!Blood_Type_ID || !Name || Blood_Type_ID.trim() === '' || Name.trim() === '') {
        return sendErrorResponse(res, 400, 'Blood Type ID and Name are required.');
    }
    try {
        await pool.query('INSERT INTO BloodType (Blood_Type_ID, Name) VALUES (?, ?)', [Blood_Type_ID.trim(), Name.trim()]);
        res.status(201).json({ message: `Blood Type '${Name.trim()}' created successfully.`, insertedId: Blood_Type_ID.trim() });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
             if (error.message.includes('PRIMARY')) sendErrorResponse(res, 409, `Blood Type with ID '${Blood_Type_ID}' already exists.`);
             else if (error.message.includes('Name')) sendErrorResponse(res, 409, `Blood Type with Name '${Name}' already exists.`);
             else sendErrorResponse(res, 409, 'Duplicate entry error.');
        } else {
            sendErrorResponse(res, 500, 'Error creating blood type.', error);
        }
    }
});

// PUT (Update) a Blood Type by ID
app.put('/api/blood-types/:id', async (req, res) => {
    const { id } = req.params;
    const { Name } = req.body;
    if (!Name || Name.trim() === '') {
        return sendErrorResponse(res, 400, 'Blood Type Name is required for update.');
    }
    try {
        const [result] = await pool.query('UPDATE BloodType SET Name = ? WHERE Blood_Type_ID = ?', [Name.trim(), id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Blood Type with ID '${id}' not found.`);
        }
        res.json({ message: `Blood Type '${id}' updated successfully.` });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY' && error.message.includes('Name')) {
             sendErrorResponse(res, 409, `Another Blood Type with name '${Name}' already exists.`);
        } else {
             sendErrorResponse(res, 500, `Error updating blood type '${id}'.`, error);
        }
    }
});

// DELETE a Blood Type by ID
app.delete('/api/blood-types/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM BloodType WHERE Blood_Type_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Blood Type with ID '${id}' not found.`);
        }
        res.json({ message: `Blood Type '${id}' deleted successfully.` });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.message.toLowerCase().includes('foreign key constraint')) {
            sendErrorResponse(res, 409, `Cannot delete Blood Type '${id}'. It is referenced by other records.`);
        } else {
            sendErrorResponse(res, 500, `Error deleting blood type '${id}'.`, error);
        }
    }
});

// === Hospitals ===

// GET all Hospitals (Sorted by ID)
app.get('/api/hospitals', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Hospital ORDER BY Hospital_ID ASC');
        res.json(rows);
    } catch (error) {
        sendErrorResponse(res, 500, 'Error fetching hospitals.', error);
    }
});

// POST a new Hospital
app.post('/api/hospitals', async (req, res) => {
    const { Hospital_ID, Name, Address, Contact_Number } = req.body;
    if (!Hospital_ID || !Name || !Contact_Number || Hospital_ID.trim() === '' || Name.trim() === '' || Contact_Number.trim() === '') {
        return sendErrorResponse(res, 400, 'Hospital ID, Name, and Contact Number are required.');
    }
    try {
        await pool.query('INSERT INTO Hospital (Hospital_ID, Name, Address, Contact_Number) VALUES (?, ?, ?, ?)',
            [Hospital_ID.trim(), Name.trim(), Address?.trim() || null, Contact_Number.trim()]);
        res.status(201).json({ message: `Hospital '${Name.trim()}' created successfully.`, insertedId: Hospital_ID.trim() });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            sendErrorResponse(res, 409, `Hospital with ID '${Hospital_ID}' already exists.`);
        } else {
            sendErrorResponse(res, 500, 'Error creating hospital.', error);
        }
    }
});

// PUT (Update) a Hospital by ID
app.put('/api/hospitals/:id', async (req, res) => {
    const { id } = req.params;
    const { Name, Address, Contact_Number } = req.body;
    if (!Name || !Contact_Number || Name.trim() === '' || Contact_Number.trim() === '') {
        return sendErrorResponse(res, 400, 'Name and Contact Number are required for update.');
    }
    try {
        const [result] = await pool.query(
            'UPDATE Hospital SET Name = ?, Address = ?, Contact_Number = ? WHERE Hospital_ID = ?',
            [Name.trim(), Address?.trim() || null, Contact_Number.trim(), id]
        );
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Hospital with ID '${id}' not found.`);
        }
        res.json({ message: `Hospital '${id}' updated successfully.` });
    } catch (error) {
        sendErrorResponse(res, 500, `Error updating hospital '${id}'.`, error);
    }
});

// DELETE a Hospital by ID
app.delete('/api/hospitals/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM Hospital WHERE Hospital_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Hospital with ID '${id}' not found.`);
        }
        res.json({ message: `Hospital '${id}' deleted successfully.` });
    } catch (error) {
         if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.message.toLowerCase().includes('foreign key constraint')) {
            sendErrorResponse(res, 409, `Cannot delete Hospital '${id}'. It is referenced by transactions.`);
        } else {
            sendErrorResponse(res, 500, `Error deleting hospital '${id}'.`, error);
        }
    }
});

// === Donors ===

// GET all Donors (Sorted by ID)
app.get('/api/donors', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.*, bt.Name as Blood_Type_Name
            FROM Donor d
            LEFT JOIN BloodType bt ON d.Blood_Type_ID = bt.Blood_Type_ID
            ORDER BY d.Donor_ID ASC
        `);
        res.json(rows);
    } catch (error) {
        sendErrorResponse(res, 500, 'Error fetching donors.', error);
    }
});

// POST a new Donor
app.post('/api/donors', async (req, res) => {
    const { Donor_ID, Name, Contact_Number, Blood_Type_ID, Donor_Card_ID, Age } = req.body;
    if (!Donor_ID || !Name || !Contact_Number || !Blood_Type_ID || Age === undefined || Age === null || Donor_ID.trim() === '' || Name.trim() === '' || Contact_Number.trim() === '' || Blood_Type_ID.trim() === '') {
        return sendErrorResponse(res, 400, 'Donor ID, Name, Contact, Blood Type, and Age are required.');
    }
    const ageInt = parseInt(Age, 10);
    if (isNaN(ageInt) || ageInt < 18) {
        return sendErrorResponse(res, 400, 'Age must be a valid number and 18 or older.');
    }
    const donorCardTrimmed = Donor_Card_ID?.trim() || null;
    try {
        await pool.query(
            'INSERT INTO Donor (Donor_ID, Name, Contact_Number, Blood_Type_ID, Donor_Card_ID, Age) VALUES (?, ?, ?, ?, ?, ?)',
            [Donor_ID.trim(), Name.trim(), Contact_Number.trim(), Blood_Type_ID.trim(), donorCardTrimmed, ageInt]
        );
        // If using separate DonationCard table, handle insertion here too (within transaction if needed)
        res.status(201).json({ message: `Donor '${Name.trim()}' created successfully.`, insertedId: Donor_ID.trim() });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('PRIMARY')) sendErrorResponse(res, 409, `Donor with ID '${Donor_ID}' already exists.`);
            else if (error.message.includes('Donor_Card_ID')) sendErrorResponse(res, 409, `Donation Card ID '${Donor_Card_ID}' is already assigned.`);
            else sendErrorResponse(res, 409, 'Duplicate entry error.');
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            sendErrorResponse(res, 400, `Invalid Blood Type ID '${Blood_Type_ID}' provided.`);
        } else if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || error.message.includes('Age')) {
            sendErrorResponse(res, 400, 'Age must be 18 or greater.');
        } else {
            sendErrorResponse(res, 500, 'Error creating donor.', error);
        }
    }
});

// PUT (Update) a Donor by ID
app.put('/api/donors/:id', async (req, res) => {
    const { id } = req.params;
    const { Name, Contact_Number, Blood_Type_ID, Donor_Card_ID, Age } = req.body;
    if (!Name || !Contact_Number || !Blood_Type_ID || Age === undefined || Age === null || Name.trim() === '' || Contact_Number.trim() === '' || Blood_Type_ID.trim() === '') {
       return sendErrorResponse(res, 400, 'Name, Contact, Blood Type, and Age are required.');
    }
    const ageInt = parseInt(Age, 10);
    if (isNaN(ageInt) || ageInt < 18) {
        return sendErrorResponse(res, 400, 'Age must be a valid number and 18 or older.');
    }
    const donorCardTrimmed = Donor_Card_ID?.trim() || null;
    try {
        const [result] = await pool.query(`
            UPDATE Donor
            SET Name = ?, Contact_Number = ?, Blood_Type_ID = ?, Donor_Card_ID = ?, Age = ?
            WHERE Donor_ID = ?
        `, [Name.trim(), Contact_Number.trim(), Blood_Type_ID.trim(), donorCardTrimmed, ageInt, id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Donor with ID '${id}' not found.`);
        }
        // Handle DonationCard table update if necessary
        res.json({ message: `Donor '${id}' updated successfully.` });
    } catch (error) {
         if (error.code === 'ER_DUP_ENTRY' && error.message.includes('Donor_Card_ID')) {
             sendErrorResponse(res, 409, `Donation Card ID '${Donor_Card_ID}' is already assigned to another donor.`);
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            sendErrorResponse(res, 400, `Invalid Blood Type ID '${Blood_Type_ID}' provided.`);
        } else if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || error.message.includes('Age')) {
            sendErrorResponse(res, 400, 'Age must be 18 or greater.');
        } else {
            sendErrorResponse(res, 500, `Error updating donor '${id}'.`, error);
        }
    }
});

// DELETE a Donor by ID
app.delete('/api/donors/:id', async (req, res) => {
    const { id } = req.params;
    // If using separate DonationCard table with CASCADE, it deletes automatically.
    // If not using CASCADE, delete from DonationCard first or handle error.
    try {
        // Optional: Delete from DonationCard first if needed
        // await pool.query('DELETE FROM DonationCard WHERE Donor_ID = ?', [id]);
        const [result] = await pool.query('DELETE FROM Donor WHERE Donor_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Donor with ID '${id}' not found.`);
        }
        res.json({ message: `Donor '${id}' deleted successfully.` });
    } catch (error) {
         if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.message.toLowerCase().includes('foreign key constraint')) {
            sendErrorResponse(res, 409, `Cannot delete Donor '${id}'. It is referenced by other records (Transactions/Recipients).`);
        } else {
            sendErrorResponse(res, 500, `Error deleting donor '${id}'.`, error);
        }
    }
});

// === Recipients ===

// GET all Recipients (Sorted by ID)
app.get('/api/recipients', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT r.*, bt.Name as Blood_Type_Name
            FROM Recipient r
            LEFT JOIN BloodType bt ON r.Blood_Type_ID = bt.Blood_Type_ID
            ORDER BY r.Recipient_ID ASC
        `);
        res.json(rows);
    } catch (error) {
        sendErrorResponse(res, 500, 'Error fetching recipients.', error);
    }
});

// POST a new Recipient
app.post('/api/recipients', async (req, res) => {
    const { Recipient_ID, Name, Contact_Number, Blood_Type_ID, Donor_ID } = req.body;
    if (!Recipient_ID || !Name || !Contact_Number || !Blood_Type_ID || Recipient_ID.trim() === '' || Name.trim() === '' || Contact_Number.trim() === '' || Blood_Type_ID.trim() === '') {
        return sendErrorResponse(res, 400, 'Recipient ID, Name, Contact, and Required Blood Type are required.');
    }
    const directedDonorId = Donor_ID?.trim() || null;
    try {
        await pool.query(
            'INSERT INTO Recipient (Recipient_ID, Name, Contact_Number, Blood_Type_ID, Donor_ID) VALUES (?, ?, ?, ?, ?)',
            [Recipient_ID.trim(), Name.trim(), Contact_Number.trim(), Blood_Type_ID.trim(), directedDonorId]
        );
        res.status(201).json({ message: `Recipient '${Name.trim()}' created successfully.`, insertedId: Recipient_ID.trim() });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            sendErrorResponse(res, 409, `Recipient with ID '${Recipient_ID}' already exists.`);
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            if (error.message.includes('Blood_Type_ID')) sendErrorResponse(res, 400, `Invalid Blood Type ID '${Blood_Type_ID}' provided.`);
            else if (error.message.includes('Donor_ID') && directedDonorId) sendErrorResponse(res, 400, `Invalid Directed Donor ID '${directedDonorId}' provided.`);
            else sendErrorResponse(res, 400, 'Invalid foreign key (Blood Type or Directed Donor).');
        } else {
            sendErrorResponse(res, 500, 'Error creating recipient.', error);
        }
    }
});

// PUT (Update) a Recipient by ID
app.put('/api/recipients/:id', async (req, res) => {
    const { id } = req.params;
    const { Name, Contact_Number, Blood_Type_ID, Donor_ID } = req.body;
    if (!Name || !Contact_Number || !Blood_Type_ID || Name.trim() === '' || Contact_Number.trim() === '' || Blood_Type_ID.trim() === '') {
        return sendErrorResponse(res, 400, 'Name, Contact, and Required Blood Type are required.');
    }
     const directedDonorId = Donor_ID?.trim() || null;
    try {
        const [result] = await pool.query(`
            UPDATE Recipient
            SET Name = ?, Contact_Number = ?, Blood_Type_ID = ?, Donor_ID = ?
            WHERE Recipient_ID = ?
        `, [Name.trim(), Contact_Number.trim(), Blood_Type_ID.trim(), directedDonorId, id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Recipient with ID '${id}' not found.`);
        }
        res.json({ message: `Recipient '${id}' updated successfully.` });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            if (error.message.includes('Blood_Type_ID')) sendErrorResponse(res, 400, `Invalid Blood Type ID '${Blood_Type_ID}' provided.`);
            else if (error.message.includes('Donor_ID') && directedDonorId) sendErrorResponse(res, 400, `Invalid Directed Donor ID '${directedDonorId}' provided.`);
            else sendErrorResponse(res, 400, 'Invalid foreign key (Blood Type or Directed Donor).');
        } else {
            sendErrorResponse(res, 500, `Error updating recipient '${id}'.`, error);
        }
    }
});

// DELETE a Recipient by ID
app.delete('/api/recipients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM Recipient WHERE Recipient_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Recipient with ID '${id}' not found.`);
        }
        res.json({ message: `Recipient '${id}' deleted successfully.` });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.message.toLowerCase().includes('foreign key constraint')) {
            sendErrorResponse(res, 409, `Cannot delete Recipient '${id}'. It is referenced by recipient transactions.`);
        } else {
            sendErrorResponse(res, 500, `Error deleting recipient '${id}'.`, error);
        }
    }
});

// === Donor Transactions ===

// GET all Donor Transactions (Sorted by Date DESC)
app.get('/api/donor-transactions', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT dt.*, d.Name as Donor_Name, h.Name as Hospital_Name
            FROM DonorTransactions dt
            LEFT JOIN Donor d ON dt.Donor_ID = d.Donor_ID
            LEFT JOIN Hospital h ON dt.Hospital_ID = h.Hospital_ID
            ORDER BY dt.Date DESC, dt.Donor_Trans_ID ASC
        `);
        res.json(rows);
    } catch (error) {
        sendErrorResponse(res, 500, 'Error fetching donor transactions.', error);
    }
});

// POST a new Donor Transaction
app.post('/api/donor-transactions', async (req, res) => {
    const { Donor_Trans_ID, Donor_ID, Donation_Confirmation, Health_Condition, Date, Hospital_ID } = req.body;
    if (!Donor_Trans_ID || !Donor_ID || !Hospital_ID || !Date || Donor_Trans_ID.trim() === '' || Donor_ID.trim() === '' || Hospital_ID.trim() === '' || Date.trim() === '') {
        return sendErrorResponse(res, 400, 'Transaction ID, Donor ID, Hospital ID, and Date are required.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(Date.trim())) {
        return sendErrorResponse(res, 400, 'Date must be in YYYY-MM-DD format.');
    }
    try {
        await pool.query(
            'INSERT INTO DonorTransactions (Donor_Trans_ID, Donor_ID, Donation_Confirmation, Health_Condition, Date, Hospital_ID) VALUES (?, ?, ?, ?, ?, ?)',
            [Donor_Trans_ID.trim(), Donor_ID.trim(), Donation_Confirmation?.trim() || null, Health_Condition?.trim() || null, Date.trim(), Hospital_ID.trim()]
        );
        res.status(201).json({ message: 'Donor transaction recorded successfully.', insertedId: Donor_Trans_ID.trim() });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            sendErrorResponse(res, 409, `Donor Transaction with ID '${Donor_Trans_ID}' already exists.`);
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            if (error.message.includes('Donor_ID')) sendErrorResponse(res, 400, `Invalid Donor ID '${Donor_ID}' provided.`);
            else if (error.message.includes('Hospital_ID')) sendErrorResponse(res, 400, `Invalid Hospital ID '${Hospital_ID}' provided.`);
            else sendErrorResponse(res, 400, 'Invalid Donor or Hospital ID provided.');
        } else {
            sendErrorResponse(res, 500, 'Error recording donor transaction.', error);
        }
    }
});

// PUT (Update) a Donor Transaction by ID
app.put('/api/donor-transactions/:id', async (req, res) => {
    const { id } = req.params;
    const { Donor_ID, Donation_Confirmation, Health_Condition, Date, Hospital_ID } = req.body;
    if (!Donor_ID || !Hospital_ID || !Date || Donor_ID.trim() === '' || Hospital_ID.trim() === '' || Date.trim() === '') {
        return sendErrorResponse(res, 400, 'Donor ID, Hospital ID, and Date are required for update.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(Date.trim())) {
         return sendErrorResponse(res, 400, 'Date must be in YYYY-MM-DD format.');
    }
    try {
        const [result] = await pool.query(`
            UPDATE DonorTransactions
            SET Donor_ID = ?, Donation_Confirmation = ?, Health_Condition = ?, Date = ?, Hospital_ID = ?
            WHERE Donor_Trans_ID = ?
        `, [Donor_ID.trim(), Donation_Confirmation?.trim() || null, Health_Condition?.trim() || null, Date.trim(), Hospital_ID.trim(), id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Donor Transaction with ID '${id}' not found.`);
        }
        res.json({ message: `Donor Transaction '${id}' updated successfully.` });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             if (error.message.includes('Donor_ID')) sendErrorResponse(res, 400, `Invalid Donor ID '${Donor_ID}' provided.`);
             else if (error.message.includes('Hospital_ID')) sendErrorResponse(res, 400, `Invalid Hospital ID '${Hospital_ID}' provided.`);
             else sendErrorResponse(res, 400, 'Invalid Donor or Hospital ID provided.');
        } else {
            sendErrorResponse(res, 500, `Error updating donor transaction '${id}'.`, error);
        }
    }
});

// DELETE a Donor Transaction by ID
app.delete('/api/donor-transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM DonorTransactions WHERE Donor_Trans_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Donor Transaction with ID '${id}' not found.`);
        }
        res.json({ message: `Donor Transaction '${id}' deleted successfully.` });
    } catch (error) {
        sendErrorResponse(res, 500, `Error deleting donor transaction '${id}'.`, error);
    }
});

// === Recipient Transactions ===

// GET all Recipient Transactions (Sorted by Date DESC)
app.get('/api/recipient-transactions', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                rt.*,
                r.Name as Recipient_Name,
                h.Name as Hospital_Name,
                bt.Name as Blood_Type_Name,
                dc.Donor_ID as Card_Donor_ID -- Added for potential display if needed
            FROM RecipientTransactions rt
            LEFT JOIN Recipient r ON rt.Recipient_ID = r.Recipient_ID
            LEFT JOIN Hospital h ON rt.Hospital_ID = h.Hospital_ID
            LEFT JOIN BloodType bt ON rt.Blood_Type_ID = bt.Blood_Type_ID
            LEFT JOIN DonationCard dc ON rt.Donor_Card_ID = dc.Card_ID -- Link to DonationCard if used
            ORDER BY rt.Date DESC, rt.Recipient_Trans_ID ASC
        `);
        res.json(rows);
    } catch (error) {
        sendErrorResponse(res, 500, 'Error fetching recipient transactions.', error);
    }
});

// POST a new Recipient Transaction
app.post('/api/recipient-transactions', async (req, res) => {
    const { Recipient_Trans_ID, Recipient_ID, Recipient_Request, Date, Donor_Card_ID, Blood_Type_ID, Hospital_ID } = req.body;
    if (!Recipient_Trans_ID || !Recipient_ID || !Hospital_ID || !Blood_Type_ID || !Date || Recipient_Trans_ID.trim() === '' || Recipient_ID.trim() === '' || Hospital_ID.trim() === '' || Blood_Type_ID.trim() === '' || Date.trim() === '') {
        return sendErrorResponse(res, 400, 'Transaction ID, Recipient ID, Hospital ID, Blood Type ID, and Date are required.');
    }
     if (!/^\d{4}-\d{2}-\d{2}$/.test(Date.trim())) {
         return sendErrorResponse(res, 400, 'Date must be in YYYY-MM-DD format.');
    }
    const sourceCardId = Donor_Card_ID?.trim() || null;
    try {
        await pool.query(`
            INSERT INTO RecipientTransactions
            (Recipient_Trans_ID, Recipient_ID, Recipient_Request, Date, Donor_Card_ID, Blood_Type_ID, Hospital_ID)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [Recipient_Trans_ID.trim(), Recipient_ID.trim(), Recipient_Request?.trim() || null, Date.trim(), sourceCardId, Blood_Type_ID.trim(), Hospital_ID.trim()]);
        res.status(201).json({ message: 'Recipient transaction recorded successfully.', insertedId: Recipient_Trans_ID.trim() });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            sendErrorResponse(res, 409, `Recipient Transaction with ID '${Recipient_Trans_ID}' already exists.`);
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             if (error.message.includes('Recipient_ID')) sendErrorResponse(res, 400, `Invalid Recipient ID '${Recipient_ID}' provided.`);
             else if (error.message.includes('Hospital_ID')) sendErrorResponse(res, 400, `Invalid Hospital ID '${Hospital_ID}' provided.`);
             else if (error.message.includes('Blood_Type_ID')) sendErrorResponse(res, 400, `Invalid Blood Type ID '${Blood_Type_ID}' provided.`);
             else if (error.message.includes('Donor_Card_ID') && sourceCardId) sendErrorResponse(res, 400, `Invalid Donor Card ID '${sourceCardId}' provided.`);
             else sendErrorResponse(res, 400, 'Invalid reference provided.');
        } else {
            sendErrorResponse(res, 500, 'Error recording recipient transaction.', error);
        }
    }
});

// PUT (Update) a Recipient Transaction by ID
app.put('/api/recipient-transactions/:id', async (req, res) => {
    const { id } = req.params;
    const { Recipient_ID, Recipient_Request, Date, Donor_Card_ID, Blood_Type_ID, Hospital_ID } = req.body;
    if (!Recipient_ID || !Hospital_ID || !Blood_Type_ID || !Date || Recipient_ID.trim() === '' || Hospital_ID.trim() === '' || Blood_Type_ID.trim() === '' || Date.trim() === '') {
        return sendErrorResponse(res, 400, 'Recipient ID, Hospital ID, Blood Type ID, and Date are required for update.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(Date.trim())) {
         return sendErrorResponse(res, 400, 'Date must be in YYYY-MM-DD format.');
    }
    const sourceCardId = Donor_Card_ID?.trim() || null;
    try {
        const [result] = await pool.query(`
            UPDATE RecipientTransactions
            SET Recipient_ID = ?, Recipient_Request = ?, Date = ?, Donor_Card_ID = ?, Blood_Type_ID = ?, Hospital_ID = ?
            WHERE Recipient_Trans_ID = ?
        `, [Recipient_ID.trim(), Recipient_Request?.trim() || null, Date.trim(), sourceCardId, Blood_Type_ID.trim(), Hospital_ID.trim(), id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Recipient Transaction with ID '${id}' not found.`);
        }
        res.json({ message: `Recipient Transaction '${id}' updated successfully.` });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
             if (error.message.includes('Recipient_ID')) sendErrorResponse(res, 400, `Invalid Recipient ID '${Recipient_ID}' provided.`);
             else if (error.message.includes('Hospital_ID')) sendErrorResponse(res, 400, `Invalid Hospital ID '${Hospital_ID}' provided.`);
             else if (error.message.includes('Blood_Type_ID')) sendErrorResponse(res, 400, `Invalid Blood Type ID '${Blood_Type_ID}' provided.`);
             else if (error.message.includes('Donor_Card_ID') && sourceCardId) sendErrorResponse(res, 400, `Invalid Donor Card ID '${sourceCardId}' provided.`);
             else sendErrorResponse(res, 400, 'Invalid reference provided.');
        } else {
            sendErrorResponse(res, 500, `Error updating recipient transaction '${id}'.`, error);
        }
    }
});

// DELETE a Recipient Transaction by ID
app.delete('/api/recipient-transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM RecipientTransactions WHERE Recipient_Trans_ID = ?', [id]);
        if (result.affectedRows === 0) {
            return sendErrorResponse(res, 404, `Recipient Transaction with ID '${id}' not found.`);
        }
        res.json({ message: `Recipient Transaction '${id}' deleted successfully.` });
    } catch (error) {
        sendErrorResponse(res, 500, `Error deleting recipient transaction '${id}'.`, error);
    }
});

// --- Root / Test Route ---
app.get('/', (req, res) => {
    res.json({ message: 'Blood Bank Management System API is active!' });
});

// --- 404 Handler (Not Found) ---
// This should be placed after all other specific API routes
app.use((req, res, next) => {
    sendErrorResponse(res, 404, `API route not found: ${req.method} ${req.originalUrl}`);
});

// --- Global Error Handler ---
// This should be the very last middleware defined
app.use((error, req, res, next) => {
    // Log the detailed error on the server regardless of environment
    console.error("Global Error Handler Caught:", error);

    // Send a generic error response, using the utility function
    sendErrorResponse(res, error.statusCode || 500, 'An unexpected server error occurred.', error);
});

// --- Start Server ---
const server = app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});

// --- Graceful Shutdown Logic ---
const gracefulShutdown = async (signal) => {
    console.log(`${signal} signal received: closing HTTP server and DB pool...`);
    server.close(async () => { // Stop accepting new connections
        console.log('HTTP server closed.');
        try {
            if (pool) {
                await pool.end(); // Close all connections in the pool
                console.log('DB Pool closed successfully.');
            }
        } catch (error) {
            console.error("Error closing DB pool:", error);
        } finally {
            console.log("Exiting process.");
            process.exit(0); // Exit after cleanup
        }
    });
};

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT')); // CTRL+C
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // `kill` command