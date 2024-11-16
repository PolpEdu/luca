import json
import requests
from ens import ENS
from web3 import Web3
import os
from cdp import Wallet


def pad_address(address: str) -> str:
    """Pad an address to 32 bytes (64 hex chars)"""
    address = address.replace("0x", "")
    return "0x" + address.zfill(64)


def format_sse(data: str, event: str = None, functions: str = []) -> str:
    """Format data as SSE"""
    response = {"event": event, "data": data}
    if len(functions) > 0:
        response["functions"] = functions
    return json.dumps(response) + "\n"


def get_token_address(token_symbol: str) -> str:
    method = "get"
    apiUrl = "https://api.1inch.dev/token/v1.2/search"
    requestOptions = {
        "headers": {"Authorization": "Bearer " + os.getenv("ONEINCH_API_KEY")},
        "body": "",
        "params": {
            "query": token_symbol,
            "ignore_listed": "false",
            "only_positive_rating": "true",
            "limit": "1",
        },
    }

    # Prepare request components
    headers = requestOptions.get("headers", {})
    body = requestOptions.get("body", {})
    params = requestOptions.get("params", {})

    response = requests.get(apiUrl, headers=headers, params=params)
    print("response", response.json())
    return response.json()[0]["address"]


def get_requested_token_prices(token_addresses: list[str]) -> str:
    url = "https://api.1inch.dev/price/v1.1/1"

    payload = {"tokens": token_addresses, "currency": "USD"}
    print("payload", payload)
    response = requests.post(
        url,
        headers={"Authorization": f"Bearer {os.getenv('ONEINCH_API_KEY')}"},
        json=payload,
    )
    token_addr = token_addresses[0]
    price = None
    if response.status_code == 200:
        prices = response.json()
        price = prices[token_addr]
    else:
        print("Failed to fetch token prices.")
        price = "Error fetching price"
    return price


def fetch_address_ens(address: str) -> str:
    w3 = Web3(Web3.HTTPProvider("https://cloudflare-eth.com"))
    ns = ENS.from_web3(w3)
    return ns.address(address)
