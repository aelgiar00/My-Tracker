import numpy as np
import pandas as pd

np.random.seed(42)
num_days = 180

data = []

for _ in range(num_days):
    day_of_week = np.random.randint(0, 7)
    is_weekend = 1 if day_of_week in [4, 5] else 0
    
    if is_weekend:
        outside_hours = np.random.choice([0, 1, 2, 4], p=[0.5, 0.2, 0.2, 0.1])
        sleep_hours = np.random.normal(7.5, 0.8)
    else:
        outside_hours = np.random.choice([0, 3, 6, 8], p=[0.2, 0.3, 0.3, 0.2])
        sleep_hours = np.random.normal(6.5, 1.0)
        
    sleep_hours = round(max(4.0, min(10.0, sleep_hours)), 1)
    active_habits_count = np.random.randint(4, 7)
    
    prob_prayer = 0.95 if sleep_hours >= 6 else 0.80
    target_prayers = 1 if np.random.rand() < prob_prayer else 0
    
    prob_gym = 0.85
    if outside_hours >= 6:
        prob_gym -= 0.55
    if sleep_hours < 5.5:
        prob_gym -= 0.20
    target_cardio_gym = 1 if np.random.rand() < max(0.1, prob_gym) else 0
    
    prob_ps = 0.75
    if outside_hours >= 7:
        prob_ps -= 0.40
    if target_cardio_gym == 1:
        prob_ps += 0.10
    target_problem_solving = 1 if np.random.rand() < max(0.15, prob_ps) else 0

    prob_ml = 0.80 if outside_hours <= 4 else 0.40
    target_ml_pipeline = 1 if np.random.rand() < prob_ml else 0
    
    prob_typing = 0.85 if outside_hours < 8 else 0.50
    target_touch_typing = 1 if np.random.rand() < prob_typing else 0

    data.append({
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "outside_hours": outside_hours,
        "sleep_hours": sleep_hours,
        "active_habits_count": active_habits_count,
        "target_prayers": target_prayers,
        "target_cardio_gym": target_cardio_gym,
        "target_problem_solving": target_problem_solving,
        "target_ml_pipeline": target_ml_pipeline,
        "target_touch_typing": target_touch_typing,
    })

df = pd.DataFrame(data)
df.to_csv("tracker_data.csv", index=False)
print("Dataset created: tracker_data.csv with 180 records.")
