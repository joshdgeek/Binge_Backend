const { Transaction, SystemProgram, PublicKey, Connection, clusterApiUrl } = require("@solana/web3.js")

const connection = new Connection(
    clusterApiUrl('devnet'),
    'confirmed',
);

//verify addresses
function validateSolAddress(addresses) {
    let invalidAddresses = [];
    for (let i = 0; i < addresses.length; i++) {
        try {
            let pubkey = new PublicKey(addresses[i]);
            let isSolana = PublicKey.isOnCurve(pubkey.toBytes());
            if (!isSolana) {
                invalidAddresses.push(addresses[i]);
            }
        } catch (err) {
            invalidAddresses.push(addresses[i]);
        }
    }
    return invalidAddresses;
}


module.exports.sendSol = async (req, res) => {
    const { sender, listOfAddresses, listOfAmounts } = req.body;
    console.log(sender, listOfAddresses, listOfAmounts);

    //VALIDATION FOR LIST OF ADDRESS AND AMOUNT
    if (!Array.isArray(listOfAmounts) || listOfAmounts.length !== listOfAddresses.length) {
        return res.json({
            status: "error",
            message: "Amounts must be an array with the same length as addresses."
        });
    }

    //Validate listOfAmounts to ensure all positive numbers
    for (let i = 0; i < listOfAmounts.length; i++) {
        if (typeof listOfAmounts[i] !== 'number' || listOfAmounts[i] <= 0) {
            return res.json({
                status: "error",
                message: `Invalid amount at index ${i}: ${listOfAmounts[i]}`
            });
        }
    }


    try {
        //verify addresses are valid
        let addressesIsInvalid = validateSolAddress(listOfAddresses);
        if (addressesIsInvalid.length > 0) {
            return res.json({
                status: "error",
                message: "Invalid Solana address(es): " + addressesIsInvalid.join(", ")
            })
        }


        //create Transaction
        const transaction = new Transaction();

        for (let i = 0; i < listOfAddresses.length; i++) {
            try {
                let instruction = SystemProgram.transfer({
                    fromPubkey: new PublicKey(sender),
                    toPubkey: new PublicKey(listOfAddresses[i]),
                    lamports: listOfAmounts[i],
                });
                transaction.add(instruction);


            } catch (error) {
                return res.json({
                    status: "error",
                    message: "Error creating instruction for address: " + listOfAddresses[i] + " - " + error.message
                });
            }
        }


        // Set recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.feePayer = new PublicKey(sender);
        transaction.recentBlockhash = blockhash;

        const serializedTx = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
        });

        // Convert to base64 so it can be sent via JSON
        const base64Tx = serializedTx.toString('base64');
        console.log("Serialized Transaction:", serializedTx);
        console.log("base64tx:", base64Tx);

        return res.json({ instruct: base64Tx });

        //return instructions
    } catch (error) {
        return res.json({
            status: "error",
            message: "Error creating transaction: " + error.message
        });
    }
}