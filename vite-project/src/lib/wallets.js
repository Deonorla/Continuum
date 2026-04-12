import {
  isConnected as freighterIsConnected,
  requestAccess as freighterRequestAccess,
} from '@stellar/freighter-api';

async function detectFreighterWallet() {
  try {
    const connection = await freighterIsConnected();
    const isAvailable = Boolean(connection?.isConnected || connection?.isAllowed);

    return {
      id: 'stellar:freighter',
      type: 'stellar',
      name: 'Freighter',
      icon: '/images/freighter-icon.png',
      rdns: 'org.stellar.freighter',
      source: 'freighter',
      provider: {
        async connect() {
          const response = await freighterRequestAccess();
          if (response?.error) {
            throw new Error(response.error.message || 'Freighter access was denied.');
          }
          return response.address;
        },
      },
      description: 'Injected Stellar wallet for Soroban and payment session signing',
      isAvailable,
    };
  } catch (error) {
    return {
      id: 'stellar:freighter',
      type: 'stellar',
      name: 'Freighter',
      icon: '/images/freighter-icon.png',
      rdns: 'org.stellar.freighter',
      source: 'freighter',
      provider: null,
      description: 'Install Freighter to use the Stellar payment flow',
      isAvailable: false,
    };
  }
}

export async function discoverInjectedWallets() {
  return [await detectFreighterWallet()];
}

export async function getAvailableWallets() {
  return discoverInjectedWallets();
}

export async function resolveWalletSelection(selection, wallets = []) {
  if (!selection) {
    return null;
  }

  if (typeof selection === 'object' && (selection.provider || selection.source)) {
    return selection;
  }

  const refreshedWallets = wallets.length ? wallets : await getAvailableWallets();
  const matchedWallet = refreshedWallets.find((wallet) => wallet.id === selection);
  if (matchedWallet) {
    return matchedWallet;
  }

  if (String(selection) !== 'stellar:freighter') {
    return null;
  }

  return detectFreighterWallet();
}
