const mongoose = require('mongoose');

const WargaEmasOrderSchema = new mongoose.Schema({
    icPictureFront: { type: String, required: true },
    icPictureBack: { type: String, required: true },
    dateTimeSubmission: { type: String },
    receiverPhoneNumber: { type: String, required: true },
}, { collection: 'wargaemasorder' });

module.exports = mongoose.model('WAORDERS', WargaEmasOrderSchema);
