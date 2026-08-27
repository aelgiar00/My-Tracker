import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

# 1. قراءة الـ Dataset
df = pd.read_csv("tracker_data.csv")

# 2. تحديد الـ Features (المدخلات)
feature_cols = ["day_of_week", "is_weekend", "outside_hours", "sleep_hours", "active_habits_count"]
X = df[feature_cols]

# 3. العادات المستهدفة للتوقع (Targets)
target_cols = [
    "target_prayers",
    "target_cardio_gym",
    "target_problem_solving",
    "target_ml_pipeline",
    "target_touch_typing"
]

models = {}
metrics = {}

# 4. تدريب موديل مخصص لكل عادة
for target in target_cols:
    y = df[target]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    clf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    clf.fit(X_train, y_train)
    
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    
    models[target] = clf
    metrics[target] = round(acc * 100, 2)
    print(f"Accuracy for {target}: {metrics[target]}%")

# 5. حفظ الموديلات المجمعة في ملف واحد لاستخدامه في السيرفر
joblib.dump(models, "tracker_models.pkl")
print("\nAll models trained and exported to tracker_models.pkl successfully!")
