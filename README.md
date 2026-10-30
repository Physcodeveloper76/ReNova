# ReNova - Direct E-Waste Recycling Platform

ReNova is a sustainable e-waste recycling platform that connects sellers of electronic scrap and discarded hardware directly with verified buyers and recyclers. It enables sellers to easily photograph and list e-waste with geolocation tagging, while buyers can browse available materials on an interactive map.

---

## 🚀 Features

### For Sellers:
- **Instant Photo Listing**: Capture or upload photos of your electronic scrap with automatic details.
- **Geolocation Tagging**: Tag pickup locations with GPS coordinates or custom address lookup.
- **Seller Dashboard**: Manage your active listings, track status, and view eco-contributions.
- **Direct Role Selection**: Seamless access for testing or production with instant role selection.

### For Buyers & Recyclers:
- **Interactive Map Marketplace**: Browse e-waste listings across your region using Leaflet maps.
- **Direct Contact & Verification**: View detailed components, asking prices, photos, and contact sellers directly for pickups.
- **Comprehensive Listings**: Filter and inspect hardware items, components, and recyclable materials.

---

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (React 19)
- **Styling**: Tailwind CSS & Vanilla CSS
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Maps**: [React Leaflet](https://react-leaflet.js.org/)
- **Backend**: Flask API (`ScanNova/backend/app.py`) on port 5000 & Next.js API routes
- **Database / Auth**: Supabase / Local storage fallback

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.8+)
- npm or pnpm

### Quick Start (Run Both Frontend & Backend Simultaneously)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Physcodeveloper76/ReNova.git
   cd ReNova
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Install backend dependencies**:
   ```bash
   pip install -r ScanNova/requirements.txt
   ```

4. **Environment Setup**:
   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

5. **Run Everything with One Command**:
   ```bash
   python run.py
   ```
   This will automatically start:
   - **ScanNova Backend**: `http://localhost:5000`
   - **ReNova Next.js Frontend**: `http://localhost:3000`

---

## 📄 License

This project is licensed under the MIT License.

---
*Built for a cleaner and greener planet.*
