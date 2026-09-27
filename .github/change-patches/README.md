# AttendEase Incremental Change Patches

This directory contains 100 sequential, individually applicable Git patches (`001.patch` through `100.patch`) generated from the 100 incremental improvement commits on top of `origin/main` (`12745c0`).

## Automated GitHub Actions Release

The workflow in [`.github/workflows/auto-commit.yml`](../workflows/auto-commit.yml) and selector script [`release_next_patch.py`](./release_next_patch.py) automatically release one dependency-eligible patch at a random **2–6 hour** interval (`7200`–`21600` seconds):

- [`release_next_patch.py`](./release_next_patch.py): Evaluates the dependency graph and `git apply --check`, randomly selects **one** eligible unreleased patch, applies it with `git apply --index`, appends its ID to [`released.txt`](./released.txt), and writes the next release timestamp (`NOW + 2..6h`) to [`.github/auto-commit-state`](../auto-commit-state).
- [`released.txt`](./released.txt): Tracks which patch IDs (`001`–`100`) have been released so each patch is applied exactly once and the workflow stops automatically after all 100 patches are complete.

## Manual Usage

Each patch is formatted as a standard Git mailbox patch (`git format-patch --binary`) and can also be applied manually to a clean checkout of `origin/main`:

```bash
# Apply the next patch with commit metadata and message:
git am --keep-cr .github/change-patches/001.patch

# Or apply the diff directly to the working tree and index:
git apply --index .github/change-patches/001.patch
```

## Patch Mapping (001 – 100)

