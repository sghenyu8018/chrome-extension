# 抖音达人信息采集器 Chrome扩展

一个Chrome浏览器扩展，用于采集抖音达人信息并存储到本地SQLite数据库中。

## 功能特性

- 🎯 一键采集达人信息（用户名、头像、简介、粉丝数等）
- 📹 自动采集作品列表（标题、封面、播放量、点赞数等）
- 💾 本地SQLite数据库存储，数据安全可靠
- 🔍 搜索和筛选已采集的达人
- 📊 统计信息展示
- 📥 数据导出功能（JSON格式）
- 🎨 现代化的用户界面

## 安装方法

1. 下载或克隆本项目到本地
2. 打开Chrome浏览器，进入扩展程序管理页面（chrome://extensions/）
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目文件夹

## 使用方法

1. 访问抖音用户主页（例如：https://www.douyin.com/user/xxx）
2. 点击页面右上角的"采集达人信息"按钮
3. 等待采集完成
4. 点击浏览器工具栏中的扩展图标，查看已采集的达人列表
5. 可以搜索、查看统计信息或导出数据

## 项目结构

```
chrome-extension/
├── manifest.json          # 扩展配置文件
├── background.js          # 后台服务脚本
├── content.js             # 内容脚本（注入到抖音页面）
├── popup/                 # 弹窗界面
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── utils/                 # 工具模块
│   ├── database.js        # 数据库操作
│   └── scraper.js         # 数据抓取逻辑
├── lib/                   # 第三方库
│   └── sql.js            # SQL.js加载器
└── icons/                 # 扩展图标
```

## 数据表结构

### creators 表（达人信息）
- id: 主键
- user_id: 用户ID（唯一）
- username: 用户名
- avatar_url: 头像URL
- bio: 个人简介
- follower_count: 粉丝数
- following_count: 关注数
- like_count: 获赞数
- video_count: 作品数
- collected_at: 采集时间
- updated_at: 更新时间

### videos 表（作品信息）
- id: 主键
- creator_id: 达人ID（外键）
- video_id: 视频ID（唯一）
- title: 视频标题
- cover_url: 封面URL
- play_count: 播放量
- like_count: 点赞数
- comment_count: 评论数
- share_count: 分享数
- created_at: 创建时间
- collected_at: 采集时间

## 技术栈

- Chrome Extension Manifest V3
- SQL.js (WebAssembly SQLite)
- 原生JavaScript（无框架依赖）

## 注意事项

1. 本扩展仅用于学习和研究目的
2. 请遵守抖音的使用条款和robots.txt
3. 数据存储在浏览器本地，不会上传到任何服务器
4. 建议合理使用，避免频繁采集造成服务器压力

## 开发说明

### 添加图标

需要在 `icons/` 目录下放置以下尺寸的图标：
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

可以使用在线工具生成，或使用 `create_icons.py` 脚本生成。

### 调试

1. 打开Chrome开发者工具
2. 查看Console标签页查看日志
3. 在扩展程序页面点击"检查视图"查看background和popup的日志

### 测试

项目包含Playwright自动化测试：

```bash
# 安装依赖
npm install

# 安装Playwright浏览器
npm run install-browsers

# 运行测试
npm test

# 可视化模式运行
npm run test:headed

# UI模式（推荐）
npm run test:ui
```

详细测试说明请查看 `tests/README.md`

## 许可证

MIT License
