# OED Technical Training Management System (OED-TTMS)
## Enterprise Project Overview, Architecture & Source Specification

### 1. Executive Summary
The OED Technical Training Management System (OED-TTMS) is an enterprise-grade web application built using React, TypeScript, Tailwind CSS, and Firebase Cloud Infrastructure. It serves as a unified digital ecosystem for managing technical training, competency records, safety compliance, attendance tracking, and field certification across engineering and technical departments (Heavy Machinery, Asphalt Plant, Central Workshops, and Engineering Projects).

---

### 2. Corporate Visual Identity & Branding
- **Primary Color:** Orascom Deep Navy Blue (`#002D62`) - represents authority, structure, and institutional stability.
- **Accent Color:** Industrial Construction Gold/Yellow (`#FFC000`) - represents engineering energy, active status, and high-visibility alerts.
- **Surface & Backgrounds:** Slate/Zinc crisp surfaces (`#F8F9FA`, `#FFFFFF`) with geometric card layouts, data tables, and live BI charting.
- **Target Audience Roles:**
  - Engineers (مهندسين)
  - Technicians (فنيين)
  - Operators & Site Personnel (سائقين وفنيي تشغيل)

---

### 3. Core Enterprise Features & Capabilities

#### A. Institutional Knowledge Governance & Zero Data Loss
- **Historical Competency Vault:** Digital lifetime training records for every employee from onboarding to leadership transition.
- **Seamless Handover (Business Continuity):** When department leadership or training managers transition, all records, historical metrics, attendance archives, and performance metrics are instantly accessible and verifiable with zero data fragmentation.

#### B. Multi-Tiered Security & Role-Based Access Control (RBAC)
- **Granular Roles:** Admin / General Management, Site Supervisor, Department Manager, and Trainee.
- **End-to-End Encryption:** TLS/SSL in-transit encryption and AES-256 at-rest database protection.
- **Session Auto-Lock:** Automatic timeout locking after 3 minutes of background inactivity to prevent unauthorized access on mobile/desktop devices.
- **Security Audit Trails:** Dedicated live login logging capturing User ID, HR Code, Role, and timestamp.

#### C. Targeted Communication & Push Notifications
- **Smart Audience Filtering:** When announcing upcoming training sessions, push notifications and in-app announcements are strictly filtered to the intended target audience:
  - *Engineers Only:* Received only by engineering staff.
  - *Technicians Only:* Received only by technical & workshop crew.
  - *Mixed / Global:* Broadcast across all company personnel.

#### D. Live Quota & System Usage Intelligence (BI Dashboard)
- **Live Firestore Monitoring:** Tracks daily/monthly reads, writes, and real-time storage percentages.
- **Real-time Online Presence:** Live pulse indicator showing actively online registered users with names, HR codes, and roles.

#### E. Central Digital Course Library & Material Hub
- **Standardized Catalog:** Interactive catalog displaying course name, duration in days, covered topics, and direct links to authorized training materials and documentation.

#### F. Data-Driven Decision Making
- **Skill-Gap Analysis:** Instant identification of departments with deficient training hours.
- **Employee Course Requests:** Frontline technicians and site engineers can submit requests for technical subjects directly to training administrators.

---

### 4. Key Data Models & TypeScript Specifications

```typescript
export type Role = "trainee" | "manager" | "admin" | "supervisor" | null;

export interface User {
  id: string;
  username?: string;
  hrCode: string;
  name: string;
  department: string;
  role: Role;
  jobRole?: string; // e.g. "Engineer", "Technician"
  phone: string;
  email?: string;
  status: "pending" | "approved" | "rejected" | "deleted";
  fcmToken?: string;
  createdAt?: string;
}

export interface UpcomingSession {
  id: string;
  courseId?: string;
  courseTitle: string;
  startDate: string;
  endDate: string;
  sessionNumber: string;
  startTime: string;
  location: string;
  targetParticipants: "engineers" | "technicians" | "mixed";
  registeredUsers?: string[];
  feedbackLink?: string;
  feedbackEnabled?: boolean;
}

export interface SystemAnnouncement {
  id: string;
  sessionId?: string;
  title?: string;
  courseName?: string;
  message: string;
  date: string;
  author: string;
  isGlobal: boolean;
  targetAudience?: string; // 'engineers' | 'technicians' | 'mixed'
}
```

---

### 5. Return on Investment (ROI) & Strategic Impact
1. **Zero External Software Licensing Cost:** 100% in-house built, eliminating recurring enterprise software subscription fees.
2. **80% Administrative Overhead Reduction:** Automated report generation (PDF & Excel), live query filtering, and automated reminder delivery.
3. **Asset Protection:** Precision training for heavy machinery operators and technicians prevents equipment breakdowns and maximizes machine lifespans.
