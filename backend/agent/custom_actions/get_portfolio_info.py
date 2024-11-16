import os
import time
import requests
from constants import get_blockscout_explorer
from utils import fetch_address_ens
from flask import current_app
from cdp import Wallet


def get_portfolio_info(ensOrAddress: str, chain: str) -> dict:
    """Gets address information for a given wallet address. If the user asks for HIS portfolio info use the agent one. BY DEFAULT USE ETH MAINNET unless otherwise specified.
    Includes current value, token details, and profit/loss information. With also the blockscout explorer: https://base-sepolia.blockscout.com/{address}/{address}

    Args:
        ensOrAddress (str): The ENS name (e.g., 'vitalik.eth'). If it starts with 0x... then it's an address. If it doesnt end with .eth and its not an address and the user is not referring to his portfolio, ask if the user wants to replace the ending with .eth. Only accept .eth endings.
        chain (str): The chain to get portfolio information for. If you are not sure about the chain, ask the user.
    Returns:
        dict: A json with all of the portfolio information.
    """
    try:
        # Configuration
        chain_id = None
        if chain == "polygon":
            chain_id = 137
        elif chain == "base" or chain == "8453":
            chain_id = 8453
        elif chain == "arbitrum" or chain == "42161":
            chain_id = 42161
        elif chain == "sepolia" or chain == "84532":
            chain_id = 84532
        elif (
            chain == "ethereum"
        ):  # needs to be ethereum. this api doesnt support testnets and stuff
            chain_id = 1

        address = None
        if ensOrAddress.endswith(".eth"):
            address = fetch_address_ens(ensOrAddress)
        elif ensOrAddress.startswith("0x"):
            address = ensOrAddress
        else:
            wallet: Wallet = current_app.wallet
            address = wallet.address

        if not address:
            return {"error": "Could not resolve address"}

        headers = {"Authorization": f"Bearer {os.getenv('ONEINCH_API_KEY')}"}
        base_url = "https://api.1inch.dev/portfolio/portfolio/v4/overview/erc20"
        params = {"addresses": [address], "chain_id": str(chain_id)}
        # Get current value
        current_value = requests.get(
            f"{base_url}/current_value",
            params=params,
            headers=headers,
        ).json()
        time.sleep(1)  # Rate limiting

        # Get token details
        token_details = requests.get(
            f"{base_url}/details",
            params=params,
            headers=headers,
        ).json()

        print(current_value, "\n\n\n\n", token_details, flush=True)

        # Format response
        portfolio_data = {
            "address": address,
            "total_value": {
                "native": current_value["result"][0]["result"][1]["value_usd"],
                "stable": current_value["result"][1]["result"][1]["value_usd"],
                "tokens": current_value["result"][2]["result"][1]["value_usd"],
                "total": sum(
                    x["result"][1]["value_usd"] for x in current_value["result"]
                ),
            },
            "tokens": [],
            "blockscout_link": get_blockscout_explorer(
                address, isAddress=True, chain=chain
            ),
        }
        # Add token details
        for token in token_details.get("result", []):
            if token.get("value_usd", 0) > 1:  # Filter out dust amounts
                token_info = {
                    "symbol": token.get(
                        "contract_address"
                    ),  # You may want to add token symbol mapping
                    "amount": token.get("amount"),
                    "value_usd": token.get("value_usd"),
                    "price_usd": token.get("price_to_usd"),
                    "profit_loss": {
                        "absolute": token.get("abs_profit_usd"),
                        "percentage": token.get("roi") * 100 if token.get("roi") else 0,
                    },
                }
                portfolio_data["tokens"].append(token_info)

        # Sort tokens by value
        portfolio_data["tokens"].sort(key=lambda x: x["value_usd"], reverse=True)

        return portfolio_data

    except Exception as e:
        if "'result'" in str(e):
            return {
                "error": "We don't have enough information about this chain. Please try another chain or verify the chain name is correct."
            }
        return {
            "error": f"Error fetching portfolio info: {e}",
        }
