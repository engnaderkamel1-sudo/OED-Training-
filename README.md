# 🏢 Orascom Equipment Department — Training Management System (OED-TTMS)

> **Official Enterprise Training Tracking & Management System**  
> Designed and customized for **Orascom Construction — Equipment Department (OED)**.

---

## 🌟 Executive Overview
**OED-TTMS** is a modern, high-performance web platform and Progressive Web App (PWA) built to streamline training schedules, automate session management, enforce Role-Based Access Control (RBAC), and manage workforce technical training compliance across company workshops and project sites.

---

## 🏗️ Technical Architecture & Stack

* **Frontend Framework:** React 19 with TypeScript
* **Build Tool & Bundler:** Vite 6 (Fast ESM HMR & Optimized Production Chunking)
* **Styling & Design System:** Tailwind CSS (Executive Orascom Palette: Navy `#002D62`, Corporate Gold `#FFC000`, High-Contrast Dark & Light Mode)
* **Backend & Database:** Google Cloud Firebase Serverless Architecture
  * **Firestore NoSQL:** Real-time WebSocket synchronization with IndexedDB multi-tab local caching
  * **Firebase Authentication:** Multi-tenant credential verification & encrypted password hashing
  * **Push Notifications:** Firebase Cloud Messaging (FCM) & Web Push API
* **Deployment & Edge CDN:** Vercel Edge Network with PWA Service Worker caching

---

## 🛡️ Role-Based Access Control (RBAC)

The system features 4 specialized role access levels:
1. **Executive ⭐:** Read-only access to the Admin Dashboard, KPI analytics, training registers, and sessions without mutation capabilities.
2. **Admin 🛡️:** Full administrative authority (Session scheduling, user provisioning, course management, Excel synchronization).
3. **Site Supervisor 👷:** Workshop/Site dashboard to track team training compliance and nominate technicians and engineers for available courses.
4. **Trainee 🎓:** Personalized dashboard for eligible courses, self-enrollment, daily QR-code attendance verification, and feedback evaluations.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* **Node.js:** v18.0.0 or higher
* **npm:** v9.0.0 or higher

### Installation & Run

1. **Clone or extract the repository:**
   ```bash
   cd oed-training-management-system
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   *The application will launch on `http://localhost:3000`.*

4. **Build for Production:**
   ```bash
   npm run build
   ```
   *The production-ready assets will be generated in the `dist/` directory.*

---

## 📁 Key Project Directory Structure

```
├── api/                    # Serverless API routes (e.g. push notification dispatch)
├── public/                 # Static assets, PWA manifest, vendor scripts & icons
├── src/
│   ├── components/         # Modular UI components & dashboard views
│   ├── context.tsx         # Unified Global Application State & Firestore Listeners
│   ├── data.ts             # Master catalog data & initial verified records
│   ├── firebase.ts         # Firebase SDK configuration & multi-app auth providers
│   ├── types.ts            # Complete TypeScript domain models & interfaces
│   └── utils/              # Print PDF generation, security validators & serial algorithms
├── firestore.rules         # Cloud Firestore security rules & RBAC enforcement
├── IT_Discussion_Guide.md  # Detailed technical architectural guide for IT discussions
├── package.json            # Project dependencies and script declarations
├── vercel.json             # Edge deployment routing and PWA headers
└── vite.config.ts          # Vite build configuration & PWA plugin settings
```

---

## 📄 Technical Reference
For a comprehensive architectural breakdown and IT discussion points, please refer to:
👉 **[`IT_Discussion_Guide.md`](./IT_Discussion_Guide.md)**

---
*© 2026 Orascom Construction — Equipment Department (OED). All rights reserved.*
