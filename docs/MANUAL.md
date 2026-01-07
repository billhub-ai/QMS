
# CMH Quetta Queue Management System (QMS) - Operations Manual

## 1. Installation & Setup (Server)

**Prerequisites:**
- A Windows 10/11 PC to act as the Server.
- [Node.js](https://nodejs.org/) installed (LTS version recommended).
- Internet connection (One-time only for installation).

**Step-by-Step Installation:**

1.  **Extract Files:** Unzip the project folder to a location (e.g., `C:\QMS`).
2.  **Install Dependencies:**
    - Open "Command Prompt" or "PowerShell".
    - Navigate to the folder: `cd C:\QMS`
    - Run command: `npm install`
    - *(This downloads React, Database tools, and UI libraries)*
3.  **Build the Application:**
    - Run command: `npm run build`
    - *(This creates a `dist` folder with the optimized offline-ready application)*
4.  **Start the Server:**
    - Run command: `npm start`
    - Windows Firewall popup may appear. Check **Allow access** for Private Networks.

**The system is now running.**
- **Local URL:** `http://localhost:3001`
- **Network URL:** Find your server IP (Run `ipconfig` in cmd), e.g., `http://192.168.1.10:3001`

### 1.1 Updating the System

If you receive a new version of the software, follow these steps to update while keeping your data safe:

1.  **Stop the Server:** Close the Command Prompt window running the server (or press `Ctrl + C`).
2.  **Backup Data:** Copy the `database.json` file and the `voice_assets` folder to a safe location (e.g., Desktop). This contains all your counters, tokens, and settings.
3.  **Replace Files:** Delete the old project files (except your backup) and extract the **new version** into the folder.
4.  **Restore Data:** Paste your backed-up `database.json` and `voice_assets` folder back into the project folder, overwriting the empty defaults.
5.  **Re-install & Build:**
    - Open Command Prompt in the folder.
    - Run: `npm install`
    - Run: `npm run build`
6.  **Start:** Run `npm start` to launch the updated system.

---

## 2. Zero-Touch Dual Monitor Kiosk Setup

To make the system launch automatically in full screen on both monitors (Main Counter + Room Display) without needing a keyboard or mouse click:

**Step A: Configure Chrome for Autoplay**
Chrome blocks audio by default until a user clicks. To fix this:
1.  Right-click your Desktop > New > Shortcut.
2.  Browse to select `chrome.exe`.
3.  Name it "QMS Main".
4.  Right-click the new shortcut > Properties.
5.  In the **Target** field, add these flags at the end (after the quotes):
    `--autoplay-policy=no-user-gesture-required --check-for-update-interval=31536000`

**Step B: Create Startup Shortcuts**
Create two shortcuts in the Windows Startup folder (`Win + R` > `shell:startup`).

**Shortcut 1: Main Counter (Primary Monitor)**
Target:
`"C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window --kiosk --user-data-dir="C:\kiosk\profile1" --autoplay-policy=no-user-gesture-required --window-position=0,0 http://localhost:3001`

**Shortcut 2: Extended Screen (Secondary Monitor)**
1.  First, find the ID of the counter (e.g., `c_xray_1`) from the Admin Dashboard > Settings > Manual Overrides > Seed Data, or check the URL when you open a counter manually.
2.  Target:
`"C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window --kiosk --user-data-dir="C:\kiosk\profile2" --autoplay-policy=no-user-gesture-required --window-position=1920,0 http://localhost:3001/?view=door-display&counterId=YOUR_COUNTER_ID&autostart=true`

*Note: Replace `1920` with the width of your primary monitor. Replace `YOUR_COUNTER_ID` with the actual ID.*

---

## 3. Client Configuration (Kiosks & Displays)

**Connecting a Device:**
1.  Connect the device (TV, Tablet, PC) to the **same Wi-Fi/LAN** as the server.
2.  Open Chrome/Edge.
3.  Type the Server URL: `http://192.168.1.XX:3001` (Replace XX with server IP).
4.  **Important:** On the first screen "Identify This Station", select the role.

**Roles:**
- **Admin & Server:** Main control panel. Use this on the Server PC.
- **Patient Kiosk:** Touch screen for patients to get tickets.
- **Staff Counter:** For Doctors/Assistants to call patients.
- **Waiting Hall:** Large TV display for public viewing.
- **Room Screen:** Small display/tablet placed outside a specific door.

**Network Setup (First Time Only):**
1.  After selecting a role, you will be asked for "Network Setup".
2.  Type the Server IP (`192.168.1.XX`).
3.  Click "Connect".
4.  If the connection is successful, the "Network Sync Active" icon will turn Green in the menu.

---

## 4. User Manual

### Admin Dashboard
- **Access:** Select 'Admin' role.
- **Functions:**
  - **Dashboard:** View live stats, waiting counts, and AI insights.
  - **Settings:** Change Clinic Name, Language (Urdu/English), and Printer Layout.
  - **Reports:** View daily/weekly logs.
  - **Resets:** Use "Daily Reset" every morning (or let the auto-reset handle it at 00:00).

### Staff Counter (Doctors)
- **Call Patient:** Click "Call Next Patient" to fetch the highest priority person.
- **Status:**
  - **Hold:** Patient is temporarily set aside (e.g., sent for lab). They stay in the system.
  - **Complete:** Patient is finished.
  - **No Show:** Patient didn't appear.
  - **Recall:** Call a patient again (useful for 'Hold' patients returning).
- **Transfer:** Send a patient to another department (e.g., from General to Pharmacy).

### Patient Kiosk
- Touch the department button to print a ticket.
- **Hidden Menu:** Tap and **Hold** the top header area for 2 seconds to unlock "Edit Mode" to change layout/colors.

### TV Display
- Shows "Now Serving" large ticket numbers.
- Shows "Clinic Pulse" (waiting lists for all departments).
- **Audio:** Click anywhere on the screen once after loading to enable audio announcements.

---

## 5. Troubleshooting

**"Station Offline" / Red Wifi Icon:**
- Check if the Server PC is on and `npm start` is running.
- Check if the Client device is connected to the same Wi-Fi.
- Check Windows Firewall on Server (Turn off temporarily to test).

**Audio not playing:**
- Browsers block auto-play. **Click the screen once** after it loads.
- Go to Admin > Settings and ensure "Audio Engine" is set to "Standard TTS" if you haven't uploaded MP3 files.

**Printing not working silently:**
- Configure the Kiosk browser shortcut with target: `chrome.exe --kiosk-printing`.

---

## 6. Moving to Production (Deployment)

If you are moving the system from a development PC to a dedicated Server PC, follow these exact steps:

**1. Create a Folder**
Create a folder (e.g., `C:\QMS_Prod`) on the server.

**2. Copy Required Files**
Copy only the following files/folders from your development folder to the new folder:
*   📁 `dist/` (This contains the entire built application)
*   📁 `voice_assets/` (If you have custom audio files)
*   📄 `server.js`
*   📄 `package.json`
*   📄 `database.json` (Optional: Only if you want to keep existing data)

**3. Install Server Dependencies**
Open Command Prompt in the new folder (`C:\QMS_Prod`) and run:
```bash
npm install --omit=dev
```
*This installs the lightweight server dependencies needed to run `npm start`.*

**4. Run**
Run `npm start`. The app will be available at `http://localhost:3001` (or your Server IP).
