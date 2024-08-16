const QRCode = require('qrcode');

const generateQRCode = async (data) => {
    try {
        const qrCodeLink = await QRCode.toDataURL(data);
        return qrCodeLink;
    } catch (error) {
        throw new Error('Failed to generate QR code');
    }
};

module.exports = { generateQRCode };
