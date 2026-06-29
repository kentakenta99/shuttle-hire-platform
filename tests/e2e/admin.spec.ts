import { test, expect } from '@playwright/test'

const ADMIN_EMAIL    = process.env.E2E_ADMIN_EMAIL    ?? ''
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? ''

// ── 未ログイン保護（認証情報不要）──────────────────────────────
test.describe('TMK管理者 — 未ログイン保護', () => {
  test('T01 未ログインで /admin → /admin/login へリダイレクト', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('T02 未ログインで /admin/slots → /admin/login へリダイレクト', async ({ page }) => {
    await page.goto('/admin/slots')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('T03 未ログインで /admin/bookings → /admin/login へリダイレクト', async ({ page }) => {
    await page.goto('/admin/bookings')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('T04 ログイン失敗 — 誤パスワード → エラーメッセージ', async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpassword123')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(
      page.locator('text=メールアドレスまたはパスワードが正しくありません。')
    ).toBeVisible({ timeout: 10000 })
  })
})

// ── ログイン後（E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD が必要）──
test.describe('TMK管理者 — ログイン後', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD が未設定')
    await page.goto('/admin/login')
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'ログイン' }).click()
    await page.waitForURL('**/admin', { timeout: 15000 })
  })

  test('T05 ダッシュボードが表示される', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible()
  })

  test('T06 リロードしてもセッションが維持される', async ({ page }) => {
    await page.reload()
    await expect(page).toHaveURL(/\/admin/)
    await expect(page.locator('input[type="email"]')).not.toBeVisible()
  })

  test('T07 スロット一覧が表示される', async ({ page }) => {
    await page.goto('/admin/slots')
    await expect(page.getByText('出発枠一覧')).toBeVisible()
  })

  test('T08 予約一覧が表示される', async ({ page }) => {
    await page.goto('/admin/bookings')
    await expect(page).toHaveURL(/\/admin\/bookings/)
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('T09 ホテル一覧が表示される', async ({ page }) => {
    await page.goto('/admin/hotels')
    await expect(page).toHaveURL(/\/admin\/hotels/)
    await expect(page.locator('main').first()).toBeVisible()
  })
})
