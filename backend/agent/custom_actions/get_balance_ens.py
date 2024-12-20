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


def get_balance_ens(ensOrAddress: str, token: str) -> str:
    """Gets the current balance of ETH or tokens for an ENS address. If you are not sure about the chain to use, just use Ethereum Mainnet for this specific action.

    Args:
        ensOrAddress (str): The ENS name (e.g., 'vitalik.eth'). If it starts with 0x... then it's an address. If it doesnt end with .eth and its not an address, ask if the user wants to replace the ending with .eth. Only accept .eth endings.
        token (str): The token symbol (e.g., 'ETH', 'USDC', 'USDT', and so on).

    Returns:
        str: The balance information for the address.
    """
    try:
        address = None
        if not ensOrAddress.endswith(".eth"):
            address = ensOrAddress
        else:
            address = fetch_address_ens(ensOrAddress)

        if not address or not is_address(address):
            return f"Could not resolve ENS name: {ensOrAddress}"

        if token.lower() == "eth":
            eth_balance = get_eth_balance(address)
            return f"The balance for {ensOrAddress} ({address}) is {float(eth_balance):.4f} ETH."
        else:
            token_address = get_token_address(token)
            # print(f"Token address: {token_address}")
            token_balance = float(get_balance_token(address, token_address))
            # print(f"Token balance: {token_balance}")
            return f"The balance for {ensOrAddress} ({address}) is {token_balance:.4f} {token}."
    except Exception as e:
        return f"Error fetching balance: {e}"