| Patch # | Patch File | Source Commit | Commit Message |
| :--- | :--- | :--- | :--- |
| 001 | [`001.patch`](./001.patch) | `c97b5d9` | `docs(backend): add module docstring to database.py` |
| 002 | [`002.patch`](./002.patch) | `65c3422` | `refactor(qr): import shared now_utc helper from models` |
| 003 | [`003.patch`](./003.patch) | `3a2f618` | `docs(models): document now_utc helper function` |
| 004 | [`004.patch`](./004.patch) | `61fe35c` | `chore(models): add __repr__ to Student model` |
| 005 | [`005.patch`](./005.patch) | `8bab9a3` | `chore(models): add __repr__ to FacultyProfile model` |
| 006 | [`006.patch`](./006.patch) | `62033de` | `chore(models): add __repr__ to Subject model` |
| 007 | [`007.patch`](./007.patch) | `9a93d32` | `chore(models): add __repr__ to ClassSession model` |
| 008 | [`008.patch`](./008.patch) | `e08d49f` | `chore(models): add __repr__ to Attendance model` |
| 009 | [`009.patch`](./009.patch) | `37db694` | `chore(models): add __repr__ to TimetableSlot model` |
| 010 | [`010.patch`](./010.patch) | `1bb64e9` | `fix(db): ensure sqlite migration connection closes in finally block` |
| 011 | [`011.patch`](./011.patch) | `4843950` | `feat(api): add /api/health route alias on health check endpoint` |
| 012 | [`012.patch`](./012.patch) | `32b10d9` | `config(backend): read PORT and FLASK_DEBUG from environment variables` |
| 013 | [`013.patch`](./013.patch) | `16121bf` | `docs(auth): add module docstring to auth.py` |
| 014 | [`014.patch`](./014.patch) | `effb379` | `chore(auth): remove unused FaceProfile import` |
| 015 | [`015.patch`](./015.patch) | `19b255e` | `fix(auth): validate basic email format in register endpoint` |
| 016 | [`016.patch`](./016.patch) | `0e63aea` | `refactor(auth): extract _issue_user_token helper for JWT creation` |
| 017 | [`017.patch`](./017.patch) | `f45fc08` | `fix(auth): use silent=True in request.get_json calls` |
| 018 | [`018.patch`](./018.patch) | `8dcef40` | `feat(auth): include faculty department in /api/auth/me response` |
| 019 | [`019.patch`](./019.patch) | `5c4d036` | `docs(qr): add docstring to get_current_qr endpoint` |
| 020 | [`020.patch`](./020.patch) | `5fd99f6` | `fix(qr): restrict session QR generation endpoint to faculty role` |
| 021 | [`021.patch`](./021.patch) | `56bec7b` | `security(attendance): use secrets.compare_digest for QR token comparison` |
| 022 | [`022.patch`](./022.patch) | `8d52374` | `refactor(attendance): extract ALLOWED_QR_LIFETIMES constant` |
| 023 | [`023.patch`](./023.patch) | `23592e8` | `refactor(attendance): extract module-level DAYS_ORDER constant` |
| 024 | [`024.patch`](./024.patch) | `cd1c902` | `fix(attendance): sort timetable slots by weekday and start_time in student dashboard` |
| 025 | [`025.patch`](./025.patch) | `bef7de2` | `chore(attendance): remove unused FaceProfile import` |
| 026 | [`026.patch`](./026.patch) | `8d0fc43` | `fix(attendance): normalize subject code to uppercase on creation` |
| 027 | [`027.patch`](./027.patch) | `4c190b5` | `fix(attendance): make roll number lookup case-insensitive in manual mark` |
| 028 | [`028.patch`](./028.patch) | `950628c` | `fix(attendance): use silent=True in request.get_json calls` |
| 029 | [`029.patch`](./029.patch) | `5dbd6a6` | `feat(faculty): register faculty management routes on faculty_bp` |
| 030 | [`030.patch`](./030.patch) | `18dd4ff` | `fix(timetable): validate day_of_week in create_timetable_slot` |
| 031 | [`031.patch`](./031.patch) | `a27cf5f` | `fix(timetable): validate day_of_week in update_timetable_slot` |
| 032 | [`032.patch`](./032.patch) | `c051e40` | `fix(subjects): return 409 if deleting subject with existing class sessions` |
| 033 | [`033.patch`](./033.patch) | `635d239` | `fix(faculty): prevent deleting faculty account with existing class sessions` |
| 034 | [`034.patch`](./034.patch) | `937f530` | `feat(attendance): support configurable limit param in get_all_attendance_records` |
| 035 | [`035.patch`](./035.patch) | `bda4f51` | `docs(attendance): add docstring to mark_attendance endpoint` |
| 036 | [`036.patch`](./036.patch) | `e540677` | `docs(attendance): add docstring to manual_mark_attendance endpoint` |
| 037 | [`037.patch`](./037.patch) | `857f5ac` | `feat(dashboard): include qr_lifetime_seconds in student dashboard active sessions` |
| 038 | [`038.patch`](./038.patch) | `53efbcc` | `fix(attendance): standardize status casing to Present in get_session_records` |
| 039 | [`039.patch`](./039.patch) | `f18f6d2` | `fix(attendance): cap manual override reason to 255 characters` |
| 040 | [`040.patch`](./040.patch) | `c13610f` | `feat(profile): include zepiris_identity_id in student profile response` |
| 041 | [`041.patch`](./041.patch) | `c98869a` | `docs(face): add module docstring to face_routes.py` |
| 042 | [`042.patch`](./042.patch) | `581473f` | `fix(face): use silent=True when parsing JSON in register_face` |
| 043 | [`043.patch`](./043.patch) | `eef3338` | `docs(face): add docstrings to register_face and face_status endpoints` |
| 044 | [`044.patch`](./044.patch) | `875657d` | `fix(zepiris): raise clear ValueError on empty string in decode_image` |
| 045 | [`045.patch`](./045.patch) | `83fcab4` | `config(zepiris): allow overriding similarity threshold via ZEPIRIS_SIMILARITY_THRESHOLD` |
| 046 | [`046.patch`](./046.patch) | `3f43e36` | `config(zepiris): allow configuring inference device via ZEPIRIS_DEVICE` |
| 047 | [`047.patch`](./047.patch) | `2fc9635` | `refactor(zepiris): use standard logging module instead of print statements` |
| 048 | [`048.patch`](./048.patch) | `9eda5c0` | `fix(zepiris): validate matching embedding shapes in cosine_similarity` |
| 049 | [`049.patch`](./049.patch) | `6d50c8a` | `fix(zepiris): clamp cosine_similarity result to [-1.0, 1.0]` |
| 050 | [`050.patch`](./050.patch) | `c9fc665` | `refactor(zepiris): use context manager when opening PIL image in decode_image` |
| 051 | [`051.patch`](./051.patch) | `a8aadc8` | `test(backend): track ended_sess_id in created_session_ids for cleanup` |
| 052 | [`052.patch`](./052.patch) | `83211bb` | `chore(tests): remove unused secrets import in test_suite.py` |
| 053 | [`053.patch`](./053.patch) | `9cdaa55` | `chore(tests): remove unused TimetableSlot import in test_suite.py` |
| 054 | [`054.patch`](./054.patch) | `45e06b0` | `test(zepiris): add unit test for cosine_similarity edge cases` |
| 055 | [`055.patch`](./055.patch) | `3a95f79` | `test(auth): assert /api/auth/me response in Scenario 4` |
| 056 | [`056.patch`](./056.patch) | `f2e6b30` | `test(face): assert /api/student/face/status after face enrollment` |
| 057 | [`057.patch`](./057.patch) | `524a38b` | `build(backend): add explicit numpy and Werkzeug entries to requirements.txt` |
| 058 | [`058.patch`](./058.patch) | `9c37f5e` | `build(backend): remove unused qrcode package from requirements.txt` |
| 059 | [`059.patch`](./059.patch) | `9c50119` | `chore(frontend): remove unused Vite boilerplate App.css` |
| 060 | [`060.patch`](./060.patch) | `18798e0` | `chore(frontend): remove unused Vite starter assets` |
| 061 | [`061.patch`](./061.patch) | `42ce4de` | `build(frontend): remove unused react-router-dom dependency` |
| 062 | [`062.patch`](./062.patch) | `9a78e30` | `chore(frontend): set package name to attendease-frontend and version to 1.0.0` |
| 063 | [`063.patch`](./063.patch) | `98e8178` | `feat(frontend): add description and theme-color meta tags to index.html` |
| 064 | [`064.patch`](./064.patch) | `db561df` | `fix(api): strip trailing slashes from VITE_API_URL in config.js` |
| 065 | [`065.patch`](./065.patch) | `28f1ec4` | `docs(frontend): add JSDoc comments to api/config.js` |
| 066 | [`066.patch`](./066.patch) | `28b9d67` | `feat(camera): add getActiveCount helper to cameraManager` |
| 067 | [`067.patch`](./067.patch) | `080cf32` | `fix(camera): stop active camera streams on window pagehide event` |
| 068 | [`068.patch`](./068.patch) | `21b6037` | `fix(ui): automatically close mobile navigation drawer on route change` |
| 069 | [`069.patch`](./069.patch) | `191a942` | `refactor(context): use getAuthHeaders in registerFace and markAttendance` |
| 070 | [`070.patch`](./070.patch) | `e4a965f` | `fix(context): reset subjects and studentStats state on logout` |
| 071 | [`071.patch`](./071.patch) | `63e17a8` | `refactor(context): remove redundant Content-Type spreads with getAuthHeaders` |
| 072 | [`072.patch`](./072.patch) | `4b4cd0d` | `perf(hooks): update CSS variables directly in useMousePosition without state re-renders` |
| 073 | [`073.patch`](./073.patch) | `a19aa93` | `perf(hooks): use passive mousemove listener in useMousePosition` |
| 074 | [`074.patch`](./074.patch) | `1848e80` | `fix(ui): default Button type prop to button` |
| 075 | [`075.patch`](./075.patch) | `352e9ed` | `a11y(ui): link label and input elements with useId in Input component` |
| 076 | [`076.patch`](./076.patch) | `5fd4dbf` | `fix(ui): guard max<=0 and add progressbar ARIA attributes in ProgressBar` |
| 077 | [`077.patch`](./077.patch) | `6497daf` | `a11y(navbar): add aria-label and type=button to mobile menu toggle` |
| 078 | [`078.patch`](./078.patch) | `ed008f7` | `fix(navbar): add page title mapping for /student/register-face route` |
| 079 | [`079.patch`](./079.patch) | `7613da6` | `a11y(sidebar): add aria-current=page to active navigation buttons` |
| 080 | [`080.patch`](./080.patch) | `39d2af7` | `feat(attendance): support optional timestamp prop in AttendanceSuccess` |
| 081 | [`081.patch`](./081.patch) | `1f99dde` | `feat(monitor): display confidence score on live QR_FACE check-in badges` |
| 082 | [`082.patch`](./082.patch) | `25c1941` | `fix(scanner): guard QRScanner transition timeouts with isMounted check` |
| 083 | [`083.patch`](./083.patch) | `aed67cf` | `ui(login): clarify identifier input label and placeholder for all roles` |
| 084 | [`084.patch`](./084.patch) | `6601367` | `feat(login): add link to registration page on Login screen` |
| 085 | [`085.patch`](./085.patch) | `257cc04` | `fix(register): trim name and normalize email before submitting` |
| 086 | [`086.patch`](./086.patch) | `0ed9f3e` | `ui(timetable): default selectedDay to current weekday on TimetablePage` |
| 087 | [`087.patch`](./087.patch) | `593a7b6` | `ui(student): default timetable day tab to current weekday on Dashboard` |
| 088 | [`088.patch`](./088.patch) | `8d84a6a` | `fix(faculty): clear toast timeouts on repeat trigger and unmount` |
| 089 | [`089.patch`](./089.patch) | `5d3f664` | `fix(faculty): track and clear toast timers in TimetablePage and AttendancePage` |
| 090 | [`090.patch`](./090.patch) | `9f7dcb8` | `a11y(modals): allow closing faculty management modals with Escape key` |
| 091 | [`091.patch`](./091.patch) | `a873b7e` | `feat(history): show verification method column in student AttendanceHistory` |
| 092 | [`092.patch`](./092.patch) | `f6584fb` | `feat(profile): display Zepiris Identity ID on student ProfilePage` |
| 093 | [`093.patch`](./093.patch) | `8ea8dbb` | `fix(camera): verify video dimensions before canvas capture in RegisterFacePage` |
| 094 | [`094.patch`](./094.patch) | `10b2546` | `fix(camera): verify video dimensions before canvas capture in ScanAttendancePage` |
| 095 | [`095.patch`](./095.patch) | `dad6bbc` | `docs(readme): update backend test command to python test_suite.py` |
| 096 | [`096.patch`](./096.patch) | `a090044` | `docs(readme): update QR token lifetime description in API reference` |
| 097 | [`097.patch`](./097.patch) | `7aa9196` | `docs(readme): document face biometrics and admin endpoints in API reference` |
| 098 | [`098.patch`](./098.patch) | `2fc0764` | `docs(readme): remove obsolete control_panel.py section` |
| 099 | [`099.patch`](./099.patch) | `be39711` | `docs(config): add .env.example template for backend and frontend settings` |
| 100 | [`100.patch`](./100.patch) | `50f99ec` | `chore(git): ignore test coverage artifacts in .gitignore` |
