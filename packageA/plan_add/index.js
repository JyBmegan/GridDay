Page({
  data: {
    // --- 基础信息 ---
    title: '',
    
    // --- 分类管理 ---
    category: '', 
    categories: [], // 初始为空，由用户添加
    customCategory: '',
    showAddCategory: false,

    // --- 样式素材 (与打卡页统一的莫兰迪/多巴胺色盘) ---
    colors: [
      '#ff9f43', '#ff6b6b', '#ee5253', '#ff9ff3', '#f368e0', '#fab1a0', '#e17055', '#d63031', 
      '#feca57', '#00d2d3', '#1dd1a1', '#10ac84', '#c8d6e5', '#576574', '#222f3e', '#b8e994', 
      '#54a0ff', '#2e86de', '#5f27cd', '#341f97', '#48dbfb', '#0abde3', '#8395a7', '#222f3e', 
      '#a8d8ea', '#aa96da', '#fcbad3', '#ffffd2', '#84817a', '#d1ccc0', '#ff5252', '#706fd3'
    ],
    selectedColor: '#54a0ff', // 默认选中颜色
    
    // --- 图标库 ---
    emojis: [
      '📅', '💼', '🏃', '🏋️', '🧘‍♀️', '🚲', '🏊', '🏀', '⚽️', '🏸', '🎾', '🥊', '🧗', '🤸', 
      '💊', '💧', '💤', '🍎', '🍌', '🥑', '🥦', '🥩', '🍳', '☕️', '🍺', '🥢', '🧹', '🛌', 
      '🛀', '🧼', '🧺', '🪴', '📚', '💻', '📝', '💡', '🎓', '💰', '📈', '⏰', '📱', '🔋', 
      '🏆', '🎯', '✈️', '🎮', '🎸', '🎨', '🎤', '🎬', '🎧', '📷', '🎹', '🎲', '🧩', '🌞', 
      '🌈', '🔥', '✨', '🎉', '🐶', '🐱', '🐹', '🐰', '🦊', '🌲', '🌵', '🌻', '🌊', '⭐️'
    ],
    icon: '📅', // 默认图标

    // --- 时间相关 ---
    date: '', 
    startTime: '09:00',
    endTime: '10:00',
    
    // --- UI控制 ---
    showColorPicker: false
  },

  onLoad(options) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
    
    // 1. 读取历史分类列表
    const cachedCats = wx.getStorageSync('plan_categories') || [];
    
    // 2. 读取日期（如果是从日历点击进来的）
    this.setData({ 
      date: options.date || dateStr,
      categories: cachedCats
    });
  },

  // --- 输入绑定 ---
  bindTitle(e) { this.setData({ title: e.detail.value }); },
  bindDateChange(e) { this.setData({ date: e.detail.value }); },
  bindStartTimeChange(e) { this.setData({ startTime: e.detail.value }); },
  bindEndTimeChange(e) { this.setData({ endTime: e.detail.value }); },

  // =========================================================
  // 分类与绑定逻辑 (Category Logic)
  // =========================================================
  
  // 1. 选择分类 -> 自动应用该分类绑定的颜色/图标
  selectCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    
    // 读取保存的设置
    const settings = wx.getStorageSync('plan_cat_settings') || {}; 
    // settings 结构: { '工作': {color: '#xxx', icon: '💼'}, '运动': {color: '#yyy', icon: '🏃'} }
    
    let updateData = { category: cat };
    
    // 如果这个分类之前存过颜色/图标，就自动选上
    if (settings[cat]) {
        if (settings[cat].color) updateData.selectedColor = settings[cat].color;
        if (settings[cat].icon) updateData.icon = settings[cat].icon;
    }
    
    this.setData(updateData);
  },

  // 2. 显示添加框
  toggleAddCategory() {
    this.setData({ showAddCategory: !this.data.showAddCategory });
  },

  // 3. 绑定输入
  bindCategoryInput(e) {
    this.setData({ customCategory: e.detail.value });
  },

  // 4. 确认添加分类
  confirmAddCategory() {
    const val = this.data.customCategory.trim();
    if (!val) return;
    
    const list = this.data.categories;
    if (!list.includes(val)) {
      list.push(val);
      wx.setStorageSync('plan_categories', list); // 存列表
      
      // 新分类默认给个随机色，并保存绑定关系
      const randomColor = this.data.colors[Math.floor(Math.random() * this.data.colors.length)];
      this.saveCatSettings(val, randomColor, this.data.icon);

      this.setData({ 
        categories: list,
        category: val, // 选中它
        selectedColor: randomColor,
        customCategory: '',
        showAddCategory: false
      });
    } else {
      wx.showToast({ title: '分类已存在', icon: 'none' });
    }
  },

  // 辅助：保存分类的颜色/图标设置
  saveCatSettings(cat, color, icon) {
      if (!cat) return;
      const settings = wx.getStorageSync('plan_cat_settings') || {};
      settings[cat] = { color: color, icon: icon };
      wx.setStorageSync('plan_cat_settings', settings);
  },

  // =========================================================
  // 样式选择逻辑 (Style Logic)
  // =========================================================

  toggleColorPicker() { this.setData({ showColorPicker: !this.data.showColorPicker }); },
  
  // 选择颜色 -> 同时更新当前分类的绑定配置
  selectColor(e) { 
    const color = e.currentTarget.dataset.color;
    this.setData({ selectedColor: color, showColorPicker: false }); 
    
    // 如果当前选中了分类，记录这个颜色偏好
    if (this.data.category) {
        this.saveCatSettings(this.data.category, color, this.data.icon);
    }
  },

  // 选择图标 -> 同时更新当前分类的绑定配置
  selectEmoji(e) { 
    const icon = e.currentTarget.dataset.emoji;
    this.setData({ icon: icon });
    
    // 如果当前选中了分类，记录这个图标偏好
    if (this.data.category) {
        this.saveCatSettings(this.data.category, this.data.selectedColor, icon);
    }
  },

  // =========================================================
  // 保存逻辑 (Save Logic)
  // =========================================================
  savePlan() {
    const { title, date, startTime, endTime, category, selectedColor, icon } = this.data;
    
    if (!title) return wx.showToast({ title: '请输入日程内容', icon: 'none' });
    
    // 计算时长 (小时)
    // 兼容 iOS 格式: YYYY/MM/DD
    const start = new Date(`${date.replace(/-/g, '/')} ${startTime}`);
    const end = new Date(`${date.replace(/-/g, '/')} ${endTime}`);
    
    if (end <= start) return wx.showToast({ title: '结束时间需晚于开始', icon: 'none' });
    
    const durationHours = (end - start) / (1000 * 60 * 60);

    const newPlan = {
      id: Date.now(),
      type: 'plan',
      title, 
      date, 
      startTime, 
      endTime, 
      category: category || '未分类',
      color: selectedColor,
      icon: icon, 
      duration: durationHours.toFixed(1)
    };

    let plans = wx.getStorageSync('plans') || [];
    plans.push(newPlan);
    wx.setStorageSync('plans', plans);

    wx.showToast({ title: '已添加', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 1000);
  }
})