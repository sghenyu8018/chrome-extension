// Popup界面逻辑

// 格式化数字（显示为K、万等）
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + '亿';
  } else if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// 加载统计信息
async function loadStatistics() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatistics' });
    if (response && response.success) {
      const stats = response.statistics;
      document.getElementById('creatorCount').textContent = formatNumber(stats.creatorCount);
      document.getElementById('videoCount').textContent = formatNumber(stats.videoCount);
      document.getElementById('followerCount').textContent = formatNumber(stats.totalFollowers);
    }
  } catch (error) {
    console.error('加载统计信息失败:', error);
  }
}

// 加载达人列表
async function loadCreators(keyword = '') {
  const listContainer = document.getElementById('creatorsList');
  listContainer.innerHTML = '<div class="loading">加载中...</div>';

  try {
    let response;
    if (keyword) {
      response = await chrome.runtime.sendMessage({ 
        action: 'searchCreators', 
        keyword: keyword 
      });
    } else {
      response = await chrome.runtime.sendMessage({ action: 'getCreators' });
    }

    if (response && response.success) {
      const creators = response.creators || [];
      displayCreators(creators);
    } else {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">😔</div><div class="empty-state-text">加载失败</div></div>';
    }
  } catch (error) {
    console.error('加载达人列表失败:', error);
    listContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">加载失败: ' + error.message + '</div></div>';
  }
}

// 显示达人列表
function displayCreators(creators) {
  const listContainer = document.getElementById('creatorsList');

  if (creators.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">还没有采集任何达人信息<br>访问抖音用户主页，点击"采集达人信息"按钮开始采集</div>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = creators.map(creator => `
    <div class="creator-card" data-creator-id="${creator.id}">
      <div class="creator-header">
        <img src="${creator.avatar_url || 'https://via.placeholder.com/50'}" 
             alt="${creator.username}" 
             class="creator-avatar"
             onerror="this.src='https://via.placeholder.com/50'">
        <div class="creator-info">
          <div class="creator-name">${escapeHtml(creator.username || '未知')}</div>
          <div class="creator-bio">${escapeHtml(creator.bio || '暂无简介')}</div>
        </div>
      </div>
      <div class="creator-stats">
        <div class="creator-stat">
          <div class="creator-stat-label">粉丝</div>
          <div class="creator-stat-value">${formatNumber(creator.follower_count)}</div>
        </div>
        <div class="creator-stat">
          <div class="creator-stat-label">关注</div>
          <div class="creator-stat-value">${formatNumber(creator.following_count)}</div>
        </div>
        <div class="creator-stat">
          <div class="creator-stat-label">获赞</div>
          <div class="creator-stat-value">${formatNumber(creator.like_count)}</div>
        </div>
        <div class="creator-stat">
          <div class="creator-stat-label">作品</div>
          <div class="creator-stat-value">${formatNumber(creator.video_count)}</div>
        </div>
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: #999;">
        采集时间: ${formatDate(creator.collected_at)}
      </div>
    </div>
  `).join('');

  // 添加点击事件（可以扩展为查看详情）
  document.querySelectorAll('.creator-card').forEach(card => {
    card.addEventListener('click', () => {
      const creatorId = card.getAttribute('data-creator-id');
      // 可以在这里添加查看详情的功能
      console.log('点击了达人:', creatorId);
    });
  });
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return '未知';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + '分钟前';
  if (hours < 24) return hours + '小时前';
  if (days < 7) return days + '天前';
  
  return date.toLocaleDateString('zh-CN');
}

// 导出数据
async function exportData() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'exportData' });
    if (response && response.success) {
      const data = response.data;
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `douyin-creators-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showMessage('数据导出成功！', 'success');
    } else {
      showMessage('导出失败: ' + (response?.error || '未知错误'), 'error');
    }
  } catch (error) {
    console.error('导出数据失败:', error);
    showMessage('导出失败: ' + error.message, 'error');
  }
}

// 清空数据库
async function clearDatabase() {
  if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({ action: 'clearDatabase' });
    if (response && response.success) {
      showMessage('数据库已清空', 'success');
      loadCreators();
      loadStatistics();
    } else {
      showMessage('清空失败: ' + (response?.error || '未知错误'), 'error');
    }
  } catch (error) {
    console.error('清空数据库失败:', error);
    showMessage('清空失败: ' + error.message, 'error');
  }
}

// 显示消息提示
function showMessage(message, type = 'info') {
  // 创建消息元素
  const messageEl = document.createElement('div');
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-size: 14px;
    animation: slideDown 0.3s ease;
  `;

  document.body.appendChild(messageEl);

  setTimeout(() => {
    messageEl.style.animation = 'slideDown 0.3s ease reverse';
    setTimeout(() => messageEl.remove(), 300);
  }, 2000);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 加载数据
  loadCreators();
  loadStatistics();

  // 搜索功能
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  searchBtn.addEventListener('click', () => {
    loadCreators(searchInput.value.trim());
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadCreators(searchInput.value.trim());
    }
  });

  // 刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', () => {
    loadCreators(searchInput.value.trim());
    loadStatistics();
  });

  // 导出按钮
  document.getElementById('exportBtn').addEventListener('click', exportData);

  // 清空按钮
  document.getElementById('clearBtn').addEventListener('click', clearDatabase);
});

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      transform: translateX(-50%) translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);
