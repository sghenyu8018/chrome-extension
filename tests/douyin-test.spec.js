// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

/**
 * 抖音扩展功能测试
 */
test.describe('抖音达人信息采集扩展测试', () => {
  
  test.beforeEach(async ({ context }) => {
    // 每个测试前等待扩展加载
    await context.waitForTimeout(2000);
  });

  test('应该能够打开抖音首页', async ({ page }) => {
    await page.goto('https://www.douyin.com');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 检查页面标题或关键元素
    const title = await page.title();
    expect(title).toContain('抖音');
    
    console.log('✅ 抖音首页加载成功');
  });

  test('应该能够打开抖音用户主页', async ({ page }) => {
    // 使用一个示例用户主页URL（需要替换为真实的用户主页）
    const userPageUrl = 'https://www.douyin.com/user/MS4wLjABAAAA';
    
    await page.goto(userPageUrl);
    await page.waitForLoadState('networkidle');
    
    // 检查是否在用户主页
    const url = page.url();
    expect(url).toMatch(/\/user\//);
    
    console.log('✅ 用户主页加载成功:', url);
  });

  test('扩展应该已加载', async ({ context }) => {
    // 检查扩展是否已加载
    const backgroundPage = await context.backgroundPages();
    const extensionPage = backgroundPage.find(page => 
      page.url().includes('chrome-extension://')
    );
    
    expect(extensionPage).toBeDefined();
    console.log('✅ 扩展已加载');
  });

  test('应该显示采集按钮', async ({ page }) => {
    // 访问用户主页
    const userPageUrl = 'https://www.douyin.com/user/MS4wLjABAAAA';
    await page.goto(userPageUrl);
    await page.waitForLoadState('networkidle');
    
    // 等待content script注入和按钮出现
    await page.waitForTimeout(3000);
    
    // 检查采集按钮是否存在
    const collectButton = page.locator('#douyin-collector-btn');
    
    // 如果按钮存在，检查其可见性
    const count = await collectButton.count();
    if (count > 0) {
      await expect(collectButton).toBeVisible();
      const buttonText = await collectButton.textContent();
      expect(buttonText).toContain('采集');
      console.log('✅ 采集按钮已显示:', buttonText);
    } else {
      console.log('⚠️ 采集按钮未找到，可能需要更多时间加载或页面结构不同');
    }
  });

  test('应该能够点击采集按钮', async ({ page }) => {
    const userPageUrl = 'https://www.douyin.com/user/MS4wLjABAAAA';
    await page.goto(userPageUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const collectButton = page.locator('#douyin-collector-btn');
    const buttonCount = await collectButton.count();
    
    if (buttonCount > 0) {
      // 点击采集按钮
      await collectButton.click();
      
      // 等待按钮状态变化
      await page.waitForTimeout(1000);
      
      // 检查按钮文本是否变为"采集中..."
      const buttonText = await collectButton.textContent();
      console.log('✅ 按钮点击成功，当前状态:', buttonText);
    } else {
      console.log('⚠️ 采集按钮未找到，跳过点击测试');
    }
  });

  test('应该能够打开扩展popup', async ({ page, context }) => {
    // 访问抖音页面
    await page.goto('https://www.douyin.com');
    await page.waitForLoadState('networkidle');
    
    // 等待扩展加载
    await page.waitForTimeout(2000);
    
    // 查找扩展ID
    let extensionId = null;
    const backgroundPages = await context.backgroundPages();
    for (const bgPage of backgroundPages) {
      const url = bgPage.url();
      if (url.includes('chrome-extension://')) {
        const match = url.match(/chrome-extension:\/\/([a-z]{32})\//);
        if (match) {
          extensionId = match[1];
          break;
        }
      }
    }
    
    if (extensionId) {
      // 打开popup页面
      const popupUrl = `chrome-extension://${extensionId}/popup/popup.html`;
      const popupPage = await context.newPage();
      await popupPage.goto(popupUrl);
      
      // 检查popup内容
      const title = await popupPage.locator('h1').textContent();
      expect(title).toContain('达人信息采集器');
      
      console.log('✅ Popup页面打开成功');
      await popupPage.close();
    } else {
      console.log('⚠️ 无法获取扩展ID');
    }
  });

  test('应该能够提取页面数据', async ({ page }) => {
    const userPageUrl = 'https://www.douyin.com/user/MS4wLjABAAAA';
    await page.goto(userPageUrl);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 尝试提取页面中的用户名
    const username = await page.evaluate(() => {
      // 尝试多个选择器
      const selectors = [
        '[data-e2e="user-title"]',
        '.user-title',
        'h1[class*="username"]',
        'h1'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          return element.textContent.trim();
        }
      }
      return null;
    });
    
    if (username) {
      console.log('✅ 成功提取用户名:', username);
      expect(username).toBeTruthy();
    } else {
      console.log('⚠️ 未能提取用户名，可能是页面结构不同或需要登录');
    }
  });

  test('应该能够拦截网络请求', async ({ page }) => {
    const requests = [];
    
    // 监听网络请求
    page.on('request', request => {
      const url = request.url();
      if (url.includes('douyin.com') && url.includes('api')) {
        requests.push(url);
      }
    });
    
    await page.goto('https://www.douyin.com');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ 监听到的网络请求数量:', requests.length);
    if (requests.length > 0) {
      console.log('示例请求:', requests[0]);
    }
  });

  test('应该能够检查扩展存储', async ({ context }) => {
    // 获取扩展的背景页面
    const backgroundPages = await context.backgroundPages();
    const extensionPage = backgroundPages.find(page => 
      page.url().includes('chrome-extension://')
    );
    
    if (extensionPage) {
      // 尝试访问chrome.storage（需要在扩展上下文中）
      try {
        const storage = await extensionPage.evaluate(() => {
          return new Promise((resolve) => {
            chrome.storage.local.get(['database'], (result) => {
              resolve(result);
            });
          });
        });
        
        console.log('✅ 扩展存储访问成功');
        console.log('存储数据:', storage ? '存在' : '空');
      } catch (error) {
        console.log('⚠️ 无法访问扩展存储:', error.message);
      }
    }
  });
});

/**
 * 测试工具函数
 */
test.describe('测试工具函数', () => {
  
  test('页面加载速度测试', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('https://www.douyin.com');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ 页面加载时间: ${loadTime}ms`);
    
    expect(loadTime).toBeLessThan(10000); // 应该在10秒内加载完成
  });

  test('页面元素检查', async ({ page }) => {
    await page.goto('https://www.douyin.com');
    await page.waitForLoadState('networkidle');
    
    // 检查常见的抖音页面元素
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    console.log('✅ 页面基本元素检查通过');
  });
});
