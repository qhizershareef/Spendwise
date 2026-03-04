<![CDATA[# 💰 SpendWise — Smart Expense Tracker

A premium, AI-powered personal finance tracker built with **React Native** and **Expo**. Track every rupee, get intelligent insights, visualize your spending, and sync to Google Drive — all from your phone.

---

## ✨ Features at a Glance

### 📊 Dashboard
- **Monthly spending overview** with income vs expense breakdown
- **Today, This Week, and Savings** cards — tap any card for in-depth charts
- **Budget progress bars** with visual alerts when nearing limits
- **AI Quick Tips** from your spending data
- **Floating QR scan button** for instant transactions

### ➕ Add Transactions
- Quick manual entry with amount, category, and payee
- **15 built-in categories** (11 expense + 4 income) with icons and colors
- **Payment method tracking** — Cash, UPI, Card, Net Banking, Wallet
- **Payment app selector** — GPay, PhonePe, Paytm, CRED, etc.
- **QR code scanner** with deep-link to payment apps
- **Location tagging** (optional GPS capture per transaction)
- Floating QR scan button available on both Home and Add screens

### 📜 Transaction History
- **Search** by payee, note, or category name
- **Category filters** — tap chips to filter by category
- **Date-grouped list** with relative timestamps
- **Swipe-to-delete** with confirmation
- **Tap to view/edit** transaction details

### 🧠 AI-Powered Insights
- **Google Gemini** or **OpenAI ChatGPT** integration
- **Smart alerts** — overspending warnings with specific amounts
- **Savings tips** — actionable suggestions with estimated savings
- **Monthly summaries** — AI-written financial health check
- **Category breakdowns** with pie charts
- **Budget progress** tracking across categories

### 📈 Detailed Analysis Screens
Tap any card on the home screen for visual deep dives:

| Screen | What You See |
|--------|-------------|
| **Today** | Hourly spending bar chart + category pie chart |
| **This Week** | Daily spending bars + category breakdown |
| **Monthly** | Daily spending trend + top categories |
| **Savings** | Income vs Expense comparison + spending distribution |

### ⚙️ Settings & Customization
- **Theme** — Light, Dark, or System Default
- **Currency** — INR (₹) by default
- **Custom categories** — Add your own with icon picker
- **Budget management** — Set monthly limits per category
- **SMS auto-detect** — Automatically capture transactions from bank SMS (Android)
- **Biometric lock** — Fingerprint/Face unlock
- **AI provider toggle** — Switch between Gemini and ChatGPT

### ☁️ Data & Sync
- **Google Drive backup** — Sign in with Google, sync with one tap
- **Restore from backup** — Download and restore all data from Drive
- **Export as CSV** — Spreadsheet-friendly format for Excel/Sheets
- **Export as JSON** — Full app backup with all settings
- Share exports via WhatsApp, Email, Files, or any app

### 🎬 Onboarding
- Beautiful **5-slide animated walkthrough** on first launch
- Covers: Welcome → Track Transactions → AI Insights → Charts → Get Started
- Can be skipped anytime

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) / npx
- Android or iOS device with [Expo Go](https://expo.dev/client) installed

### Installation

```bash
# Clone the repository
git clone https://github.com/qhizershareef/Spendwise.git
cd Spendwise

# Install dependencies
npm install

# Start the development server
npx expo start
```

Scan the QR code with **Expo Go** on your phone to run the app.

### Quick Setup Checklist
1. ✅ Install and run the app
2. 🎯 Complete the onboarding walkthrough
3. ➕ Add your first transaction
4. 🤖 Set up AI (Settings → AI Configuration → add API key)
5. ☁️ Connect Google Drive (Settings → Data & Sync → Sign in)

---

## 🤖 AI Setup

SpendWise supports two AI providers for intelligent spending insights:

### Google Gemini (Recommended)
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key
3. In the app: **Settings → AI Configuration → paste key**

### OpenAI ChatGPT
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an API key
3. In the app: **Settings → AI Configuration → switch to ChatGPT → paste key**

Tap **Test Connection** to verify your key works.

---

## ☁️ Google Drive Sync Setup

### For Development (Expo Go)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **Google Drive API**
3. Create **OAuth 2.0 Client ID** (Web Application type)
4. Add authorized redirect URI: `https://auth.expo.io/@anonymous/spendwise`
5. Copy the Client ID into `services/googleDrive.ts`

### For Production
- Create an **Android** type OAuth client with your app's package name and SHA-1
- Create an **iOS** type OAuth client with your bundle ID

---

## 🏗️ Project Structure

```
spendwise/
├── app/                    # Screens & navigation (Expo Router)
│   ├── (tabs)/             # Tab screens
│   │   ├── index.tsx       # Home / Dashboard
│   │   ├── transactions.tsx# Transaction history
│   │   ├── add.tsx         # Add transaction
│   │   ├── insights.tsx    # AI insights & charts
│   │   ├── settings.tsx    # App settings
│   │   └── _layout.tsx     # Tab navigator config
│   ├── detail/             # Detail analysis screens
│   │   ├── today.tsx       # Today's spending analysis
│   │   ├── weekly.tsx      # Weekly analysis
│   │   ├── monthly.tsx     # Monthly analysis
│   │   └── savings.tsx     # Savings analysis
│   ├── transaction/[id].tsx# Transaction view/edit
│   ├── scanner.tsx         # QR code scanner
│   ├── onboarding.tsx      # First-launch walkthrough
│   └── _layout.tsx         # Root stack navigator
├── constants/
│   ├── theme.ts            # Colors, spacing, border radius tokens
│   └── categories.ts       # Category definitions & icons
├── services/
│   ├── ai.ts               # Gemini & ChatGPT integration
│   ├── export.ts           # CSV/JSON export
│   ├── googleDrive.ts      # Google Drive OAuth & sync
│   ├── location.ts         # GPS location capture
│   ├── payments.ts         # Payment app deep linking
│   ├── sms.ts              # SMS auto-detection
│   └── storage.ts          # File-based data persistence
├── stores/                 # Zustand state management
│   ├── transactionStore.ts # Transaction CRUD & queries
│   ├── preferencesStore.ts # User settings
│   ├── budgetStore.ts      # Budget & goals management
│   └── syncStore.ts        # Google Drive sync state
├── types/
│   └── index.ts            # TypeScript interfaces
└── utils/
    ├── formatters.ts       # Currency, date, time formatters
    └── id.ts               # UUID generation
```

---

## 🔧 Advanced Customization

### Adding Custom Categories

**Via the app:** Settings → Categories → Add Custom

**Via code:** Edit `constants/categories.ts`:
```typescript
{
    id: 'my_category',
    label: 'My Category',
    icon: 'star',           // MaterialCommunityIcons name
    color: '#FF6B6B',
    subcategories: ['sub1', 'sub2'],
    isCustom: false,
    isIncome: false,        // true for income categories
}
```

### Theming

Edit `constants/theme.ts` to customize:
- **Brand colors** — `customColors.brand.primary`, `secondary`, `accent`
- **Category colors** — `customColors.category.*`
- **Semantic colors** — income (green), expense (red)
- **Spacing scale** — `xs` through `xxl`
- **Border radius** — `sm`, `md`, `lg`, `xl`, `full`

### Payment Methods & Apps

Edit `constants/categories.ts` to add payment methods:
```typescript
// Add a new payment method
PAYMENT_METHODS.push({ id: 'crypto', label: 'Crypto', icon: 'bitcoin' });

// Add a new payment app
PAYMENT_APPS.push({
    id: 'myapp',
    label: 'MyApp',
    icon: 'cellphone',
    color: '#4CAF50',
    urlScheme: 'myapp://',
});
```

### AI Prompt Customization

Edit `services/ai.ts` to modify:
- **Insight style** — Change the prompt in `generateInsights()` for different tone, length, or focus areas
- **Token limits** — Adjust `maxOutputTokens` for longer/shorter responses
- **Summary format** — Modify `generateSummary()` prompt for different summary styles

### Storage & Data Format

Data is stored as JSON files in the app's document directory:
```
spendwise-data/
├── 2025-01.json      # January transactions
├── 2025-02.json      # February transactions
├── preferences.json  # User settings
├── budgets.json      # Budget configurations
└── goals.json        # Savings goals
```

Each monthly file contains:
```json
{
    "month": "2025-01",
    "transactions": [...],
    "metadata": {
        "totalIncome": 50000,
        "totalExpense": 35000,
        "transactionCount": 42,
        "lastUpdated": "2025-01-31T23:59:59Z"
    }
}
```

---

## 📱 Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Expo SDK 55** | Framework & build system |
| **React Native** | Cross-platform UI |
| **Expo Router** | File-based navigation |
| **React Native Paper** | Material Design 3 components |
| **Zustand** | Lightweight state management |
| **expo-file-system** | Local data persistence |
| **react-native-gifted-charts** | Bar & pie charts |
| **react-native-reanimated** | Smooth animations |
| **expo-auth-session** | Google OAuth |
| **expo-sharing** | Native share sheet |
| **expo-camera** | QR code scanning |
| **expo-location** | GPS capture |

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ using React Native & Expo
</p>
]]>
