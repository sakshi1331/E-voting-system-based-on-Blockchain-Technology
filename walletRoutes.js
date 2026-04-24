const express = require('express');
const router = express.Router();
const Web3 = require('web3');

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider('YOUR_INFURA_OR_ALCHEMY_URL'));

// Route to get wallet balance
router.get('/balance/:address', async (req, res) => {
    const address = req.params.address;
    try {
        const balance = await web3.eth.getBalance(address);
        res.json({ balance: web3.utils.fromWei(balance, 'ether') });
    } catch (error) {
        res.status(500).json({ error: 'Unable to fetch balance' });
    }
});

// Route to send Ether from one wallet to another
router.post('/send', async (req, res) => {
    const { from, to, amount, privateKey } = req.body;
    try {
        const transaction = {
            to: to,
            value: web3.utils.toWei(amount, 'ether'),
            gas: 2000000,
        };

        const signedTransaction = await web3.eth.accounts.signTransaction(transaction, privateKey);
        const receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
        res.json({ receipt });
    } catch (error) {
        res.status(500).json({ error: 'Transaction failed' });
    }
});

module.exports = router;