
# MyTracker 🚀

**MyTracker** is an advanced, AI-powered Habit Tracking application designed to help users build consistency, analyze their performance, and predict future habit completions using Machine Learning.

🔗 **[Live App: Try MyTracker Here!](https://my-tracker-kappa-nine.vercel.app/)**
🔗 **[Developer's GitHub: Ahmed El-Giar](https://github.com/aelgiar00/My-Tracker)**

## 🌟 Key Features

*   **Secure User Authentication:** Complete user session management (Sign up, Log in, secure sessions) powered by **Supabase**. Each user's data is isolated and protected via Row Level Security (RLS).
*   **Intelligent ML Predictions:** Integrates with a **FastAPI** backend to predict the probability of habit completion using advanced algorithms (Gradient Boosting, Random Forest, Logistic Regression).
*   **Dynamic Theming Engine:** Four meticulously crafted UI themes (Obsidian Gold, Paper, Slate, Lavender) that apply dynamic CSS variables across the entire application.
*   **Comprehensive Analytics:** Real-time calculation of pace, streaks, and correlation matrices to track habit co-occurrence.
*   **Installable App (PWA):** Built to be installed directly on desktop or mobile devices for a native app-like experience.
*   **Bulk Operations:** Fast and efficient bulk adding and updating of habits for seamless daily planning.

## 🛠️ Technology Stack

**Frontend:**
*   **React & TypeScript:** For building a scalable, type-safe, and maintainable user interface.
*   **Tailwind CSS:** For rapid, responsive, and custom styling.
*   **Recharts:** For rendering performance histograms and data visualizations.
*   **Zustand:** For global state management.

**Backend & AI:**
*   **Supabase (BaaS):** PostgreSQL Database, Authentication, and Session handling.
*   **FastAPI (Python):** Dedicated microservice for handling Machine Learning models and returning prediction probabilities.

**Deployment:**
*   **Vercel:** The frontend is deployed on Vercel for lightning-fast Edge delivery, continuous CI/CD, and secure environment variable management.

## ⚙️ Local Setup for Developers

If you want to clone this repository and run it locally on your own machine, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/yourusername/my-tracker.git](https://github.com/yourusername/my-tracker.git)
   cd my-tracker

```

2. **Install dependencies:**
```bash
npm install

```


3. **Set up Environment Variables:**
Create a `.env` file in the root directory. **You must use your own Supabase project credentials.**
```env
VITE_SUPABASE_URL=your_own_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_own_supabase_anon_key_here

```


*(Note: Never commit your actual `.env` file to version control. It is already added to `.gitignore`.)*
4. **Run the development server:**
```bash
npm run dev

```



## 🚀 Deployment

This project is optimized for deployment on **Vercel**. Vercel ensures that our React application is served globally with maximum speed, while keeping our production API keys secure.

To deploy your own instance, simply import the GitHub repository into Vercel and add your Supabase credentials to the Vercel Environment Variables settings.

## 👨‍💻 Core Team & Contributors

This application was engineered and developed by:

* **Ahmed El-Giar**
* **Omar El-Deeb**
* **Ibrahim Keshta**
* **Hatem Abdelrahman**
* **Mohamed El-Azabawy**

## 📄 License

This project is licensed under the MIT License.


```
