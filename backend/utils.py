import json
import requests
from ens import ENS
from web3 import Web3
import os
from cdp import Wallet
import solcx
from constants import ERC20_CONTRACT_SOURCE
from eth_account import Account
from solcx import compile_standard, install_solc


def get_rpc_url(chain: str) -> str:
    if chain == "base" or chain == "8453":
        return "https://base.llamarpc.com"
    elif chain == "sepolia" or chain == "84532":
        return "https://sepolia.base.org"
    elif chain == "polygon" or chain == "137":
        return "https://polygon.llamarpc.com"
    else:
        return "https://cloudflare-eth.com"


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


def fetch_address_ens(address: str, chain: str = "ethereum") -> str:
    w3 = Web3(Web3.HTTPProvider(get_rpc_url(chain)))
    ns = ENS.from_web3(w3)
    return ns.address(address)


def get_eth_balance(address: str, chain: str = "ethereum") -> str:
    w3 = Web3(Web3.HTTPProvider(get_rpc_url(chain)))
    try:
        balance = w3.eth.get_balance(Web3.to_checksum_address(address))
        eth_balance = w3.from_wei(balance, "ether")
        return str(eth_balance)
    except Exception as e:
        return f"Error fetching balance: {e}"


def get_balance_token(address: str, token_address: str, chain: str = "ethereum") -> str:
    w3 = Web3(Web3.HTTPProvider(get_rpc_url(chain)))
    tokenInst = w3.eth.contract(
        address=Web3.to_checksum_address(token_address),
        abi=json.loads(open("abis/erc20.json").read()),
    )  # declaring the token contract
    decimals = tokenInst.functions.decimals().call()

    balance = tokenInst.functions.balanceOf(address).call()
    return str(balance / 10**decimals)


def burn_token(wallet: Wallet, token_address: str, amount: str) -> str:
    if token_address == "0x0000000000000000000000000000000000000000":
        # simple transfer eth
        tx_hash = wallet.transfer(
            amount, "eth", "0x0000000000000000000000000000000000000000"
        )

        print("tx_hash", tx_hash.transaction_hash)
        return tx_hash.transaction_hash

    print(f"Burning {amount} of ({token_address}) token_address", flush=True)
    tx_hash = wallet.transfer(
        amount, token_address, "0x0000000000000000000000000000000000000000"
    )
    return tx_hash.transaction_hash


def disperse_token(
    wallet: Wallet, token_address: str, total_amount: float, wallets: list[str]
) -> list[str]:
    singular_amount = str(total_amount / len(wallets))
    txs_hashes = []
    for address in wallets:
        tx_hash = wallet.transfer(singular_amount, token_address, address)
        txs_hashes.append(tx_hash.transaction_hash)
    return txs_hashes


def get_contract_source(url: str) -> str:
    response = requests.get(url)
    response.raise_for_status()
    return response.text


def compile_contract(source_code: str) -> tuple[dict, str]:
    # Install specific Solidity version
    install_solc("0.8.20")

    # Compile contract
    compiled_sol = compile_standard(
        {
            "language": "Solidity",
            "sources": {"ERC20.sol": {"content": source_code}},
            "settings": {
                "outputSelection": {
                    "*": {"*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]}
                }
            },
        },
        solc_version="0.8.20",
    )

    # Extract bytecode and ABI
    contract_data = compiled_sol["contracts"]["ERC20.sol"]["ERC20"]
    bytecode = contract_data["evm"]["bytecode"]["object"]
    abi = contract_data["abi"]

    return abi, bytecode


def deploy_erc20(
    rpc_url: str,
    private_key: str,
    token_name: str,
    token_symbol: str,
    initial_supply: int,
) -> str:
    # Connect to Polygon network
    w3 = Web3(Web3.HTTPProvider(rpc_url))

    # Check connection
    if not w3.is_connected():
        raise Exception("Failed to connect to Polygon network")

    # Get contract source and compile
    source_code = get_contract_source(ERC20_CONTRACT_SOURCE)
    abi, bytecode = compile_contract(source_code)

    # Create account object
    account = Account.from_key(private_key)

    # Prepare contract deployment
    contract = w3.eth.contract(abi=abi, bytecode=bytecode)

    # Get nonce
    nonce = w3.eth.get_transaction_count(account.address)

    # Prepare deployment transaction
    transaction = contract.constructor(token_name, token_symbol).build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "gas": 2000000,  # Adjust gas limit as needed
            "gasPrice": w3.eth.gas_price,
            "chainId": 137,  # Polygon Mainnet chain ID
        }
    )

    # Sign transaction
    signed_txn = w3.eth.account.sign_transaction(transaction, private_key)

    # Send transaction
    tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)

    # Wait for transaction receipt
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    print(f"Contract deployed! Address: {tx_receipt.contractAddress}")
    return tx_receipt.contractAddress
