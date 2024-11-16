from cdp import Wallet
from utils import get_token_address, disperse_token
from flask import current_app


def send_tokens_batch(wallets: str, amount: str, token: str) -> list[str] | str:
    """Send tokens from one address to another.

    Args:
        wallets (str): A list of addresses to distribute the token to like this "0x456", "0x123",...
        amount (float): The amount of tokens to distribute to each address (e.g., 100.0)
        token (str): The token to distribute. Must be a valid ERC-20 token address.

    Returns:
        str: A transaction hex hash.
    """

    try:
        if token == "eth":
            token_address = "eth"
        else:
            token_address = get_token_address(token)

        wallet = current_app.wallet
        wallets_list = wallets.split(",")

        return disperse_token(wallet, token_address, float(amount), wallets_list)
    except Exception as e:
        return f"Error burning token: {e}"
