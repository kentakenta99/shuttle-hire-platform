import { test, expect } from '@playwright/test'

test.describe('公開ページ — 認証不要', () => {
  test('T01 / → /hotel/login へリダイレクト', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/hotel\/login/)
  })

  test('T02 /privacy プライバシーポリシーが表示される', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByText('プライバシーポリシー').first()).toBeVisible()
    // 事業者情報セクションが存在する
    await expect(page.getByText('1. 事業者情報')).toBeVisible()
  })

  test('T03 /lookup 予約照会フォームが表示される', async ({ page }) => {
    await page.goto('/lookup')
    await expect(page.getByText('予約を確認する')).toBeVisible()
    // 確認番号入力フィールドが存在する
    await expect(page.locator('input')).toBeVisible()
  })

  test('T04 /lookup?code=INVALID 予約が見つからない場合のメッセージ', async ({ page }) => {
    await page.goto('/lookup?code=INVALID')
    await expect(page.getByText('予約が見つかりませんでした。確認番号をご確認ください。')).toBeVisible()
  })

  test('T05 /api/health → 200 + status:ok', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    const body = await res.json() as { status: string; checks: Record<string, string> }
    expect(body.status).toBe('ok')
    expect(body.checks.supabase).toBe('ok')
  })

  test('T06 /confirm/INVALID-REF → 404', async ({ page }) => {
    const res = await page.goto('/confirm/INVALID-REF-000000')
    expect(res?.status()).toBe(404)
  })
})
