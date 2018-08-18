const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: String,
    password: String,
    type: Number,
    status: Number,
    date: Date
});

const User = mongoose.model('User', UserSchema);

module.exports = User;