# Playwright 测试说明

本目录包含使用Playwright进行自动化测试的测试文件。

## 安装依赖

首先需要安装Node.js和npm，然后安装项目依赖：

```bash
npm install
```

安装Playwright浏览器：

```bash
npm run install-browsers
# 或
npx playwright install chromium
```

## 运行测试

### 运行所有测试

```bash
npm test
```

### 以可视化模式运行（headed模式）

```bash
npm run test:headed
```

### 调试模式

```bash
npm run test:debug
```

### UI模式（推荐）

```bash
npm run test:ui
```

## 测试文件说明

### `douyin-test.spec.js`

主要的测试文件，包含以下测试用例：

1. **打开抖音首页** - 验证能够正常访问抖音
2. **打开用户主页** - 验证能够访问用户主页
3. **扩展加载检查** - 验证扩展是否正确加载
4. **采集按钮显示** - 验证采集按钮是否出现在用户主页
5. **点击采集按钮** - 测试按钮点击功能
6. **打开扩展popup** - 测试扩展弹窗界面
7. **提取页面数据** - 测试数据提取功能
8. **拦截网络请求** - 监控API请求
9. **检查扩展存储** - 验证数据库存储功能

### `example-test.js`

示例测试文件，展示基本的测试用法。

## 测试配置

测试配置在 `playwright.config.js` 中，主要设置：

- 自动加载Chrome扩展
- 测试超时时间：60秒
- 使用Chromium浏览器
- 失败时保留截图和视频

## 注意事项

1. **需要真实的抖音URL** - 某些测试需要真实的用户主页URL，请替换示例URL
2. **可能需要登录** - 部分功能可能需要登录状态
3. **网络环境** - 确保能够访问抖音网站
4. **扩展加载** - 测试会自动加载扩展，但首次可能需要更多时间

## 自定义测试

可以根据需要添加新的测试用例：

```javascript
test('我的自定义测试', async ({ page }) => {
  await page.goto('https://www.douyin.com/user/YOUR_USER_ID');
  // 你的测试代码
});
```

## 调试技巧

1. 使用 `test.debug()` 暂停测试进入调试模式
2. 使用 `page.pause()` 在代码中暂停执行
3. 使用 `await page.screenshot()` 截图查看页面状态
4. 使用 `console.log()` 输出调试信息

## 常见问题

**Q: 测试失败，提示扩展未加载？**  
A: 确保manifest.json和所有文件路径正确，尝试增加等待时间。

**Q: 采集按钮找不到？**  
A: 可能是页面结构变化或需要更多加载时间，检查选择器是否正确。

**Q: 无法访问扩展存储？**  
A: 扩展存储只能在扩展的上下文中访问，需要通过background page访问。
