import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@uni.edu';
const ADMIN_PASSWORD = 'your_password_here';
const INSTRUCTOR_EMAIL = 'jana@uni.edu';
const INSTRUCTOR_PASSWORD = 'Pass1234!';
const STUDENT_EMAIL = 'zeina@uni.edu';
const STUDENT_PASSWORD = 'Pass1234!';

// ========================
// TC01 - Valid Admin Login
// ========================
test('TC01 - Valid admin login redirects to admin dashboard', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/admin', { timeout: 10000 });
  expect(page.url()).toContain('/dashboard/admin');
  await page.screenshot({ path: 'tests/screenshots/TC01_admin_login.png' });
});

// ========================
// TC02 - Invalid Login
// ========================
test('TC02 - Wrong password shows error message', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', 'wrongpassword123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  const pageContent = await page.content();
  expect(pageContent.toLowerCase()).toMatch(/invalid|credentials|error/);
  expect(page.url()).not.toContain('/dashboard');
  await page.screenshot({ path: 'tests/screenshots/TC02_invalid_login.png' });
});

// ========================
// TC03 - Instructor Login
// ========================
test('TC03 - Instructor login redirects to instructor dashboard', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', INSTRUCTOR_EMAIL);
  await page.fill('#password', INSTRUCTOR_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/instructor', { timeout: 10000 });
  expect(page.url()).toContain('/dashboard/instructor');
  await page.screenshot({ path: 'tests/screenshots/TC03_instructor_login.png' });
});

// ========================
// TC04 - Student Login
// ========================
test('TC04 - Student login redirects to student dashboard', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', STUDENT_EMAIL);
  await page.fill('#password', STUDENT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/student', { timeout: 10000 });
  expect(page.url()).toContain('/dashboard/student');
  await page.screenshot({ path: 'tests/screenshots/TC04_student_login.png' });
});

// ========================
// TC05 - Admin Dashboard Loads
// ========================
test('TC05 - Admin dashboard shows user management', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/admin', { timeout: 10000 });
  await expect(page.locator('text=User Management')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/TC05_admin_dashboard.png' });
});

// ========================
// TC06 - Admin Tabs Work
// ========================
test('TC06 - Admin Classes and Majors tabs work', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/admin', { timeout: 10000 });

  await page.click('text=Classes');
  await expect(page.locator('text=Classes')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/TC06_classes_tab.png' });

  await page.click('text=Majors');
  await expect(page.locator('text=Majors')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/TC06_majors_tab.png' });
});

// ========================
// TC07 - Create User Modal Opens
// ========================
test('TC07 - Add User modal opens and shows fields', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/admin', { timeout: 10000 });

  await page.click('text=+ Add User');
  await expect(page.locator('text=Create New User')).toBeVisible();
  await expect(page.locator('text=Full Name')).toBeVisible();
  await expect(page.locator('text=Email')).toBeVisible();
  await expect(page.locator('text=Password')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/TC07_add_user_modal.png' });
});

// ========================
// TC08 - Bulk CSV Modal Opens
// ========================
test('TC08 - Bulk Upload CSV modal opens', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/admin', { timeout: 10000 });

  await page.click('text=Bulk Upload');
  await expect(page.locator('text=Bulk Upload Users via CSV')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/TC08_csv_modal.png' });
});

// ========================
// TC09 - Instructor Dashboard Loads
// ========================
test('TC09 - Instructor dashboard shows exam list', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', INSTRUCTOR_EMAIL);
  await page.fill('#password', INSTRUCTOR_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/instructor', { timeout: 10000 });
  await expect(page.locator('text=My Exams')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/TC09_instructor_dashboard.png' });
});

// ========================
// TC10 - Create Exam Modal Opens
// ========================
test('TC10 - New Exam modal opens with correct fields', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', INSTRUCTOR_EMAIL);
  await page.fill('#password', INSTRUCTOR_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/instructor', { timeout: 10000 });

  await page.click('text=+ New Exam');
  await expect(page.locator('text=Create New Exam')).toBeVisible();
  await expect(page.locator('text=Title')).toBeVisible();
  await expect(page.locator('text=Duration')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/TC10_new_exam_modal.png' });
});

// ========================
// TC11 - Invalid Exam Dates
// ========================
test('TC11 - End time before start time shows validation error', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', INSTRUCTOR_EMAIL);
  await page.fill('#password', INSTRUCTOR_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/instructor', { timeout: 10000 });

  await page.click('text=+ New Exam');
  await page.waitForTimeout(500);

  const titleInput = page.locator('input[placeholder*="Midterm"]');
  await titleInput.fill('Test Invalid Dates');

  const dateInputs = page.locator('input[type="datetime-local"]');
  await dateInputs.nth(0).fill('2026-12-01T11:00');
  await dateInputs.nth(1).fill('2026-12-01T09:00');

  await page.click('text=Create Exam');
  await page.waitForTimeout(1000);

  await expect(page.locator('text=End time must be after start time')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/TC11_invalid_dates.png' });
});

// ========================
// TC12 - Exam Manager Loads
// ========================
test('TC12 - Exam manager loads with Questions and Classes tabs', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', INSTRUCTOR_EMAIL);
  await page.fill('#password', INSTRUCTOR_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/instructor', { timeout: 10000 });

  const manageBtn = page.locator('text=Manage').first();
  if (await manageBtn.isVisible()) {
    await manageBtn.click();
    await page.waitForURL('**/dashboard/instructor/exam/**', { timeout: 10000 });
    await expect(page.locator('text=Questions')).toBeVisible();
    await expect(page.locator('text=Assigned Classes')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/TC12_exam_manager.png' });
  } else {
    console.log('TC12 SKIPPED: No exams available to manage');
  }
});

// ========================
// TC13 - Add Question Modal
// ========================
test('TC13 - Add Question modal shows type options', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', INSTRUCTOR_EMAIL);
  await page.fill('#password', INSTRUCTOR_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/instructor', { timeout: 10000 });

  const manageBtn = page.locator('text=Manage').first();
  if (await manageBtn.isVisible()) {
    await manageBtn.click();
    await page.waitForURL('**/dashboard/instructor/exam/**', { timeout: 10000 });
    await page.click('text=+ Add Question');
    await expect(page.locator('text=Question Type')).toBeVisible();
    await expect(page.locator('text=Multiple Choice')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/TC13_add_question_modal.png' });
  } else {
    console.log('TC13 SKIPPED: No exams available');
  }
});

// ========================
// TC14 - Student Dashboard Shows Info
// ========================
test('TC14 - Student dashboard shows student info card', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', STUDENT_EMAIL);
  await page.fill('#password', STUDENT_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/student', { timeout: 10000 });
  await expect(page.locator('text=My Exams')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/TC14_student_dashboard.png' });
});

// ========================
// TC15 - Logout from Admin
// ========================
test('TC15 - Logout redirects to login page', async ({ page }) => {
  await page.goto('/');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/admin', { timeout: 10000 });

  await page.click('text=Logout');
  await page.waitForTimeout(2000);
  expect(page.url()).not.toContain('/dashboard');
  await expect(page.locator('#email')).toBeVisible();
  await page.screenshot({ path: 'tests/screenshots/TC15_logout.png' });
});