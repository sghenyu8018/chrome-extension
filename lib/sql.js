// SQL.js加载器
// 从CDN加载SQL.js库
const loadSqlJs = async () => {
  if (typeof initSqlJs !== 'undefined') {
    return initSqlJs;
  }
  
  // 如果CDN加载失败，尝试使用本地文件
  try {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js';
    document.head.appendChild(script);
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        if (typeof initSqlJs !== 'undefined') {
          resolve(initSqlJs);
        } else {
          reject(new Error('SQL.js加载失败'));
        }
      };
      script.onerror = reject;
    });
  } catch (error) {
    console.error('加载SQL.js失败:', error);
    throw error;
  }
};

// 在background script中使用时，使用importScripts
if (typeof importScripts !== 'undefined') {
  importScripts('https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js');
}
