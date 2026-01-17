// Background Service Worker
// 处理消息、管理采集任务、调用数据库存储

// 静态导入SQL.js（必须在Service Worker启动时导入，不能动态导入）
// 在Manifest V3中，importScripts必须在Service Worker注册时执行，不能动态执行
importScripts('lib/sql-wasm.js');

// 加载数据库模块（必须在SQL.js之后加载）
importScripts('utils/database.js');

// 初始化数据库
let dbInitialized = false;

async function initDatabase() {
  if (dbInitialized) {
    console.log('[Background] 数据库已初始化，跳过');
    return;
  }
  
  console.log('[Background] 开始初始化数据库...');
  const startTime = Date.now();
  
  try {
    await db.init();
    dbInitialized = true;
    const elapsed = Date.now() - startTime;
    console.log('[Background] 数据库初始化成功，耗时:', elapsed + 'ms');
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error('[Background] 数据库初始化失败:', {
      error: error.message,
      stack: error.stack,
      elapsed: elapsed + 'ms'
    });
  }
}

// 扩展安装或启动时初始化数据库
chrome.runtime.onInstalled.addListener(() => {
  initDatabase();
});

chrome.runtime.onStartup.addListener(() => {
  initDatabase();
});

// 立即初始化
initDatabase();

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // 保持消息通道开放以支持异步响应
});

// 处理消息
async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'startCollect':
        await handleStartCollect(request, sender, sendResponse);
        break;
      
      case 'getCreators':
        await handleGetCreators(sendResponse);
        break;
      
      case 'searchCreators':
        await handleSearchCreators(request, sendResponse);
        break;
      
      case 'getStatistics':
        await handleGetStatistics(sendResponse);
        break;
      
      case 'exportData':
        await handleExportData(sendResponse);
        break;
      
      case 'clearDatabase':
        await handleClearDatabase(sendResponse);
        break;
      
      default:
        sendResponse({ success: false, error: '未知的操作' });
    }
  } catch (error) {
    console.error('处理消息失败:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理开始采集请求
async function handleStartCollect(request, sender, sendResponse) {
  const startTime = Date.now();
  console.log('[Background] 收到开始采集请求:', {
    tabId: sender.tab.id,
    url: sender.tab.url,
    timestamp: new Date().toISOString()
  });

  try {
    // 确保数据库已初始化
    console.log('[Background] 确保数据库已初始化...');
    await initDatabase();

    console.log('[Background] 向content script发送提取数据请求...');
    // 向content script发送提取数据请求
    chrome.tabs.sendMessage(sender.tab.id, {
      action: 'extractData',
      collectVideos: true,
      scrollToLoad: false, // 默认不自动滚动，避免影响用户体验
      maxScrolls: 5,
      videoLimit: 50
    }, async (response) => {
      const messageTime = Date.now() - startTime;
      
      if (chrome.runtime.lastError) {
        console.error('[Background] 无法与页面通信:', {
          error: chrome.runtime.lastError.message,
          tabId: sender.tab.id,
          elapsed: messageTime + 'ms'
        });
        sendResponse({ 
          success: false, 
          error: '无法与页面通信: ' + chrome.runtime.lastError.message 
        });
        return;
      }

      console.log('[Background] Content script响应:', {
        success: response?.success,
        hasData: !!response?.data,
        elapsed: messageTime + 'ms'
      });

      if (!response || !response.success) {
        console.error('[Background] Content script返回失败:', {
          error: response?.error,
          response: response
        });
        sendResponse({ 
          success: false, 
          error: response?.error || '提取数据失败' 
        });
        return;
      }

      const { creator, videos } = response.data;

      console.log('[Background] 解析响应数据:', {
        hasCreator: !!creator,
        creatorUserId: creator?.user_id,
        videoCount: videos?.length || 0
      });

      if (!creator || !creator.user_id) {
        console.error('[Background] 达人信息无效:', { creator });
        sendResponse({ 
          success: false, 
          error: '无法提取达人信息' 
        });
        return;
      }

      try {
        console.log('[Background] 开始保存达人信息...');
        const saveStartTime = Date.now();
        
        // 保存达人信息
        const creatorId = await db.upsertCreator(creator);
        console.log('[Background] 达人信息已保存:', {
          creatorId,
          userId: creator.user_id,
          username: creator.username
        });

        // 保存作品信息
        let savedVideoCount = 0;
        if (videos && videos.length > 0) {
          console.log('[Background] 开始保存', videos.length, '个作品...');
          const videosWithCreatorId = videos.map(video => ({
            ...video,
            creator_id: creatorId,
            created_at: video.created_at || new Date().toISOString()
          }));
          
          await db.insertVideos(videosWithCreatorId);
          savedVideoCount = videos.length;
          console.log('[Background] 作品信息已保存:', savedVideoCount, '个');
        }

        const totalTime = Date.now() - startTime;
        const saveTime = Date.now() - saveStartTime;

        console.log('[Background] 采集完成:', {
          creatorId,
          videoCount: savedVideoCount,
          saveTime: saveTime + 'ms',
          totalTime: totalTime + 'ms'
        });

        sendResponse({ 
          success: true, 
          creatorId: creatorId,
          videoCount: savedVideoCount,
          message: `成功保存达人信息和 ${savedVideoCount} 个作品` 
        });
      } catch (dbError) {
        const totalTime = Date.now() - startTime;
        console.error('[Background] 保存数据失败:', {
          error: dbError.message,
          stack: dbError.stack,
          totalTime: totalTime + 'ms'
        });
        sendResponse({ 
          success: false, 
          error: '保存数据失败: ' + dbError.message 
        });
      }
    });
  } catch (error) {
    console.error('处理采集请求失败:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// 处理获取所有达人请求
async function handleGetCreators(sendResponse) {
  try {
    await initDatabase();
    const creators = await db.getAllCreators();
    sendResponse({ success: true, creators: creators });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// 处理搜索达人请求
async function handleSearchCreators(request, sendResponse) {
  try {
    await initDatabase();
    const keyword = request.keyword || '';
    const creators = await db.searchCreators(keyword);
    sendResponse({ success: true, creators: creators });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// 处理获取统计信息请求
async function handleGetStatistics(sendResponse) {
  try {
    await initDatabase();
    const stats = await db.getStatistics();
    sendResponse({ success: true, statistics: stats });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// 处理导出数据请求
async function handleExportData(sendResponse) {
  try {
    await initDatabase();
    const data = await db.exportData();
    sendResponse({ success: true, data: data });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// 处理清空数据库请求
async function handleClearDatabase(sendResponse) {
  try {
    await initDatabase();
    await db.clearDatabase();
    sendResponse({ success: true, message: '数据库已清空' });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
