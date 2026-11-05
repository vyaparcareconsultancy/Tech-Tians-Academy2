import { test, expect } from '@playwright/test'

// These end-to-end tests run entirely in DEMO MODE (no Supabase env vars),
// so they never touch a database and never send network requests.

test.describe('demo mode flows', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: /Master STEM Curriculums/i })
    ).toBeVisible()
  })

  test('demo login redirects a student to their dashboard', async ({ page }) => {
    await page.goto('/login')
    await page
      .getByRole('button', { name: /rohan\.verma@techtians\.com/i })
      .click()
    await expect(page).toHaveURL(/\/student\/dashboard/)
  })

  test('demo login redirects an admin to the admin dashboard', async ({ page }) => {
    await page.goto('/login')
    await page
      .getByRole('button', { name: /admin@techtians\.com/i })
      .click()
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test('demo login redirects a teacher to the teacher dashboard', async ({ page }) => {
    await page.goto('/login')
    await page
      .getByRole('button', { name: /meera\.rao@techtians\.com/i })
      .click()
    await expect(page).toHaveURL(/\/teacher\/dashboard/)
  })

  test('student can open courses and certificates pages', async ({ page }) => {
    await page.goto('/login')
    await page
      .getByRole('button', { name: /rohan\.verma@techtians\.com/i })
      .click()
    await expect(page).toHaveURL(/\/student\/dashboard/)
    await page.goto('/student/courses')
    await expect(page).toHaveURL(/\/student\/courses/)
    await page.goto('/student/certificates')
    await expect(page).toHaveURL(/\/student\/certificates/)
  })

  test('verification of a bogus certificate shows the invalid state', async ({ page }) => {
    await page.goto('/verify/TTA-BOGUS')
    await expect(
      page.getByRole('heading', { name: 'Certificate not found' })
    ).toBeVisible()
  })
})
