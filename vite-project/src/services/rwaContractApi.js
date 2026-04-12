import { ACTIVE_NETWORK } from '../networkConfig.js';
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

function requireAddress(label, value) {
  if (!value) {
    throw new Error(`${label} is not configured`);
  }
}

function requireWriteWallet(signer) {
  if (!signer) {
    throw new Error(
      'Connect Freighter before authorizing this Stellar action.',
    );
  }
}

export function hashText(value) {
  return hashStellarText(value || '');
}

export function parseTokenAmount(value, decimals = 7) {
  const str = String(value || 0);
  const [whole = '0', frac = ''] = str.split('.');
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole + padded);
}

export async function approveAndCreateAssetYieldStream({
  signer,
  tokenAddress,
  streamAddress,
  hubAddress,
  tokenId,
  totalAmount,
  duration,
}) {
  requireWriteWallet(signer);
  const sender = await signer.getAddress();
  return openStellarYieldStream({
    sender,
    tokenId: Number(tokenId),
    token: tokenAddress || resolveStellarPaymentToken(),
    totalAmount: BigInt(totalAmount),
    durationSeconds: Number(duration),
  });
}

export async function claimAssetYield({ signer, hubAddress, tokenId }) {
  requireWriteWallet(signer);
  const owner = await signer.getAddress();
  return claimStellarYield({
    owner,
    tokenId: Number(tokenId),
  });
}

export async function flashAdvanceAssetYield({ signer, hubAddress, tokenId, amount }) {
  requireWriteWallet(signer);
  const owner = await signer.getAddress();
  return flashAdvanceStellarYield({
    owner,
    tokenId: Number(tokenId),
    amount: BigInt(amount),
  });
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

export async function updateAssetMetadataOnChain({ signer, hubAddress, tokenId, metadataURI }) {
  requireWriteWallet(signer);
  const owner = await signer.getAddress();
  return updateStellarAssetMetadata({
    owner,
    tokenId: Number(tokenId),
    metadataURI,
  });
}

export async function updateAssetEvidenceOnChain({
  signer,
  hubAddress,
  tokenId,
  evidenceRoot,
  evidenceManifestHash,
}) {
  requireWriteWallet(signer);
  const owner = await signer.getAddress();
  return updateStellarAssetEvidence({
    owner,
    tokenId: Number(tokenId),
    evidenceRoot,
    evidenceManifestHash,
  });
}

export async function updateAssetVerificationTag({ signer, hubAddress, tokenId, tag }) {
  requireWriteWallet(signer);
  const owner = await signer.getAddress();
  return updateStellarVerificationTag({
    owner,
    tokenId: Number(tokenId),
    tagHash: hashText(tag),
  });
}

export async function transferAssetOwnershipOnChain({
  signer,
  tokenId,
  to,
}) {
  requireWriteWallet(signer);
  const owner = await signer.getAddress();
  return transferStellarAsset({
    owner,
    tokenId: Number(tokenId),
    to,
  });
}

export async function readClaimableYield({ provider, hubAddress, tokenId }) {
  const asset = await fetchRwaAsset(tokenId);
  return BigInt(asset?.claimableYield || 0);
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
  if (!ACTIVE_NETWORK.kind || ACTIVE_NETWORK.kind !== 'stellar') {
    throw new Error('This action is only available on the Stellar runtime.');
  }
  requireWriteWallet(signer);
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
  if (!ACTIVE_NETWORK.kind || ACTIVE_NETWORK.kind !== 'stellar') {
    throw new Error('This action is only available on the Stellar runtime.');
  }
  requireWriteWallet(signer);
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
  if (!ACTIVE_NETWORK.kind || ACTIVE_NETWORK.kind !== 'stellar') {
    throw new Error('This action is only available on the Stellar runtime.');
  }
  requireWriteWallet(signer);
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
