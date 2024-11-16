from utils import get_token_address, get_requested_token_prices


def get_price(token_symbol: str) -> str:
    """Gets/Fetches the price of a token on Ethereum Mainnet agains USDC. If the user wants to use other chains say its not possible at the moment.

    Args:
        token_symbol (str): The symbol of the token to get the price for.

    Returns:
        str: The price of the token.

    """
    print(f"Fetching price for {token_symbol}", flush=True)
    try:
        token_address = get_token_address(token_symbol)
        price = get_requested_token_prices([token_address])
        return price
    except Exception as e:
        return f"Error fetching price: {e}"
