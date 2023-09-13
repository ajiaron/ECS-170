import numpy as np
import pandas as pd
import seaborn as sns
import os
import sys
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2' # silence tensorflow warnings
import yfinance as yf
from pmdarima import auto_arima
from pyESN import ESN
import matplotlib.pyplot as plt
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
from math import sqrt
from sklearn.model_selection import train_test_split 
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
app = FastAPI()

class GrabDataInput(BaseModel):
    symbol: str
    start_date: str
    end_date: str
    intervals: str

@app.post("/grab_data")
def grab_data_endpoint(data: GrabDataInput):
    result = grab_data(data.symbol, data.start_date, data.end_date, data.intervals)
    return {'result': result}

def grab_data(symbol, start_date, end_date, intervals):
    stock_data = yf.download(symbol, start=start_date, end=end_date, interval=intervals ,progress=False)
    data = stock_data["Close"].values
    if not len(data):
        raise HTTPException(status_code=404, detail="Data not found")
    if isinstance(data, pd.DataFrame):
        return data.to_dict()
    elif isinstance(data, np.ndarray):
        return data.tolist()
    else:
        raise HTTPException(status_code=500, detail="Unexpected data type")

    
@app.get("/MSE")
def MSE(prediction, actual):
    return np.mean(np.power(np.subtract(np.array(prediction),actual),2))

class DataModel(BaseModel):
    data: list[float]

@app.post("/run_echo")
def run_echo_endpoint(data:DataModel):
    print(data)
    mse, current_set = run_echo(data.data)
    return {"mse": mse, "predictions": current_set.tolist()}

def run_echo(data, reservoir_size=500, sr=1.2, n=0.005, window=5):
    esn = ESN(n_inputs = 1,
          n_outputs = 1,
          n_reservoir = reservoir_size,
          sparsity=0.2,
          random_state=23,
          spectral_radius=sr,
          noise = n)
    trainlen = 100
    current_set = []
    for i in range(0,100):
        pred_training = esn.fit(np.ones(trainlen),np.array(data[i:trainlen+i]))
        prediction = esn.predict(np.ones(window))
        current_set.append(prediction[0])
    current_set = np.reshape(np.array(current_set),(-1,100))
    mse = MSE(current_set, np.array(data[trainlen:trainlen+100]))
    return (mse, current_set)

class LRRequest(BaseModel):
    stock_symbol: str
    start_date: str
    end_date: str
    interval: str
    split_percentage: float

@app.post("/run_linear_regression")
def run_lr_endpoint(request: LRRequest):
    predictions, y_test, mse = run_linear_regression(request.stock_symbol, request.start_date, request.end_date, request.interval, request.split_percentage)
    return {"predictions": predictions.tolist(), "expected":y_test.tolist(), "mse": mse}

def run_linear_regression(stock_symbol, start_date, end_date, interval, split_percentage):
    series = yf.download(stock_symbol, start=start_date, end=end_date, interval=interval, progress=False)
    series['Days'] = (series.index 
    - series.index[0]).days
    
    X = series[['Days']].values
    y = series['Adj Close'].values

    # Determine the split point between train and test data
    split_index = int(len(X) * split_percentage)

    X_train, X_test = X[:split_index], X[split_index:]
    y_train, y_test = y[:split_index], y[split_index:]

    # Create and fit the linear regression model
    model = LinearRegression()
    model.fit(X_train, y_train)

    # Make predictions on the test set
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    return y_pred, y_test, mse
    
class ARIMARequest:
    stock_symbol: str
    start_date: str
    end_date: str
    interval: str
    split_percentage: float = 0.66

@app.post("/run_arima")
def run_arima_endpoint(request: ARIMARequest):
    predictions, mse, expected_values = run_arima(request.stock_symbol, request.start_date, request.end_date, request.interval, request.split_percentage)
    return {"predictions": predictions, "expected":expected_values, "mse":mse}

