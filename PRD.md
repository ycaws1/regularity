
# PRD: "Regularity" (MVP)

**Version:** 1.0
**Status:** Draft
**Platform:** Webapp

## 1. Executive Summary

**"Regularity"** is a straightforward health utility app designed to help users track their bowel movements. The primary goal is to assist users in monitoring their digestive health by visualizing their history on a calendar and receiving alerts when they are experiencing constipation (exceeding a user-defined threshold of days without a movement).

### Key Objectives

* Provide a private, secure way to log health data.
* Visualize frequency to identify patterns.
* Proactively alert users to potential health issues via custom notifications.

---

## 2. User Stories

These stories define the scope of the Minimum Viable Product (MVP).

* **As a user**, I want to create an account and log in so that my health data is synced and retrievable across devices.
* **As a user**, I want to see a calendar view so I can quickly identify which days I recorded a bowel movement.
* **As a user**, I want to tap a specific date to toggle whether I pooped that day.
* **As a user**, I want to set a "Constipation Threshold" (e.g., 3 days) so the app warns me if I haven't gone in that timeframe.

---

## 3. Functional Requirements

### 3.1. Authentication (Supabase Auth)

* **FR-01:** Users must sign up using email/password.
* **FR-02:** Users must be able to log in and log out.
* **FR-03:** Passwords must be hashed and salt-secure (Handled natively by Supabase GoTrue).
* **FR-04:** Session tokens must persist so the user does not need to log in every time they open the app.

### 3.2. The Calendar & Logging

* **FR-05:** The home screen shall display a monthly calendar view.
* **FR-06:** Dates with a recorded log shall have a visual indicator (e.g., a green dot or checkmark).
* **FR-07:** Tapping a date opens a modal or action sheet to "Add Log" or "Remove Log" for that specific date.
* **FR-08:** The app must fetch only the logged-in user's data from the database.

### 3.3. Notification Logic

* **FR-09:** Users can input a variable  (integer) representing "Max days without logging."
* **FR-10:** The app must calculate the difference between the current date () and the date of the last log ().
* Logic: If , trigger a local notification.


* **FR-11:** Notifications should be scheduled locally on the device (does not require a backend push server for MVP).

---

## 4. Technical Architecture & Schema

### 4.1. Tech Stack Recommendation

* **Frontend:** NextJS
* **Backend/Database:** Supabase (PostgreSQL).
* **Auth:** Supabase Auth.

### 4.2. Database Schema (PostgreSQL)

We will need two main tables in Supabase.

**Table 1: `profiles**` (Extends the default auth table)
| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key, References `auth.users.id` |
| `alert_threshold` | int | Default: 3. The  value for alarms. |
| `created_at` | timestamp | Account creation date. |

**Table 2: `logs**`
| Column Name | Type | Description |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `user_id` | uuid | Foreign Key to `profiles.id` |
| `log_date` | date | The date the event occurred. |
| `created_at` | timestamp | System timestamp. |

### 4.3. Security Policies (RLS)

Supabase **Row Level Security (RLS)** is critical here to ensure Requirement #3 is met.

* **Policy:** `SELECT`, `INSERT`, `UPDATE`, `DELETE` operations on the `logs` table are only permitted where `auth.uid() = user_id`.
* *Translation:* A user can absolutely never read or write another user's poop logs.

---

## 5. UI/UX Guidelines

* **Tone:** Discrete, clinical but friendly. Avoid "gross" imagery.
* **Color Palette:** Soft warm tones (beiges, soft browns) or clinical cleanliness (teals, whites).
* **Interaction:**
* **Calendar:** Large, tappable day cells.
* **Empty State:** If a user has no logs, show a helpful prompt: "Tap today to log your first entry."



---

## 6. Future Roadmap (Post-MVP)

* **Bristol Stool Scale:** Allow users to select the *type* of poop (Type 1–7) rather than just a binary "Yes/No."
* **Stats Dashboard:** Graphs showing weekly consistency.
* **Data Export:** Export a PDF summary to share with a gastroenterologist.

---
