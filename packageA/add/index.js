Page({
  data: {
    name: '',
    icon: '',
    goal: 1,
    
    // ★★★ 修改：初始分类为空，没有任何预设 ★★★
    category: '', 
    customCategory: '',
    showAddCategory: false,
    categoryList: [], // 空空如也
    
    // 颜色和图标保持不变...
    colors: ['#ff9f43', '#ff6b6b', '#ee5253', '#ff9ff3', '#f368e0', '#fab1a0', '#e17055', '#d63031', '#feca57', '#00d2d3', '#1dd1a1', '#10ac84', '#c8d6e5', '#576574', '#222f3e', '#b8e994', '#54a0ff', '#2e86de', '#5f27cd', '#341f97', '#48dbfb', '#0abde3', '#8395a7', '#222f3e', '#a8d8ea', '#aa96da', '#fcbad3', '#ffffd2', '#84817a', '#d1ccc0', '#ff5252', '#706fd3'],
    selectedColor: '#ff9f43',
    emojis: ['🏃', '🏋️', '🧘‍♀️', '🚲', '🏊', '🏀', '⚽️', '🏸', '🎾', '🥊', '🧗', '🤸', '💊', '💧', '💤', '🍎', '🍌', '🥑', '🥦', '🥩', '🍳', '☕️', '🍺', '🥢', '🧹', '🛌', '🛀', '🧼', '🧺', '🪴', '📚', '💻', '📝', '📅', '💡', '🎓', '💼', '💰', '📈', '⏰', '📱', '🔋', '🏆', '🎯', '✈️', '🎮', '🎸', '🎨', '🎤', '🎬', '🎧', '📷', '🎹', '🎲', '🧩', '🌞', '🌈', '🔥', '✨', '🎉', '🐶', '🐱', '🐹', '🐰', '🦊', '🌲', '🌵', '🌻', '🌊', '⭐️']
  },

  onLoad() {
    // ★★★ 修改：只读取用户存的，绝不给默认值 ★★★
    const cachedCats = wx.getStorageSync('categories');
    if (cachedCats && cachedCats.length > 0) {
      this.setData({ categoryList: cachedCats });
    }
  },

  bindNameInput(e) { this.setData({ name: e.detail.value }) },
  selectEmoji(e) { this.setData({ icon: e.currentTarget.dataset.emoji }); },
  selectColor(e) { this.setData({ selectedColor: e.currentTarget.dataset.color }); },
  decreaseGoal() { if (this.data.goal > 1) this.setData({ goal: this.data.goal - 1 }); },
  increaseGoal() { this.setData({ goal: this.data.goal + 1 }); },

  selectCategory(e) { this.setData({ category: e.currentTarget.dataset.item }); },
  toggleAddCategory() { this.setData({ showAddCategory: !this.data.showAddCategory }); },
  bindCategoryInput(e) { this.setData({ customCategory: e.detail.value }); },
  
  confirmAddCategory() {
    const val = this.data.customCategory.trim();
    if (!val) return;
    const list = this.data.categoryList;
    if (!list.includes(val)) {
      list.push(val);
      wx.setStorageSync('categories', list);
      this.setData({ categoryList: list, category: val, customCategory: '', showAddCategory: false });
    } else {
      wx.showToast({ title: '分类已存在', icon: 'none' });
    }
  },

  saveHabit() {
    const { name, icon, selectedColor, goal, category } = this.data;
    if (!name) return wx.showToast({ title: '请输入名称', icon: 'none' });
    if (!icon) return wx.showToast({ title: '请选择图标', icon: 'none' });

    let habits = wx.getStorageSync('habits') || [];
    const newHabit = {
      id: Date.now(),
      name, icon, color: selectedColor, goal, category,
      logs: []
    };
    habits.push(newHabit);
    wx.setStorageSync('habits', habits);
    wx.showToast({ title: '创建成功', icon: 'success' });
    setTimeout(() => { wx.navigateBack(); }, 1000);
  }
})