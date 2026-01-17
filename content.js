// Content Script - 注入到抖音页面
// 监听页面变化，提取数据并发送给background script

// 加载scraper工具（内联加载，因为content script不能直接import）
let scraperLoaded = false;

function loadScraper() {
  return new Promise((resolve, reject) => {
    console.log('[Content Script] 开始加载Scraper...', {
      scraperLoaded,
      scraperExists: typeof scraper !== 'undefined',
      currentURL: window.location.href
    });

    if (scraperLoaded && typeof scraper !== 'undefined') {
      console.log('[Content Script] Scraper已加载，跳过重复加载');
      resolve();
      return;
    }

    const scraperScript = document.createElement('script');
    const scraperUrl = chrome.runtime.getURL('utils/scraper.js');
    scraperScript.src = scraperUrl;
    
    console.log('[Content Script] 创建script标签，URL:', scraperUrl);

    let checkStartTime = Date.now();
    const timeout = 10000; // 增加到10秒
    const checkInterval = 100; // 每100ms检查一次

    scraperScript.onload = function() {
      console.log('[Content Script] scraper.js脚本加载完成');
      scraperLoaded = true;
      
      // 等待scraper对象创建
      const checkScraper = setInterval(() => {
        const elapsed = Date.now() - checkStartTime;
        if (typeof scraper !== 'undefined') {
          console.log('[Content Script] Scraper对象已创建，耗时:', elapsed + 'ms');
          clearInterval(checkScraper);
          resolve();
        } else if (elapsed > timeout) {
          console.error('[Content Script] Scraper对象创建超时:', {
            elapsed: elapsed + 'ms',
            timeout: timeout + 'ms',
            scraperLoaded,
            scraperType: typeof scraper,
            windowKeys: Object.keys(window).filter(k => k.includes('scraper'))
          });
          clearInterval(checkScraper);
          reject(new Error('Scraper加载超时：脚本已加载但对象未创建'));
        } else {
          // 每500ms输出一次状态
          if (elapsed % 500 < checkInterval) {
            console.log('[Content Script] 等待Scraper对象创建...', {
              elapsed: elapsed + 'ms',
              scraperType: typeof scraper
            });
          }
        }
      }, checkInterval);
    };
    
    scraperScript.onerror = (error) => {
      console.error('[Content Script] 加载scraper.js失败:', {
        error,
        url: scraperUrl,
        scriptSrc: scraperScript.src,
        readyState: scraperScript.readyState
      });
      reject(new Error('加载scraper.js失败: ' + error.message));
    };

    const appendTarget = document.head || document.documentElement;
    console.log('[Content Script] 将script标签添加到DOM:', {
      target: appendTarget.tagName,
      hasHead: !!document.head,
      hasDocumentElement: !!document.documentElement
    });
    
    appendTarget.appendChild(scraperScript);
    console.log('[Content Script] script标签已添加，等待加载...');
  });
}

// 预加载scraper
loadScraper().then(() => {
  console.log('[Content Script] Scraper预加载成功');
}).catch(err => {
  console.warn('[Content Script] 预加载scraper失败:', err);
});

// 等待页面加载完成
let pageReady = false;

function checkPageReady() {
  if (document.readyState === 'complete') {
    pageReady = true;
    initContentScript();
  } else {
    setTimeout(checkPageReady, 100);
  }
}

checkPageReady();

function initContentScript() {
  // 检查是否在用户主页
  if (isUserProfilePage()) {
    addCollectButton();
    listenForMessages();
  }

  // 监听URL变化（抖音是SPA，需要监听路由变化）
  observeUrlChanges();
}

// 检查是否在用户主页
function isUserProfilePage() {
  const url = window.location.href;
  return url.includes('/user/') || url.includes('/profile/');
}

// 添加采集按钮到页面
function addCollectButton() {
  // 避免重复添加
  if (document.getElementById('douyin-collector-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'douyin-collector-btn';
  button.textContent = '采集达人信息';
  button.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    z-index: 10000;
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
  });

  button.addEventListener('click', async () => {
    await handleCollectClick(button);
  });

  document.body.appendChild(button);
}

