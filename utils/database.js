// 数据库操作封装
// 使用SQL.js在浏览器中运行SQLite

class Database {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  // 初始化SQL.js
  async initSqlJs() {
    if (this.SQL) {
      return this.SQL;
    }

    // 在background script中
    if (typeof importScripts !== 'undefined') {
      try {
        importScripts('https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js');
        this.SQL = await initSqlJs({
          locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`
        });
        return this.SQL;
      } catch (error) {
        console.error('加载SQL.js失败:', error);
        throw error;
      }
    }

    // 在其他环境中，假设已经通过script标签加载
    if (typeof initSqlJs === 'undefined') {
      throw new Error('SQL.js未加载，请先加载sql.js库');
    }

    this.SQL = await initSqlJs({
      locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`
    });
    return this.SQL;
  }

  // 初始化数据库
  async init() {
    if (this.initialized && this.db) {
      return this.db;
    }

    try {
      // 初始化SQL.js
      const SQL = await this.initSqlJs();
      
      // 从chrome.storage加载数据库
      const result = await chrome.storage.local.get(['database']);
      let dbData = result.database;

      // 如果数据库不存在，创建新的
      if (!dbData) {
        this.db = new SQL.Database();
        await this.createTables();
        await this.saveDatabase();
        this.initialized = true;
        return this.db;
      }

      // 加载现有数据库
      const uint8Array = new Uint8Array(dbData);
      this.db = new SQL.Database(uint8Array);
      this.initialized = true;
      return this.db;
    } catch (error) {
      console.error('数据库初始化失败:', error);
      throw error;
    }
  }

  // 创建数据表
  async createTables() {
    if (!this.db) {
      await this.init();
    }

    // 创建达人信息表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS creators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE,
        username TEXT,
        avatar_url TEXT,
        bio TEXT,
        follower_count INTEGER,
        following_count INTEGER,
        like_count INTEGER,
        video_count INTEGER,
        collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
      )
    `);

    // 创建作品信息表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER,
        video_id TEXT UNIQUE,
        title TEXT,
        cover_url TEXT,
        play_count INTEGER,
        like_count INTEGER,
        comment_count INTEGER,
        share_count INTEGER,
        created_at DATETIME,
        collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES creators(id)
      )
    `);

    await this.saveDatabase();
  }

  // 保存数据库到chrome.storage
  async saveDatabase() {
    if (!this.db) return;

    try {
      const data = this.db.export();
      const buffer = Array.from(data);
      await chrome.storage.local.set({ database: buffer });
    } catch (error) {
      console.error('保存数据库失败:', error);
      throw error;
    }
  }

