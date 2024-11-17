from web3 import Web3
import os
from utils import deploy_erc20
from constants import get_tx_explorer


def deploy_contract_polygon(name: str, ticker: str, max_supply: int) -> str:
    """Deploy an ERC20 token smart contract.

    Args:
        wallet (wallet): The wallet to deploy the Token from.
        name (str): The name of the token (e.g., "My Token")
        symbol (str): The token symbol (e.g., "USDC", "MEME", "SYM")
        total_supply (str): The total supply of tokens to mint (e.g., "1000000")

    Returns:
        str: A message containing the deployed token contract address and details

    """
    try:
        pk = os.getenv("PRIVATE_KEY")
        if pk is None:
            raise Exception("PRIVATE_KEY environment variable is not set")

        try:
            contract_address = deploy_erc20(
                "https://polygon-rpc.com", pk, name, ticker, max_supply
            )

            return f"Deployed ERC20 token contract {name} ({ticker}) with total supply of {max_supply} tokens at address {contract_address}. Transaction link: {get_tx_explorer(contract_address, True, chain='polygon')}"
        except Exception as e:
            return f"Error deploying token {e!s}"
    except Exception as e:
        return f"Error deploying token {e!s}"
