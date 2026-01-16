// Content Script - 注入到抖音页面
// 监听页面变化，提取数据并发送给background script

// 加载scraper工具（内联加载，因为content script不能直接import）
let scraperLoaded = false;

function loadScraper() {
  return new Promise((resolve, reject) => {
    if (scraperLoaded && typeof scraper !== 'undefined') {
      resolve();
      return;
    }

    const scraperScript = document.createElement('script');
    scraperScript.src = chrome.runtime.getURL('utils/scraper.js');
    scraperScript.onload = function() {
      scraperLoaded = true;
      // 等待scraper对象创建
      const checkScraper = setInterval(() => {
        if (typeof scraper !== 'undefined') {
          clearInterval(checkScraper);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(checkScraper);
        if (typeof scraper === 'undefined') {
          reject(new Error('Scraper加载超时'));
        }
      }, 5000);
    };
    scraperScript.onerror = () => {
      reject(new Error('加载scraper.js失败'));
    };
    (document.head || document.documentElement).appendChild(scraperScript);
  });
}

// 预加载scraper
loadScraper().catch(err => console.warn('预加载scraper失败:', err));

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
  try {
    // 确保scraper已加载
    await loadScraper();

    if (typeof scraper === 'undefined') {
      throw new Error('数据抓取模块未加载');
    }

    const data = await scraper.collectCreatorData({
      collectVideos: request.collectVideos !== false,
      scrollToLoad: request.scrollToLoad || false,
      maxScrolls: request.maxScrolls || 5,
      videoLimit: request.videoLimit || 50
    });

    sendResponse({ success: true, data: data });
  } catch (error) {
    console.error('提取数据失败:', error);
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
