from handlers.bridge import bridge_usdc_exec
from flask import current_app
import json


def bridge_usdc(amount: str, chain: str = "arbitrum") -> str:
    """Bridge USDC to a given chain.

    Args:
        wallet (Wallet): The cdp wallet to bridge USDC from.
        amount (str): The amount of USDC to bridge.

    Returns:
        str: The transaction hash of the transaction and the amount bridged.

    """
    # parse amount to wei
    amount_wei = int(amount) * 10**6
    print(f"Bridging {amount} USDC to {chain}", flush=True)
    try:
        d = bridge_usdc_exec(
            current_app.wallet_data,
            current_app.wallet_data_arb,
            str(amount_wei),
        )
        return json.dumps(d)
    except Exception as e:
        return f"Error fetching price: {e}"
