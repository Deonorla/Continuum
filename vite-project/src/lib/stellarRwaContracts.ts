import { signTransaction as signFreighterTransaction } from '@stellar/freighter-api';
import { ethers } from 'ethers';
import { ACTIVE_NETWORK } from '../networkConfig.js';
import {
  nativeTokenAddress,
  paymentTokenAddress,
  rwaAttestationRegistryAddress,
  rwaRegistryAddress,
  rwaYieldVaultAddress,
} from '../contactInfo.js';
import { fetchProtocolCatalog } from '../services/protocolApi';
import { Client as RwaRegistryClient } from '../../../sdk/generated/stellar/rwa-registry/src/index.ts';
import { Client as AttestationRegistryClient } from '../../../sdk/generated/stellar/attestation-registry/src/index.ts';
import { Client as YieldVaultClient } from '../../../sdk/generated/stellar/yield-vault/src/index.ts';

const DEFAULT_IPFS_GATEWAY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_IPFS_GATEWAY_URL)
  || 'https://gateway.pinata.cloud/ipfs';

const DEFAULT_RWA_RUNTIME_IDS = {
  registry: rwaRegistryAddress,
  attestationRegistry: rwaAttestationRegistryAddress,
  yieldVault: rwaYieldVaultAddress,
};

let runtimeContractIdsPromise: Promise<typeof DEFAULT_RWA_RUNTIME_IDS> | null = null;

function isConfiguredContractId(contractId?: string) {
  return Boolean(contractId && String(contractId).startsWith('C'));
}

function bigintToNumber(value: bigint | number | string | undefined, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function extractTxHash(sent: any) {
  return sent?.sendTransactionResponse?.hash || sent?.getTransactionResponse?.txHash || '';
}

function createClientOptions(publicKey?: string) {
  return {
    rpcUrl: ACTIVE_NETWORK.rpcUrl,
    networkPassphrase: ACTIVE_NETWORK.passphrase,
    publicKey,
    signTransaction: signFreighterTransaction,
  };
}

async function resolveRuntimeContractIds() {
  if (!runtimeContractIdsPromise) {
    runtimeContractIdsPromise = (async () => {
      try {
        const catalog = await fetchProtocolCatalog();
        const nextIds = {
          registry: catalog?.rwa?.assetRegistryAddress || catalog?.rwa?.hubAddress || rwaRegistryAddress,
          attestationRegistry: catalog?.rwa?.attestationRegistryAddress || rwaAttestationRegistryAddress,
          yieldVault: catalog?.rwa?.assetStreamAddress || rwaYieldVaultAddress,
        };
        return {
          registry: isConfiguredContractId(nextIds.registry) ? nextIds.registry : rwaRegistryAddress,
          attestationRegistry: isConfiguredContractId(nextIds.attestationRegistry)
            ? nextIds.attestationRegistry
            : rwaAttestationRegistryAddress,
          yieldVault: isConfiguredContractId(nextIds.yieldVault) ? nextIds.yieldVault : rwaYieldVaultAddress,
        };
      } catch {
        return DEFAULT_RWA_RUNTIME_IDS;
      }
    })();
  }

  return runtimeContractIdsPromise;
}

export function resetResolvedRwaContractIdsForTest() {
  runtimeContractIdsPromise = null;
}

async function createRegistryClient(publicKey?: string) {
  const { registry } = await resolveRuntimeContractIds();
  if (!isConfiguredContractId(registry)) {
    throw new Error('RWA registry contract ID is not configured for Stellar.');
  }
  return new RwaRegistryClient({
    contractId: registry,
    ...createClientOptions(publicKey),
  });
}

async function createAttestationRegistryClient(publicKey?: string) {
  const { attestationRegistry } = await resolveRuntimeContractIds();
  if (!isConfiguredContractId(attestationRegistry)) {
    throw new Error('Attestation registry contract ID is not configured for Stellar.');
  }
  return new AttestationRegistryClient({
    contractId: attestationRegistry,
    ...createClientOptions(publicKey),
  });
}

async function createYieldVaultClient(publicKey?: string) {
  const { yieldVault } = await resolveRuntimeContractIds();
  if (!isConfiguredContractId(yieldVault)) {
    throw new Error('Yield vault contract ID is not configured for Stellar.');
  }
  return new YieldVaultClient({
    contractId: yieldVault,
    ...createClientOptions(publicKey),
  });
}

function stableValue(value: any): any {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = stableValue(value[key]);
        return accumulator;
      }, {} as Record<string, any>);
  }
  return value;
}

