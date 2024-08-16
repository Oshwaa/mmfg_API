const express = require('express');
const { pool } = require('../connection'); 
const { generateQRCode } = require('./qr_generator'); 
const nodemailer = require('nodemailer'); 

const router = express.Router();

// member id
function generateMemberId() {
    return Math.floor(10000 + Math.random() * 90000); 
}
// transac ID
const generateTransactionId = () => {
    return Math.floor(1000 + Math.random() * 9000); 
};

async function isMemberIdUnique(member_id) {
    const [rows] = await pool.query('SELECT 1 FROM members WHERE member_id = ?', [member_id]);
    return rows.length === 0;
}
async function isTransactionIdUnique(transaction_id) {
    const [rows] = await pool.query('SELECT 1 FROM transactions WHERE transaction_id = ?', [transaction_id]);
    return rows.length === 0;
}
//Current date
const currentDate = new Date().toISOString().split('T')[0]; //wag alisin ung split,mas simple icompare pag walang time
// Register Endpoint
router.post('/register', async (req, res) => {
    const { member_name, email, registration_date, expiry_date, amount} = req.body;
    let { member_id } = req.body;

    if (!member_name || !email || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        do {
            if (!member_id) {
                member_id = generateMemberId();
            }
        } while (!(await isMemberIdUnique(member_id)));

       
        const qrCodeData = `${member_id}`; 
        const qrCodeLink = await generateQRCode(qrCodeData);

       
        await connection.query(
            'INSERT INTO members (member_id, member_name, qr_code, email, registration_date, expiry_date) VALUES (?, ?, ?, ?, NOW(), ?)',
            [member_id, member_name, qrCodeLink, email, expiry_date]
        );

        let transaction_id;
        do{
            transaction_id = generateTransactionId();
        }
        while (!(await isTransactionIdUnique(transaction_id)));

        // Save transaction data to database
        await connection.query(
            'INSERT INTO transactions (transaction_id, amount, transaction_date, transaction_type,transaction_by) VALUES (?, ?, NOW(), ?, ?)',
            [transaction_id, amount, 'MEMBERSHIP',member_name] 
        );

        // Commit transaction
        await connection.commit();

        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS  
            }
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Gym Membership QR Code',
            text: `Please find your QR code attached.\n\nExpiry Date: ${expiry_date}`,
            attachments: [
                {
                    filename: 'qrcode.png',
                    content: qrCodeLink.split(',')[1],
                    encoding: 'base64'
                }
            ]
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: 'Member registered and transaction recorded successfully' });

    } catch (error) {
        // Rollback
        if (connection) {
            await connection.rollback();
        }
        console.error('Error registering member or creating transaction:', error);
        res.status(500).json({ error: 'Failed to register(DUPLICATE EMAIL)' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Update(FOR ADMIN) change name change email blabla
router.put('/update/:member_id', async (req, res) => {
    const { member_id } = req.params;
    const { member_name, email } = req.body;

    if (!member_id) {
        return res.status(400).json({ error: 'Missing member_id' });
    }

    try {
       
        const [existingMember] = await pool.query('SELECT * FROM members WHERE member_id = ?', [member_id]);

        if (existingMember.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

      
        let updateQuery = 'UPDATE members SET ';
        let queryParams = [];
        if (member_name) {
            updateQuery += 'member_name = ?, ';
            queryParams.push(member_name);
        }
        if (email) {
            updateQuery += 'email = ?, ';
            queryParams.push(email);
        }

        updateQuery = updateQuery.slice(0, -2);
        updateQuery += ' WHERE member_id = ?';
        queryParams.push(member_id);

        await pool.query(updateQuery, queryParams);

        res.status(200).json({ message: 'Member updated successfully' });

    } catch (error) {
        console.error('Error updating member:', error);
        res.status(500).json({ error: 'Failed to update member' });
    }
});
//delete
router.delete('/delete/:member_id', async (req,res) => {
    const {member_id} = req.params;
    if(!member_id){
        return res.status(400).json({error: 'Member Not Found'})
    }
        let connection;

    try{
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existingMember] = await connection.query('Select * FROM members WHERE member_id = ?',[member_id]);
        
        if(existingMember.length === 0){
            await connection.rollback();
            return res.status(404).json({ error: 'Member not found' });

        }
        await connection.query('DELETE FROM members WHERE member_id = ?', [member_id]);

        await connection.commit();
        res.status(200).json({ message: 'Deleted Successfully' });
    }
    catch (error) {
        // Rollback
        if (connection) {
            await connection.rollback();
        }
        console.error('Error', error);
        res.status(500).json({ error: 'Failed to Delete' });
    } finally {
        if (connection) {
            connection.release();
        }
    }

});


// pang extend ng membership  
router.put('/extend/:member_id', async (req, res) => {
    const { member_id } = req.params;
    const { expiry_date, amount } = req.body; //dagdagan transaction_by if needed

    if (!member_id) {
        return res.status(404).json({ error: 'Missing Member ID' });
    }

    if (!expiry_date) {
        return res.status(401).json({ error: 'Missing expiry_date' });
    }
    if(expiry_date <= currentDate){
        return res.status(401).json({ error: 'Walang time machine boss' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [existingMember] = await connection.query('SELECT * FROM members WHERE member_id = ?', [member_id]);

        if (existingMember.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const member_name = existingMember[0].member_name;
        const qr_code = existingMember[0].qr_code;
        const email = existingMember[0].email;

        await connection.query(
            'UPDATE members SET expiry_date = ? WHERE member_id = ?',
            [expiry_date, member_id]
        );

        let transaction_id;
        do {
            transaction_id = generateTransactionId();
        } while (!(await isTransactionIdUnique(transaction_id)));


        await connection.query(
            'INSERT INTO transactions (transaction_id, amount, transaction_date, transaction_type,transaction_by) VALUES (?, ?, NOW(), ?,?)',
            [transaction_id, amount, 'MEMBERSHIP EXTENSION',member_name]
        );

        await connection.commit();
        
        // send email uli pag nag extend
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS  
            }
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Gym Membership is Extended',
            text: `Please find your QR code attached.\n\nExpiry Date: ${expiry_date}`,
            attachments: [
                {
                    filename: 'qrcode.png',
                    content: qr_code.split(',')[1],
                    encoding: 'base64'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log(expiry_date, currentDate) //debugger
        res.status(200).json({ message: 'Expiry date updated and transaction recorded successfully' });

    } catch (error) {
        // Rollback
        if (connection) {
            await connection.rollback();
        }
        console.error('Error updating expiry date or creating transaction:', error);
        res.status(500).json({ error: 'Failed to update expiry date or create transaction' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Scan Endpoint
//Create qr scanner Function for front-end {qrCode:"qrDataFromScanner"}
router.post('/scan', async (req, res) => {
    const {qrCode} = req.body;

    if (!qrCode) {
        return res.status(400).json({ error: 'QR code is required' });
    }

    const member_id = qrCode;

    if (!member_id) {
        return res.status(400).json({ error: 'Invalid QR code' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [memberRows] = await connection.query('SELECT * FROM members WHERE member_id = ?', [member_id]);

        if (memberRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Member not found' });
        }

        const member = memberRows[0];
        const expiryDate = new Date(member.expiry_date).toISOString().split('T')[0];

        if (expiryDate < currentDate) {
            await connection.rollback();
            return res.status(403).json({ error: 'Membership expired' });
        }

        let transaction_id;
        do {
            transaction_id = generateTransactionId();
        } while (!(await isTransactionIdUnique(transaction_id)));

        await connection.query(
            'INSERT INTO transactions (transaction_id, amount, transaction_date, transaction_type, transaction_by) VALUES (?, ?, NOW(), ?, ?)',
            [transaction_id, 0, 'MEMBER', member.member_name]
        );

        await connection.commit();
        console.log(expiryDate,currentDate) // debugger
        res.status(200).json({ message: 'Membership is valid', expiryDate });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error querying the database or inserting transaction:', error);
        res.status(500).json({ error: 'Database error' });
        console.log("debug")
    } finally {
        if (connection) {
            connection.release();
            console.log("Debug")
        }
    }
});

module.exports = router;