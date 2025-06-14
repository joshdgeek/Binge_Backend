//trade api 
const { Connection, Transaction, VersionedTransaction, sendAndConfirmTransaction, PublicKey, Keypair, clusterApiUrl } = require('@solana/web3.js');
const { NATIVE_MINT } = require('@solana/spl-token');

//const axios = require('axios')
//const { connection, owner, fetchTokenAccountData } = require('../config'
const { API_URLS } = require('@raydium-io/raydium-sdk-v2');
const bs58 = require('bs58').default;


const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');


module.exports.getquoteMintAddress = async (req, res) => {
    // Construct the URL for the swap quote
    const { inputMint, outputMint, amount } = req.body;

    const slippage = 0.01, txVersion = 'V0'

    const url = `https://transaction-v1.raydium.io/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippage * 10000}&txVersion=${txVersion}`;

    // Perform the GET request using Fetch API
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const swapResponse = await response.json();
        console.log('Swap Quote:', swapResponse);
        res.json({ swapResponse });
        return swapResponse;
    } catch (error) {
        console.error('Error fetching swap quote:', error);
    }
}

module.exports.swapRoute = async (req, res) => {

    const { swapClient } = req.body;
    const inputMint = NATIVE_MINT.toBase58();
    const outputMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
    const amount = 6024096; // e.g. 1 token in base unit
    const slippage = 0.005; // 0.5% slippage
    const isInputSol = inputMint === NATIVE_MINT.toBase58();
    const isOutputSol = outputMint === NATIVE_MINT.toBase58();
    const inputTokenAcc = null; // Replace with your associated token account if needed
    const outputTokenAcc = null;
    txVersion = 'V0'; // or 'V1' for VersionedTransaction
    const isV0Tx = txVersion === 'V0';

    try {
        // ========== Get Quote ==========
        const swapBaseInUrl = `${API_URLS.SWAP_HOST}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippage * 10000}&txVersion=${txVersion}`;

        const quoteRes = await fetch(swapBaseInUrl);
        if (!quoteRes.ok) throw new Error(`Quote request failed with status ${quoteRes.status}`);
        const swapResponse = await quoteRes.json();

        // ========== Serialize Transaction ==========
        const serializeUrl = `${API_URLS.SWAP_HOST}/transaction/swap-base-in`;
        const payload = {
            computeUnitPriceMicroLamports: String(swapResponse.data?.default?.h ?? 0),
            swapResponse,
            txVersion,
            wallet: swapClient,
            wrapSol: isInputSol,
            unwrapSol: isOutputSol,
            inputAccount: isInputSol ? undefined : inputTokenAcc?.toBase58?.(),
            outputAccount: isOutputSol ? undefined : outputTokenAcc?.toBase58?.(),
        };



        const txRes = await fetch(serializeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!txRes.ok) throw new Error(`Transaction serialization failed with status ${txRes.status}`);
        const swapTransactions = await txRes.json();

        if (!swapTransactions.success) throw new Error('Raydium API returned failure');

        // ========== Deserialize Transactions ==========
        const allTxBuf = swapTransactions.data.map((tx) => Buffer.from(tx.transaction, 'base64'));
        const allTransactions = allTxBuf.map((txBuf) =>
            isV0Tx ? VersionedTransaction.deserialize(txBuf) : Transaction.from(txBuf)
        );

        console.log(`✅ Total ${allTransactions.length} transactions`, swapTransactions);
        return res.json({ swapTransactions })
    } catch (error) {
        console.error('❌ Swap failed:', error.message);
    }
}

