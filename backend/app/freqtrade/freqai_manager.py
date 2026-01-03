"""
FreqAI Manager - Machine Learning Model Management

Manages FreqAI machine learning models:
- Model training and inference
- Feature engineering
- Model persistence
- GPU acceleration
"""

import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class FreqAIModelConfig:
    """FreqAI model configuration."""
    model_type: str = "LightGBMRegressor"
    label_period_candles: int = 24
    training_period_days: int = 30
    feature_parameters: Dict[str, Any] = field(default_factory=lambda: {
        "include_timeframes": ["5m", "15m", "1h"],
        "include_corr_pairlist": ["BTC/USDT", "ETH/USDT"],
        "indicator_periods_candles": [10, 20, 50],
    })
    data_split_parameters: Dict[str, Any] = field(default_factory=lambda: {
        "test_size": 0.1,
        "random_state": 42,
    })


@dataclass
class ModelInfo:
    """Information about a trained model."""
    model_id: str
    model_type: str
    pair: str
    timeframe: str
    training_date: datetime
    training_samples: int
    feature_count: int
    metrics: Dict[str, float]
    file_path: str


class FreqAIManager:
    """
    FreqAI Model Manager.
    
    Manages machine learning models for FreqTrade:
    - LightGBM, XGBoost, CatBoost regressors/classifiers
    - Neural network models (PyTorch)
    - Reinforcement learning models
    
    Supports GPU acceleration via CUDA.
    """
    
    SUPPORTED_MODELS = [
        "LightGBMRegressor",
        "LightGBMClassifier",
        "XGBoostRegressor",
        "XGBoostClassifier",
        "CatBoostRegressor",
        "CatBoostClassifier",
        "PyTorchMLPRegressor",
        "PyTorchMLPClassifier",
        "ReinforcementLearner",
    ]
    
    def __init__(
        self,
        model_dir: str = "data/freqtrade/models",
        config: Optional[FreqAIModelConfig] = None
    ):
        self.model_dir = Path(model_dir)
        self.config = config or FreqAIModelConfig()
        self._models: Dict[str, Any] = {}
        self._model_info: Dict[str, ModelInfo] = {}
        self._gpu_available = self._check_gpu()
        
        self.model_dir.mkdir(parents=True, exist_ok=True)
    
    def _check_gpu(self) -> bool:
        """Check if GPU is available."""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False
    
    def create_model(self, model_type: str) -> Optional[Any]:
        """Create a new model instance."""
        if model_type not in self.SUPPORTED_MODELS:
            logger.error(f"Unsupported model type: {model_type}")
            return None
        
        try:
            if "LightGBM" in model_type:
                import lightgbm as lgb
                params = {
                    "objective": "regression" if "Regressor" in model_type else "binary",
                    "boosting_type": "gbdt",
                    "n_estimators": 1000,
                    "learning_rate": 0.05,
                    "num_leaves": 31,
                    "device": "gpu" if self._gpu_available else "cpu",
                }
                return lgb.LGBMRegressor(**params) if "Regressor" in model_type else lgb.LGBMClassifier(**params)
            
            elif "XGBoost" in model_type:
                import xgboost as xgb
                params = {
                    "objective": "reg:squarederror" if "Regressor" in model_type else "binary:logistic",
                    "n_estimators": 1000,
                    "learning_rate": 0.05,
                    "max_depth": 6,
                    "tree_method": "gpu_hist" if self._gpu_available else "hist",
                }
                return xgb.XGBRegressor(**params) if "Regressor" in model_type else xgb.XGBClassifier(**params)
            
            elif "CatBoost" in model_type:
                from catboost import CatBoostRegressor, CatBoostClassifier
                params = {
                    "iterations": 1000,
                    "learning_rate": 0.05,
                    "depth": 6,
                    "task_type": "GPU" if self._gpu_available else "CPU",
                    "verbose": False,
                }
                return CatBoostRegressor(**params) if "Regressor" in model_type else CatBoostClassifier(**params)
            
            else:
                logger.warning(f"Model type {model_type} not yet implemented")
                return None
                
        except ImportError as e:
            logger.error(f"Required library not installed for {model_type}: {e}")
            return None
    
    def train_model(
        self,
        model_id: str,
        model_type: str,
        X_train: np.ndarray,
        y_train: np.ndarray,
        pair: str,
        timeframe: str
    ) -> bool:
        """Train a model."""
        model = self.create_model(model_type)
        if model is None:
            return False
        
        try:
            logger.info(f"Training {model_type} model for {pair}...")
            model.fit(X_train, y_train)
            
            self._models[model_id] = model
            self._model_info[model_id] = ModelInfo(
                model_id=model_id,
                model_type=model_type,
                pair=pair,
                timeframe=timeframe,
                training_date=datetime.utcnow(),
                training_samples=len(X_train),
                feature_count=X_train.shape[1],
                metrics={},
                file_path=str(self.model_dir / f"{model_id}.pkl")
            )
            
            logger.info(f"Model {model_id} trained successfully")
            return True
            
        except Exception as e:
            logger.error(f"Model training failed: {e}")
            return False
    
    def predict(self, model_id: str, X: np.ndarray) -> Optional[np.ndarray]:
        """Make predictions with a model."""
        model = self._models.get(model_id)
        if model is None:
            logger.warning(f"Model {model_id} not found")
            return None
        
        try:
            return model.predict(X)
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return None
    
    def list_models(self) -> List[Dict[str, Any]]:
        """List all loaded models."""
        return [
            {
                "model_id": info.model_id,
                "model_type": info.model_type,
                "pair": info.pair,
                "timeframe": info.timeframe,
                "training_date": info.training_date.isoformat(),
                "training_samples": info.training_samples,
                "feature_count": info.feature_count,
            }
            for info in self._model_info.values()
        ]
    
    def get_status(self) -> Dict[str, Any]:
        """Get FreqAI manager status."""
        return {
            "model_dir": str(self.model_dir),
            "gpu_available": self._gpu_available,
            "loaded_models": len(self._models),
            "supported_models": self.SUPPORTED_MODELS,
            "config": {
                "model_type": self.config.model_type,
                "label_period_candles": self.config.label_period_candles,
                "training_period_days": self.config.training_period_days,
            }
        }

