"""
Regression Lab: linear regression and evaluation metrics from scratch.

Fits a simple linear regression with ordinary least squares, computes
MAE, MSE, RMSE, R², adjusted R² and MAPE from their definitions, and
checks every value against scikit-learn.

Usage
-----
    python python/regression_metrics.py                      # default dataset
    python python/regression_metrics.py data/house_size_price.csv
    python python/regression_metrics.py data/engine_size_co2.csv --plot

The CSV file must have two columns: x first, y second, with a header row.

Author: Eng. Saeed Serwan Abdulsattar
College of Computer Studies, University of Technology Bahrain
"""

import argparse
import csv
from pathlib import Path

import numpy as np

DEFAULT_DATA = Path(__file__).resolve().parent.parent / "data" / "study_hours_exam_score.csv"


# --------------------------------------------------------------------- model
def fit_ols(x: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    """Return slope m and intercept b that minimise the sum of squared errors."""
    x_mean, y_mean = x.mean(), y.mean()
    m = np.sum((x - x_mean) * (y - y_mean)) / np.sum((x - x_mean) ** 2)
    b = y_mean - m * x_mean
    return float(m), float(b)


# ------------------------------------------------------------------- metrics
def mae(y, y_hat):
    """Mean Absolute Error: the average size of a miss."""
    return float(np.mean(np.abs(y - y_hat)))


def mse(y, y_hat):
    """Mean Squared Error: the average squared miss (in squared units of y)."""
    return float(np.mean((y - y_hat) ** 2))


def rmse(y, y_hat):
    """Root Mean Squared Error: MSE back in the units of y."""
    return float(np.sqrt(mse(y, y_hat)))


def r2(y, y_hat):
    """Coefficient of determination: 1 - SSE / SST."""
    sse = np.sum((y - y_hat) ** 2)
    sst = np.sum((y - y.mean()) ** 2)
    return float(1 - sse / sst)


def adjusted_r2(y, y_hat, p=1):
    """R² penalised for the number of features p."""
    n = len(y)
    return float(1 - (1 - r2(y, y_hat)) * (n - 1) / (n - p - 1))


def mape(y, y_hat):
    """Mean Absolute Percentage Error, skipping points where y == 0."""
    nz = y != 0
    return float(np.mean(np.abs((y[nz] - y_hat[nz]) / y[nz])) * 100)


# ---------------------------------------------------------------------- main
def load_csv(path: Path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    header, body = rows[0], rows[1:]
    data = np.array([[float(r[0]), float(r[1])] for r in body if r])
    return header, data[:, 0], data[:, 1]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("csv", nargs="?", default=DEFAULT_DATA, type=Path, help="two-column CSV file (x, y)")
    parser.add_argument("--plot", action="store_true", help="show the data, fitted line and residuals")
    args = parser.parse_args()

    (x_name, y_name), x, y = load_csv(args.csv)
    m, b = fit_ols(x, y)
    y_hat = m * x + b

    print(f"Dataset : {args.csv.name}  (n = {len(x)})")
    print(f"Model   : {y_name} = {m:.4f} * {x_name} + {b:.4f}\n")

    ours = {
        "MAE": mae(y, y_hat),
        "MSE": mse(y, y_hat),
        "RMSE": rmse(y, y_hat),
        "R²": r2(y, y_hat),
        "Adjusted R²": adjusted_r2(y, y_hat),
        "MAPE %": mape(y, y_hat),
    }

    try:
        from sklearn import metrics as skm

        ref = {
            "MAE": skm.mean_absolute_error(y, y_hat),
            "MSE": skm.mean_squared_error(y, y_hat),
            "RMSE": np.sqrt(skm.mean_squared_error(y, y_hat)),
            "R²": skm.r2_score(y, y_hat),
            "Adjusted R²": None,  # not provided by scikit-learn
            "MAPE %": skm.mean_absolute_percentage_error(y, y_hat) * 100 if np.all(y != 0) else None,
        }
    except ImportError:
        ref = {k: None for k in ours}

    print(f"{'Metric':<13}{'From scratch':>14}{'scikit-learn':>14}")
    print("-" * 41)
    for k, v in ours.items():
        r = ref[k]
        print(f"{k:<13}{v:>14.4f}{(f'{r:.4f}' if r is not None else '—'):>14}")

    if args.plot:
        import matplotlib.pyplot as plt

        order = np.argsort(x)
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.vlines(x, y, y_hat, color="#d52a55", alpha=0.5, label="residuals")
        ax.scatter(x, y, color="#1c2230", zorder=3, label="data")
        ax.plot(x[order], y_hat[order], color="#17708a", lw=2.5, label=f"ŷ = {m:.3g}x + {b:.3g}")
        ax.set(xlabel=x_name, ylabel=y_name, title=f"RMSE = {ours['RMSE']:.3g}   R² = {ours['R²']:.3f}")
        ax.legend()
        plt.tight_layout()
        plt.show()


if __name__ == "__main__":
    main()
