# ExpenseBook

An AI-powered, privacy-first personal finance tracker built for Android.

ExpenseBook helps you track your income and expenses effortlessly. You can manually log transactions or directly import your bank statements using AI. All data stays locally on your device—no accounts, no cloud sync, complete privacy.

## Features

- **Smart Dashboard:** Get an instant breakdown of your total income, expenses, and current balance, categorized by payment methods (Cash, UPI, Bank).
- **AI Bank Statement Import:** Upload a PDF or Excel bank statement. The AI will read, extract, and categorize your transactions. You get a full preview before anything is added.
- **Auto-Categorization:** One tap automatically assigns appropriate categories to your unorganized transactions using AI.
- **Receive via UPI:** Generate instant QR codes for your saved UPI IDs to easily receive payments.
- **Export to PDF:** Export your transaction history as a clean, formatted PDF right from the app.
- **100% Private:** Built with a local-first architecture. Your financial data never leaves your device. No signup required.

## Installation (Android)

1. Download the `ExpenseBook.apk` file from this repository.
2. Open the APK on your Android device to install it. (You may need to allow "Install from unknown sources" in your settings).
3. Open the app and start tracking.

## Tech Stack

- **Frontend / UI:** HTML, CSS, JavaScript (Vanilla, no framework)
- **Mobile Packaging:** Capacitor
- **Backend (AI Processing):** Serverless API hosted on Vercel
- **AI Models:** Powered by Groq (dynamically routes to available models)
- **PDF Processing:** pdf.js for on-device viewing and text extraction, jsPDF for exporting.

## Development

1. Clone the repository
2. Run `npm install`
3. Create a `.env` file and add `GROQ_API_KEY=your_api_key_here`
4. Run `npm run dev`
