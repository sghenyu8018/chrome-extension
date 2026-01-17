// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 示例测试 - 演示如何使用Playwright测试抖音页面
 * 可以根据实际需求修改
 */

test('访问抖音并检查页面', async ({ page }) => {
  // 访问抖音首页
  await page.goto('https://www.douyin.com');
  
  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
  
  // 检查页面标题
  const title = await page.title();
  console.log('页面标题:', title);
  
  // 截图（可选）
  // await page.screenshot({ path: 'screenshots/douyin-homepage.png' });
  
  expect(page.url()).toContain('douyin.com');
});

test('检查用户主页URL格式', async ({ page }) => {
  // 示例用户主页URL（需要替换为真实URL）
  const testUrls = [
    'https://www.douyin.com/user/MS4wLjABAAAA',
    'https://www.douyin.com/user/example',
  ];
  
  for (const url of testUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      console.log(`✅ URL可访问: ${url}`);
    } catch (error) {
      console.log(`⚠️ URL不可访问: ${url}`, error.message);
    }
  }
});