export function stableStringify(value: any) {
  return JSON.stringify(stableValue(value));
}

export function hashText(value: string) {
  return ethers.keccak256(ethers.toUtf8Bytes(value || ''));
}

export function hashJson(value: any) {
  return hashText(stableStringify(value));
}

export function resolveIpfsGatewayUrl(uri: string) {
  const trimmed = String(uri || '').trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('ipfs://')) {
    const gateway = String(DEFAULT_IPFS_GATEWAY).replace(/\/$/, '');
    return `${gateway}/${trimmed.replace(/^ipfs:\/\//, '')}`;
  }
  return trimmed;
}

async function fetchMetadataHash(metadataURI: string) {
  const url = resolveIpfsGatewayUrl(metadataURI);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load metadata from ${metadataURI}`);
  }
  const payload = await response.json();
  return hashJson(payload);
}

export async function mintStellarRwaAsset({
  issuer,
  assetType,
  rightsModel,
  publicMetadataURI,
  publicMetadataHash,
  evidenceRoot,
  evidenceManifestHash,
  propertyRefHash,
  jurisdiction,
  cidHash,
  tagHash,
  statusReason,
}: {
  issuer: string;
  assetType: number;
  rightsModel: number;
  publicMetadataURI: string;
  publicMetadataHash: string;
  evidenceRoot: string;
  evidenceManifestHash: string;
  propertyRefHash: string;
  jurisdiction?: string;
  cidHash: string;
  tagHash: string;
  statusReason?: string;
}) {
  const client = await createRegistryClient(issuer);
  const assembled = await client.mint_asset({
    issuer,
    asset_type: assetType,
    rights_model: rightsModel,
    public_metadata_uri: publicMetadataURI,
    public_metadata_hash: publicMetadataHash,
    evidence_root: evidenceRoot,
    evidence_manifest_hash: evidenceManifestHash,
    property_ref_hash: propertyRefHash,
    jurisdiction: jurisdiction || '',
    cid_hash: cidHash,
    tag_hash: tagHash,
    status_reason: statusReason || '',
  });
  const sent = await assembled.signAndSend();
  return {
    tokenId: bigintToNumber(sent.result),
    txHash: extractTxHash(sent),
  };
}

export async function getStellarIssuerApproval(issuer: string) {
  const client = await createRegistryClient();
  const assembled = await client.get_issuer_approval({
    issuer,
  });
  const result = assembled.result;
  return {
    approved: Boolean(result?.approved),
    note: result?.note || '',
    updatedAt: bigintToNumber(result?.updated_at, 0),
  };
}

export async function registerStellarAttestation({
  attestor,
  tokenId,
  role,
  evidenceHash,
  statementType,
  expiry,
}: {
  attestor: string;
  tokenId: number;
  role: number;
  evidenceHash: string;
  statementType: string;
  expiry?: number;
}) {
  const client = await createAttestationRegistryClient(attestor);
  const assembled = await client.register_attestation({
    attestor,
    token_id: BigInt(tokenId),
    role,
    evidence_hash: evidenceHash,
    statement_type: statementType,
    expiry: BigInt(Number(expiry || 0)),
  });
  const sent = await assembled.signAndSend();
  return {
    attestationId: bigintToNumber(sent.result),
    txHash: extractTxHash(sent),
  };
}

export async function revokeStellarAttestation({
  attestor,
  attestationId,
  reason,
}: {
  attestor: string;
  attestationId: number;
  reason?: string;
}) {
  const client = await createAttestationRegistryClient(attestor);
  const assembled = await client.revoke_attestation({
    attestor,
    attestation_id: BigInt(attestationId),
    reason: reason || '',
  });
  const sent = await assembled.signAndSend();
  return {
    txHash: extractTxHash(sent),
  };
}

export async function openStellarYieldStream({
  sender,
  tokenId,
  token,
  totalAmount,
  durationSeconds,
}: {
  sender: string;
  tokenId: number;
  token?: string;
  totalAmount: bigint;
  durationSeconds: number;
}) {
  const client = await createYieldVaultClient(sender);
  const startTime = BigInt(Math.floor(Date.now() / 1000));
  const stopTime = startTime + BigInt(Math.max(1, Number(durationSeconds || 0)));
  const assembled = await client.open_stream({
    sender,
    token_id: BigInt(tokenId),
    token: token || paymentTokenAddress,
    total_amount: BigInt(totalAmount),
    start_time: startTime,
    stop_time: stopTime,
  });
  const sent = await assembled.signAndSend();
  return {
    streamId: bigintToNumber(sent.result),
    txHash: extractTxHash(sent),
  };
}

export async function claimStellarYield({
  owner,
  tokenId,
}: {
  owner: string;
  tokenId: number;
}) {
  const client = await createYieldVaultClient(owner);
  const assembled = await client.claim({
    owner,
    token_id: BigInt(tokenId),
  });
  const sent = await assembled.signAndSend();
  return {
    amount: BigInt(sent.result || 0n),
    txHash: extractTxHash(sent),
  };
}

export async function flashAdvanceStellarYield({
  owner,
  tokenId,
  amount,
}: {
  owner: string;
  tokenId: number;
  amount: bigint;
}) {
  const client = await createYieldVaultClient(owner);
  const assembled = await client.flash_advance({
    owner,
    token_id: BigInt(tokenId),
    amount: BigInt(amount),
  });
  const sent = await assembled.signAndSend();
  return {
    amount: BigInt(sent.result || 0n),
    txHash: extractTxHash(sent),
  };
}

export async function updateStellarAssetMetadata({
  owner,
  tokenId,
  metadataURI,
  cidHash,
  publicMetadataHash,
}: {
  owner: string;
  tokenId: number;
  metadataURI: string;
  cidHash?: string;
  publicMetadataHash?: string;
}) {
  const client = await createRegistryClient(owner);
  const resolvedMetadataHash = publicMetadataHash || await fetchMetadataHash(metadataURI);
  const assembled = await client.update_asset_metadata({
    owner,
    token_id: BigInt(tokenId),
    metadata_uri: metadataURI,
    cid_hash: cidHash || hashText(metadataURI),
    public_metadata_hash: resolvedMetadataHash,
  });
  const sent = await assembled.signAndSend();
  return {
    publicMetadataHash: resolvedMetadataHash,
    txHash: extractTxHash(sent),
  };
}

export async function updateStellarAssetEvidence({
  owner,
  tokenId,
  evidenceRoot,
  evidenceManifestHash,
}: {
  owner: string;
  tokenId: number;
  evidenceRoot: string;
  evidenceManifestHash: string;
}) {
  const client = await createRegistryClient(owner);
  const assembled = await client.update_asset_evidence({
    owner,
    token_id: BigInt(tokenId),
    evidence_root: evidenceRoot,
    evidence_manifest_hash: evidenceManifestHash,
  });
  const sent = await assembled.signAndSend();
  return {
    txHash: extractTxHash(sent),
  };
}

export async function updateStellarVerificationTag({
  owner,
  tokenId,
  tagHash,
}: {
  owner: string;
  tokenId: number;
  tagHash: string;
}) {
  const client = await createRegistryClient(owner);
  const assembled = await client.update_verification_tag({
    owner,
    token_id: BigInt(tokenId),
    tag_hash: tagHash,
  });
  const sent = await assembled.signAndSend();
  return {
    txHash: extractTxHash(sent),
  };
}

export function resolveStellarPaymentToken(symbol?: string) {
  return String(symbol || '').toUpperCase() === 'XLM'
    ? nativeTokenAddress
    : paymentTokenAddress;
}
