/** Generic contract ABI type — no longer tied to ethers InterfaceAbi */
export type ContractAbi = unknown;

export interface StreamCreationResult {
    streamId: string;
    startTime: bigint;
    txHash?: string;
    session?: unknown;
}

export interface StreamEngineTransactionAdapter {
    approveToken(tokenAddress: string, spender: string, amount: bigint): Promise<unknown>;
    transferToken(tokenAddress: string, recipient: string, amount: bigint): Promise<{ hash?: string } | unknown>;
    createStream(
        contractAddress: string,
        recipient: string,
        duration: number,
        amount: bigint,
        metadata: string,
        abi: ContractAbi
    ): Promise<StreamCreationResult>;
    callContract(
        contractAddress: string,
        abi: ContractAbi,
        functionName: string,
        args: unknown[]
    ): Promise<unknown>;
    readContract?<T = unknown>(
        contractAddress: string,
        abi: ContractAbi,
        functionName: string,
        args: unknown[]
    ): Promise<T>;
    listSessions?<T = unknown>(owner: string): Promise<T[]>;
    getSession?<T = unknown>(sessionId: string): Promise<T | null>;
}
