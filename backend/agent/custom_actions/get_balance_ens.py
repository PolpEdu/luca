from eth_utils import is_address
from utils import (
    fetch_address_ens,
    get_eth_balance,
    get_balance_token,
    get_token_address,
)
from web3 import Web3
from constants import BASE_SEPOLIA_RPC

w3 = Web3(Web3.HTTPProvider(BASE_SEPOLIA_RPC))


def get_balance_ens(ens: str, token: str) -> str:
    """Gets the current balance of ETH or tokens for an ENS address. If you are not sure about the chain to use, just use Ethereum Mainnet for this specific action.

    Args:
        ens (str): The ENS name (e.g., 'vitalik.eth'). If the ens doesnt end with .eth that's fine. Ask if the user wants to replace the ending with .eth. Only accept .eth endings.
        token (str): The token symbol (e.g., 'ETH', 'USDC', 'USDT', and so on).

    Returns:
        str: The balance information for the address.
    """
    try:
        address = fetch_address_ens(ens)
        if not address or not is_address(address):
            return f"Could not resolve ENS name: {ens}"

        if token.lower() == "eth":
            eth_balance = get_eth_balance(address)
            return f"The balance for {ens} ({address}) is {eth_balance:.4f} ETH."
        else:
            token_address = get_token_address(token)
            # print(f"Token address: {token_address}")
            token_balance = float(get_balance_token(address, token_address))
            # print(f"Token balance: {token_balance}")
            return f"The balance for {ens} ({address}) is {token_balance:.4f} {token}."
    except Exception as e:
        return f"Error fetching balance: {e}"
