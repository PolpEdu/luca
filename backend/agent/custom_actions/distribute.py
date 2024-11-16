from cdp import Wallet
from cdp_langchain.tools import CdpTool
from pydantic import BaseModel, Field
from web3 import Web3
from constants import get_blockscout_explorer, constants
import json

DISTRIBUTE_TOKENS_PROMPT = """
This tool will distribute a certain token to a list of addresses.
"""


class SendTransaction(BaseModel):
    """Input argument schema for send ETH action."""

    addresses: list[str] = Field(
        ..., description="The list of addresses to distribute the token to."
    )
    amount: float = Field(
        ..., description="The amount of tokens to distribute to each address."
    )
    token: str = Field(
        ...,
        description="The token to distribute. Must be a valid ERC-20 token address.",
    )


#! can only be one message
def send_tokens(wallet: Wallet, message: str) -> str:
    """Send tokens from one address to another.

    Args:
        wallet (Wallet): The wallet to send ETH from.
        message (str): A message containing the address from, to and amount. Like this {"addressesTo": ["0x456", "0x123",...], "amount": 100.0, "token": "0x123"}

    Returns:
        str: A transaction hex hash.
    """

    message_dict = json.loads(message)
    addresses = message_dict["addressesTo"]
    amount = message_dict["amount"]
    token = message_dict["token"]

    w3 = Web3(Web3.HTTPProvider(constants.BASE_SEPOLIA_RPC))
    disperse_contract = w3.eth.contract(
        address=constants.DISPERSE_CONTRACT_SEPOLIA, abi=constants.DISPERSE_CONTRACT_ABI
    )

    tx = disperse_contract.functions.disperseTokenSimple(
        token, addresses, [amount] * len(addresses)
    ).transact()

    return f"The transaction is sent! {get_blockscout_explorer(tx.hash, isTransaction=True, isAddress=False)}"


def get_gdp_sign(agentkit):
    return CdpTool(
        name="sign_message",
        description=DISTRIBUTE_TOKENS_PROMPT,
        cdp_agentkit_wrapper=agentkit,
        args_schema=SendTransaction,
        func=send_tokens,
    )
