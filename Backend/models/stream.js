const mongoose = require('mongoose')

//stream Schema
const Stream = mongoose.model('Stream', {
    Stream: {
        type: String,
        required: true
    },
    Base64: {
        type: String,
        required: true
    },
    Timestamp: {
        type: String,
        required: true
    },
})

module.exports = { Stream }