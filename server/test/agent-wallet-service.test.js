const { expect } = require("chai");
const { Keypair } = require("@stellar/stellar-sdk");

const { AgentWalletService } = require("../services/agentWalletService");

describe("AgentWalletService", function () {
    it("signs managed asset transfer writes with the managed wallet as tx source", async function () {
        const ownerKeypair = Keypair.random();
        const managedKeypair = Keypair.random();
        const expectedOwner = ownerKeypair.publicKey();

        let capturedWrite = null;
        const service = new AgentWalletService({
            encryptionKey: "a".repeat(64),
            chainService: {
                assetRegistryAddress: "CCQ7RAHNLTGH2CF5BNNWAGFJLCB6EUV76K5ZQ4CWU42VF3FGZ5PJHNYK",
                contractService: {
                    async invokeWrite(payload) {
                        capturedWrite = payload;
                        return { txHash: "abc123" };
                    },
                },
            },
        });

        service.resolveKeypair = async (ownerPublicKey) => {
            expect(String(ownerPublicKey).toUpperCase()).to.equal(expectedOwner.toUpperCase());
            return managedKeypair;
        };

        await service.transferAsset({
            owner: expectedOwner,
            tokenId: 9,
            to: Keypair.random().publicKey(),
        });

        expect(capturedWrite).to.be.an("object");
        expect(capturedWrite.method).to.equal("transfer_asset");
        expect(capturedWrite.contractId).to.equal("CCQ7RAHNLTGH2CF5BNNWAGFJLCB6EUV76K5ZQ4CWU42VF3FGZ5PJHNYK");
        expect(capturedWrite.sourceAccount).to.equal(managedKeypair.publicKey());
        expect(capturedWrite.signerSecret).to.equal(managedKeypair.secret());
    });
});
