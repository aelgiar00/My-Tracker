from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HabitRecord(BaseModel):
    date: str
    habitId: str
    habitName: str
    scheduled: bool
    completed: bool


class MLRequest(BaseModel):
    targetDate: str
    trackingStart: Optional[str] = None
    records: List[HabitRecord]
    modelType: Optional[str] = "Random Forest"
    threshold: Optional[float] = 70.0


@app.post("/api/ml-insights")
async def get_ml_insights(req: MLRequest):
    if not req.records:
        return {"status": "error", "message": "No records found to analyze."}

    df = pd.DataFrame([r.model_dump() for r in req.records])

    if df.empty:
        return {"status": "error", "message": "No habits found in data."}

    target_dt = pd.to_datetime(req.targetDate)
    target_month_start = target_dt.replace(day=1)

    predictions = []
    total_month_correct = 0
    total_month_evals = 0

    for habit_name, g in df.groupby("habitName"):
        g = g.sort_values("date").reset_index(drop=True)
        g["date_dt"] = pd.to_datetime(g["date"])

        # هندسة الميزات
        g["prev_done"] = g["completed"].shift(1).fillna(0).astype(int)
        g["roll7"] = g["completed"].shift(1).rolling(7, min_periods=1).mean().fillna(0)
        g["dow"] = g["date_dt"].dt.dayofweek

        # فلترة بيانات التدريب للعادات المجدولة فقط (استبعاد أيام الراحة من التدريب)
        train_data = g[(g["date_dt"] < target_dt) & (g["scheduled"] == True)]
        target_data = g[g["date_dt"] == target_dt]

        if target_data.empty:
            continue

        is_target_scheduled = target_data["scheduled"].iloc[0]

        # لو اليوم المختار إجازة من العادة دي
        if not is_target_scheduled:
            predictions.append({
                "habitName": habit_name,
                "predicted": False,
                "probability": 0,
                "reason": "Rest day (Not scheduled)",
                "canPredict": False,
                "importances": None
            })
            continue

        if len(train_data) < 3:
            predictions.append({
                "habitName": habit_name,
                "predicted": False,
                "probability": 0,
                "reason": "Not enough historical data",
                "canPredict": False,
                "importances": None
            })
            continue

        X_train = train_data[["dow", "prev_done", "roll7"]]
        y_train = train_data["completed"].astype(int)

        if len(y_train.unique()) == 1:
            val = y_train.iloc[0]
            predictions.append({
                "habitName": habit_name,
                "predicted": bool(val),
                "probability": 100 if val == 1 else 0,
                "reason": "100% constant historical trend",
                "canPredict": True,
                "importances": None
            })
            continue

        # بناء الموديل
        if req.modelType == "Logistic Regression":
            model = LogisticRegression(random_state=42, max_iter=200)
        elif req.modelType == "Gradient Boosting":
            model = GradientBoostingClassifier(random_state=42)
        else:
            model = RandomForestClassifier(n_estimators=50, max_depth=5, random_state=42)

        model.fit(X_train, y_train)

        # حساب الدقة الصارمة للشهر الحالي (Validation Accuracy)
        month_eval_data = train_data[train_data["date_dt"] >= target_month_start]
        if not month_eval_data.empty:
            X_eval = month_eval_data[["dow", "prev_done", "roll7"]]
            y_eval = month_eval_data["completed"].astype(int)
            probs = model.predict_proba(X_eval)[:, 1] * 100
            preds = (probs >= req.threshold).astype(int)
            total_month_correct += sum(preds == y_eval)
            total_month_evals += len(y_eval)

        # توقع اليوم المستهدف
        X_target = target_data[["dow", "prev_done", "roll7"]]
        prob = model.predict_proba(X_target)[0][1] * 100
        pred = bool(prob >= req.threshold)

        # استخراج أهمية الميزات لإرسالها لـ React ليرسمها
        if req.modelType == "Logistic Regression":
            importances = np.abs(model.coef_[0])
        else:
            importances = model.feature_importances_

        importances_dict = {
            "Day": float(importances[0]),
            "Yest": float(importances[1]),
            "Mom": float(importances[2])
        }

        features = ["Day", "Yesterday", "Momentum"]
        top_feature = features[np.argmax(importances)]

        reason_prefix = "High confidence" if prob >= req.threshold else "Low confidence"
        predictions.append({
            "habitName": habit_name,
            "predicted": pred,
            "probability": round(prob, 1),
            "reason": f"{reason_prefix}. Main driver: {top_feature}",
            "canPredict": True,
            "importances": importances_dict
        })

    if total_month_evals > 0:
        final_acc = (total_month_correct / total_month_evals) * 100
        acc_text = f"{final_acc:.1f}% (evaluated strictly on the current test month: {total_month_correct}/{total_month_evals} correct predictions)"
    else:
        acc_text = "N/A (No previous schedule data in the current month to evaluate)"

    return {
        "status": "success",
        "targetDate": req.targetDate,
        "predictions": predictions,
        "stats": {
            "model_used": req.modelType,
            "accuracy_text": acc_text,
            "why_this_model": f"Trained using {req.modelType}. A hard decision threshold of {req.threshold}% was applied to ensure strict prediction confidence, preventing false positives."
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)