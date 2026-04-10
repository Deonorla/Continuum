import { Contract, ethers } from 'ethers';
import { ACTIVE_NETWORK } from '../networkConfig.js';
import {
  substrateCallContract,
  substrateReadContract,
} from '../lib/substrateAssets.js';
import {
  fetchRwaAsset,
  rwaAdminAction,
  rwaRelayAction,
} from './rwaApi.js';
import {
  flashAdvanceStellarYield,
  hashJson as hashStellarJson,
  hashText as hashStellarText,
  mintStellarRwaAsset,
  openStellarYieldStream,
  claimStellarYield,
  registerStellarAttestation,
  resolveIpfsGatewayUrl,
  resolveStellarPaymentToken,
  revokeStellarAttestation,
  transferStellarAsset,
  updateStellarAssetEvidence,
  updateStellarAssetMetadata,
  updateStellarVerificationTag,
} from '../lib/stellarRwaContracts.ts';

const TOKEN_APPROVAL_GAS_LIMIT = 500000n;
const ASSET_STREAM_CREATION_GAS_LIMIT = 1500000n;

const HUB_ABI = [
  'function createAssetYieldStream(uint256 tokenId, uint256 totalAmount, uint256 duration) external returns (uint256)',
  'function claimYield(uint256 tokenId) external returns (uint256)',
  'function flashAdvance(uint256 tokenId, uint256 amount) external',
  'function claimableYield(uint256 tokenId) external view returns (uint256)',
  'function setCompliance(address user, uint8 assetType, bool approved, uint64 expiry, string jurisdiction) external',
  'function setIssuerApproval(address issuer, bool approved, string note) external',
  'function setAttestationPolicy(uint8 assetType, uint8 role, bool required, uint64 maxAge) external',
  'function freezeStream(uint256 streamId, bool frozen, string reason) external',
  'function setAssetPolicy(uint256 tokenId, bool frozen, bool disputed, bool revoked, string reason) external',
  'function setVerificationStatus(uint256 tokenId, uint8 status, string reason) external',
  'function updateAssetMetadata(uint256 tokenId, string metadataURI, bytes32 cidHash) external',
  'function updateAssetEvidence(uint256 tokenId, bytes32 evidenceRoot, bytes32 evidenceManifestHash) external',
  'function updateVerificationTag(uint256 tokenId, bytes32 tagHash) external',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

function requireAddress(label, value) {
  if (!value) {
    throw new Error(`${label} is not configured`);
  }
}

function hasNativeSubstrateSession(substrateSession) {
  return ACTIVE_NETWORK.chainId === 420420421 && Boolean(substrateSession?.api && substrateSession?.account);
}

function isStellarRuntime() {
  return ACTIVE_NETWORK.kind === 'stellar';
}

function requireWriteWallet({ signer, substrateSession }) {
  if (!signer && !hasNativeSubstrateSession(substrateSession)) {
    throw new Error(
      isStellarRuntime()
        ? 'Connect Freighter before authorizing this Stellar action.'
        : 'Connect a compatible wallet before sending this contract action.',
    );
  }
}

export function hashText(value) {
  return hashStellarText(value || '');
}

export function parseTokenAmount(value, decimals = 6) {
  return ethers.parseUnits(String(value || 0), decimals);
}

export async function approveAndCreateAssetYieldStream({
  signer,
  substrateSession,
  tokenAddress,
  streamAddress,
  hubAddress,
  tokenId,
  totalAmount,
  duration,
}) {
  if (isStellarRuntime()) {
    requireWriteWallet({ signer, substrateSession });
    const sender = await signer.getAddress();
    return openStellarYieldStream({
      sender,
      tokenId: Number(tokenId),
      token: tokenAddress || resolveStellarPaymentToken(),
      totalAmount: BigInt(totalAmount),
      durationSeconds: Number(duration),
    });
  }

  requireAddress('Token address', tokenAddress);
  requireAddress('Asset stream address', streamAddress);
  requireAddress('RWA hub address', hubAddress);
  requireWriteWallet({ signer, substrateSession });

  if (hasNativeSubstrateSession(substrateSession)) {
    // Use ERC-20 precompile approve so the EVM contract's transferFrom can see the allowance.
    // assets.approveTransfer (native pallet) and the EVM precompile allowance store are separate —
    // the contract reads ERC-20 allowances, not native delegations.
    await substrateCallContract(substrateSession, {
      contractAddress: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [streamAddress, totalAmount],
    });
    return substrateCallContract(substrateSession, {
      contractAddress: hubAddress,
      abi: HUB_ABI,
      functionName: 'createAssetYieldStream',
      args: [tokenId, totalAmount, duration],
    });
  }

  const ownerAddress = await signer.getAddress();
  if (ACTIVE_NETWORK.chainId === 420420421) {
    // Same fix for the EVM-signer path on Westend: use the ERC-20 precompile, not assets.approveTransfer.
    try {
      const token = new Contract(tokenAddress, ERC20_ABI, signer);
      const approveTx = await token.approve(streamAddress, totalAmount, {
        gasLimit: TOKEN_APPROVAL_GAS_LIMIT,
      });
      await approveTx.wait();
    } catch (error) {
      console.warn('[rwaContractApi] ERC-20 precompile approval failed.', error);
      throw new Error(error?.message || 'Token approval failed on Westend.');
    }
  } else {
    const token = new Contract(tokenAddress, ERC20_ABI, signer);
    let shouldApprove = true;
    try {
      const allowance = await token.allowance(ownerAddress, streamAddress);
      shouldApprove = allowance < totalAmount;
    } catch (error) {
      console.warn('[rwaContractApi] Unable to read token allowance. Falling back to direct approval.', error);
    }

    if (shouldApprove) {
      const approveTx = await token.approve(streamAddress, totalAmount, {
        gasLimit: TOKEN_APPROVAL_GAS_LIMIT,
      });
      await approveTx.wait();
    }
  }

  const hub = new Contract(hubAddress, HUB_ABI, signer);
  const tx = await hub.createAssetYieldStream(tokenId, totalAmount, duration, {
    gasLimit: ASSET_STREAM_CREATION_GAS_LIMIT,
  });
  return tx.wait();
}

export async function claimAssetYield({ signer, substrateSession, hubAddress, tokenId }) {
  if (isStellarRuntime()) {
    requireWriteWallet({ signer, substrateSession });
    const owner = await signer.getAddress();
    return claimStellarYield({
      owner,
      tokenId: Number(tokenId),
    });
  }

  requireAddress('RWA hub address', hubAddress);
  requireWriteWallet({ signer, substrateSession });

  if (hasNativeSubstrateSession(substrateSession)) {
    return substrateCallContract(substrateSession, {
      contractAddress: hubAddress,
      abi: HUB_ABI,
      functionName: 'claimYield',
      args: [tokenId],
    });
  }

  const hub = new Contract(hubAddress, HUB_ABI, signer);
  const tx = await hub.claimYield(tokenId);
  return tx.wait();
}

export async function flashAdvanceAssetYield({ signer, substrateSession, hubAddress, tokenId, amount }) {
  if (isStellarRuntime()) {
    requireWriteWallet({ signer, substrateSession });
    const owner = await signer.getAddress();
    return flashAdvanceStellarYield({
      owner,
      tokenId: Number(tokenId),
      amount: BigInt(amount),
    });
  }

  requireAddress('RWA hub address', hubAddress);
  requireWriteWallet({ signer, substrateSession });

  if (hasNativeSubstrateSession(substrateSession)) {
    return substrateCallContract(substrateSession, {
      contractAddress: hubAddress,
      abi: HUB_ABI,
      functionName: 'flashAdvance',
      args: [tokenId, amount],
    });
  }

  const hub = new Contract(hubAddress, HUB_ABI, signer);
  const tx = await hub.flashAdvance(tokenId, amount);
  return tx.wait();
}

export async function setAssetCompliance({
  assetType,
  user,
  approved,
  expiry,
  jurisdiction,
}) {
  return rwaAdminAction({ action: 'setCompliance', user, assetType, approved, expiry, jurisdiction });
}

export async function setAssetStreamFreeze({ hubAddress: _hub, streamId, frozen, reason }) {
  return rwaAdminAction({ action: 'freezeStream', streamId, frozen, reason });
}

export async function setAssetIssuerApproval({
  issuer,
  approved,
  note,
}) {
  return rwaAdminAction({ action: 'setIssuerApproval', issuer, approved, note });
}

export async function setAssetAttestationPolicy({
  assetType,
  role,
  required,
  maxAge,
}) {
  return rwaAdminAction({ action: 'setAttestationPolicy', assetType, role, required, maxAge });
}

export async function setAssetPolicyOnChain({
  tokenId,
  frozen,
  disputed,
  revoked,
  reason,
}) {
  return rwaAdminAction({ action: 'setAssetPolicy', tokenId, frozen, disputed, revoked, reason });
}

export async function setAssetVerificationStatus({
  tokenId,
  status,
  reason,
}) {
  return rwaAdminAction({ action: 'setVerificationStatus', tokenId, status, reason });
}

export async function updateAssetMetadataOnChain({ signer, substrateSession, hubAddress, tokenId, metadataURI }) {
  if (isStellarRuntime()) {
    requireWriteWallet({ signer, substrateSession });
    const owner = await signer.getAddress();
    return updateStellarAssetMetadata({
      owner,
      tokenId: Number(tokenId),
      metadataURI,
    });
  }

  requireAddress('RWA hub address', hubAddress);
  requireWriteWallet({ signer, substrateSession });

  if (hasNativeSubstrateSession(substrateSession)) {
    return substrateCallContract(substrateSession, {
      contractAddress: hubAddress,
      abi: HUB_ABI,
      functionName: 'updateAssetMetadata',
      args: [tokenId, metadataURI, hashText(metadataURI)],
    });
  }

  const hub = new Contract(hubAddress, HUB_ABI, signer);
  const tx = await hub.updateAssetMetadata(tokenId, metadataURI, hashText(metadataURI));
  return tx.wait();
}

export async function updateAssetEvidenceOnChain({
  signer,
  substrateSession,
  hubAddress,
  tokenId,
  evidenceRoot,
  evidenceManifestHash,
}) {
  if (isStellarRuntime()) {
    requireWriteWallet({ signer, substrateSession });
    const owner = await signer.getAddress();
    return updateStellarAssetEvidence({
      owner,
      tokenId: Number(tokenId),
      evidenceRoot,
      evidenceManifestHash,
    });
  }

  requireAddress('RWA hub address', hubAddress);
  requireWriteWallet({ signer, substrateSession });

  if (hasNativeSubstrateSession(substrateSession)) {
    return substrateCallContract(substrateSession, {
      contractAddress: hubAddress,
      abi: HUB_ABI,
      functionName: 'updateAssetEvidence',
      args: [tokenId, evidenceRoot, evidenceManifestHash],
    });
  }

  const hub = new Contract(hubAddress, HUB_ABI, signer);
  const tx = await hub.updateAssetEvidence(tokenId, evidenceRoot, evidenceManifestHash);
  return tx.wait();
}

export async function updateAssetVerificationTag({ signer, substrateSession, hubAddress, tokenId, tag }) {
  if (isStellarRuntime()) {
    requireWriteWallet({ signer, substrateSession });
    const owner = await signer.getAddress();
    return updateStellarVerificationTag({
      owner,
      tokenId: Number(tokenId),
      tagHash: hashText(tag),
    });
  }

  requireAddress('RWA hub address', hubAddress);
  requireWriteWallet({ signer, substrateSession });

  if (hasNativeSubstrateSession(substrateSession)) {
    return substrateCallContract(substrateSession, {
      contractAddress: hubAddress,
      abi: HUB_ABI,
      functionName: 'updateVerificationTag',
      args: [tokenId, hashText(tag)],
    });
  }

  const hub = new Contract(hubAddress, HUB_ABI, signer);
  const tx = await hub.updateVerificationTag(tokenId, hashText(tag));
  return tx.wait();
}

export async function transferAssetOwnershipOnChain({
  signer,
  substrateSession,
  tokenId,
  to,
}) {
  if (isStellarRuntime()) {
    requireWriteWallet({ signer, substrateSession });
    const owner = await signer.getAddress();
    return transferStellarAsset({
      owner,
      tokenId: Number(tokenId),
      to,
    });
  }

  throw new Error('Automatic custody transfer is only implemented on the Stellar runtime.');
}

export async function readClaimableYield({ provider, substrateSession, hubAddress, tokenId }) {
  if (isStellarRuntime()) {
    const asset = await fetchRwaAsset(tokenId);
    return BigInt(asset?.claimableYield || 0);
  }

  requireAddress('RWA hub address', hubAddress);

  if (hasNativeSubstrateSession(substrateSession)) {
    return substrateReadContract(substrateSession, {
      contractAddress: hubAddress,
      abi: HUB_ABI,
      functionName: 'claimableYield',
      args: [tokenId],
    });
  }

  const hub = new Contract(hubAddress, HUB_ABI, provider);
  return hub.claimableYield(tokenId);
}

export async function mintAssetTwinWithFreighter({
  signer,
  issuer,
  assetType,
  rightsModel,
  publicMetadataURI,
  publicMetadataHash,
  evidenceRoot,
  evidenceManifestHash,
  propertyRefHash,
  jurisdiction = '',
  cidHash,
  tagHash,
  statusReason = '',
}) {
  if (!isStellarRuntime()) {
    throw new Error('Direct Stellar asset minting is only available on the Stellar runtime.');
  }
  requireWriteWallet({ signer, substrateSession: null });
  const resolvedIssuer = issuer || await signer.getAddress();
  return mintStellarRwaAsset({
    issuer: resolvedIssuer,
    assetType: Number(assetType),
    rightsModel: Number(rightsModel),
    publicMetadataURI,
    publicMetadataHash,
    evidenceRoot,
    evidenceManifestHash,
    propertyRefHash,
    jurisdiction,
    cidHash,
    tagHash,
    statusReason,
  });
}

export async function registerAssetAttestationWithFreighter({
  signer,
  tokenId,
  role,
  evidenceHash,
  statementType,
  expiry = 0,
}) {
  if (!isStellarRuntime()) {
    throw new Error('Direct Stellar attestation is only available on the Stellar runtime.');
  }
  requireWriteWallet({ signer, substrateSession: null });
  const attestor = await signer.getAddress();
  return registerStellarAttestation({
    attestor,
    tokenId: Number(tokenId),
    role: Number(role),
    evidenceHash,
    statementType,
    expiry: Number(expiry || 0),
  });
}

export async function revokeAssetAttestationWithFreighter({
  signer,
  attestationId,
  reason = '',
}) {
  if (!isStellarRuntime()) {
    throw new Error('Direct Stellar attestation revocation is only available on the Stellar runtime.');
  }
  requireWriteWallet({ signer, substrateSession: null });
  const attestor = await signer.getAddress();
  return revokeStellarAttestation({
    attestor,
    attestationId: Number(attestationId),
    reason,
  });
}

export async function hashMetadataUri(metadataURI) {
  const response = await fetch(resolveIpfsGatewayUrl(metadataURI));
  if (!response.ok) {
    throw new Error(`Unable to load metadata from ${metadataURI}`);
  }
  const metadata = await response.json();
  return hashStellarJson(metadata);
}
