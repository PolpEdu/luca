from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

from routes.transcription import bp

app.register_blueprint(bp)

if __name__ == "__main__":
    app.run(debug=True)
