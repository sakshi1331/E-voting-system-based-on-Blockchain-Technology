'use strict';

const express = require('express');
const Web3 = require('web3');
const router = express.Router();

// Connect to Ethereum node
const web3 = new Web3(new Web3.providers.HttpProvider('https://your.ethereum.node.url'));

// Wallet creation route
router.post('/create', async (req, res) => {
    try {
        const account = web3.eth.accounts.create();
        res.json({ address: account.address, privateKey: account.privateKey });
    } catch (error) {
        res.status(500).json({ error: 'Error creating wallet' });
    }
});

// Balance checking route
router.get('/balance/:address', async (req, res) => {
    const address = req.params.address;
    try {
        const balance = await web3.eth.getBalance(address);
        res.json({ address, balance: web3.utils.fromWei(balance, 'ether') });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching balance' });
    }
});

module.exports = router;
