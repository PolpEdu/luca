from flask import Flask
from flask_cors import CORS
from routes.transcription import bp
from agent.initialize_agent import initialize_agent

app = Flask(__name__)
CORS(app)


app.register_blueprint(bp)


# Initialize the agent
agent_executor = initialize_agent()
app.agent_executor = agent_executor

if __name__ == "__main__":
    app.run(debug=True)
