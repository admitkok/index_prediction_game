from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import random

app = Flask(__name__)
CORS(app)  

users = {}
leaderboard = []

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    if username in users:
        return jsonify({"error": "User already exists"}), 400
    users[username] = {"score": 0}
    return jsonify({"message": "User registered successfully"}), 200

@app.route('/get_leaderboard', methods=['GET'])
def get_leaderboard():
    sorted_leaderboard = sorted(leaderboard, key=lambda x: x['score'], reverse=True)
    return jsonify(sorted_leaderboard), 200

@app.route('/update_score', methods=['POST'])
def update_score():
    data = request.get_json()
    username = data.get('username')
    score = data.get('score')
    if username not in users:
        return jsonify({"error": "User not found"}), 400
    users[username]['score'] = score
    leaderboard.append({"username": username, "score": score})
    return jsonify({"message": "Score updated successfully"}), 200

@app.route('/get_data', methods=['GET'])
def get_data():
    ticker = request.args.get('ticker', '^GSPC') 
    data = yf.download(ticker, period='1d', interval='1m')
    data = data.reset_index()
    data['Datetime'] = data['Datetime'].dt.strftime('%Y-%m-%d %H:%M:%S') 
    data = data[['Datetime', 'Close']]
    return jsonify(data=data.to_dict(orient='records'))


if __name__ == '__main__':
    app.run(debug=True)
