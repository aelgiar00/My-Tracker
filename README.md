# 🚀 My-Tracker: AI-Powered Intelligent Habit Tracking System

> **A high-performance, full-stack habit tracking and behavior analytics dashboard integrated with an Embedded Machine Learning Engine for habit completion forecasting and behavioral pattern recognition.**

---

## 📌 Project Overview

**My-Tracker** is an end-to-end habit-tracking web platform designed to help users build consistency through data-driven insights. Unlike traditional habit trackers, this system integrates statistical analytics with **Supervised Machine Learning Models** to forecast daily habit completion likelihood, dynamically calculate feature importance (momentum, previous day performance, weekday bias), and eliminate false positives via custom decision thresholds.

---

## ✨ Key Features

- **Interactive Habit Matrix:** Dynamic, matrix-based tracking with support for custom schedules, single-day habits, and rest day detection.
- **Embedded Machine Learning Prediction Engine:** Client-side zero-latency inference running multi-model evaluations.
- **Comprehensive Behavior Analytics:** Execution heatmaps, pace completion scores, streak analyzers, and radar mastery charts.
- **Configurable Decision Thresholds:** Fine-tune model precision and recall by adjusting probability cutoff limits (e.g., 70% threshold).
- **Explainable AI (Feature Importance):** Real-time feature weight visualization displaying key drivers behind predictions (Momentum, Recency, Day bias).
- **Multi-Device Responsive UI:** Built with Tailwind CSS and Radix UI primitives for seamless mobile and desktop experiences.
- **Enterprise-Grade Authentication:** Configured via Better Auth with session management and multi-provider token verification.

---

## 🧠 Machine Learning Architecture

The application implements a comparative ML engine allowing users to dynamically switch between three classification algorithms:

| Algorithm | Optimization Target | Best Used For |
| :--- | :--- | :--- |
| **Gradient Boosting** *(Primary)* | Minimizing sequential residual errors | Capturing momentum shifts, habit streaks, and nonlinear behavioral trends. |
| **Random Forest** | Variance reduction via ensemble averaging | Balanced baseline predictions less sensitive to noise or sudden deviations. |
| **Logistic Regression** | Linear probability calibration | Direct, monotonic probability scaling and baseline verification. |

### 📊 Feature Engineering Pipeline

The inference engine extracts and weighs behavioral features per habit:
1. **Historical Execution Rate ($Score_{habit}$):** Long-term historical consistency.
2. **Pace Score ($Score_{pace}$):** Overall month-to-date execution momentum.
3. **Streak Multiplier ($Bonus_{streak}$):** Non-linear reward boosting for consecutive completions.
4. **Calendar Context:** Automated bypass for scheduled Rest Days (`Rest day (Not scheduled)`).

$$\text{Probability} = f(w_1 \cdot \text{HabitScore} + w_2 \cdot \text{PaceScore} + \text{StreakBonus})$$

---

## 🛠 Tech Stack

### Frontend & Dashboard
- **Framework:** React 18+ with TypeScript
- **Routing & State:** TanStack Router / Zustand / Local Storage persistence
- **Data Visualization:** Recharts (Heatmaps, Bar Charts, Mastery Radar)
- **UI Components & Icons:** Tailwind CSS, Radix UI Primitives, Lucide Icons, Sonner Toasts

### Backend & Database Services
- **Authentication:** Better Auth (Dynamic origin negotiation & token sessions)
- **Database & Storage:** Supabase / PGLite embedded fallback
- **Model Hosting & Serving:** PythonAnywhere (Microservice endpoint) & Embedded Client-Side Engine

### Deployment & CI/CD
- **Frontend Hosting:** Vercel (Edge-optimized build configuration)
- **Repository & Version Control:** GitHub (`aelgiar00/My-Tracker`)

---

## 📁 Repository Structure

```text
├── src/
│   ├── components/
│   │   ├── tracker/
│   │   │   ├── analytics-panel.tsx   # Analytics Dashboard & Embedded ML Matrix
│   │   │   ├── habit-matrix.tsx      # Main Interactive Grid
│   │   │   ├── progress-ring.tsx     # Animated SVG Progress Rings
│   │   │   └── today-panel.tsx       # Daily Focus Execution Panel
│   │   └── ui/                       # Reusable UI Primitives (Buttons, Cards, Dialogs)
│   ├── lib/
│   │   ├── auth/                     # Better Auth configuration & Token validation
│   │   └── tracker/                  # Statistics, Schedule algorithms & Types
│   ├── store/                        # Zustand Global State Management
│   └── routes/                       # Application route definitions
├── .vercelignore                     # Vercel deployment filter
├── package.json                      # Project dependencies and build scripts
└── README.md                         # Project documentation
