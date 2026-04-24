// Import necessary dependencies
const express = require('express');
const router = express.Router();

// Import blockchain integration utility
const BlockchainUtil = require('../utils/blockchainUtil');

// In-memory candidates array
let candidates = [];

// Route to add a candidate
router.post('/candidates', (req, res) => {
    const { name, party } = req.body;
    const newCandidate = { id: candidates.length + 1, name, party };
    candidates.push(newCandidate);
    res.status(201).json(newCandidate);
});

// Route to get all candidates
router.get('/candidates', (req, res) => {
    res.json(candidates);
});

// Route for voting
router.post('/vote', async (req, res) => {
    const { candidateId } = req.body;
    const candidate = candidates.find(c => c.id === candidateId);

    if (!candidate) {
        return res.status(404).send('Candidate not found');
    }

    // Integrate with blockchain to record the vote
    try {
        await BlockchainUtil.recordVote(candidateId);
        res.status(200).send('Vote cast successfully');
    } catch (error) {
        res.status(500).send('Error recording vote');
    }
});

// Export the router
module.exports = router;
