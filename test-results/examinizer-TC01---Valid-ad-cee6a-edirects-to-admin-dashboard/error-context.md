# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: examinizer.spec.ts >> TC01 - Valid admin login redirects to admin dashboard
- Location: tests/examinizer.spec.ts:13:5

# Error details

```
Error: page.goto: Target page, context or browser has been closed
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const ADMIN_EMAIL = 'admin@uni.edu';
  4   | const ADMIN_PASSWORD = 'your_password_here';
  5   | const INSTRUCTOR_EMAIL = 'jana@uni.edu';
  6   | const INSTRUCTOR_PASSWORD = 'Pass1234!';
  7   | const STUDENT_EMAIL = 'zeina@uni.edu';
  8   | const STUDENT_PASSWORD = 'Pass1234!';
  9   | 
  10  | // ========================
  11  | // TC01 - Valid Admin Login
  12  | // ========================
  13  | test('TC01 - Valid admin login redirects to admin dashboard', async ({ page }) => {
> 14  |   await page.goto('/');
      |              ^ Error: page.goto: Target page, context or browser has been closed
  15  |   await page.fill('#email', ADMIN_EMAIL);
  16  |   await page.fill('#password', ADMIN_PASSWORD);
  17  |   await page.click('button[type="submit"]');
  18  |   await page.waitForURL('**/dashboard/admin', { timeout: 10000 });
  19  |   expect(page.url()).toContain('/dashboard/admin');
  20  |   await page.screenshot({ path: 'tests/screenshots/TC01_admin_login.png' });
  21  | });
  22  | 
  23  | // ========================
  24  | // TC02 - Invalid Login
  25  | // ========================
  26  | test('TC02 - Wrong password shows error message', async ({ page }) => {
  27  |   await page.goto('/');
  28  |   await page.fill('#email', ADMIN_EMAIL);
  29  |   await page.fill('#password', 'wrongpassword123');
  30  |   await page.click('button[type="submit"]');
  31  |   await page.waitForTimeout(2000);
  32  |   const pageContent = await page.content();
  33  |   expect(pageContent.toLowerCase()).toMatch(/invalid|credentials|error/);
  34  |   expect(page.url()).not.toContain('/dashboard');
  35  |   await page.screenshot({ path: 'tests/screenshots/TC02_invalid_login.png' });
  36  | });
  37  | 
  38  | // ========================
  39  | // TC03 - Instructor Login
  40  | // ========================
  41  | test('TC03 - Instructor login redirects to instructor dashboard', async ({ page }) => {
  42  |   await page.goto('/');
  43  |   await page.fill('#email', INSTRUCTOR_EMAIL);
  44  |   await page.fill('#password', INSTRUCTOR_PASSWORD);
  45  |   await page.click('button[type="submit"]');
  46  |   await page.waitForURL('**/dashboard/instructor', { timeout: 10000 });
  47  |   expect(page.url()).toContain('/dashboard/instructor');
  48  |   await page.screenshot({ path: 'tests/screenshots/TC03_instructor_login.png' });
  49  | });
  50  | 
  51  | // ========================
  52  | // TC04 - Student Login
  53  | // ========================
  54  | test('TC04 - Student login redirects to student dashboard', async ({ page }) => {
  55  |   await page.goto('/');
  56  |   await page.fill('#email', STUDENT_EMAIL);
  57  |   await page.fill('#password', STUDENT_PASSWORD);
  58  |   await page.click('button[type="submit"]');
  59  |   await page.waitForURL('**/dashboard/student', { timeout: 10000 });
  60  |   expect(page.url()).toContain('/dashboard/student');
  61  |   await page.screenshot({ path: 'tests/screenshots/TC04_student_login.png' });
  62  | });
  63  | 
  64  | // ========================
  65  | // TC05 - Admin Dashboard Loads
  66  | // ========================
  67  | test('TC05 - Admin dashboard shows user management', async ({ page }) => {
  68  |   await page.goto('/');
  69  |   await page.fill('#email', ADMIN_EMAIL);
  70  |   await page.fill('#password', ADMIN_PASSWORD);
  71  |   await page.click('button[type="submit"]');
  72  |   await page.waitForURL('**/dashboard/admin', { timeout: 10000 });
  73  |   await expect(page.locator('text=User Management')).toBeVisible();
  74  |   await page.screenshot({ path: 'tests/screenshots/TC05_admin_dashboard.png' });
  75  | });
  76  | 
  77  | // ========================
  78  | // TC06 - Admin Tabs Work
  79  | // ========================
  80  | test('TC06 - Admin Classes and Majors tabs work', async ({ page }) => {
  81  |   await page.goto('/');
  82  |   await page.fill('#email', ADMIN_EMAIL);
  83  |   await page.fill('#password', ADMIN_PASSWORD);
  84  |   await page.click('button[type="submit"]');
  85  |   await page.waitForURL('**/dashboard/admin', { timeout: 10000 });
  86  | 
  87  |   await page.click('text=Classes');
  88  |   await expect(page.locator('text=Classes')).toBeVisible();
  89  |   await page.screenshot({ path: 'tests/screenshots/TC06_classes_tab.png' });
  90  | 
  91  |   await page.click('text=Majors');
  92  |   await expect(page.locator('text=Majors')).toBeVisible();
  93  |   await page.screenshot({ path: 'tests/screenshots/TC06_majors_tab.png' });
  94  | });
  95  | 
  96  | // ========================
  97  | // TC07 - Create User Modal Opens
  98  | // ========================
  99  | test('TC07 - Add User modal opens and shows fields', async ({ page }) => {
  100 |   await page.goto('/');
  101 |   await page.fill('#email', ADMIN_EMAIL);
  102 |   await page.fill('#password', ADMIN_PASSWORD);
  103 |   await page.click('button[type="submit"]');
  104 |   await page.waitForURL('**/dashboard/admin', { timeout: 10000 });
  105 | 
  106 |   await page.click('text=+ Add User');
  107 |   await expect(page.locator('text=Create New User')).toBeVisible();
  108 |   await expect(page.locator('text=Full Name')).toBeVisible();
  109 |   await expect(page.locator('text=Email')).toBeVisible();
  110 |   await expect(page.locator('text=Password')).toBeVisible();
  111 |   await page.screenshot({ path: 'tests/screenshots/TC07_add_user_modal.png' });
  112 | });
  113 | 
  114 | // ========================
```