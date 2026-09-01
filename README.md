
# 🚀 Habit Mastery & Personal AI Tracker

> An elite, AI-driven habit-tracking and life execution platform engineered for high-performance personal analytics, dynamic workflow personalization, and machine learning behavioral insights.

* 🌐 **Live Web App**: [https://my-tracker-kappa-nine.vercel.app/](https://your-live-app-url.vercel.app)
[![GitHub Repository](https://github.com/aelgiar00/My-Tracker)

---

## 🌟 What We Built Today (Key Features & Overhauls)

### 1. 🧠 ML-Driven Predictive Analytics Engine
* **Multi-Model Intelligence**: Integrated a sophisticated prediction engine supporting **Gradient Boosting**, **Random Forest**, and **Logistic Regression** engines[cite: 5]. Each engine runs on isolated heuristic weights to provide distinct, accurate probability outputs.
* **Interactive Probability Matrix**: Dynamic prediction table evaluating historical patterns against selected test dates, featuring **Low, Medium, and High** dynamic prediction classes with customizable range settings[cite: 5].
* **Deep Habit Drilldown**: Clickable accordion rows for each habit revealing a **14-day probability trend sparkline**, **7-day execution context timeline**, and the model's underlying reasoning[cite: 5].
* **Performance Histogram Comparison**: A visual benchmarking section comparing model accuracy and F1 scores[cite: 5].

### 2. 🎨 Premium UI/UX & Glassmorphism Engine
* **Glassmorphism Modals**: Overhauled dialog windows (Settings, New Habit, Prediction Ranges) with a transparent, blurred backdrop (`backdrop-blur-3xl`) that seamlessly blends with any active theme[cite: 4, 6].
* **Dynamic Theme Engine**: Fully compatible with 5 luxury themes: *Obsidian Gold*, *Ink*, *Paper*, *Slate*, and *Lavender*[cite: 4].
* **Sticky Bottom Navigation Bar**: Fluid mobile-friendly tab switcher (`Daily`, `Matrix`, `Stats`) for rapid context switching[cite: 5].
* **Polished Typography**: High-definition radial gauge progress rings paired with *Playfair Display* serif numbers for elite visual feedback[cite: 5].

### 3. ⚙️ Highly Personalized Execution Coach (Personal AI)
* **Customizable Time Blocks**: Replaced hardcoded lifestyle sliders with a fully dynamic allocation system where users can add, rename, or remove life categories (e.g., Sleep, Work 1, Work 2, Gym, Reading) and save states directly to `localStorage`[cite: 5].
* **Integrated Daily Score**: Dynamic calculation combining scheduled habits and one-off daily tasks into a single high-definition percentage ring[cite: 5].

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

1. **Historical Execution Rate ($Score_{habit}$)**: Long-term historical consistency.
2. **Pace Score ($Score_{pace}$)**: Overall month-to-date execution momentum.
3. **Streak Multiplier ($Bonus_{streak}$)**: Non-linear reward boosting for consecutive completions.
4. **Calendar Context**: Automated bypass for scheduled Rest Days (`Rest day (Not scheduled)`).

$$\text{Probability} = f(w_1 \cdot \text{HabitScore} + w_2 \cdot \text{PaceScore} + \text{StreakBonus})$$

---

## 🛠️ Tech Stack & Architecture

* **Framework**: React, TypeScript, Vite, Tailwind CSS v4[cite: 5]
* **State Management**: Zustand (with local persistence & snapshot export/import workflows)[cite: 5]
* **Data Visualization**: Recharts (`<RadarChart>`, `<BarChart>`, `<ResponsiveContainer>`)[cite: 5]
* **Database & Cloud Auth**: Supabase (PostgreSQL for real-time user state synchronization)[cite: 5]
* **Date Manipulation**: `date-fns`[cite: 5]

---

## 📦 Project Structure

```text
src/
├── components/
│   ├── tracker/
│   │   ├── tracker-app.tsx         # Main layout container & bottom navigation
│   │   ├── today-panel.tsx         # Personal AI & dynamic life blocks
│   │   ├── analytics-panel.tsx     # Recharts mastery radar, heatmaps, & correlation matrix
│   │   ├── ml-panel.tsx            # ML prediction matrix, confidence classes, & histograms
│   │   ├── habit-matrix.tsx        # Month/Week execution grid matrix
│   │   ├── habit-dialogs.tsx       # Glassmorphic modal dialogs & settings
│   │   └── auth-dialog.tsx         # Supabase authentication modal
│   └── ui/                         # Reusable core UI primitives (Button, Dialog, etc.)
├── lib/
│   ├── tracker/                    # Core scheduling, statistics, and date engines
│   └── supabase.ts                 # Supabase client configuration
└── store/
    └── tracker-store.ts            # Zustand global state & snapshot handlers

```

---

## 🚀 Deployment & Hosting Guide

### 1. Live Application & Source Code

* 🌐 **Live Web App**: [https://my-tracker-kappa-nine.vercel.app/](https://my-tracker-elgiar.vercel.app/)
* 📂 **GitHub Source Code**: [View Repository on GitHub](https://github.com/aelgiar00/My-Tracker)

### 2. Vercel Deployment (Frontend & Serverless)

The application is optimized for deployment on **Vercel**:

1. Connect your GitHub repository to Vercel.
2. Configure build settings:
* **Framework Preset**: Vite
* **Build Command**: `npm run build`
* **Output Directory**: `dist`


3. Add your environment variables in the Vercel dashboard:
* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`


4. Deploy!

### 3. Supabase Backend Setup

To enable cloud state synchronization:

1. Create a new project on [Supabase](https://supabase.com).
2. Create the primary sync table `user_tracker_data`:
```sql
create table user_tracker_data (
  user_id uuid references auth.users not null primary key,
  snapshot jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

```


3. Enable Row Level Security (RLS) and policies allowing users to read/write only their own rows.
4. Copy your project API keys into your `.env` file locally and on Vercel.

---

## 💻 Local Development Setup

1. **Clone the repository**:
```bash
git clone [https://github.com/your-username/habit-tracker.git](https://github.com/your-username/habit-tracker.git)
cd habit-tracker

```


2. **Install dependencies**:
```bash
npm install

```


3. **Configure environment variables**:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

```


4. **Run the development server**:
```bash
npm run dev

```


5. **Build for production**:
```bash
npm run build

```



---

## 📄 License

This project is proprietary and built as an advanced high-performance personal execution system.

```

```
