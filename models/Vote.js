const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    voterId: {
        type: String,
        required: true
    },
    candidateId: {
        type: String,
        required: true
    },
    transactionHash: {
        type: String,
        required: true
    },
    votedAt: {
        type: Date,
        default: Date.now
    }
});

const Vote = mongoose.model('Vote', VoteSchema);

module.exports = Vote;