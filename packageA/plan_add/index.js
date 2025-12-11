Page({
  data: {
    title: '',
    category: '', 
    categories: [], 
    customCategory: '',
    showAddCategory: false,
    // 备选颜色和图标
    colors: [
      '#ff9f43', '#ff6b6b', '#ee5253', '#ff9ff3', '#f368e0', '#fab1a0', '#e17055', '#d63031', 
      '#feca57', '#00d2d3', '#1dd1a1', '#10ac84', '#c8d6e5', '#576574', '#222f3e', '#b8e994', 
      '#54a0ff', '#2e86de', '#5f27cd', '#341f97', '#48dbfb', '#0abde3', '#8395a7', '#222f3e', 
      '#a8d8ea', '#aa96da', '#fcbad3', '#ffffd2', '#84817a', '#d1ccc0', '#ff5252', '#706fd3'
    ],
    selectedColor: '#54a0ff', // 默认选中颜色
    
    emojis: [
      '📅', '💼', '🏃', '🏋️', '🧘‍♀️', '🚲', '🏊', '🏀', '⚽️', '🏸', '🎾', '🥊', '🧗', '🤸', 
      '💊', '💧', '💤', '🍎', '🍌', '🥑', '🥦', '🥩', '🍳', '☕️', '🍺', '🥢', '🧹', '🛌', 
      '🛀', '🧼', '🧺', '🪴', '📚', '💻', '📝', '💡', '🎓', '💰', '📈', '⏰', '📱', '🔋', 
      '🏆', '🎯', '✈️', '🎮', '🎸', '🎨', '🎤', '🎬', '🎧', '📷', '🎹', '🎲', '🧩', '🌞', 
      '🌈', '🔥', '✨', '🎉', '🐶', '🐱', '🐹', '🐰', '🦊', '🌲', '🌵', '🌻', '🌊', '⭐️'
    ],
    icon: '📅', // 默认图标

// 传入开始时间 (HH:mm)，返回1小时后的时间 (HH:mm)
// function getOneHourLater(timeStr) {
//   if (!timeStr) return '';
//   let [hours, minutes] = timeStr.split(':').map(Number);
//   hours += 1;
//   // 处理跨天情况 (比如 23:00 变成 00:00)
//   if (hours >= 24) {
//     hours = hours % 24; 
//   // 补零格式化 (比如 9 变成 '09')
//   const formatHour = hours.toString().padStart(2, '0');
//   const formatMinute = minutes.toString().padStart(2, '0');
//   return `${formatHour}:${formatMinute}`;
// }
    date: '', 
    startTime: '09:00',
    endTime: '10:00',
    
    showColorPicker: false
  },

  onLoad(options) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
    
    const cachedCats = wx.getStorageSync('plan_categories') || [];
    
    this.setData({ 
      date: options.date || dateStr,
      categories: cachedCats
    });
  },

  bindTitle(e) { this.setData({ title: e.detail.value }); },
  bindDateChange(e) { this.setData({ date: e.detail.value }); },
  bindStartTimeChange(e) { this.setData({ startTime: e.detail.value }); },
  bindEndTimeChange(e) { this.setData({ endTime: e.detail.value }); },

  
  // 选择分类 -> 自动应用该分类绑定的颜色/图标
  selectCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    const settings = wx.getStorageSync('plan_cat_settings') || {}; 
    let updateData = { category: cat };

    if (settings[cat]) {
        if (settings[cat].color) updateData.selectedColor = settings[cat].color;
        if (settings[cat].icon) updateData.icon = settings[cat].icon;
    }
    
    this.setData(updateData);
  },

  toggleAddCategory() {
    this.setData({ showAddCategory: !this.data.showAddCategory });
  },

  bindCategoryInput(e) {
    this.setData({ customCategory: e.detail.value });
  },

  confirmAddCategory() {
    const val = this.data.customCategory.trim();
    if (!val) return;
    
    const list = this.data.categories;
    if (!list.includes(val)) {
      list.push(val);
      wx.setStorageSync('plan_categories', list); // 存列表

      const randomColor = this.data.colors[Math.floor(Math.random() * this.data.colors.length)];
      this.saveCatSettings(val, randomColor, this.data.icon);

      this.setData({ 
        categories: list,
        category: val, 
        selectedColor: randomColor,
        customCategory: '',
        showAddCategory: false
      });
    } else {
      wx.showToast({ title: 'Category Exised', icon: 'none' });
    }
  },

  saveCatSettings(cat, color, icon) {
      if (!cat) return;
      const settings = wx.getStorageSync('plan_cat_settings') || {};
      settings[cat] = { color: color, icon: icon };
      wx.setStorageSync('plan_cat_settings', settings);
  },


  toggleColorPicker() { this.setData({ showColorPicker: !this.data.showColorPicker }); },
  
  // 选择颜色 -> 同时更新当前分类的绑定配置
  selectColor(e) { 
    const color = e.currentTarget.dataset.color;
    this.setData({ selectedColor: color, showColorPicker: false }); 
    
    if (this.data.category) {
        this.saveCatSettings(this.data.category, color, this.data.icon);
    }
  },

  selectEmoji(e) { 
    const icon = e.currentTarget.dataset.emoji;
    this.setData({ icon: icon });

    if (this.data.category) {
        this.saveCatSettings(this.data.category, this.data.selectedColor, icon);
    }
  },

  savePlan() {
    const { title, date, startTime, endTime, category, selectedColor, icon } = this.data;
    
    if (!title) return wx.showToast({ title: 'Add Your Plan', icon: 'none' });
    
    // 计算时长 (小时), 兼容 iOS 格式: YYYY/MM/DD
    const start = new Date(`${date.replace(/-/g, '/')} ${startTime}`);
    const end = new Date(`${date.replace(/-/g, '/')} ${endTime}`);
    
    if (end <= start) {
      return wx.showModal({
        title: 'Error', 
        content: 'End time must be after start time', 
        showCancel: false, 
        confirmText: 'OK'
      });
    }
    
    const durationHours = (end - start) / (1000 * 60 * 60);

    const newPlan = {
      id: Date.now(),
      type: 'plan',
      title, 
      date, 
      startTime, 
      endTime, 
      category: category || 'Uncategorized',
      color: selectedColor,
      icon: icon, 
      duration: durationHours.toFixed(1)
    };

    let plans = wx.getStorageSync('plans') || [];
    plans.push(newPlan);
    wx.setStorageSync('plans', plans);

    wx.showToast({ title: 'Done!', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 1000);
  }
})