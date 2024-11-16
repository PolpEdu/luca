from utils import get_token_address, burn_token
from flask import current_app


def burns_token(token: str, amount: str) -> str:
    """Burns/Deletes a token by sending the amount to the 0x0 address.

    Args:
        token (str): The ticker or name of the token to burn that we will later get the address for. If its eth pass "eth"
        amount (str): The amount of the token to burn.

    Returns:
        str: The transaction hash of the burn.

    """
    try:
        if token == "eth":
            token_address = "0x0000000000000000000000000000000000000000"
        else:
            token_address = get_token_address(token)
        wallet = current_app.wallet
        return burn_token(wallet, token_address, amount)
    except Exception as e:
        return f"Error burning token: {e}"
