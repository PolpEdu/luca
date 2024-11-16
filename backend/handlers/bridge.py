from web3 import Web3
from cdp import Wallet
from typing import Any
import requests
import time
from utils import pad_address
from constants import (
    BASE_TOKEN_MESSENGER_ADDRESS,
    BASE_MESSAGE_TRANSMITTER_ADDRESS,
    USDC_BASE_ADDRESS,
    TOKEN_MESSENGER_ABI,
    MESSAGE_TRANSMITTER_ABI,
)


def bridge_usdc_exec(
    base_wallet: Wallet, arbitrum_wallet: Wallet, usdc_amount: str
) -> dict[str, Any]:
    """Bridges USDC from Base to Arbitrum.

    Args:
        base_wallet (Wallet): The Base wallet to use.
        arbitrum_wallet (Wallet): The Arbitrum wallet to use.
        usdc_amount (str): The amount of USDC to bridge.

    Returns:
        dict: A dictionary containing the transaction hashes and balances.
    """

    w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))

    # Get initial balances
    base_usdc_balance = base_wallet.balance("usdc")
    arbitrum_usdc_balance = arbitrum_wallet.balance("usdc")
    print(
        f"Base USDC initial balance: {base_usdc_balance} | Arbitrum USDC initial balance: {arbitrum_usdc_balance}"
    )

    # Get recipient address and pad it
    arbitrum_address = arbitrum_wallet.default_address
    padded_recipient = pad_address(arbitrum_address)

    # Step 1: Approve TokenMessenger as spender
    usdc_contract = w3.eth.contract(
        address=Web3.to_checksum_address(USDC_BASE_ADDRESS),
        abi=[
            {
                "inputs": [
                    {"name": "spender", "type": "address"},
                    {"name": "value", "type": "uint256"},
                ],
                "name": "approve",
                "outputs": [{"name": "", "type": "bool"}],
                "stateMutability": "nonpayable",
                "type": "function",
            }
        ],
    )

    approve_tx = base_wallet.invoke_contract(
        USDC_BASE_ADDRESS,
        "approve",
        args={
            "spender": BASE_TOKEN_MESSENGER_ADDRESS,
            "value": usdc_amount,
        },
    )
    approve_tx.wait()
    print(f"Approve transaction completed: {approve_tx.transaction_hash}")

    # Step 2: Call depositForBurn
    deposit_tx = base_wallet.invoke_contract(
        BASE_TOKEN_MESSENGER_ADDRESS,
        "depositForBurn",
        args={
            "amount": str(usdc_amount),  # amount
            "destinationDomain": "3",  # destinationDomain (Arbitrum)
            "mintRecipient": padded_recipient,  # mintRecipient
            "burnToken": USDC_BASE_ADDRESS,  # burnToken
        },
        abi=TOKEN_MESSENGER_ABI,
    )
    deposit_tx.wait()
    print(f"Deposit transaction completed: {deposit_tx.transaction_hash}")

    # Step 3: Get messageHash from transaction receipt
    receipt = w3.eth.get_transaction_receipt(deposit_tx.transaction_hash)
    message_sent_topic = w3.keccak(text="MessageSent(bytes)").hex()

    message_log = next(
        log for log in receipt.logs if log.topics[0].hex() == message_sent_topic
    )
    message_bytes = message_log["data"]
    message_hash = w3.keccak(hexstr=message_bytes).hex()
    print(f"Message hash: {message_hash}")

    # Step 4: Wait for attestation
    while True:
        response = requests.get(
            f"https://iris-api.circle.com/attestations/{message_hash}"
        )
        attestation_data = response.json()

        if attestation_data["status"] == "complete":
            attestation_signature = attestation_data["attestation"]
            break

        time.sleep(2)

    print(
        f"Received attestation signature from Circle's Iris service: {attestation_signature}"
    )

    # Step 5: Call receiveMessage on Arbitrum
    receive_tx = arbitrum_wallet.invoke_contract(
        BASE_MESSAGE_TRANSMITTER_ADDRESS,
        "receiveMessage",
        args={
            "message": message_bytes,
            "attestation": attestation_signature,
        },
        abi=MESSAGE_TRANSMITTER_ABI,
    )
    receive_tx.wait()
    print(f"Receive message transaction completed: {receive_tx.transaction_hash}")

    # Get final balances
    final_base_balance = base_wallet.balance("usdc")
    final_arbitrum_balance = arbitrum_wallet.balance("usdc")
    print(
        f"Base USDC final balance: {final_base_balance} | Arbitrum USDC final balance: {final_arbitrum_balance}"
    )

    return {
        "approve_tx": approve_tx.transaction_hash,
        "deposit_tx": deposit_tx.transaction_hash,
        "receive_tx": receive_tx.transaction_hash,
        "initial_base_balance": base_usdc_balance,
        "initial_arbitrum_balance": arbitrum_usdc_balance,
        "final_base_balance": final_base_balance,
        "final_arbitrum_balance": final_arbitrum_balance,
    }
