const express = require('express');
const db = require('../connection'); // Import the database connection

const router = express.Router();

// Function to generate a 4-digit random number
function generateRandomId() {
    return Math.floor(1000 + Math.random() * 9000);
}

async function isIdUnique(connection, table, column, id) {
    const [rows] = await connection.query(`SELECT 1 FROM ?? WHERE ?? = ?`, [table, column, id]);
    return rows.length === 0;
}

router.post('/add', async (req, res) => {
    const { name, session_date, amount, transaction_date, transaction_type } = req.body;

    let connection; // Define connection variable in the outer scope

    try {
        // Start a transaction
        connection = await db.pool.getConnection();
        await connection.beginTransaction();

        let transaction_id;
        let non_member_id;

        // Generate unique transaction_id
        do {
            transaction_id = generateRandomId();
        } while (!(await isIdUnique(connection, 'transactions', 'transaction_id', transaction_id)));

        // Insert into transactions table
        await connection.query(
            `INSERT INTO transactions (transaction_id, amount, transaction_date, transaction_type, transaction_by)
             VALUES (?, ?, ?, ?, ?)`,
            [transaction_id, amount, transaction_date, transaction_type, name]
        );

        // Generate unique non_member_id
        do {
            non_member_id = generateRandomId();
        } while (!(await isIdUnique(connection, 'non_member', 'non_member_id', non_member_id)));

        // Insert into non_member table
        await connection.query(
            `INSERT INTO non_member (non_member_id, name, session_date, transaction_id)
             VALUES (?, ?, ?, ?)`,
            [non_member_id, name, session_date, transaction_id]
        );

        // Commit transaction
        await connection.commit();
        connection.release();

        res.status(201).json({ non_member_id });
    } catch (error) {
        // Rollback transaction in case of error
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Database Error:', error);
        res.status(500).json({ error: 'Database Error' });
    }
});


router.get('/view', async (req, res) => {
    try {
        const connection = await db.pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM non_member'); // Replace your_table with your actual table name
        connection.release();
        res.json(rows);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ error: err.message });
    }
});

// Function to format date and time
const formatDateTime = (dateTimeStr) => {
    const dateObj = new Date(dateTimeStr);
    if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date string');
    }
    const year = dateObj.getFullYear();
    const month = `0${dateObj.getMonth() + 1}`.slice(-2); // Months are zero-indexed
    const day = `0${dateObj.getDate()}`.slice(-2);
    const hours = `0${dateObj.getHours()}`.slice(-2);
    const minutes = `0${dateObj.getMinutes()}`.slice(-2);
    const seconds = `0${dateObj.getSeconds()}`.slice(-2);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// PUT API for updating non-member and transaction

router.put('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { name, dateTime } = req.body;

    let connection;

    try {
        // Validate dateTime
        const formattedDateTime = formatDateTime(dateTime);

        // Start a transaction
        connection = await db.pool.getConnection();
        await connection.beginTransaction();

        console.log(`Editing non_member with id: ${id}`);

        // Update non_member table for name and session_date
        const updateNonMemberQuery = 'UPDATE non_member SET name = ?, session_date = ? WHERE non_member_id = ?';
        await connection.query(updateNonMemberQuery, [name, formattedDateTime, id]);
        console.log(`Updated non_member table with name: ${name} and session_date: ${formattedDateTime}`);

        // Retrieve the transaction_id associated with the non_member
        const getTransactionIdQuery = 'SELECT transaction_id FROM non_member WHERE non_member_id = ?';
        const [rows] = await connection.query(getTransactionIdQuery, [id]);
        if (rows.length === 0) {
            throw new Error(`No transaction found for non_member_id: ${id}`);
        }

        const transactionId = rows[0].transaction_id;
        console.log(`Retrieved transaction_id: ${transactionId}`);

        // Update transactions table for transaction_date and transaction_by
        const updateTransactionQuery = 'UPDATE transactions SET transaction_date = ?, transaction_by = ? WHERE transaction_id = ?';
        await connection.query(updateTransactionQuery, [formattedDateTime, name, transactionId]);
        console.log(`Updated transactions table with transaction_date: ${formattedDateTime} and transaction_by: ${name}`);

        // Commit transaction
        await connection.commit();
        connection.release();

        res.status(200).json({ message: 'Non-member and transaction updated successfully' });
    } catch (error) {
        // Rollback transaction in case of error
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Database Error:', error);
        res.status(500).json({ error: 'Database Error', details: error.message });
    }
});


router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    let connection;

    try {
        // Start a transaction
        connection = await db.pool.getConnection();
        await connection.beginTransaction();

        // Get transaction_id associated with the non_member_id
        const getTransactionIdQuery = 'SELECT transaction_id FROM non_member WHERE non_member_id = ?';
        const [rows] = await connection.query(getTransactionIdQuery, [id]);

        if (rows.length === 0) {
            throw new Error('Non-member not found');
        }

        const transactionId = rows[0].transaction_id;

        // Delete from transactions table
        const deleteTransactionQuery = 'DELETE FROM transactions WHERE transaction_id = ?';
        await connection.query(deleteTransactionQuery, [transactionId]);

        // Delete from non_member table
        const deleteNonMemberQuery = 'DELETE FROM non_member WHERE non_member_id = ?';
        await connection.query(deleteNonMemberQuery, [id]);

        // Commit transaction
        await connection.commit();
        connection.release();

        res.status(200).json({ message: 'Non-member and associated transaction deleted successfully' });
    } catch (error) {
        // Rollback transaction in case of error
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Database Error:', error);
        res.status(500).json({ error: 'Database Error' });
    }
});

module.exports = router;
