<p align="center">
  <img src="assets/img/utb-logo.svg" alt="University of Technology Bahrain" width="72">
</p>

<h1 align="center">Regression Lab</h1>

<p align="center">
  <strong>An interactive, browser-based lab for learning linear and polynomial regression and their evaluation metrics.</strong><br>
  College of Computer Studies · University of Technology Bahrain
</p>

<p align="center">
  <a href="https://saeedserwan.github.io/regression/"><strong>▶ Lesson 1: Linear regression</strong></a> ·
  <a href="https://saeedserwan.github.io/regression/polynomial.html"><strong>▶ Lesson 2: Polynomial regression</strong></a><br>
  <a href="notebooks/">Jupyter notebooks</a> ·
  <a href="data/">Datasets</a>
</p>

---

## Overview

Regression Lab helps students build real intuition for **linear and polynomial regression** by manipulating them directly. Drag data points, fit a line by eye, and watch every evaluation metric respond in real time. Then compare your attempt with the optimal least-squares solution.

It runs entirely in the browser: no installation, no sign-up, no server. It also works offline in a computer lab once the repository is downloaded.

## What students learn

### Lesson 1: Linear regression · [open](https://saeedserwan.github.io/regression/)

| # | Section | Key ideas |
|---|---|---|
| 1 | **The model** | slope, intercept, prediction ŷ, residual e = y − ŷ |
| 2 | **Fit a line yourself** | drag points, adjust m and b, compare with the best-fit line |
| 3 | **Why least squares?** | why raw errors cancel; the closed-form OLS solution, computed live |
| 4 | **Evaluation metrics** | **MAE, MSE, RMSE, R², adjusted R², MAPE**, a live residual table, and what R² really measures |
| 5 | **Outliers** | how one point inflates RMSE far more than MAE |
| 6 | **Gradient descent** | learning rate, convergence vs divergence, why feature scaling matters |
| 7 | **Train / test & overfitting** | polynomial degree, train vs test RMSE, bias–variance trade-off |
| 8 | **Is the slope real?** | standard errors, t-statistics, p-values, confidence intervals, F-test |
| 9 | **Do it in Python** | NumPy, scikit-learn and statsmodels code generated from the current data |
| 10 | **Quiz** | ten self-check questions with instant explanations |

### Lesson 2: Polynomial regression · [open](https://saeedserwan.github.io/regression/polynomial.html)

| # | Section | Key ideas |
|---|---|---|
| 1 | **When lines fail** | curved scatter, patterned residuals, the polynomial model |
| 2 | **Anatomy of a polynomial** | what each coefficient does: bends, end behaviour, vertex |
| 3 | **Fit a curve** | degree slider, live residual plot, training metrics vs 5-fold CV RMSE |
| 4 | **Still linear regression** | feature engineering, the design matrix, why features must be scaled |
| 5 | **Choosing the degree** | train vs cross-validated error, adjusted R², bias–variance trade-off |
| 6 | **Beware extrapolation** | how fits that agree inside the data diverge outside it |
| 7 | **Ridge regularisation** | the L2 penalty, choosing λ by cross-validation, coefficient shrinkage |
| 8 | **Do it in Python** | NumPy, scikit-learn pipelines with CV, and Ridge, generated from the current data |
| 9 | **Quiz** | nine self-check questions |

## Datasets

Each lesson has its own set of datasets to switch between, and both accept your own CSV.

**Lesson 1 (linear relationships)**

| Dataset | x | y |
|---|---|---|
| Study hours → exam score | hours studied per week | exam score (%) |
| House size → price | floor area (m²) | price (BD thousands) |
| Temperature → ice-cream sales | daily max temperature (°C) | cones sold |
| Car age → resale value | age (years) | value (BD thousands) |
| Experience → monthly salary | years of experience | salary (BD) |
| Advertising spend → sales | ad spend (BD thousands) | sales (BD thousands) |
| Engine size → CO₂ emissions | engine size (litres) | CO₂ (g/km) |
| No relationship | x | y (pure noise) |
| Random generator | adjustable sample size, noise and slope | |
| Blank canvas | click to create your own points | |

**Lesson 2 (curved relationships)**

| Dataset | x | y | Shape |
|---|---|---|---|
| Car speed → stopping distance | speed (km/h) | distance (m) | quadratic (physics) |
| Thrown ball: height over time | time (s) | height (m) | exact parabola |
| Fertiliser → crop yield | fertiliser (kg/ha) | yield (t/ha) | rise then fall |
| Age → monthly income | age (years) | income (BD) | inverted U |
| Hour of day → electricity demand | hour | demand (MW) | daily wave |
| Straight-line data (control) | hours studied | exam score | linear: extra degrees don't help |
| Random wave | adjustable noise and size | sin(2πx) + noise | non-polynomial |

All datasets are synthetic, generated with fixed random seeds so that every student sees the same numbers. CSV copies are in [`data/`](data/).

## Metrics at a glance

| Metric | Formula | Units | Sensitive to outliers |
|---|---|---|---|
| MAE | (1/n) Σ \|yᵢ − ŷᵢ\| | same as y | low |
| MSE | (1/n) Σ (yᵢ − ŷᵢ)² | y² | high |
| RMSE | √MSE | same as y | high |
| R² | 1 − SSE / SST | none | high |
| Adjusted R² | 1 − (1 − R²)(n − 1)/(n − p − 1) | none | high |
| MAPE | (100%/n) Σ \|(yᵢ − ŷᵢ)/yᵢ\| | % | medium |

Every value shown on the site has been verified against **NumPy**, **scikit-learn** and **statsmodels**.

## Using it in class

- **Lecture:** project the live lab and move points while discussing each metric.
- **Lab session:** students open a notebook in Jupyter or Google Colab and work through the exercises: [Lesson 1 in Colab](https://colab.research.google.com/github/SaeedSerwan/regression/blob/main/notebooks/linear_regression_metrics.ipynb) · [Lesson 2 in Colab](https://colab.research.google.com/github/SaeedSerwan/regression/blob/main/notebooks/polynomial_regression.ipynb).
- **Self-study:** the quiz at the end gives instant feedback with explanations.

## Run locally

```bash
git clone https://github.com/SaeedSerwan/regression.git
cd regression
python -m http.server 8000      # then open http://localhost:8000
```

Python tools:

```bash
pip install numpy pandas matplotlib scikit-learn statsmodels
python python/regression_metrics.py data/house_size_price.csv --plot
```

## Repository structure

```
regression/
├── index.html                  # Lesson 1: linear regression
├── polynomial.html             # Lesson 2: polynomial regression
├── assets/
│   ├── css/style.css
│   ├── js/core.js              # fitting, metrics, statistics, CV (testable in Node)
│   ├── js/ui.js                # shared plotting and UI helpers
│   ├── js/app.js               # Lesson 1 interactions
│   ├── js/poly.js              # Lesson 2 interactions
│   ├── img/                    # UTB logo and favicons
│   └── vendor/                 # KaTeX and fonts, bundled for offline use
├── data/                       # all datasets as CSV
├── notebooks/
│   ├── linear_regression_metrics.ipynb
│   └── polynomial_regression.ipynb
└── python/
    └── regression_metrics.py   # metrics from scratch vs scikit-learn
```

## Author

**Eng. Saeed Serwan Abdulsattar**
College of Computer Studies, University of Technology Bahrain
ORCID: [0009-0004-8340-5472](https://orcid.org/0009-0004-8340-5472)

## License

Released under the [MIT License](LICENSE). You are welcome to use and adapt it for teaching; please keep the attribution.
