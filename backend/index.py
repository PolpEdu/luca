import os
from pathlib import Path
from dotenv import load_dotenv

# Get the directory containing the current file
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables
load_dotenv(".env")
print(os.environ)
from flask import Flask
from flask_cors import CORS
from routes.transcription import bp
from agent.initialize_agent import initialize_agent
from db.setup import setup

app = Flask(__name__)
CORS(app)

setup()
app.register_blueprint(bp)


# Initialize the agent
agent_executor = initialize_agent()
app.agent_executor = agent_executor

if __name__ == "__main__":
    app.run(debug=True)
