"""
Content for the two code-walkthrough lessons (Linear in Python, Polynomial in Python).

Each lesson is a list of cells:
  ("md",   "markdown text")
  ("code", "python code")

Inside a code cell, a line may end with   # >> explanation   to attach a
line-by-line explanation. A line ending with   # >>^   shares the explanation
of the line above (used for statements that span several lines).

tools/build_walkthroughs.py turns this into a Jupyter notebook (executed, with
outputs) and an HTML page for the website, so the two always match.

Author: Eng. Saeed Serwan Abdulsattar
"""

LINEAR = {
    "slug": "linear",
    "page": "code-linear.html",
    "notebook": "walkthrough_linear_regression.ipynb",
    "dataset": "house_size_price.csv",
    "eyebrow": "Lesson 3 · Linear regression in Python",
    "title": "Linear regression in Python, <em>line by line</em>.",
    "doc_title": "Linear Regression in Python, Line by Line",
    "lead": "A complete, runnable notebook that takes a real-style dataset from a CSV file to a trained, "
            "evaluated and visualised linear regression model. Every line of code is explained: "
            "hover over (or tap) a line to see what it does.",
    "learn": [
        "Load and inspect a dataset with pandas",
        "Visualise distributions and relationships with Matplotlib",
        "Split data, train a model and read its coefficients",
        "Compute MAE, MSE, RMSE, R², adjusted R² and MAPE",
        "Diagnose the model with residual and predicted-vs-actual plots",
    ],
    "cells": [
        ("md", """## 1. Import the libraries

Every Python data-science project starts by importing the tools it needs. We use four libraries:
**NumPy** for maths, **pandas** for tables, **Matplotlib** for charts and **scikit-learn** for machine learning."""),
        ("code", """%config InlineBackend.figure_format = "retina"  # >> A Jupyter setting (not Python): draw sharper plots on high-resolution screens.
import numpy as np  # >> NumPy provides fast arrays and maths functions (mean, square root, …). `as np` is the standard nickname.
import pandas as pd  # >> pandas reads the CSV file into a DataFrame: a table with named columns, like a spreadsheet.
import matplotlib.pyplot as plt  # >> Matplotlib's plotting interface. Every chart in this notebook is drawn with `plt`.
from sklearn.model_selection import train_test_split  # >> A helper that randomly splits the data into a training part and a test part.
from sklearn.linear_model import LinearRegression  # >> The linear regression model, fitted by ordinary least squares.
from sklearn.metrics import mean_absolute_error, mean_squared_error  # >> Ready-made functions for the evaluation metrics.
from sklearn.metrics import r2_score, mean_absolute_percentage_error  # >>^

plt.rcParams["figure.figsize"] = (7, 4.5)  # >> Default figure size (width, height) in inches for every chart we draw.
plt.rcParams["axes.grid"] = True  # >> Add light grid lines to all charts so values are easier to read."""),

        ("md", """## 2. Load the dataset

The dataset records **25 houses**: their floor area in m² and their price in thousands of Bahraini dinars (BD).
It is stored as a CSV file in the course repository, so pandas can read it straight from the web."""),
        ("code", """url = "https://raw.githubusercontent.com/SaeedSerwan/regression/main/data/house_size_price.csv"  # >> The file's web address. You could also download the CSV and use its local file name instead.
df = pd.read_csv(url)  # >> Read the CSV into a DataFrame called `df`. Each row is one house; each column is one variable.
df.columns = ["area", "price"]  # >> Rename the columns to short names that are quicker to type: area (m²) and price (BD thousands).
print("Rows and columns:", df.shape)  # >> `.shape` gives (rows, columns). We expect 25 houses and 2 columns.
df.head()  # >> Show the first 5 rows. In a notebook, the value of the last line of a cell is displayed automatically."""),

        ("md", """## 3. Explore the data

Before modelling, check the data is clean and get a feel for its scale."""),
        ("code", """print("Missing values per column:")  # >> A heading for the next output.
print(df.isna().sum())  # >> `isna()` marks empty cells as True; `.sum()` counts them per column. Both should be 0.
df.describe().round(1)  # >> Summary statistics for each column: count, mean, standard deviation (std), min, quartiles and max."""),

        ("md", """### Distributions

A **histogram** shows how the values of one variable are spread out."""),
        ("code", """fig, axes = plt.subplots(1, 2, figsize=(11, 4))  # >> One figure with two side-by-side panels (1 row, 2 columns). `axes[0]` is the left panel, `axes[1]` the right.
axes[0].hist(df["area"], bins=8, color="#17708a", edgecolor="white")  # >> Left panel: a histogram of floor area, grouped into 8 bins (bars).
axes[0].set(title="Floor area", xlabel="m²", ylabel="number of houses")  # >> Give the panel a title and axis labels.
axes[1].hist(df["price"], bins=8, color="#d52a55", edgecolor="white")  # >> Right panel: the same for price.
axes[1].set(title="Price", xlabel="BD thousands", ylabel="number of houses")  # >>^
plt.tight_layout()  # >> Adjust the spacing so titles and labels don't overlap.
plt.show()  # >> Display the figure."""),

        ("md", """### The relationship

A **scatter plot** places one dot per house, with the feature on the x-axis and the target on the y-axis.
If the dots follow a straight-line trend, linear regression is a sensible model."""),
        ("code", """plt.scatter(df["area"], df["price"], color="#1c2230")  # >> One dot per house: area across, price up.
plt.xlabel("Floor area (m²)")  # >> Always label your axes, with units.
plt.ylabel("Price (BD thousands)")  # >>^
plt.title("Bigger houses cost more")  # >> A good title states the takeaway, not just the variable names.
plt.show()  # >> Display the chart.

r = df["area"].corr(df["price"])  # >> Pearson correlation r: how tightly the points follow a straight line, from −1 to +1.
print(f"Correlation r = {r:.3f}")  # >> An f-string inserts the value of `r`; `:.3f` rounds it to 3 decimal places."""),

        ("md", """A correlation close to **+1** confirms a strong, positive, linear relationship.

## 4. Prepare the data

scikit-learn expects the inputs (**features**, `X`) and the output (**target**, `y`) separately.
We also hold back some houses as a **test set**: the model never sees them during training, so they tell us how well it works on new data."""),
        ("code", """X = df[["area"]]  # >> Features. Double brackets return a 2-D table; scikit-learn requires 2-D input even when there is only one feature.
y = df["price"]  # >> Target. Single brackets return a 1-D column (a pandas Series).

X_train, X_test, y_train, y_test = train_test_split(  # >> Shuffle the rows and split them into training and test sets.
    X, y, test_size=0.2, random_state=42)  # >> `test_size=0.2` keeps 20 % of houses for testing. `random_state` fixes the shuffle so everyone gets the same split.
print(f"Training houses: {len(X_train)}  ·  test houses: {len(X_test)}")  # >> Check the sizes: 20 for training, 5 for testing."""),

        ("md", """## 5. Train the model

Training finds the slope $m$ and intercept $b$ of the line $\\hat{y} = m\\,x + b$ that make the squared errors on the training data as small as possible."""),
        ("code", """model = LinearRegression()  # >> Create an untrained linear regression model.
model.fit(X_train, y_train)  # >> Train it: least squares chooses the slope and intercept that minimise the squared errors on the training data.

m = model.coef_[0]  # >> The learned slope. `coef_` holds one value per feature; we take the first (and only) one.
b = model.intercept_  # >> The learned intercept.
print(f"price = {m:.4f} × area + {b:.2f}")  # >> Print the fitted equation."""),

        ("md", """**Reading the result:** the slope says each extra square metre adds about that many *thousand* BD to the price.
The intercept is the predicted price of a 0 m² house. It is needed to position the line, but it has no practical meaning here.

## 6. Make predictions"""),
        ("code", """y_pred = model.predict(X_test)  # >> Predicted prices for the 5 test houses, which the model has never seen.

results = pd.DataFrame({  # >> Build a table that puts actual and predicted prices side by side.
    "area": X_test["area"],  # >>^
    "actual": y_test,  # >>^
    "predicted": y_pred.round(1),  # >>^
})  # >>^
results["error"] = (results["actual"] - results["predicted"]).round(1)  # >> Residual = actual − predicted. A positive error means the model guessed too low.
results  # >> Display the table."""),

        ("md", """## 7. Evaluate the model

Each metric summarises the test errors in a different way:

| Metric | Meaning | Units |
|---|---|---|
| **MAE** | average size of an error | BD thousands |
| **MSE** | average *squared* error; punishes big misses | (BD thousands)² |
| **RMSE** | square root of MSE | BD thousands |
| **R²** | share of price variation explained (1 = perfect) | none |
| **Adjusted R²** | R² with a penalty for each feature | none |
| **MAPE** | average error as a % of the true price | % |"""),
        ("code", """mae = mean_absolute_error(y_test, y_pred)  # >> MAE: the average size of the errors, in BD thousands.
mse = mean_squared_error(y_test, y_pred)  # >> MSE: the average squared error. Squaring makes large errors count much more.
rmse = np.sqrt(mse)  # >> RMSE: the square root of MSE, back in BD thousands so it is easy to interpret.
r2 = r2_score(y_test, y_pred)  # >> R²: 1 − (model's squared error ÷ squared error of always guessing the mean).
mape = mean_absolute_percentage_error(y_test, y_pred) * 100  # >> MAPE: average error as a fraction of the true value; × 100 turns it into a percentage.

n, p = len(y_test), X_test.shape[1]  # >> n = number of test houses (5); p = number of features (1).
adj_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1)  # >> Adjusted R². scikit-learn has no built-in function, so we apply the formula directly.

print(f"MAE         = {mae:.2f} BD thousand")  # >> Print each metric, rounded to 2 decimals.
print(f"MSE         = {mse:.2f}")  # >>^
print(f"RMSE        = {rmse:.2f} BD thousand")  # >>^
print(f"R²          = {r2:.3f}")  # >>^
print(f"Adjusted R² = {adj_r2:.3f}")  # >>^
print(f"MAPE        = {mape:.1f} %")  # >>^"""),

        ("md", """### Check the formulas by hand

The library functions are not magic. Here are MAE and RMSE computed directly from their definitions:
$\\text{MAE} = \\frac{1}{n}\\sum|y_i-\\hat y_i|$ and $\\text{RMSE} = \\sqrt{\\frac{1}{n}\\sum(y_i-\\hat y_i)^2}$."""),
        ("code", """errors = y_test - y_pred  # >> The residuals: one error per test house.
print("MAE  by hand:", round(np.mean(np.abs(errors)), 2))  # >> Take absolute values, then the mean. Identical to `mean_absolute_error`.
print("RMSE by hand:", round(np.sqrt(np.mean(errors ** 2)), 2))  # >> Square, average, then square-root. Identical to the RMSE above.

train_r2 = r2_score(y_train, model.predict(X_train))  # >> R² on the training data, for comparison.
print(f"R² on training data: {train_r2:.3f}  ·  on test data: {r2:.3f}")  # >> Similar values mean the model is not overfitting."""),

        ("md", """## 8. Visualise the fitted line"""),
        ("code", """line_x = np.linspace(df["area"].min(), df["area"].max(), 100)  # >> 100 evenly spaced areas across the data range, to draw a smooth line.
line_y = model.predict(pd.DataFrame({"area": line_x}))  # >> The predicted price at each of those areas. A DataFrame keeps the column name the model was trained with.

plt.scatter(X_train["area"], y_train, color="#1c2230", label="training houses")  # >> Training houses as dark dots.
plt.scatter(X_test["area"], y_test, color="#d52a55", marker="s", s=60, label="test houses")  # >> Test houses as larger red squares (`s` sets the marker size).
plt.plot(line_x, line_y, color="#17708a", linewidth=2.5, label="fitted line")  # >> The regression line.
plt.xlabel("Floor area (m²)")  # >> Axis labels and a title.
plt.ylabel("Price (BD thousands)")  # >>^
plt.title(f"price = {m:.3f} × area + {b:.1f}")  # >>^
plt.legend()  # >> Show the key that explains each colour.
plt.show()  # >> Display the chart."""),

        ("md", """## 9. Diagnose the model with residual plots

A good linear model leaves residuals that look like **random noise**: no curve, no funnel shape, centred on zero.
A clear pattern means the model is missing something (for example, a curve; see the polynomial lesson)."""),
        ("code", """train_pred = model.predict(X_train)  # >> Predictions on the training houses.
residuals = y_train - train_pred  # >> Their residuals (actual − predicted).

fig, axes = plt.subplots(1, 2, figsize=(11, 4))  # >> Two panels side by side.
axes[0].scatter(train_pred, residuals, color="#d52a55")  # >> Left: residual against predicted price. We want a shapeless cloud.
axes[0].axhline(0, color="grey", linestyle="--")  # >> A dashed reference line at zero error.
axes[0].set(title="Residuals vs predicted", xlabel="predicted price", ylabel="residual")  # >> Labels for the left panel.
axes[1].hist(residuals, bins=8, color="#17708a", edgecolor="white")  # >> Right: histogram of the residuals. Roughly symmetric around 0 is good.
axes[1].set(title="Distribution of residuals", xlabel="residual", ylabel="count")  # >> Labels for the right panel.
plt.tight_layout()  # >> Tidy the spacing.
plt.show()  # >> Display the figure."""),

        ("md", """### Predicted vs actual

If every prediction were perfect, all points would sit on the diagonal line $y = x$."""),
        ("code", """all_pred = model.predict(X)  # >> Predictions for all 25 houses.
plt.scatter(y, all_pred, color="#1c2230")  # >> Each dot: actual price (across) vs predicted price (up).
lims = [y.min(), y.max()]  # >> The lowest and highest actual prices, used to draw the diagonal.
plt.plot(lims, lims, color="#d52a55", linestyle="--", label="perfect prediction")  # >> The line y = x.
plt.xlabel("Actual price (BD thousands)")  # >> Labels and title.
plt.ylabel("Predicted price (BD thousands)")  # >>^
plt.title("Predicted vs actual")  # >>^
plt.legend()  # >> Show the key.
plt.show()  # >> Display the chart."""),

        ("md", """## 10. Use the model

The trained model can now price houses it has never seen."""),
        ("code", """new_houses = pd.DataFrame({"area": [120, 250, 380]})  # >> Three new houses. The column must have the same name used in training.
new_houses["predicted_price"] = model.predict(new_houses).round(1)  # >> Predict their prices and store them in a new column.
new_houses  # >> Display the result."""),

        ("md", """> **Careful with extrapolation.** The model learned from houses between roughly 80 and 400 m².
> A prediction for a 2,000 m² palace would be a pure guess: nothing in the data says the straight line continues that far.

## Summary

| Step | Code |
|---|---|
| Load | `pd.read_csv(url)` |
| Split | `train_test_split(X, y, test_size=0.2)` |
| Train | `LinearRegression().fit(X_train, y_train)` |
| Predict | `model.predict(X_test)` |
| Evaluate | `mean_absolute_error`, `mean_squared_error`, `r2_score`, … |
| Diagnose | residual plots, predicted vs actual |

## Exercises

1. Change `random_state=42` to another number and re-run everything. How much do the metrics change? Why?
2. Replace the URL with `.../data/car_age_resale_value.csv` (rename the columns accordingly). Is the slope positive or negative? Interpret it.
3. Add a deliberately wrong row with `df.loc[len(df)] = [150, 300]` right after loading. Which metrics change the most: MAE or RMSE?
4. Try `test_size=0.4`. What happens to the reliability of the test metrics with fewer training houses?"""),
    ],
}


