require('dotenv').config();
const mysql = require('mysql2/promise');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// MySQL database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to the database');
        connection.release();
    } catch (err) {
        console.error('Failed to connect to the database:', err);
        process.exit(1);
    }
})();

// Google Drive API setup
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const auth = new google.auth.GoogleAuth({
    credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: process.env.GOOGLE_AUTH_URI,
        token_uri: process.env.GOOGLE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    },
    scopes: SCOPES,
});

async function uploadImageToDrive(filePath) {
    try {
        const folderId = process.env.GOOGLE_DRIVE_INVENTORY_FOLDER_ID; // Replace with your existing folder ID
        const authClient = await auth.getClient();
        const drive = google.drive({ version: 'v3', auth: authClient });

        const fileMetadata = {
            name: path.basename(filePath),
            parents: [folderId], // Upload to the existing folder
        };
        const media = {
            mimeType: 'image/jpeg',
            body: fs.createReadStream(filePath),
        };
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
            supportsAllDrives: true,
        });

        const fileId = response.data.id;

        // Share the file with your main Google account
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'user',
                emailAddress: 'metalmusclefitnessgym@gmail.com',
            },
            supportsAllDrives: true,
        });

        // Generate the image link
        const imageUrl = `https://drive.google.com/thumbnail?id=${fileId}`;

        return imageUrl;
    } catch (error) {
        console.error('Failed to upload file to Google Drive:', error);
        throw error;
    }
}

// Function to delete an image from Google Drive
async function deleteImageFromDrive(imageUrl) {
    try {
        // Extract the file ID from the Google Drive URL
        const fileId = imageUrl.split('id=')[1];

        const authClient = await auth.getClient();
        const drive = google.drive({ version: 'v3', auth: authClient });

        // Use the Google Drive API to delete the file
        await drive.files.delete({ fileId });
    } catch (error) {
        console.error('Failed to delete file from Google Drive:', error);
        throw error;
    }
}

module.exports = { pool, uploadImageToDrive, deleteImageFromDrive };