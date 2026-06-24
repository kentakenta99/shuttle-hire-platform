import { test, expect } from '@playwright/test'

const DRIVER_EMAIL    = process.env.E2E_DRIVER_EMAIL    ?? ''
const DRIVER_PASSWORD = process.env.E2E_DRIVER_PASSWORD ?? ''

// ── 未ログイン保護（認証情報不要）──────────────────────────────
test.describe('ドライバー — 未ログイン保護', () => {
  test('T01 未ログインで /driver → /driver/login へリダイレクト', async ({ page }) => {
    await page.goto('/driver')
    await expect(page).toHaveURL(/\/driver\/login/)
  })

  test('T02 ログイン失敗 — 誤パスワード → エラーメッセージ', async ({ page }) => {
    await page.goto('/driver/login')
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword123')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(
      page.locator('text=メールアドレスまたはパスワードが正しくありません。')
    ).toBeVisible({ timeout: 10000 })
  })
})

// ── ログイン後（E2E_DRIVER_EMAIL / E2E_DRIVER_PASSWORD が必要）──
test.describe('ドライバー — ログイン後', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!DRIVER_EMAIL || !DRIVER_PASSWORD, 'E2E_DRIVER_EMAIL / E2E_DRIVER_PASSWORD が未設定')
    await page.goto('/driver/login')
    await page.fill('input[type="email"]', DRIVER_EMAIL)
    await page.fill('input[type="password"]', DRIVER_PASSWORD)
    await page.getByRole('button', { name: 'ログイン' }).click()
    await page.waitForURL('**/driver', { timeout: 15000 })
  })

  test('T03 リロードしてもセッションが維持される', async ({ page }) => {
    await page.reload()
    await expect(page).toHaveURL(/\/driver/)
    await expect(page.locator('input[type="email"]')).not.toBeVisible()
  })

  test('T04 本日の担当便が表示される', async ({ page }) => {
    await expect(page.getByText('本日の担当便')).toBeVisible()
  })
})
