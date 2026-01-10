Page({
  data: {
    isEdit: false,
    habitId: null,
    name: '',
    icon: '',
    goal: 1,
    
    category: '', 
    customCategory: '',
    showAddCategory: false,
    categoryList: [], 
    
    // 颜色和图标设置
    colors: [
    /* Row 1: Red/Pink (Deep -> Light) */
    '#492620', '#71323a', '#983e54', '#bf4a6e', '#e65588', '#e8779d', '#ea99b2', '#ecbbc7', '#eddcdb', 

    /* Row 2: Pink (Deep -> Light) */
    '#4e301d', '#764430', '#9d5742', '#c56b54', '#ec7e66','#ed9882', '#edb19e', '#edb19e', '#ede3d6', 
    
    /* Row 3: Orange/Brown (Deep -> Light) */
    '#523a1a', '#7a5828', '#a17535', '#c89243', '#efaf50','#efbe70', '#eecc90', '#eedbb0', '#ede9d0',
    
    /* Row 4: Yellow/Beige (Deep -> Light) */
    '#473e1e', '#726725', '#9d8f2c', '#c8b833', '#f2e03a','#f0e55f', '#ede983', '#ebeea8', '#e8f2cc',
    
    /* Row 5: Green (Deep -> Light) */
    '#3b4122', '#58652b', '#748834', '#91ac3d', '#adcf46','#bad969', '#c7e38c', '#d4edaf', '#e1f6d2', 
    
    /* Row 6: Mild Green (Deep -> Light)*/
    '#303d27', '#3e5d32', '#4c7d3c', '#5a9d47', '#68bd51','#85cc74', '#a2da96', '#bfe8b9', '#dcf6db',

    /* Row 7: Cyan (Deep -> Light)*/
    '#263936', '#3b564e', '#4f7366', '#64907e', '#78ac96','#92beab', '#abd0bf', '#c5e2d4', '#def3e8',
    
    /* Row 8: Blue (Deep -> Light) */
    '#1c3445', '#374e6b', '#526890', '#6d82b6', '#879bdb','#9db1e2', '#b3c6e8', '#c9dbef', '#dff0f5', 
    
    /* Row 9: Mild Mauve (Deep -> Light) */
    '#2c2f46', '#49486c', '#666192', '#837ab8', '#a093dd','#b3a9e4', '#c5bfea', '#d7d5f0', '#e9ebf6', 

    /* Row 10: Purple (Deep -> Light) */
    '#3c2947', '#5b426d', '#7a5a93', '#9972b9', '#b88ade','#c7a3e3', '#d5bce8', '#e3d5ed', '#f1edf2', 

    /* Row 11: 过渡 */
    '#1e1524', '#3f3545', '#5f5466', '#7f7487','#9f93a8','#b4abbb', '#c9c2cd', '#ded9e0', '#f2f0f2',
    
    /* Row 12: 中性灰、高级灰、白色系 */
    '#000000', '#1f1f1f', '#3d3d3d', '#5b5b5b','#797979','#989898', '#b6b6b6', '#d4d4d4', '#f2f2f2',],

    selectedColor: '#ff9f43',

    emojis: [ '💻', '💼', '📅', '📊', '📝', '📁', '📌', '📎', 
    '📞', '📧', '🗑️', '🖨️', '📈', '💡', '🧠', '⌚', '🏠', '🛒', '🛍️', '💵', '💳', '📦', '🔑', '🧹', '🍽️', '☕', '🚿', '🛌', '🛋️', '🧺', '🪴', '🔌', '🏃', '🏋️', '🧘', '🚲', '🏊', '🏀', '👣', '💊', '🩺', '🩹', '💧', '🍎', '🥗', '🏋️‍♀️', '🧗', '🥊', '🚗', '✈️', '🚇', '🚌', '⛽', '🗺️', '🚦', '🎉', 
    '🎂', '🎁', '🎮', '🎧', '📖', '🎨', '🏖️', '🍿', '⚙️', '🔍', '🔔', '✅', '❌', '⚠️', '❤️', '⭐', '🔒', '👀', '🔥', '⚡', '🚫', '📢', '💬', '➕']
  },

  onLoad(options) {
    const cachedCats = wx.getStorageSync('categories') || [];
    this.setData({ categoryList: cachedCats });

    // Check for ID to enable Edit Mode
    if (options.id) {
      wx.setNavigationBarTitle({ title: 'Edit Habit' });
      this.loadHabitData(options.id);
    }
  },

  loadHabitData(id) {
    const habits = wx.getStorageSync('habits') || [];
    const target = habits.find(h => h.id == id); 
    if (target) {
      this.setData({
        isEdit: true,
        habitId: target.id,
        name: target.name,
        icon: target.icon,
        selectedColor: target.color,
        goal: target.goal || 1,
        category: target.category || '',
        categoryList: this.ensureCategoryExists(target.category)
      });
    }
  },

  ensureCategoryExists(cat) {
    let list = this.data.categoryList;
    if (cat && !list.includes(cat)) {
      list.push(cat);
    }
    return list;
  },

  bindNameInput(e) { this.setData({ name: e.detail.value }) },
  selectEmoji(e) { this.setData({ icon: e.currentTarget.dataset.emoji }); },
  selectColor(e) { this.setData({ selectedColor: e.currentTarget.dataset.color }); },
  decreaseGoal() { if (this.data.goal > 1) this.setData({ goal: this.data.goal - 1 }); },
  increaseGoal() { this.setData({ goal: this.data.goal + 1 }); },

  selectCategory(e) { this.setData({ category: e.currentTarget.dataset.item }); },
  toggleAddCategory() { this.setData({ showAddCategory: !this.data.showAddCategory }); },
  bindCategoryInput(e) { this.setData({ customCategory: e.detail.value }); },

  deleteCategory(e) {
    const targetCat = e.currentTarget.dataset.item;
  
    wx.showModal({
      title: 'Delete Category',
      content: `Remove "${targetCat}" from options?`,
      confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.categoryList.filter(c => c !== targetCat);
          wx.setStorageSync('categories', list);
        // 更新页面数据
          this.setData({ 
            categoryList: list,
            category: this.data.category === targetCat ? '' : this.data.category
          });
        
          wx.showToast({ title: 'Deleted', icon: 'none' });
        }
      }
    });
  },
  
  confirmAddCategory() {
    const val = this.data.customCategory.trim();
    if (!val) return;
    const list = this.data.categoryList;
    if (!list.includes(val)) {
      list.push(val);
      wx.setStorageSync('categories', list);
      this.setData({ categoryList: list, category: val, customCategory: '', showAddCategory: false });
    } else {
      wx.showToast({ title: 'Category already exists', icon: 'none' });
    }
  },

  saveHabit() {
    const { name, icon, selectedColor, goal, category, isEdit, habitId } = this.data;
    if (!name) return wx.showToast({ title: 'Please Name the Habit', icon: 'none' });
    if (!icon) return wx.showToast({ title: 'Please Select a Icon', icon: 'none' });

    let habits = wx.getStorageSync('habits') || [];
    
    if (isEdit) {
      const index = habits.findIndex(h => h.id === habitId);
      if (index !== -1) {
        habits[index] = {
          ...habits[index], 
          name, 
          icon, 
          color: selectedColor, 
          goal, 
          category
        };
        wx.showToast({ title: 'Habit Updated!', icon: 'success' });
      } else {
        wx.showToast({ title: 'Error: Habit not found', icon: 'none' });
        return;
      }
    } else {
      const newHabit = {
        id: Date.now(),
        name, 
        icon, 
        color: selectedColor, 
        goal, 
        category,
        logs: []
      };
      habits.push(newHabit);
      wx.showToast({ title: 'Habit Created!', icon: 'success' });
    }

    wx.setStorageSync('habits', habits);
    
    setTimeout(() => { wx.navigateBack(); }, 1000);
  }
})