  // 插入或更新达人信息
  async upsertCreator(creatorData) {
    if (!this.db) {
      await this.init();
    }

    const {
      user_id,
      username,
      avatar_url,
      bio,
      follower_count,
      following_count,
      like_count,
      video_count
    } = creatorData;

    // 检查是否已存在
    const stmt = this.db.prepare(`SELECT id FROM creators WHERE user_id = ?`);
    stmt.bind([user_id]);
    const existing = [];
    while (stmt.step()) {
      existing.push(stmt.getAsObject());
    }
    stmt.free();

    if (existing.length > 0) {
      // 更新现有记录
      const updateStmt = this.db.prepare(
        `UPDATE creators SET 
          username = ?, avatar_url = ?, bio = ?,
          follower_count = ?, following_count = ?, like_count = ?, video_count = ?,
          updated_at = datetime('now')
        WHERE user_id = ?`
      );
      updateStmt.run([username, avatar_url, bio, follower_count, following_count, like_count, video_count, user_id]);
      updateStmt.free();
      
      const resultStmt = this.db.prepare(`SELECT id FROM creators WHERE user_id = ?`);
      resultStmt.bind([user_id]);
      resultStmt.step();
      const result = resultStmt.getAsObject();
      resultStmt.free();
      await this.saveDatabase();
      return result.id; // 返回creator_id
    } else {
      // 插入新记录
      const insertStmt = this.db.prepare(
        `INSERT INTO creators 
          (user_id, username, avatar_url, bio, follower_count, following_count, like_count, video_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      insertStmt.run([user_id, username, avatar_url, bio, follower_count, following_count, like_count, video_count]);
      insertStmt.free();
      
      const resultStmt = this.db.prepare(`SELECT id FROM creators WHERE user_id = ?`);
      resultStmt.bind([user_id]);
      resultStmt.step();
      const result = resultStmt.getAsObject();
      resultStmt.free();
      await this.saveDatabase();
      return result.id; // 返回creator_id
    }
  }

  // 插入作品信息
  async insertVideo(videoData) {
    if (!this.db) {
      await this.init();
    }

    const {
      creator_id,
      video_id,
      title,
      cover_url,
      play_count,
      like_count,
      comment_count,
      share_count,
      created_at
    } = videoData;

    // 检查是否已存在
    const stmt = this.db.prepare(`SELECT id FROM videos WHERE video_id = ?`);
    stmt.bind([video_id]);
    const existing = [];
    while (stmt.step()) {
      existing.push(stmt.getAsObject());
    }
    stmt.free();

    if (existing.length > 0) {
      // 更新现有记录
      const updateStmt = this.db.prepare(
        `UPDATE videos SET 
          title = ?, cover_url = ?, play_count = ?, like_count = ?,
          comment_count = ?, share_count = ?, created_at = ?
        WHERE video_id = ?`
      );
      updateStmt.run([title, cover_url, play_count, like_count, comment_count, share_count, created_at, video_id]);
      updateStmt.free();
    } else {
      // 插入新记录
      const insertStmt = this.db.prepare(
        `INSERT INTO videos 
          (creator_id, video_id, title, cover_url, play_count, like_count, comment_count, share_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      insertStmt.run([creator_id, video_id, title, cover_url, play_count, like_count, comment_count, share_count, created_at]);
      insertStmt.free();
    }

    await this.saveDatabase();
  }

  // 批量插入作品
  async insertVideos(videos) {
    if (!this.db) {
      await this.init();
    }

    for (const video of videos) {
      await this.insertVideo(video);
    }
  }

  // 查询所有达人
  async getAllCreators() {
    if (!this.db) {
      await this.init();
    }

    const stmt = this.db.prepare(`SELECT * FROM creators ORDER BY collected_at DESC`);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  // 查询达人的所有作品
  async getVideosByCreator(creatorId) {
    if (!this.db) {
      await this.init();
    }

    const stmt = this.db.prepare(`SELECT * FROM videos WHERE creator_id = ? ORDER BY created_at DESC`);
    stmt.bind([creatorId]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  // 搜索达人
  async searchCreators(keyword) {
    if (!this.db) {
      await this.init();
    }

    const stmt = this.db.prepare(`SELECT * FROM creators WHERE username LIKE ? OR bio LIKE ? ORDER BY collected_at DESC`);
    stmt.bind([`%${keyword}%`, `%${keyword}%`]);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  // 获取统计信息
  async getStatistics() {
    if (!this.db) {
      await this.init();
    }

    const stmt1 = this.db.prepare(`SELECT COUNT(*) as count FROM creators`);
    stmt1.step();
    const creatorCount = stmt1.getAsObject().count;
    stmt1.free();

    const stmt2 = this.db.prepare(`SELECT COUNT(*) as count FROM videos`);
    stmt2.step();
    const videoCount = stmt2.getAsObject().count;
    stmt2.free();

    const stmt3 = this.db.prepare(`SELECT SUM(follower_count) as total FROM creators`);
    stmt3.step();
    const totalFollowers = stmt3.getAsObject().total || 0;
    stmt3.free();

    return {
      creatorCount: creatorCount || 0,
      videoCount: videoCount || 0,
      totalFollowers: totalFollowers || 0
    };
  }

  // 导出数据为JSON
  async exportData() {
    if (!this.db) {
      await this.init();
    }

    const creators = await this.getAllCreators();
    const data = [];

    for (const creator of creators) {
      const videos = await this.getVideosByCreator(creator.id);
      data.push({
        ...creator,
        videos
      });
    }

    return data;
  }

  // 清空数据库
  async clearDatabase() {
    if (!this.db) {
      await this.init();
    }

    this.db.run(`DELETE FROM videos`);
    this.db.run(`DELETE FROM creators`);
    await this.saveDatabase();
  }
}

// 创建全局数据库实例
const db = new Database();
