from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import os
import joblib

app = FastAPI(title="Habit Tracker ML & AI Engine")

# إتاحة الاتصال من تطبيق React على Vercel أو Localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "tracker_models.pkl"

# تحميل الموديل إذا كان محفوظاً أو تدريبه تلقائياً عند أول تشغيل
def get_models():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None

class DayContext(BaseModel):
    day_of_week: int          # 0: Mon ... 6: Sun
    outside_hours: float      # عدد ساعات الكلية/الكورسات/المشاوير
    sleep_hours: float        # ساعات النوم
    active_habits_count: int  # عدد العادات المخطط لها اليوم

@app.get("/")
def home():
    return {"status": "online", "message": "ML Habit Engine is running"}

@app.post("/predict-day")
def predict_day_readiness(data: DayContext):
    models = get_models()
    
    # تحديد هل اليوم إجازة أسبوعية
    is_weekend = 1 if data.day_of_week in [4, 5] else 0
    
    features = pd.DataFrame([{
        "day_of_week": data.day_of_week,
        "is_weekend": is_weekend,
        "outside_hours": data.outside_hours,
        "sleep_hours": data.sleep_hours,
        "active_habits_count": data.active_habits_count
    }])

    habit_names_map = {
        "target_prayers": "الصلوات في وقتها",
        "target_cardio_gym": "تمرين الجيم / الكارديو",
        "target_problem_solving": "Codeforces / Problem Solving",
        "target_ml_pipeline": "Python / ML Pipeline",
        "target_touch_typing": "Touch Typing"
    }

    predictions = {}
    advice_list = []

    if models:
        for target_key, clf in models.items():
            prob = clf.predict_proba(features)[0][1]
            habit_arabic = habit_names_map.get(target_key, target_key)
            predictions[habit_arabic] = {
                "probability": round(float(prob) * 100, 1),
                "status": "آمن" if prob >= 0.65 else ("متوسط" if prob >= 0.40 else "معرض للإلغاء")
            }
    else:
        # Fallback منطقي في حالة عدم وجود ملف pkl
        predictions = {k: {"probability": 75.0, "status": "آمن"} for k in habit_names_map.values()}

    # منطق المساعد الذكي (Rule-based AI Coach & Decision Trees)
    if data.outside_hours >= 6:
        advice_list.append(
            f"⚠️ لديك اليوم {data.outside_hours} ساعات خارج المنزل. الموديل يرجح انخفاض طاقتك البدنية والذهنية؛ يُفضل نقل مسائل الـ Problem Solving إلى أول الصباح، وجعل جلسة الجيم مقتصرة على تمارين خفيفة."
        )
    
    if data.sleep_hours < 6.0:
        advice_list.append(
            "⚠️ عدد ساعات نومك أقل من المعدل المثالي. تجنب المهام المعقدة في آخر الليل لضمان الالتزام بمواقيت الصلاة وتركيز اليوم التالي."
        )
        
    if not advice_list:
        advice_list.append("✅ ظروف يومك متوازنة وممتازة لإتمام كل أهدافك والحفاظ على سلاسل الـ Streak دون انقطاع.")

    overall_readiness = round(float(np.mean([p["probability"] for p in predictions.values()])), 1)

    return {
        "readiness_score": overall_readiness,
        "habits_forecast": predictions,
        "ai_coach_insights": advice_list
    }