// 处理采集按钮点击
async function handleCollectClick(button) {
  const originalText = button.textContent;
  button.textContent = '采集中...';
  button.disabled = true;
  button.style.opacity = '0.7';

  try {
    // 通知background开始采集
    chrome.runtime.sendMessage({
      action: 'startCollect',
      url: window.location.href
    }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('发送消息失败:', chrome.runtime.lastError);
        showNotification('采集失败: ' + chrome.runtime.lastError.message, 'error');
        resetButton(button, originalText);
        return;
      }

      if (response && response.success) {
        showNotification('采集成功！已保存 ' + (response.videoCount || 0) + ' 个作品', 'success');
      } else {
        showNotification('采集失败: ' + (response?.error || '未知错误'), 'error');
      }
      resetButton(button, originalText);
    });
  } catch (error) {
    console.error('采集过程出错:', error);
    showNotification('采集失败: ' + error.message, 'error');
    resetButton(button, originalText);
  }
}

function resetButton(button, originalText) {
  button.textContent = originalText;
  button.disabled = false;
  button.style.opacity = '1';
}

// 显示通知
function showNotification(message, type = 'info') {
  // 移除旧通知
  const oldNotification = document.getElementById('douyin-collector-notification');
  if (oldNotification) {
    oldNotification.remove();
  }

  const notification = document.createElement('div');
  notification.id = 'douyin-collector-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 160px;
    right: 20px;
    z-index: 10001;
    padding: 16px 24px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease;
  `;

  // 添加动画样式
  if (!document.getElementById('collector-styles')) {
    const style = document.createElement('style');
    style.id = 'collector-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  // 3秒后自动移除
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 监听来自background的消息
function listenForMessages() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractData') {
      handleExtractData(request, sendResponse);
      return true; // 保持消息通道开放
    }
  });
}

// 处理数据提取请求
async function handleExtractData(request, sendResponse) {
  const startTime = Date.now();
  console.log('[Content Script] 开始处理数据提取请求:', {
    collectVideos: request.collectVideos,
    scrollToLoad: request.scrollToLoad,
    maxScrolls: request.maxScrolls,
    videoLimit: request.videoLimit,
    url: window.location.href
  });

  try {
    // 确保scraper已加载
    console.log('[Content Script] 检查Scraper加载状态...');
    const loadStartTime = Date.now();
    await loadScraper();
    const loadTime = Date.now() - loadStartTime;
    console.log('[Content Script] Scraper加载完成，耗时:', loadTime + 'ms');

    if (typeof scraper === 'undefined') {
      console.error('[Content Script] Scraper对象未定义:', {
        scraperLoaded,
        scraperType: typeof scraper,
        windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('scraper'))
      });
      throw new Error('数据抓取模块未加载');
    }

    console.log('[Content Script] 开始采集达人数据...');
    const collectStartTime = Date.now();
    const data = await scraper.collectCreatorData({
      collectVideos: request.collectVideos !== false,
      scrollToLoad: request.scrollToLoad || false,
      maxScrolls: request.maxScrolls || 5,
      videoLimit: request.videoLimit || 50
    });
    const collectTime = Date.now() - collectStartTime;

    console.log('[Content Script] 数据采集完成:', {
      creator: data.creator ? '存在' : '不存在',
      videoCount: data.videos ? data.videos.length : 0,
      collectTime: collectTime + 'ms',
      totalTime: (Date.now() - startTime) + 'ms'
    });

    sendResponse({ success: true, data: data });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('[Content Script] 提取数据失败:', {
      error: error.message,
      stack: error.stack,
      totalTime: totalTime + 'ms',
      scraperLoaded,
      scraperType: typeof scraper,
      url: window.location.href
    });
    sendResponse({ success: false, error: error.message });
  }
}

// 监听URL变化（抖音是SPA应用）
function observeUrlChanges() {
  let lastUrl = window.location.href;

  // 方法1: 监听popstate事件
  window.addEventListener('popstate', () => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(() => {
        if (isUserProfilePage()) {
          addCollectButton();
        } else {
          removeCollectButton();
        }
      }, 500);
    }
  });

  // 方法2: 使用MutationObserver监听DOM变化
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(() => {
        if (isUserProfilePage()) {
          addCollectButton();
        } else {
          removeCollectButton();
        }
      }, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 方法3: 定期检查URL（备用方案）
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (isUserProfilePage()) {
        addCollectButton();
      } else {
        removeCollectButton();
      }
    }
  }, 1000);
}

// 移除采集按钮
function removeCollectButton() {
  const button = document.getElementById('douyin-collector-btn');
  if (button) {
    button.remove();
  }
}
