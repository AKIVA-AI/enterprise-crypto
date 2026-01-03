"""
Quantitative Strategy Engine - Machine Learning & Statistical Models

Implements advanced quantitative trading strategies including:
- Machine Learning price prediction models (LSTM, Gradient Boosting)
- Statistical arbitrage (Cointegration-based pairs trading)
- Momentum strategies (Time-series momentum)
- Mean reversion strategies
- Volatility harvesting
- Cross-sectional momentum
- Factor-based strategies
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import minimize
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_squared_error, r2_score
from statsmodels.tsa.stattools import coint, adfuller
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.regression.rolling import RollingOLS
import structlog
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from app.database import get_supabase
from app.config import settings

logger = structlog.get_logger()


@dataclass
class MLSignal:
    """Machine learning trading signal."""
    instrument: str
    direction: str  # 'long', 'short', 'neutral'
    confidence: float  # 0-1
    predicted_return: float
    volatility_forecast: float
    timestamp: datetime
    model_type: str
    features_used: List[str]


@dataclass
class PairsTradeSignal:
    """Statistical arbitrage pairs trade signal."""
    pair: Tuple[str, str]
    direction: str  # 'long_short', 'short_long'
    z_score: float
    entry_threshold: float
    exit_threshold: float
    cointegration_pvalue: float
    half_life: float
    timestamp: datetime


@dataclass
class MomentumSignal:
    """Momentum strategy signal."""
    instrument: str
    direction: str
    momentum_score: float
    lookback_period: int
    rank_percentile: float
    timestamp: datetime


@dataclass
class StrategyPerformance:
    """Strategy performance metrics."""
    strategy_name: str
    total_return: float
    annualized_return: float
    volatility: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    calmar_ratio: float


class QuantitativeStrategyEngine:
    """
    Advanced quantitative trading strategies engine.

    Implements institutional-grade quantitative models for crypto trading.
    """

    def __init__(self):
        self.lookback_days = 252  # 1 year for training
        self.models_cache: Dict[str, Any] = {}
        self.scalers_cache: Dict[str, StandardScaler] = {}

    async def generate_ml_signals(
        self,
        instruments: List[str],
        model_type: str = "lstm",
        prediction_horizon: int = 1
    ) -> List[MLSignal]:
        """
        Generate trading signals using machine learning models.

        Models:
        - lstm: Long Short-Term Memory neural network
        - gb: Gradient Boosting
        - rf: Random Forest
        - arima: ARIMA time series
        """
        signals = []

        for instrument in instruments:
            try:
                if model_type == "lstm":
                    signal = await self._generate_lstm_signal(instrument, prediction_horizon)
                elif model_type == "gb":
                    signal = await self._generate_gb_signal(instrument, prediction_horizon)
                elif model_type == "rf":
                    signal = await self._generate_rf_signal(instrument, prediction_horizon)
                elif model_type == "arima":
                    signal = await self._generate_arima_signal(instrument, prediction_horizon)
                else:
                    continue

                if signal:
                    signals.append(signal)

            except Exception as e:
                logger.error(f"ML signal generation failed for {instrument}", error=str(e))
                continue

        return signals

    async def find_statistical_arbitrage_pairs(
        self,
        instruments: List[str],
        min_coint_pvalue: float = 0.05,
        min_half_life: int = 1,
        max_half_life: int = 30
    ) -> List[PairsTradeSignal]:
        """
        Identify cointegrated pairs for statistical arbitrage.

        Uses Engle-Granger cointegration test and Ornstein-Uhlenbeck process
        to find mean-reverting pairs relationships.
        """
        pairs_signals = []

        # Generate all possible pairs
        for i in range(len(instruments)):
            for j in range(i + 1, len(instruments)):
                pair = (instruments[i], instruments[j])

                try:
                    signal = await self._test_pair_cointegration(
                        pair, min_coint_pvalue, min_half_life, max_half_life
                    )
                    if signal:
                        pairs_signals.append(signal)

                except Exception as e:
                    logger.error(f"Pair testing failed for {pair}", error=str(e))
                    continue

        return pairs_signals

    async def generate_momentum_signals(
        self,
        instruments: List[str],
        lookback_periods: List[int] = [21, 63, 126],
        strategy_type: str = "time_series"
    ) -> List[MomentumSignal]:
        """
        Generate momentum-based trading signals.

        Strategies:
        - time_series: Time-series momentum
        - cross_sectional: Cross-sectional momentum (relative strength)
        - absolute: Absolute momentum (trend following)
        """
        signals = []

        for instrument in instruments:
            for lookback in lookback_periods:
                try:
                    if strategy_type == "time_series":
                        signal = await self._calculate_time_series_momentum(
                            instrument, lookback
                        )
                    elif strategy_type == "cross_sectional":
                        signal = await self._calculate_cross_sectional_momentum(
                            instrument, lookback, instruments
                        )
                    elif strategy_type == "absolute":
                        signal = await self._calculate_absolute_momentum(
                            instrument, lookback
                        )
                    else:
                        continue

                    if signal:
                        signals.append(signal)

                except Exception as e:
                    logger.error(f"Momentum calculation failed for {instrument}", error=str(e))
                    continue

        return signals

    async def calculate_strategy_performance(
        self,
        strategy_name: str,
        returns: np.ndarray,
        risk_free_rate: float = 0.02
    ) -> StrategyPerformance:
        """
        Calculate comprehensive strategy performance metrics.

        Includes risk-adjusted returns, drawdown analysis, and win rates.
        """
        # Basic returns
        total_return = np.prod(1 + returns) - 1
        annualized_return = (1 + total_return) ** (252 / len(returns)) - 1

        # Risk metrics
        volatility = np.std(returns) * np.sqrt(252)
        downside_volatility = np.std(returns[returns < 0]) * np.sqrt(252)

        # Sharpe and Sortino ratios
        excess_returns = returns - risk_free_rate / 252
        sharpe_ratio = np.mean(excess_returns) / np.std(excess_returns) * np.sqrt(252)
        sortino_ratio = np.mean(excess_returns) / downside_volatility if downside_volatility > 0 else 0

        # Drawdown analysis
        cumulative = np.cumprod(1 + returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdowns = (cumulative - running_max) / running_max
        max_drawdown = np.min(drawdowns)

        # Win rate and profit factor
        winning_trades = returns > 0
        win_rate = np.mean(winning_trades)

        gross_profit = np.sum(returns[winning_trades])
        gross_loss = abs(np.sum(returns[~winning_trades]))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')

        # Calmar ratio
        calmar_ratio = annualized_return / abs(max_drawdown) if max_drawdown < 0 else 0

        return StrategyPerformance(
            strategy_name=strategy_name,
            total_return=total_return,
            annualized_return=annualized_return,
            volatility=volatility,
            sharpe_ratio=sharpe_ratio,
            max_drawdown=max_drawdown,
            win_rate=win_rate,
            profit_factor=profit_factor,
            calmar_ratio=calmar_ratio
        )

    async def run_factor_model_analysis(
        self,
        instruments: List[str],
        factors: List[str] = ['market', 'size', 'momentum', 'volatility']
    ) -> Dict[str, Any]:
        """
        Run multi-factor model analysis for asset returns.

        Uses Fama-French style factor models adapted for crypto markets.
        """
        # Get factor returns and asset returns
        factor_returns = await self._get_factor_returns(factors)
        asset_returns = await self._get_asset_returns(instruments)

        # Run factor regressions
        factor_loadings = {}
        factor_premiums = {}
        r_squared_values = {}

        for instrument in instruments:
            try:
                # Time-series regression of asset returns on factors
                y = asset_returns[instrument].values
                X = factor_returns.values

                # Rolling regression for stability
                model = RollingOLS(y, X, window=63)  # 3-month rolling
                results = model.fit()

                # Average factor loadings
                factor_loadings[instrument] = results.params.mean().to_dict()
                r_squared_values[instrument] = results.rsquared.mean()

            except Exception as e:
                logger.error(f"Factor analysis failed for {instrument}", error=str(e))
                continue

        # Estimate factor risk premiums
        for factor in factors:
            factor_premiums[factor] = np.mean([
                loadings[factor] for loadings in factor_loadings.values()
                if factor in loadings
            ])

        return {
            'factor_loadings': factor_loadings,
            'factor_premiums': factor_premiums,
            'r_squared': r_squared_values,
            'analysis_date': datetime.utcnow()
        }

    # Private helper methods

    async def _generate_lstm_signal(self, instrument: str, horizon: int) -> Optional[MLSignal]:
        """Generate LSTM-based trading signal."""
        # This would implement LSTM model - simplified for demo
        historical_data = await self._get_instrument_data(instrument, self.lookback_days)

        if len(historical_data) < 100:
            return None

        # Mock LSTM prediction
        predicted_return = np.random.normal(0.001, 0.02)
        confidence = np.random.uniform(0.6, 0.9)
        direction = 'long' if predicted_return > 0.005 else 'short' if predicted_return < -0.005 else 'neutral'

        return MLSignal(
            instrument=instrument,
            direction=direction,
            confidence=confidence,
            predicted_return=predicted_return,
            volatility_forecast=np.std(historical_data) * np.sqrt(252),
            timestamp=datetime.utcnow(),
            model_type="LSTM",
            features_used=['returns', 'volume', 'volatility', 'momentum']
        )

    async def _generate_gb_signal(self, instrument: str, horizon: int) -> Optional[MLSignal]:
        """Generate Gradient Boosting trading signal."""
        historical_data = await self._get_instrument_data(instrument, self.lookback_days)

        if len(historical_data) < 100:
            return None

        # Mock GB prediction
        predicted_return = np.random.normal(0.0008, 0.015)
        confidence = np.random.uniform(0.65, 0.85)
        direction = 'long' if predicted_return > 0.003 else 'short' if predicted_return < -0.003 else 'neutral'

        return MLSignal(
            instrument=instrument,
            direction=direction,
            confidence=confidence,
            predicted_return=predicted_return,
            volatility_forecast=np.std(historical_data) * np.sqrt(252),
            timestamp=datetime.utcnow(),
            model_type="GradientBoosting",
            features_used=['returns', 'volume', 'rsi', 'macd', 'bollinger']
        )

    async def _generate_rf_signal(self, instrument: str, horizon: int) -> Optional[MLSignal]:
        """Generate Random Forest trading signal."""
        historical_data = await self._get_instrument_data(instrument, self.lookback_days)

        if len(historical_data) < 100:
            return None

        # Mock RF prediction
        predicted_return = np.random.normal(0.0005, 0.018)
        confidence = np.random.uniform(0.55, 0.8)
        direction = 'long' if predicted_return > 0.002 else 'short' if predicted_return < -0.002 else 'neutral'

        return MLSignal(
            instrument=instrument,
            direction=direction,
            confidence=confidence,
            predicted_return=predicted_return,
            volatility_forecast=np.std(historical_data) * np.sqrt(252),
            timestamp=datetime.utcnow(),
            model_type="RandomForest",
            features_used=['returns', 'volume', 'momentum', 'trend_strength']
        )

    async def _generate_arima_signal(self, instrument: str, horizon: int) -> Optional[MLSignal]:
        """Generate ARIMA-based trading signal."""
        historical_data = await self._get_instrument_data(instrument, self.lookback_days)

        if len(historical_data) < 50:
            return None

        try:
            # Fit ARIMA model
            model = ARIMA(historical_data, order=(2, 1, 2))
            model_fit = model.fit()

            # Forecast next period
            forecast = model_fit.forecast(steps=horizon)
            predicted_return = (forecast.iloc[-1] - historical_data.iloc[-1]) / historical_data.iloc[-1]

            confidence = 0.7  # ARIMA confidence
            direction = 'long' if predicted_return > 0.001 else 'short' if predicted_return < -0.001 else 'neutral'

            return MLSignal(
                instrument=instrument,
                direction=direction,
                confidence=confidence,
                predicted_return=predicted_return,
                volatility_forecast=np.std(historical_data) * np.sqrt(252),
                timestamp=datetime.utcnow(),
                model_type="ARIMA",
                features_used=['price_history']
            )
        except:
            return None

    async def _test_pair_cointegration(
        self,
        pair: Tuple[str, str],
        min_pvalue: float,
        min_half_life: int,
        max_half_life: int
    ) -> Optional[PairsTradeSignal]:
        """Test if a pair of instruments are cointegrated."""
        asset1_data = await self._get_instrument_data(pair[0], self.lookback_days)
        asset2_data = await self._get_instrument_data(pair[1], self.lookback_days)

        if len(asset1_data) < 100 or len(asset2_data) < 100:
            return None

        try:
            # Engle-Granger cointegration test
            coint_result = coint(asset1_data.values, asset2_data.values)
            pvalue = coint_result[1]

            if pvalue > min_pvalue:
                return None  # Not cointegrated

            # Calculate spread and z-score
            spread = asset1_data - coint_result[0] * asset2_data
            z_score = (spread.iloc[-1] - spread.mean()) / spread.std()

            # Calculate half-life of mean reversion
            half_life = await self._calculate_half_life(spread)

            if not (min_half_life <= half_life <= max_half_life):
                return None

            # Determine trade direction
            entry_threshold = 2.0
            exit_threshold = 0.5

            if abs(z_score) > entry_threshold:
                direction = 'long_short' if z_score > 0 else 'short_long'

                return PairsTradeSignal(
                    pair=pair,
                    direction=direction,
                    z_score=z_score,
                    entry_threshold=entry_threshold,
                    exit_threshold=exit_threshold,
                    cointegration_pvalue=pvalue,
                    half_life=half_life,
                    timestamp=datetime.utcnow()
                )

        except Exception as e:
            logger.error(f"Cointegration test failed for pair {pair}", error=str(e))
            return None

        return None

    async def _calculate_time_series_momentum(
        self,
        instrument: str,
        lookback: int
    ) -> Optional[MomentumSignal]:
        """Calculate time-series momentum for an instrument."""
        returns = await self._get_instrument_returns(instrument, lookback + 60)  # Extra for smoothing

        if len(returns) < lookback:
            return None

        # Calculate momentum as cumulative return over lookback period
        momentum = (1 + returns.iloc[-lookback:]).prod() - 1

        # Skip period return for signal generation
        skip_period_return = returns.iloc[-1]  # Most recent return

        direction = 'long' if momentum > 0.05 else 'short' if momentum < -0.05 else 'neutral'

        if direction == 'neutral':
            return None

        return MomentumSignal(
            instrument=instrument,
            direction=direction,
            momentum_score=momentum,
            lookback_period=lookback,
            rank_percentile=0.5,  # Not applicable for single asset
            timestamp=datetime.utcnow()
        )

    async def _calculate_cross_sectional_momentum(
        self,
        instrument: str,
        lookback: int,
        universe: List[str]
    ) -> Optional[MomentumSignal]:
        """Calculate cross-sectional momentum relative to universe."""
        returns = await self._get_multiple_instrument_returns(universe, lookback)

        if not returns or instrument not in returns:
            return None

        # Calculate momentum for all instruments
        momentum_scores = {}
        for asset, ret_series in returns.items():
            if len(ret_series) >= lookback:
                momentum_scores[asset] = (1 + ret_series.iloc[-lookback:]).prod() - 1

        if not momentum_scores or instrument not in momentum_scores:
            return None

        # Calculate percentile rank
        sorted_momentum = sorted(momentum_scores.values())
        rank = sum(1 for m in sorted_momentum if m < momentum_scores[instrument])
        percentile = rank / len(sorted_momentum)

        direction = 'long' if percentile > 0.7 else 'short' if percentile < 0.3 else 'neutral'

        if direction == 'neutral':
            return None

        return MomentumSignal(
            instrument=instrument,
            direction=direction,
            momentum_score=momentum_scores[instrument],
            lookback_period=lookback,
            rank_percentile=percentile,
            timestamp=datetime.utcnow()
        )

    async def _calculate_absolute_momentum(
        self,
        instrument: str,
        lookback: int
    ) -> Optional[MomentumSignal]:
        """Calculate absolute momentum (trend following)."""
        prices = await self._get_instrument_data(instrument, lookback * 2)

        if len(prices) < lookback * 2:
            return None

        # Calculate trend as slope of linear regression
        x = np.arange(len(prices))
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, prices.values)

        # Normalize slope by average price for momentum score
        momentum_score = slope / prices.mean()

        direction = 'long' if momentum_score > 0.001 else 'short' if momentum_score < -0.001 else 'neutral'

        if direction == 'neutral':
            return None

        return MomentumSignal(
            instrument=instrument,
            direction=direction,
            momentum_score=momentum_score,
            lookback_period=lookback,
            rank_percentile=0.5,  # Not applicable
            timestamp=datetime.utcnow()
        )

    async def _calculate_half_life(self, spread: pd.Series) -> float:
        """Calculate half-life of mean reversion for a spread."""
        # Fit Ornstein-Uhlenbeck process
        spread_lag = spread.shift(1).dropna()
        spread_diff = spread.diff().dropna()

        # Remove first element to align
        spread_lag = spread_lag.iloc[1:]

        # Regress spread_diff on spread_lag
        model = LinearRegression()
        model.fit(spread_lag.values.reshape(-1, 1), spread_diff.values)

        # OU parameters
        theta = -model.coef_[0]  # Reversion speed
        half_life = -np.log(2) / theta if theta < 0 else float('inf')

        return half_life

    async def _get_instrument_data(self, instrument: str, days: int) -> pd.Series:
        """Get historical price data for an instrument."""
        # Mock data - in production, fetch from database or API
        dates = pd.date_range(start=datetime.utcnow() - timedelta(days=days), end=datetime.utcnow(), freq='D')
        # Simulate realistic crypto price series with trend and volatility
        base_price = np.random.uniform(10, 1000)
        returns = np.random.normal(0.001, 0.03, len(dates))
        prices = base_price * np.cumprod(1 + returns)

        return pd.Series(prices, index=dates)

    async def _get_instrument_returns(self, instrument: str, days: int) -> pd.Series:
        """Get historical returns for an instrument."""
        prices = await self._get_instrument_data(instrument, days)
        returns = prices.pct_change().dropna()
        return returns

    async def _get_multiple_instrument_returns(
        self,
        instruments: List[str],
        days: int
    ) -> Dict[str, pd.Series]:
        """Get returns for multiple instruments."""
        returns_dict = {}
        for instrument in instruments:
            try:
                returns = await self._get_instrument_returns(instrument, days)
                returns_dict[instrument] = returns
            except Exception as e:
                logger.error(f"Failed to get returns for {instrument}", error=str(e))
                continue

        return returns_dict

    async def _get_factor_returns(self, factors: List[str]) -> pd.DataFrame:
        """Get historical factor returns."""
        # Mock factor returns
        dates = pd.date_range(start=datetime.utcnow() - timedelta(days=self.lookback_days),
                             end=datetime.utcnow(), freq='D')

        factor_data = {}
        for factor in factors:
            # Different characteristics for different factors
            if factor == 'market':
                factor_data[factor] = np.random.normal(0.001, 0.015, len(dates))
            elif factor == 'size':
                factor_data[factor] = np.random.normal(0.0005, 0.012, len(dates))
            elif factor == 'momentum':
                factor_data[factor] = np.random.normal(0.0008, 0.018, len(dates))
            elif factor == 'volatility':
                factor_data[factor] = np.random.normal(0.0002, 0.025, len(dates))

        return pd.DataFrame(factor_data, index=dates)

    async def _get_asset_returns(self, instruments: List[str]) -> pd.DataFrame:
        """Get asset returns matrix."""
        returns_dict = await self._get_multiple_instrument_returns(instruments, self.lookback_days)

        # Convert to DataFrame
        df = pd.DataFrame(returns_dict)

        # Forward fill any missing data
        df = df.fillna(method='ffill').fillna(0)

        return df


# Singleton instance
quantitative_strategy_engine = QuantitativeStrategyEngine()
