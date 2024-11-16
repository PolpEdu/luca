import os
import constants
import json

from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from cdp_langchain.agent_toolkits import CdpToolkit
from cdp_langchain.utils import CdpAgentkitWrapper

from db.wallet import add_wallet_info, get_wallet_info
from agent.custom_actions.get_latest_block import get_latest_block
from agent.custom_actions.fetchEnsAddress import get_ens_address
from agent.custom_actions.get_price import get_price
from agent.custom_actions.bridge import bridge_usdc

import time


def initialize_agent():
    """Initialize the agent with CDP Agentkit."""
    # Initialize LLM.
    llm = ChatOpenAI(model=constants.AGENT_MODEL)
    llm_arb = ChatOpenAI(model=constants.AGENT_MODEL)

    # Read wallet data from environment variable or database
    wallet_id = os.getenv(constants.WALLET_ID_ENV_VAR)
    wallet_seed = os.getenv(constants.WALLET_SEED_ENV_VAR)
    wallet_id_arb = os.getenv(constants.WALLET_ID_ENV_VAR_ARB)
    wallet_seed_arb = os.getenv(constants.WALLET_SEED_ENV_VAR_ARB)
    wallet_info = json.loads(get_wallet_info()) if get_wallet_info() else None

    # Configure CDP Agentkit Langchain Extension.
    values = {}
    values_arb = {}

    # Load agent wallet information from database or environment variables
    if wallet_info:
        wallet_id = wallet_info["wallet_id"]
        wallet_seed = wallet_info["seed"]
        print(
            "Initialized CDP Agentkit with wallet data from database:",
            wallet_id,
            wallet_seed,
            wallet_id_arb,
            wallet_seed_arb,
            flush=True,
        )
        values = {
            "cdp_wallet_data": json.dumps(
                {"wallet_id": wallet_id, "seed": wallet_seed}
            ),
            # "network_id": "base-mainnet",
        }

        values_arb = {
            "cdp_wallet_data": json.dumps(
                {"wallet_id": wallet_id_arb, "seed": wallet_seed_arb}
            ),
            "network_id": "arbitrum-mainnet",
        }
    elif wallet_id and wallet_seed:
        print(
            "Initialized CDP Agentkit with wallet data from environment:",
            wallet_id,
            wallet_seed,
            wallet_id_arb,
            wallet_seed_arb,
            flush=True,
        )
        values = {
            "cdp_wallet_data": json.dumps(
                {"wallet_id": wallet_id, "seed": wallet_seed},
            ),
            # "network_id": "base-mainnet",
        }

        values_arb = {
            "cdp_wallet_data": json.dumps(
                {"wallet_id": wallet_id_arb, "seed": wallet_seed_arb}
            ),
            "network_id": "arbitrum-mainnet",
        }
    try:
        agentkit = CdpAgentkitWrapper(**values)

        # Export and store the updated wallet data back to environment variable
        wallet_data = agentkit.export_wallet()
        add_wallet_info(json.dumps(wallet_data))
        print("Exported wallet info", wallet_data, flush=True)

        # Initialize CDP Agentkit Toolkit and get tools. just create the wrapper for base.
        cdp_toolkit = CdpToolkit.from_cdp_agentkit_wrapper(agentkit)
        tools = cdp_toolkit.get_tools() + [
            get_latest_block,
            get_ens_address,
            get_price,
            bridge_usdc,
        ]

        # Store buffered conversation history in memory.
        memory = MemorySaver()

        # Create ReAct Agent using the LLM and CDP Agentkit tools.
        return create_react_agent(
            llm,
            tools=tools,
            checkpointer=memory,
            state_modifier=constants.AGENT_PROMPT,
        )
    except Exception as e:
        import traceback

        print(f"Error initializing agent: {e}", flush=True)
        print(traceback.format_exc(), flush=True)
        return None