def run_arima(stock_symbol, start_date, end_date, interval, split_percentage):
    series = yf.download(stock_symbol, start=start_date, end=end_date, interval=interval, progress=False)
    series.index = series.index.to_period('M')
    expected_values=[]
    # Split the data into train and test sets
    X = series['Adj Close'].values
    size = int(len(X) * split_percentage)
    train, test = X[0:size], X[size:len(X)]
    history = [x for x in train]
    predictions = []

    for t in range(len(test)):
        model = ARIMA(history, order=(5, 1, 0))
        
        # Suppress ARIMA model output by redirecting stdout and stderr
        with open(os.devnull, 'w') as devnull:
            old_stdout, old_stderr = sys.stdout, sys.stderr
            sys.stdout, sys.stderr = devnull, devnull
            model_fit = model.fit()
            sys.stdout, sys.stderr = old_stdout, old_stderr
        
        output = model_fit.forecast()
        yhat = output[0]
        predictions.append(yhat)
        obs = test[t]
        history.append(obs)
        expected_values.append(obs)

    mse = mean_squared_error(test, predictions)
    return predictions, mse, expected_values


class RFRequest(BaseModel):
    stock_symbol: str
    start_date: str
    end_date: str
    interval: str
    split_percentage: float

@app.post("/run_rf")
def run_rf_endpoint(request: RFRequest):
    predictions, actuals, mse_value, r2_value = run_rf(request.stock_symbol, request.start_date, request.end_date, request.interval, request.split_percentage)
    return {
        "predictions": predictions,
        "actual_values": actuals,
        "mse": mse_value,
        "r2": r2_value
    }

def run_rf(stock_symbol: str, start_date: str, end_date: str, interval: str, split_percentage: float):
    # Fetch stock data from Yahoo Finance
    series = yf.download(stock_symbol, start=start_date, end=end_date, interval=interval, progress=False)

    # Calculate moving averages and other features
    series['SMA_50'] = series['Adj Close'].rolling(window=50).mean()
    series['SMA_200'] = series['Adj Close'].rolling(window=200).mean()
    series['Volume_Mean'] = series['Volume'].rolling(window=5).mean()
    series['Daily_Return'] = series['Adj Close'].pct_change()

    series = series.dropna(subset=['SMA_50', 'SMA_200', 'Volume_Mean', 'Daily_Return'])

    # Create the target variable (next day's return)
    series['Target'] = series['Daily_Return'].shift(-1)

    # Impute missing values in the target variable using mean
    series['Target'].fillna(series['Target'].mean(), inplace=True)

    # Split the data into features (X) and target (y)
    X = series[['SMA_50', 'SMA_200', 'Volume_Mean']].values
    y = series['Target'].values

    # Split the data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

    # Create and train the Random Forest Regressor
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_model.fit(X_train, y_train)

    # Make predictions on the test set
    y_pred = rf_model.predict(X_test)

    # Calculate evaluation metrics
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print("Mean Squared Error:", mse)
    print("R-squared:", r2)

    return y_pred.tolist(), y_test.tolist(), mse, r2



@app.post('/future_pred')

def future_pred_endpoint(data: DataModel):
    result = future_pred(data.data)
    return {'result':result}

def future_pred(data, reservoir_size=500, sr=1.2, n=0.005, window=5):
    esn = ESN(n_inputs = 1,
          n_outputs = 1,
          n_reservoir = reservoir_size,
          sparsity=0.2,
          random_state=23,
          spectral_radius=sr,
          noise = n)
    pred_training = esn.fit(np.ones(100),np.array(data[-100:]))
    prediction = esn.predict(np.ones(window))
    return prediction.reshape(-1)


@app.get("/compute/")
def compute_endpoint(x: int, y: int):
    return {"result": compute_something(x, y)}

def compute_something(x: int, y: int) -> int:
    return x + y

def main():
    data = grab_data('AAPL', '2022-01-01', '2022-10-19', '1d')
    print('data: ',len(data))
    prediction = future_pred(data, 500, 1.2, 0.005, 5)
    mse, echo = run_echo(data, 500, 1.2, 0.005, 5)
    print(mse, echo)
    print(len(*echo))
    '''
    st.title("Stock Price Prediction App")

    st.write("Enter the stock symbol and dates for prediction:")

    stock_symbol = st.text_input("Stock Symbol", value='AAPL', max_chars=5)
    start_date = st.text_input("Start Date", value='2023-01-01')
    end_date = st.text_input("End Date", value='2023-01-31')

    predict_button = st.button("Predict")

    if predict_button:
        # Perform your prediction logic here
        st.write(f"Predicting for stock symbol: {stock_symbol}")
        st.write(f"Start date: {start_date}")
        st.write(f"End date: {end_date}")
        data = grab_data(stock_symbol, start_date, end_date, '1d')
        prediction = future_pred(data, 500, 1.2, .005, 5)
        st.write(prediction)
        # You can call your prediction function and display the results here
'''

if __name__ == "__main__":
    main()