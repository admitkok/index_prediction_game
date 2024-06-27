import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const App = () => {
  const [data, setData] = useState([]);
  const [intervalData, setIntervalData] = useState([]);
  const [round, setRound] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [machineScore, setMachineScore] = useState(0);
  const [result, setResult] = useState('');
  const [username, setUsername] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [triesLeft, setTriesLeft] = useState(5);
  const [showDescription, setShowDescription] = useState(false);
  const [realNextPrice, setRealNextPrice] = useState(null);
  const [machinePrediction, setMachinePrediction] = useState('');
  const [showRealPrice, setShowRealPrice] = useState(false);
  const [buttonsFrozen, setButtonsFrozen] = useState(false);

  const chartRef = useRef(null);

  const flaskUrl = 'https://5868-3-66-113-240.ngrok-free.app';
  const localURl = 'http://127.0.0.1:5000';
  const headers = {
    "ngrok-skip-browser-warning": "6024"
  };

  const funnyOutcomes = [
    "Your neighbor's cat's admiration",
    "A lifetime supply of imaginary cookies",
    "The remote control to the TV for eternity",
    "A pet unicorn",
    "Brunch with aliens",
    "A dance-off with your grandma",
    "A golden statue of your pet",
    "A pizza party with ninja turtles",
    "A time machine (to use on weekends only)",
    "A wardrobe that always matches your mood",
    "A superhero alter ego",
    "A talking dog as your personal assistant",
    "The ability to communicate with plants",
    "An invisibility cloak (but only when nobody is looking)",
    "A VIP pass to the annual squirrel convention",
  ];

  useEffect(() => {
    fetchData();
  }, [round]);

  useEffect(() => {
    if (data.length > 0) {
      selectRandomInterval();
    }
  }, [data]);

  useEffect(() => {
    if (isRegistered) {
      fetchLeaderboard();
    }
  }, [isRegistered]);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(flaskUrl + '/get_leaderboard', {headers});
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const registerUser = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(flaskUrl + '/register', { username }, {headers});
      if (response.status === 200) {
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Error registering user:', error);
    }
  };

  const fetchData = async () => {
    try {
      const response = await axios.get(flaskUrl + '/get_data', { headers });
      const formattedData = response.data.data.map(item => ({
        timestamp: item["Datetime"],
        price: item["Close"]
      }));
      setData(formattedData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const selectRandomInterval = () => {
    const intervalLength = 30; 
    const maxStart = data.length - intervalLength - 1; 
    const startIndex = Math.floor(Math.random() * maxStart);
    const selectedInterval = data.slice(startIndex, startIndex + intervalLength);
    setIntervalData(selectedInterval);
    setRealNextPrice(data[startIndex + intervalLength].price); 
  };

  const makePrediction = async (prediction) => {
    if (round >= 5) return;

    const lastPrice = intervalData[intervalData.length - 1].price;  
    const lastTimestamp = intervalData[intervalData.length - 1].timestamp;
    setButtonsFrozen(true);
  
    try {
      const response = await axios.post(flaskUrl + '/invoke_sagemaker', { timestamps: lastTimestamp }, {headers});
      const machine_prediction = response.data.machine_prediction;
      setMachinePrediction(machine_prediction);
  
      let playerMessage = `Machine predicted: ${machine_prediction}`;
      let realMovement = realNextPrice > lastPrice ? 'up' : 'down';

      if (prediction === realMovement) {
        setPlayerScore(playerScore + 1);
        playerMessage += ' - You were correct!';
      } else {
        playerMessage += ' - You were wrong!';
      }

      if (machine_prediction === realMovement) {
        setMachineScore(machineScore + 1);
        playerMessage += ' Machine was correct!';
      } else {
        playerMessage += ' Machine was wrong!';
      }

      setResult(playerMessage);
      setShowRealPrice(true);
      setTimeout(() => {
        setShowRealPrice(false);
        setButtonsFrozen(false);
        setRound(round + 1);
        setTriesLeft(triesLeft - 1);  // Decrement tries left
        if (round === 4) {
          axios.post(flaskUrl + '/update_score', { username, score: playerScore + 1 }, {headers});
          fetchLeaderboard();
        }
      }, 3000);
    } catch (error) {
      console.error('Error making prediction:', error);
    }
  };

  const resetGame = () => {
      setRound(0);
      setPlayerScore(0);
      setMachineScore(0);
      setResult('');
      setIntervalData([]);
      setRealNextPrice(null);
      setMachinePrediction(''); 
      fetchData();
  };

  const chartData = {
    labels: intervalData.map(item => item.timestamp),
    datasets: [
      {
        label: 'Index Price',
        data: intervalData.map(item => item.price),
        borderColor: 'rgba(10, 10, 255, 1)',
        borderWidth: 1,
      },
      {
        label: 'Real Next Minute Price',
        data: showRealPrice ? Array(intervalData.length - 1).fill(null).concat([realNextPrice]) : [], 
        borderColor: 'rgba(255, 0, 0, 1)',
        borderWidth: 2,
        radius: 10,
      },
    ],
  };

  const toggleDescription = () => {
    setShowDescription(!showDescription);
  };

  return (
    <div className="App">
      <h1 style={{marginBottom:"0px", fontSize: "80px"}}>Index Prediction Game</h1>
      <button className="question-mark" onClick={toggleDescription}>?</button>
      {showDescription && (
        <div className="description">
          <h1>Welcome to the Index Prediction Game!</h1>
            <li><h2 style={{ fontWeight: 400 }}>
              In this game, you will compete with machine in predicting the stock price. <br />
            </h2>
          </li>
          <li><h2 style={{fontWeight: 400}}>Your task is to predict whether the price will go up or down in the next minute. </h2></li>
          <li><h2 style={{fontWeight: 400}}> You have 5 tries to make your predictions.</h2></li>
          <li><h2 style={{fontWeight: 400}}> Your score will be updated based on the accuracy of your predictions. Good luck and have fun!</h2></li>
          <li><h2> Good luck and have fun!</h2></li>
        </div>
      )}
      {!isRegistered ? (
        <form onSubmit={registerUser}>
          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <button type="submit">Register</button>
        </form>
      ) : (
        <>
        <div>
        <h2 style={{margin: "50px"}}>You play for: {funnyOutcomes[Math.floor(Math.random() * funnyOutcomes.length)]}</h2>
        <h3 style={{marginBottom: "0px"}}>This is an S&P 500 index price graph</h3>
        <h3 style={{marginTop: "0px"}}>Guess where the price will go</h3>
        </div>
        <div className='game-container'>
          <div className="chart-container">
            {intervalData.length > 0 ? (
              <Line data={chartData} ref={chartRef} />
            ) : (
              <p>Loading chart...</p>
            )}
          </div>
          <div className='answer-container'>
          <h2>Your score:</h2>
          <h1 >{playerScore}/{round}</h1>
          <p>{result ? result : "Machine predicted:"} </p>
          {realNextPrice && <p>Next Minute Real Price: {showRealPrice ? realNextPrice : null}</p>}
          <div>
            <button className='button-up' onClick={() => makePrediction('up')} disabled={round >= 5 || buttonsFrozen}>Up</button>
            <button className='button-down' onClick={() => makePrediction('down')} disabled={round >= 5 || buttonsFrozen}>Down</button>
          </div>
        </div>
        </div>
        {round >= 5 && (
          <div className="overlay">
              <div className='game-over-container'>Game Over!</div>
              <h1 style={{marginTop: "0px"}}>{machineScore > playerScore ? 'You Lose' : 'You Win'}</h1>
              <p style={{marginBottom: "0px"}}>Your final score is: {playerScore}</p>
              <p style={{marginTop: "0px"}}>Machine final score is: {machineScore}</p>
              <button onClick={resetGame}>Retry</button>
          </div>)
        }
         <div className="leaderboard">
            <h2 style={{fontSize:"48px"}}>Leaderboard</h2>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{entry.username}</td>
                    <td>{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
