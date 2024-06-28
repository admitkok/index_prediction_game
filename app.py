###This part is in the sagemaker notebook.

from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import json
import numpy as np
import boto3
from src.data.collector import DataCollector
from src.data.processor import DataProcessor


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

@app.route('/invoke_sagemaker', methods=['POST'])
def invoke_sagemaker():
    timestamps = request.json.get('timestamps')
    print(timestamps)
    collector = DataCollector(
        filename="data-inference.csv",
        days=3,
        ticker="^GSPC",
        num_rows=31,
        last_timestamp=timestamps,
        outputpath="../data/raw/",
    )
    
    processor = DataProcessor()
    df = collector.get_data()
    df["Datetime"] = df.index
    df = df.reset_index(drop=True)
    df = processor.drop_columns(df)

    df = processor.sort_by_datetime(df)
    df = processor.extract_date_features(df)
    df = processor.one_hot_encode_day_of_week(df)
    df = processor.convert_datetime_to_iso_8601(df)

    lag = 30

    df.drop(columns=["Datetime"], inplace=True)
    df = processor.prepare_data(df, lag)

    df = df.rename(columns=processor.convert_col_name)
    df.drop(columns=["close_target"], inplace=True)

    csv_input = df.to_csv(index=False, header=False)
    runtime_client = boto3.client("sagemaker-runtime")

    endpoint_name = "index-predictor-endpoint"
    response = runtime_client.invoke_endpoint(
        EndpointName=endpoint_name, ContentType="text/csv", Body=csv_input
    )

    result = json.loads(response["Body"].read().decode())
    predictions = np.array(result)

    prediction_result = "up" if predictions > 0.5 else "down"
    print(predictions)
    return jsonify({'machine_prediction': prediction_result})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
