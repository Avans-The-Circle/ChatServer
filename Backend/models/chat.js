const mongoose = require('mongoose')

//Chat Schema
const Chat = mongoose.model('Chat', {
    Stream: {
        type: String,
        required: true
    },
    Sender: {
        type: String,
        required: true
    },
    Message: {
        type: String,
        required: true
    },
    Timestamp: {
        type: String,
        required: true
    },
})

module.exports = { Chat }