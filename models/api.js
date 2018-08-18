const mongoose = require('mongoose');
const Schema = mongoose.Schema;

var ParamSchema = new Schema({
    paramid: String,
    key: String,
    type: Number,
    isrequire: Number,
    desc: String
});

var responsedescSchema = new Schema({
    key: String,
    desc: String
});

const ApiSchema = new Schema({
    url: String,
    desc: String,
    method: String,
    project: Number,
    
    date: Date,
    lasteditor: String,
    status: Number,
    islocked: Number,

    params: [ ParamSchema ],

    usemockjs: Number,
    responsecontent: String,
    responsedesc: [ responsedescSchema ]
});

const Api = mongoose.model('Api', ApiSchema);

module.exports = Api;