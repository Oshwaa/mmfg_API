const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { pool, uploadImageToDrive, deleteImageFromDrive } = require('../connection');  // Adjust the path as necessary

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Function to generate a unique 4-digit random ID
function generateRandomId() {
    return Math.floor(1000 + Math.random() * 9000);
}

// Function to check if the generated ID is unique
async function isIdUnique(connection, table, column, id) {
    const [rows] = await connection.query(`SELECT 1 FROM ?? WHERE ?? = ?`, [table, column, id]);
    return rows.length === 0;
}

// API endpoint to add a new inventory item
router.post('/add-items', upload.single('item_image'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { item_name, item_type, quantity, date_added, inventory_status } = req.body;
        const filePath = req.file.path;

        if (!item_name || !item_type || !quantity || !date_added || !inventory_status || !filePath) {
            return res.status(400).send('Missing required fields');
        }

        // Generate a unique item_id
        let item_id;
        let isUnique = false;
        while (!isUnique) {
            item_id = generateRandomId();
            isUnique = await isIdUnique(connection, 'inventory', 'item_id', item_id);
        }

        // Upload image to Google Drive and get URL
        const imageUrl = await uploadImageToDrive(filePath);

        // Insert record into the inventory table
        const sql = `INSERT INTO inventory (item_id, item_name, item_type, quantity, date_added, inventory_status, item_image) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await connection.query(sql, [item_id, item_name, item_type, quantity, date_added, inventory_status, imageUrl]);

        res.status(200).send('Item added successfully');
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Error uploading image or saving item');
    } finally {
        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);
        connection.release();
    }
});

router.get('/view-items', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM inventory');
        res.json(rows);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Error retrieving inventory items');
    } finally {
        connection.release();
    }
});


router.delete('/delete-items/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;

        // Fetch the item to get the image URL
        const [rows] = await connection.query('SELECT item_image FROM inventory WHERE item_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).send('Item not found');
        }

        const imageUrl = rows[0].item_image;

        // Delete the image from Google Drive
        await deleteImageFromDrive(imageUrl);

        // Delete the item from the inventory table
        await connection.query('DELETE FROM inventory WHERE item_id = ?', [id]);

        res.status(200).send('Item deleted successfully');
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Error deleting item');
    } finally {
        connection.release();
    }
});


router.put('/edit-items/:id', upload.single('item_image'), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { item_name, item_type, quantity, inventory_status, is_photo_removed } = req.body;
        const filePath = req.file ? req.file.path : null;

        // Check if item exists
        const [rows] = await connection.query('SELECT item_image FROM inventory WHERE item_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).send('Item not found');
        }

        let imageUrl = rows[0].item_image;

        if (is_photo_removed === 'true' && imageUrl) {
            // Delete the old image from Google Drive
            await deleteImageFromDrive(imageUrl);
            imageUrl = null;
        }

        if (filePath) {
            // Delete the old image from Google Drive if it exists
            if (imageUrl) {
                await deleteImageFromDrive(imageUrl);
            }
            // Upload new image to Google Drive and get URL
            imageUrl = await uploadImageToDrive(filePath);
        }

        // Update the inventory item
        const sql = `UPDATE inventory SET item_name = ?, item_type = ?, quantity = ?, inventory_status = ?, item_image = ? WHERE item_id = ?`;
        await connection.query(sql, [item_name, item_type, quantity, inventory_status, imageUrl, id]);

        res.status(200).send('Item updated successfully');
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Error updating item');
    } finally {
        if (req.file) {
            // Clean up the uploaded file
            fs.unlinkSync(req.file.path);
        }
        connection.release();
    }
});


module.exports = router;
