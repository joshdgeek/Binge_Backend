const {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction
} = require("@solana/spl-token");
const {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
    Transaction,
    clusterApiUrl,
} = require("@solana/web3.js");
const dotenv = require("dotenv");
const bs58 = require("bs58").default;

dotenv.config();

const connection = new Connection(clusterApiUrl('devnet'));

// Uncomment and use your actual keypair
// const FROM_KEYPAIR = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY));

async function getNumberDecimals(MINT_ADDRESS) {
    const info = await connection.getParsedAccountInfo(new PublicKey(MINT_ADDRESS));
    const result = info.value.data.parsed.info.decimals;
    return result;
}

async function getDestinationATA(walletPubkey, mintPubkey) {
    return await getAssociatedTokenAddress(mintPubkey, walletPubkey);
}

async function sendTokens(FROM_PUBLIC_KEY_STRING, DESTINATION_WALLETS, MINT_ADDRESS, TRANSFER_AMOUNTS) {
    console.log(`Sending tokens to multiple wallets.`);

    try {
        const mintPubkey = new PublicKey(MINT_ADDRESS);
        const fromPubkey = new PublicKey(FROM_PUBLIC_KEY_STRING);

        const sourceATA = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
        console.log(`Source ATA: ${sourceATA.toString()}`);

        const decimals = await getNumberDecimals(MINT_ADDRESS);
        const tx = new Transaction();

        for (let i = 0; i < DESTINATION_WALLETS.length; i++) {
            const recipientPubkey = new PublicKey(DESTINATION_WALLETS[i]);
            const destinationATA = await getAssociatedTokenAddress(mintPubkey, recipientPubkey);

            const accountInfo = await connection.getAccountInfo(destinationATA);

            if (!accountInfo) {
                console.log(`Creating ATA for recipient: ${recipientPubkey.toString()}`);
                // Add instruction to create ATA for recipient if it doesn't exist
                tx.add(
                    createAssociatedTokenAccountInstruction(
                        fromPubkey,         // payer
                        destinationATA,     // ATA to create
                        recipientPubkey,    // owner of the ATA
                        mintPubkey          // token mint
                    )
                );
            }

            const amount = TRANSFER_AMOUNTS[i] * 10 ** decimals;
            console.log(`Transferring ${amount} tokens to ${recipientPubkey.toString()}`);

            // Now add the transfer instruction
            tx.add(
                createTransferInstruction(
                    sourceATA,
                    destinationATA,
                    fromPubkey,
                    amount
                )
            );
        }


        // Return the built transaction instead of signing it here
        console.log("buit", tx)
        return tx;

    } catch (error) {
        console.error("Error in sendTokens:", error);
        throw error;
    }
}

// Exported for use in API route
module.exports.transfer = async (req, res) => {
    const { Address_FROM, DESTINATION_WALLETS, MINT_ADDRESS, TRANSFER_AMOUNTS } = req.body;
    try {
        const transaction = await sendTokens(Address_FROM, DESTINATION_WALLETS, MINT_ADDRESS, TRANSFER_AMOUNTS);
        console.log("Transaction built successfully:");
        return ({ tx: transaction });
    } catch (error) {
        console.log(error);
        throw error;
    }
};