POLY = {
    "slug": "polynomial",
    "page": "code-polynomial.html",
    "notebook": "walkthrough_polynomial_regression.ipynb",
    "dataset": "speed_stopping_distance.csv",
    "eyebrow": "Lesson 4 · Polynomial regression in Python",
    "title": "Polynomial regression in Python, <em>line by line</em>.",
    "doc_title": "Polynomial Regression in Python, Line by Line",
    "lead": "A complete, runnable notebook that fits curves to car stopping-distance data: spotting the curve, "
            "engineering polynomial features, building a scikit-learn pipeline, choosing the degree with "
            "cross-validation and checking the danger of extrapolation. Every line is explained: hover over (or tap) a line to see what it does.",
    "learn": [
        "Recognise a curved relationship from a residual plot",
        "Create polynomial features with PolynomialFeatures",
        "Build and fit a scikit-learn pipeline",
        "Compare degrees with a test set and k-fold cross-validation",
        "Plot fitted curves and see why extrapolation is risky",
    ],
    "cells": [
        ("md", """## 1. Import the libraries

On top of the usual NumPy, pandas and Matplotlib, polynomial regression needs three extra scikit-learn tools:
**PolynomialFeatures** (creates $x^2, x^3, \\dots$), **StandardScaler** (puts features on the same scale) and **make_pipeline** (chains steps together)."""),
        ("code", """%config InlineBackend.figure_format = "retina"  # >> A Jupyter setting (not Python): draw sharper plots on high-resolution screens.
import numpy as np  # >> NumPy: arrays and maths.
import pandas as pd  # >> pandas: tables (DataFrames).
import matplotlib.pyplot as plt  # >> Matplotlib: charts.
from sklearn.preprocessing import PolynomialFeatures, StandardScaler  # >> Feature tools: create powers of x, and rescale features to mean 0 and standard deviation 1.
from sklearn.pipeline import make_pipeline  # >> Chains several steps (create features → scale → fit) into one model object.
from sklearn.linear_model import LinearRegression  # >> Ordinary least squares, exactly as in the linear lesson.
from sklearn.model_selection import train_test_split, KFold, cross_val_score  # >> Tools to split data and run k-fold cross-validation.
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score  # >> Evaluation metrics.

plt.rcParams["figure.figsize"] = (7, 4.5)  # >> Default chart size in inches.
plt.rcParams["axes.grid"] = True  # >> Light grid lines on every chart."""),

        ("md", """## 2. Load the dataset

**24 test drives**: the car's speed (km/h) and the distance it needed to stop (m). Physics tells us braking distance grows with the *square* of speed, so we expect a curve."""),
        ("code", """url = "https://raw.githubusercontent.com/SaeedSerwan/regression/main/data/speed_stopping_distance.csv"  # >> Location of the CSV file in the course repository.
df = pd.read_csv(url)  # >> Load it into a DataFrame.
df.columns = ["speed", "distance"]  # >> Short column names: speed (km/h) and stopping distance (m).
df = df.sort_values("speed").reset_index(drop=True)  # >> Sort the rows by speed (handy for reading the table) and renumber them 0, 1, 2, …
print("Rows and columns:", df.shape)  # >> 24 rows, 2 columns.
df.head()  # >> Show the first 5 rows."""),

        ("md", """## 3. Look at the data"""),
        ("code", """df.describe().round(1)  # >> Summary statistics: count, mean, spread and range of each column."""),
        ("code", """plt.scatter(df["speed"], df["distance"], color="#1c2230")  # >> One dot per test drive.
plt.xlabel("Speed (km/h)")  # >> Axis labels with units.
plt.ylabel("Stopping distance (m)")  # >>^
plt.title("Stopping distance rises faster at high speed")  # >> A title stating the takeaway.
plt.show()  # >> Display the chart."""),

        ("md", """## 4. Try a straight line first

Always start with the simplest model. Then check its **residuals** to see whether it missed a pattern."""),
        ("code", """X = df[["speed"]]  # >> Feature table (2-D, as scikit-learn requires).
y = df["distance"]  # >> Target column.

line = LinearRegression().fit(X, y)  # >> Create and train a straight-line model in one line (`fit` returns the model itself).
line_resid = y - line.predict(X)  # >> Residuals of the straight line.

fig, axes = plt.subplots(1, 2, figsize=(11, 4))  # >> Two panels: the fit, and its residuals.
axes[0].scatter(X["speed"], y, color="#1c2230")  # >> Left: the data…
axes[0].plot(X["speed"], line.predict(X), color="#17708a", linewidth=2.5)  # >> …and the fitted straight line (the rows are sorted, so the line draws cleanly).
axes[0].set(title="Straight-line fit", xlabel="speed (km/h)", ylabel="distance (m)")  # >> Labels for the left panel.
axes[1].scatter(X["speed"], line_resid, color="#d52a55")  # >> Right: residual for each test drive.
axes[1].axhline(0, color="grey", linestyle="--")  # >> Zero-error reference line.
axes[1].set(title="Residuals: a U-shape means a missed curve", xlabel="speed (km/h)", ylabel="residual (m)")  # >> Labels for the right panel.
plt.tight_layout()  # >> Tidy spacing.
plt.show()  # >> Display."""),

        ("md", """The residuals are **positive at both ends and negative in the middle**: a U-shape. The straight line is too low at slow and fast speeds and too high in between. We need a curve.

## 5. Create polynomial features

Polynomial regression is linear regression on **extra columns** built from $x$: $x^2$, $x^3$, and so on.
`PolynomialFeatures` builds them for us. Let's look at what it produces for degree 2."""),
        ("code", """poly = PolynomialFeatures(degree=2, include_bias=False)  # >> Make features up to x². `include_bias=False` skips the column of 1s, because LinearRegression adds its own intercept.
features = poly.fit_transform(X.head())  # >> Transform the first 5 rows: each speed becomes [speed, speed²].
pd.DataFrame(features, columns=poly.get_feature_names_out())  # >> Show the result as a table, with the generated column names."""),

        ("md", """The model is now $\\hat y = \\beta_0 + \\beta_1\\,\\text{speed} + \\beta_2\\,\\text{speed}^2$. It is still *linear in the coefficients* $\\beta$, so ordinary least squares fits it.

## 6. Fit a degree-2 model

A **pipeline** joins the feature step and the model into one object, so `fit` and `predict` apply both steps automatically."""),
        ("code", """X_train, X_test, y_train, y_test = train_test_split(  # >> Hold out 25 % of the test drives for testing.
    X, y, test_size=0.25, random_state=18)  # >> A fixed `random_state` makes the split reproducible.

quad = make_pipeline(  # >> Build the pipeline: step 1 creates [speed, speed²], step 2 fits least squares on them.
    PolynomialFeatures(degree=2, include_bias=False),  # >>^
    LinearRegression())  # >>^
quad.fit(X_train, y_train)  # >> Train the whole pipeline on the training data.

lr = quad.named_steps["linearregression"]  # >> Reach inside the pipeline to get the fitted LinearRegression step.
b0, b1, b2 = lr.intercept_, lr.coef_[0], lr.coef_[1]  # >> The intercept and the two coefficients (for speed and speed²).
print(f"distance = {b0:.3f} + {b1:.4f}·speed + {b2:.6f}·speed²")  # >> Print the fitted curve's equation."""),

        ("md", """The small positive coefficient on $\\text{speed}^2$ is the curvature: at high speeds it dominates, just as the physics predicts.

## 7. Compare against the straight line on the test set"""),
        ("code", """def evaluate(model, name):  # >> A reusable function that scores an already-trained model on the test set.
    pred = model.predict(X_test)  # >> Predictions for the held-out test drives.
    return {"model": name,  # >> Return a dictionary of metrics (one row of a results table).
            "MAE": mean_absolute_error(y_test, pred),  # >>^
            "RMSE": np.sqrt(mean_squared_error(y_test, pred)),  # >>^
            "R²": r2_score(y_test, pred)}  # >>^

straight = LinearRegression().fit(X_train, y_train)  # >> A straight line trained on the same training data, for a fair comparison.
comparison = pd.DataFrame([evaluate(straight, "degree 1 (line)"),  # >> Evaluate both models and stack the results into one table.
                           evaluate(quad, "degree 2 (quadratic)")])  # >>^
comparison.round(3)  # >> Display, rounded to 3 decimals."""),

        ("md", """Lower MAE and RMSE and a higher R² on **unseen** data: the curve is genuinely better, not just more flexible.

> **But only 6 cars are in the test set.** With so few, the verdict depends on *which* cars happen to land there (try `random_state=1` in step 6 and the line wins!).
> That is why step 9 uses cross-validation, which tests on every car once.

## 8. What happens with more flexibility?

Let's plot curves of several degrees. Higher degrees can wiggle to chase individual points."""),
        ("code", """grid = pd.DataFrame({"speed": np.linspace(X["speed"].min(), X["speed"].max(), 300)})  # >> 300 evenly spaced speeds, to draw smooth curves.

plt.scatter(X_train["speed"], y_train, color="#1c2230", label="training")  # >> Training data as dark dots.
plt.scatter(X_test["speed"], y_test, color="#d52a55", marker="s", s=60, label="test")  # >> Test data as red squares.
for degree, colour in [(1, "#17708a"), (2, "#2e8a5a"), (10, "#c08a12")]:  # >> Loop over three degrees, each with its own colour.
    model = make_pipeline(PolynomialFeatures(degree, include_bias=False),  # >> Features up to x^degree…
                          StandardScaler(),  # >> …rescaled so huge powers like speed¹⁰ stay numerically manageable…
                          LinearRegression())  # >> …then least squares.
    model.fit(X_train, y_train)  # >> Train this degree.
    plt.plot(grid["speed"], model.predict(grid), color=colour, linewidth=2, label=f"degree {degree}")  # >> Draw its curve.
plt.ylim(-20, 180)  # >> Fix the y-range so a wild curve doesn't squash the plot.
plt.xlabel("Speed (km/h)")  # >> Labels, key and display.
plt.ylabel("Stopping distance (m)")  # >>^
plt.legend()  # >>^
plt.show()  # >>^"""),

        ("md", """The degree-10 curve bends to pass close to the training points: it is **overfitting** and will predict new cars badly.

## 9. Choose the degree with cross-validation

One test split is a small, noisy sample. **5-fold cross-validation** splits the data into 5 parts, trains on 4 and tests on the 5th, five times over, and averages the error."""),
        ("code", """cv = KFold(n_splits=5, shuffle=True, random_state=0)  # >> Define the 5 folds (shuffled once, reproducibly).
rows = []  # >> We will collect one result per degree in this list.
for degree in range(1, 11):  # >> Try degrees 1 to 10.
    model = make_pipeline(PolynomialFeatures(degree, include_bias=False),  # >> Same pipeline as before.
                          StandardScaler(), LinearRegression())  # >>^
    scores = cross_val_score(model, X, y, cv=cv,  # >> Train and test 5 times. scikit-learn returns *negative* RMSE (it always maximises scores)…
                             scoring="neg_root_mean_squared_error")  # >>^
    train_rmse = np.sqrt(mean_squared_error(y, model.fit(X, y).predict(X)))  # >> Training error on all the data, for comparison.
    rows.append({"degree": degree, "train RMSE": train_rmse, "CV RMSE": -scores.mean()})  # >> …so we flip the sign back and store the average.

cv_table = pd.DataFrame(rows).set_index("degree")  # >> Turn the list into a table indexed by degree.
cv_table.round(2)  # >> Display it."""),
        ("code", """best = cv_table["CV RMSE"].min()  # >> The lowest cross-validated error of any degree.
chosen = cv_table[cv_table["CV RMSE"] <= 1.05 * best].index.min()  # >> Rule of thumb: pick the SIMPLEST degree whose CV error is within 5 % of the best.
print(f"Lowest CV RMSE = {best:.2f} m  →  chosen degree = {chosen}")  # >> Report the choice.

plt.plot(cv_table.index, cv_table["train RMSE"], "o-", color="#17708a", label="training RMSE")  # >> Training error by degree ("o-" = dots joined by lines).
plt.plot(cv_table.index, cv_table["CV RMSE"], "o-", color="#d52a55", label="5-fold CV RMSE")  # >> Cross-validated error by degree.
plt.axvline(chosen, color="grey", linestyle="--", label=f"chosen degree = {chosen}")  # >> Mark the chosen degree.
plt.yscale("log")  # >> Log scale, because the CV error explodes for high degrees.
plt.xlabel("Polynomial degree")  # >> Labels, key and display.
plt.ylabel("RMSE (m)")  # >>^
plt.legend()  # >>^
plt.show()  # >>^"""),

        ("md", """Training error **always** falls as the degree rises, but cross-validated error falls and then climbs. That U-shape is the **bias–variance trade-off**. Choosing the simplest model that is close to the best protects us from reading too much into small differences.

## 10. Final model and predictions"""),
        ("code", """final = make_pipeline(PolynomialFeatures(chosen, include_bias=False),  # >> Rebuild the pipeline with the chosen degree…
                      StandardScaler(), LinearRegression())  # >>^
final.fit(X, y)  # >> …and train it on ALL the data, now that the degree is decided.

new_speeds = pd.DataFrame({"speed": [50, 90, 120]})  # >> Three speeds we want predictions for.
new_speeds["predicted distance (m)"] = final.predict(new_speeds).round(1)  # >> Predict and add as a new column.
new_speeds  # >> Display."""),

        ("md", """## 11. The danger of extrapolation

Our data covers about 25–130 km/h. What do different models say at **200 km/h**?"""),
        ("code", """wide = pd.DataFrame({"speed": np.linspace(20, 200, 300)})  # >> Speeds from 20 to 200 km/h, far beyond the data.

plt.axvspan(X["speed"].min(), X["speed"].max(), color="#17708a", alpha=0.08, label="range of the data")  # >> Shade the region where we actually have data.
plt.scatter(X["speed"], y, color="#1c2230")  # >> The data.
for degree, colour in [(1, "#17708a"), (2, "#2e8a5a"), (8, "#c08a12")]:  # >> Three degrees again.
    model = make_pipeline(PolynomialFeatures(degree, include_bias=False),  # >> Build and train each one on all the data.
                          StandardScaler(), LinearRegression()).fit(X, y)  # >>^
    at_200 = model.predict(pd.DataFrame({"speed": [200]}))[0]  # >> Its prediction at 200 km/h.
    plt.plot(wide["speed"], model.predict(wide), color=colour, linewidth=2,  # >> Draw the curve over the wide range, with the 200 km/h prediction in the label.
             label=f"degree {degree}: {at_200:,.0f} m at 200 km/h")  # >>^
plt.ylim(-50, 450)  # >> Keep the y-axis readable.
plt.xlabel("Speed (km/h)")  # >> Labels, key and display.
plt.ylabel("Stopping distance (m)")  # >>^
plt.legend()  # >>^
plt.show()  # >>^"""),

        ("md", """Inside the shaded region the models roughly agree. Outside it they give wildly different answers, and a high-degree polynomial can even predict a *negative* distance.
**Never trust a polynomial far outside the range of its training data.**

## Summary

| Step | Code |
|---|---|
| Create features | `PolynomialFeatures(degree, include_bias=False)` |
| Scale | `StandardScaler()` |
| Combine | `make_pipeline(features, scaler, LinearRegression())` |
| Choose the degree | `cross_val_score(model, X, y, cv=KFold(5, shuffle=True))` |
| Predict | `model.predict(new_data)` |

## Exercises

1. Change the URL to `.../data/hour_electricity_demand.csv` (columns `hour`, `demand`). Which degree does cross-validation choose? Why is it higher than for stopping distance?
2. In step 6, try `random_state` values 0 to 5. How often does the quadratic beat the line on the test set? What does this tell you about evaluating on only 6 points?
3. In step 9, replace the 5 % rule with simply taking the degree with the lowest CV RMSE. Do you get the same answer? Which would you trust more?
4. Fit degree 2 to `.../data/projectile_height_time.csv`. The physics formula is $h = h_0 + v_0 t - \\tfrac{1}{2} g t^2$. Use the $t^2$ coefficient to estimate $g$.
5. Add `Ridge(alpha=1.0)` (from `sklearn.linear_model`) in place of `LinearRegression()` for the degree-10 model. How does its curve change?"""),
    ],
}

LESSONS = [LINEAR, POLY]
