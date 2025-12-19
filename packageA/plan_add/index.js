Page({
  data: {
    isEdit: false,
    planId: null,
    title: '',
    category: '', 
    categories: [], 
    customCategory: '',
    showAddCategory: false,
    // 备选颜色和图标
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

    selectedColor: '#54a0ff', // 默认选中颜色
    
    emojis: [ '💻', '💼', '📅', '📊', '📝', '📁', '📌', '📎', 
    '📞', '📧', '🗑️', '🖨️', '📈', '💡', '🧠', '⌚', '🏠', '🛒', '🛍️', '💵', '💳', '📦', '🔑', '🧹', '🍽️', '☕', '🚿', '🛌', '🛋️', '🧺', '🪴', '🔌', '🏃', '🏋️', '🧘', '🚲', '🏊', '🏀', '👣', '💊', '🩺', '🩹', '💧', '🍎', '🥗', '🏋️‍♀️', '🧗', '🥊', '🚗', '✈️', '🚇', '🚌', '⛽', '🗺️', '🚦', '🎉', 
    '🎂', '🎁', '🎮', '🎧', '📖', '🎨', '🏖️', '🍿', '⚙️', '🔍', '🔔', '✅', '❌', '⚠️', '❤️', '⭐', '🔒', '👀', '🔥', '⚡', '🚫', '📢', '💬', '➕'],
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
    const cachedCats = wx.getStorageSync('plan_categories') || [];

    if (options.id) {
       wx.setNavigationBarTitle({ title: 'Edit Plan' });
       this.setData({ categories: cachedCats });
       this.loadPlanData(options.id);
       return; 
    }
    
    const now = new Date();
    const dateStr = options.date || `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
    
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const formatTime = (h, m) => `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
    let startTimeStr = options.startTime || formatTime(currentH, currentM);
    
    let [sh, sm] = startTimeStr.split(':').map(Number);
    let endTotalMins = sh * 60 + sm + 60; // +60分钟
    let eh = Math.floor(endTotalMins / 60);
    let em = endTotalMins % 60;
    if (eh >= 24) { eh = 23; em = 59; }
    let endTimeStr = formatTime(eh, em);
    let initData = { 
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      categories: cachedCats
    };

    const copiedPlan = wx.getStorageSync('copied_plan_buffer');

    if (copiedPlan) {
      wx.showToast({ title: 'Pasted from clipboard', icon: 'none' });

      if (copiedPlan.duration) {
          const durationMins = Math.round(parseFloat(copiedPlan.duration) * 60);
          let newEndTotalMins = (sh * 60 + sm) + durationMins;
          let neh = Math.floor(newEndTotalMins / 60);
          let nem = newEndTotalMins % 60;
          if (neh >= 24) { neh = 23; nem = 59; }
          endTimeStr = formatTime(neh, nem);
      }

      initData = {
          ...initData,
          title: copiedPlan.title,
          category: copiedPlan.category,
          selectedColor: copiedPlan.color,
          icon: copiedPlan.icon,
          endTime: endTimeStr,
          categories: this.ensureCategoryExists(copiedPlan.category, cachedCats)
      };

      wx.removeStorageSync('copied_plan_buffer');
    }
    this.setData(initData);
  },

  loadPlanData(id) {
    const plans = wx.getStorageSync('plans') || [];
    const target = plans.find(p => p.id == id);
    if (target) {
        this.setData({
            isEdit: true,
            planId: target.id,
            title: target.title,
            date: target.date,
            startTime: target.startTime,
            endTime: target.endTime,
            category: target.category,
            selectedColor: target.color,
            icon: target.icon,
            categories: this.ensureCategoryExists(target.category, this.data.categories)
        });
    }
  },

  ensureCategoryExists(cat, list) {
    if (cat && !list.includes(cat)) {
      const newList = [...list, cat];
      return newList;
    }
    return list;
  },

  bindTitle(e) { this.setData({ title: e.detail.value }); },
  bindDateChange(e) { this.setData({ date: e.detail.value }); },
  bindStartTimeChange(e) { this.setData({ startTime: e.detail.value }); },
  bindEndTimeChange(e) { this.setData({ endTime: e.detail.value }); },

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

  deleteCategory(e) {
    const targetCat = e.currentTarget.dataset.cat;
    wx.showModal({
      title: 'Delete Category',
      content: `Remove "${targetCat}"?`,
      confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.categories.filter(c => c !== targetCat);
          wx.setStorageSync('plan_categories', list);
            this.setData({ 
                categories: list,
                category: this.data.category === targetCat ? '' : this.data.category
            });
          wx.showToast({ title: 'Deleted', icon: 'none' });
        }
      }
    });
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
    console.log('Save button clicked'); // 调试：看控制台有没有这句话
    const { title, date, startTime, endTime, category, selectedColor, icon, isEdit, planId } = this.data;
    
    // 1. 校验
    if (!title) return wx.showToast({ title: 'Please enter a title', icon: 'none' });
    
    // 2. 时间计算
    try {
      const start = new Date(`${date.replace(/-/g, '/')} ${startTime}`);
      const end = new Date(`${date.replace(/-/g, '/')} ${endTime}`);
      
      if (end <= start) {
        return wx.showModal({
          title: 'Time Error', 
          content: 'End time must be after start time', 
          showCancel: false, 
          confirmText: 'OK'
        });
      }
      
      const durationHours = (end - start) / (1000 * 60 * 60);

      // 3. 构造数据对象
      let plans = wx.getStorageSync('plans') || [];
      
      if (isEdit) {
          // 编辑模式：找到旧数据并替换
          const index = plans.findIndex(p => p.id == planId);
          if (index !== -1) {
              plans[index] = {
                  ...plans[index], // 保留其他可能存在的字段
                  title, date, startTime, endTime, 
                  category: category || 'Uncategorized',
                  color: selectedColor, icon, 
                  duration: durationHours.toFixed(1)
              };
              wx.showToast({ title: 'Updated!', icon: 'success' });
          } else {
              // 极端情况：编辑时找不到原数据，当做新增处理
              const newPlan = {
                  id: Date.now(), type: 'plan', title, date, startTime, endTime, 
                  category: category || 'Uncategorized', color: selectedColor, icon, duration: durationHours.toFixed(1)
              };
              plans.push(newPlan);
          }
      } else {
          // 新增模式
          const newPlan = {
              id: Date.now(),
              type: 'plan',
              title, date, startTime, endTime, 
              category: category || 'Uncategorized',
              color: selectedColor, icon, 
              duration: durationHours.toFixed(1)
          };
          plans.push(newPlan);
          wx.showToast({ title: 'Created!', icon: 'success' });
      }

      // 4. 保存并返回
      wx.setStorageSync('plans', plans);
      setTimeout(() => wx.navigateBack(), 1000);

    } catch (err) {
      console.error('Save failed:', err);
      wx.showToast({ title: 'Save Error', icon: 'none' });
    }
  }
})