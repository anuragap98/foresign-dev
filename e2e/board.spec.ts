import { expect, test } from '@playwright/test'
import { admin, agentCall, signIn, testProject, type TestProject } from './stack'

let project: TestProject

test.beforeEach(async () => {
  project = await testProject('board')
  await admin.from('projects').update({ gates: { plan: false, merge: false, deploy: false } }).eq('id', project.id)
})

test.afterEach(async () => {
  await project.remove()
})

test('dragging a card to another column saves its new status', async ({ page }) => {
  const title = `Drag me ${project.name.slice(-6)}`
  await agentCall(project.token, 'create_task', { ref: 'drag', title })

  await signIn(page, '/tasks')
  await page.getByRole('searchbox', { name: 'Filter tasks by text' }).fill(title)
  const card = page.locator('[data-card]', { hasText: title })
  await expect(page.locator('[data-col="todo"]').locator('[data-card]', { hasText: title })).toBeVisible()

  const from = (await card.boundingBox())!
  const to = (await page.locator('[data-col="review"]').boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + 20)
  await page.mouse.down()
  // Past the drag threshold, then across in steps so the board tracks the pointer.
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + 30, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + 80, { steps: 12 })
  await page.mouse.up()

  await expect(page.locator('[data-col="review"]').locator('[data-card]', { hasText: title })).toBeVisible()
  await expect
    .poll(async () => (await admin.from('tasks').select('status').eq('project_id', project.id).eq('external_ref', 'drag').single()).data?.status)
    .toBe('review')
})

test('pages fit a phone without sideways scrolling @phone', async ({ page }) => {
  await signIn(page, '/home')
  for (const path of ['/home', '/tasks', '/runs', '/team', '/insights', `/projects/${project.id}`]) {
    await page.goto(`/#${path}`)
    await expect(page.locator('main h1')).toBeVisible()
    const scrolled = await page.evaluate(() => {
      window.scrollTo(500, 0)
      const x = window.scrollX
      window.scrollTo(0, 0)
      return x
    })
    expect(scrolled, path).toBe(0)
  }
})
