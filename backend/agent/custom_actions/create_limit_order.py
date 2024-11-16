from utils import fetch_address_ens


def create_limit_order(ensName: str, chain: str = "ethereum") -> str:
    """Creates a limit order  using

    Args:
        ensName (str): The ENS name to get the address for ending with .eth. If its not ending with .eth, ask the user to change it to .eth or simply ask if you can change it to .eth.

    Returns:
        str: The address of the ENS name.

    """
    print(f"Fetching ENS address for {ensName}", flush=True)
    try:
        return fetch_address_ens(ensName)
    except Exception as e:
        return f"Error fetching ENS address: {e}"
