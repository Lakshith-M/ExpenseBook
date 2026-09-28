# ExpenseBook

A fast, privacy-first personal finance tracker built for Android.

ExpenseBook helps you track your income and expenses effortlessly. You can manually log transactions or directly import your bank statements. All parsing is done 100% locally on your device—no AI, no backend servers, no cloud sync, complete privacy.

## Features

- **Smart Dashboard:** Get an instant breakdown of your total income, expenses, and current balance, categorized by payment methods (Cash, UPI, Bank).
- **Local Bank Statement Import:** Upload a PDF or Excel bank statement. The app uses robust local algorithms to extract your transactions. Supports **HDFC Bank Excel**, **Canara Bank PDF**, and **ExpenseBook PDF** formats.
- **UPI IDs Filtering & QR Tagging:** Save your UPI IDs, generate receive QR codes, automatically tag received transactions to your chosen UPI ID, and filter your dashboard by specific UPI IDs.
- **Detailed Transactions:** Add descriptions and categorize your transactions easily.
- **Export to PDF:** Export your transaction history as a clean, formatted PDF right from the app.
- **100% Private:** Built with a local-first architecture. Your financial data never leaves your device. No signup required, no AI used.

## Installation (Android)

1. Download the `ExpenseBook.apk` file from this repository.
2. Open the APK on your Android device to install it. (You may need to allow "Install from unknown sources" in your settings).
3. Open the app and start tracking.

## Tech Stack

- **Frontend / UI:** HTML, CSS, JavaScript (Vanilla, no framework)
- **Mobile Packaging:** Capacitor
- **PDF Processing:** pdf.js for on-device viewing and text extraction, jsPDF for exporting.
- **Excel Processing:** SheetJS (xlsx) for structured local parsing.

## Development

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`
