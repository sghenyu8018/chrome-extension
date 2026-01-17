// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

/**
 * Playwright测试配置
 * 用于测试Chrome扩展功能
 */
module.exports = defineConfig({
  testDir: './tests',
  /* 测试超时时间 */
  timeout: 60 * 1000,
  expect: {
    /* 断言超时时间 */
    timeout: 5000
  },
  /* 并行运行测试 */
  fullyParallel: true,
  /* 失败时不重试 */
  retries: 0,
  /* 并发工作数 */
  workers: process.env.CI ? 1 : 1,
  /* 报告器 */
  reporter: [
    ['html'],
    ['list']
  ],
  /* 共享配置 */
  use: {
    /* 基础URL */
    baseURL: 'https://www.douyin.com',
    /* 截图配置 */
    screenshot: 'only-on-failure',
    /* 视频录制配置 */
    video: 'retain-on-failure',
    /* 追踪配置 */
    trace: 'retain-on-failure',
  },

  /* 配置测试项目 */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        /* 加载Chrome扩展 */
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve(__dirname)}`,
            `--load-extension=${path.resolve(__dirname)}`,
          ],
        },
        /* 上下文选项 */
        contextOptions: {
          viewport: { width: 1920, height: 1080 },
        },
      },
    },
  ],

  /* 本地开发服务器配置（如果需要） */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
