const express = require('express');
const { read } = require('fs');
const router = express.Router();
const { Chat } = require('../models/chat');


//Save Chat
router.post('/api/chat', (req, res) => {
    console.log("Chat message send");
    const chat = new Chat({
        Stream: req.body.stream,
        Sender: req.body.sender,
        Message: req.body.message,
        Timestamp: req.body.timestamp
    });
    chat.save((err, data) => {
        res.status(200).json({ code: 200, message: 'Chat Added Succesfully ', addChat: data })
        console.log(data)
    })
})
router.post('/api/chat', (req, res) => {
    console.log("Chat message send");
    const chat = new Chat({
        Stream: req.body.stream,
        Sender: req.body.sender,
        Message: req.body.message,
        Timestamp: req.body.timestamp
    });
    chat.save((err, data) => {
        res.status(200).json({ code: 200, message: 'Chat Added Succesfully ', addChat: data })
        console.log(data)
    })
})
module.exports = router;

