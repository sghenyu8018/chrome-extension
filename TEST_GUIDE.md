# 本地Chrome浏览器测试指南

## 准备工作

1. 确保所有文件都已准备好
2. 检查扩展文件结构是否完整

## 加载扩展到Chrome

### 步骤1：打开Chrome扩展管理页面

1. 打开Chrome浏览器
2. 在地址栏输入：`chrome://extensions/`
3. 或者：菜单 → 更多工具 → 扩展程序

### 步骤2：启用开发者模式

1. 在扩展管理页面右上角，开启"开发者模式"开关

### 步骤3：加载扩展

1. 点击"加载已解压的扩展程序"按钮
2. 选择项目文件夹：`D:\python\chrome-extension`
3. 点击"选择文件夹"

### 步骤4：检查扩展状态

- 扩展应该显示为"已启用"
- 检查是否有错误提示
- 如果有错误，点击"错误"查看详情

## 测试功能

### 测试1：检查扩展加载

1. 查看扩展图标是否出现在工具栏
2. 点击扩展图标，应该弹出popup窗口
3. 检查popup是否正常显示

### 测试2：测试数据库初始化

1. 打开扩展的Service Worker控制台：
   - 在扩展管理页面，找到"抖音达人信息采集器"
   - 点击"service worker"链接（或"检查视图"）
2. 查看控制台，应该看到：
   - `[Background] 开始初始化数据库...`
   - `[Background] 数据库初始化成功，耗时: XXms`
3. 如果没有错误，说明数据库初始化成功

### 测试3：测试采集功能

1. 访问抖音用户主页：
   - 打开：`https://www.douyin.com/user/MS4wLjABAAAAObLqoivX9v17p8Mx6ehZ-8Jm2neeJg05i7gagKeCWtw`
   - 或访问其他用户主页
2. 等待页面加载完成
3. 查找"采集达人信息"按钮（应该在页面右上角）
4. 点击按钮
5. 观察：
   - 按钮文字变为"采集中..."
   - 页面右上角显示通知（成功或失败）
   - 控制台输出详细日志

### 测试4：查看采集的数据

1. 点击扩展图标
2. 在popup中应该看到：
   - 统计信息（达人数量、作品数量、粉丝总数）
   - 达人列表
3. 测试搜索功能
4. 测试导出功能

### 测试5：检查控制台日志

#### Content Script日志（页面控制台）
1. 在抖音页面按F12打开开发者工具
2. 切换到Console标签
3. 应该看到详细的日志输出，包括：
   - `[Content Script] 开始加载Scraper...`
   - `[Content Script] Scraper对象已创建`
   - `[Scraper] 开始采集达人数据...`

#### Background Script日志（Service Worker控制台）
1. 在扩展管理页面点击"service worker"
2. 查看控制台输出，包括：
   - 数据库初始化日志
   - 消息处理日志
   - 数据保存日志

## 常见问题排查

### 问题1：扩展无法加载

**错误：** "无法加载清单"

**解决方案：**
- 检查manifest.json语法是否正确
- 确保所有引用的文件都存在
- 检查图标文件是否存在

### 问题2：数据库初始化失败

**错误：** "WebAssembly.instantiate() Refused to compile"

**解决方案：**
- 检查manifest.json中的CSP配置
- 确保`lib/sql-wasm.wasm`文件存在
- 重新加载扩展

### 问题3：采集按钮不显示

**可能原因：**
- 不在用户主页（URL不包含`/user/`）
- Content script未正确注入
- 页面结构变化

**解决方案：**
- 确认URL格式正确
- 检查content.js是否正确加载
- 查看页面控制台是否有错误

### 问题4：Scraper加载超时

**错误：** "Scraper加载超时：脚本已加载但对象未创建"

**解决方案：**
- 检查`utils/scraper.js`文件是否存在
- 查看控制台是否有语法错误
- 尝试重新加载扩展和页面

## 调试技巧

### 1. 查看Service Worker状态

在`chrome://extensions/`页面：
- 查看Service Worker状态
- 点击"检查视图"查看控制台
- 查看是否有错误或警告

### 2. 查看Content Script日志

在抖音页面：
- 按F12打开开发者工具
- 查看Console标签
- 过滤日志：输入`[Content Script]`或`[Scraper]`

### 3. 检查存储数据

在Service Worker控制台执行：
```javascript
chrome.storage.local.get(['database'], (result) => {
  console.log('数据库大小:', result.database ? result.database.length : 0);
});
```

### 4. 手动触发采集

在页面控制台执行：
```javascript
// 检查scraper是否加载
console.log('Scraper:', typeof window.scraper);

// 如果已加载，可以手动调用
if (window.scraper) {
  window.scraper.collectCreatorData().then(data => {
    console.log('采集结果:', data);
  });
}
```

## 测试 checklist

- [ ] 扩展成功加载，无错误
- [ ] Popup界面正常显示
- [ ] 数据库初始化成功
- [ ] 在用户主页显示采集按钮
- [ ] 点击采集按钮可以成功采集
- [ ] 数据成功保存到数据库
- [ ] Popup中可以看到采集的达人列表
- [ ] 搜索功能正常
- [ ] 导出功能正常
- [ ] 控制台无严重错误

## 性能测试

1. **采集速度**：记录采集一个达人信息所需时间
2. **数据库性能**：测试大量数据下的查询速度
3. **内存使用**：观察扩展的内存占用

## 注意事项

1. 某些功能可能需要登录抖音账号
2. 页面结构可能变化，需要更新选择器
3. 建议在测试环境中使用，避免影响正常浏览
