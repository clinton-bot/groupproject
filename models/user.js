const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    userName : {type: String, required: true, minlength: 4, maxlength: 20, unique: true},
    password : {type: String/*, required: true*/, minlength: 0, maxlength: 30}
});

module.exports = userSchema;
