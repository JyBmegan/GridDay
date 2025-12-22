Page({
  data: {
    allHabits: [],
    filteredHabits: [],
    categories: [],
    currentCategory: 'All',
    showModal: false,
    currentHabit: null,
    currentTime: '',
    note: '',
    showDropdown: false,
  },

  onShow() {
    this.loadHabits();
  },

  safeDate(dateInput) {
    if (!dateInput) return new Date();
    if (typeof dateInput === 'number') return new Date(dateInput);
    // 替换 - 为 /，解决 ISO 格式兼容性
    return new Date(dateInput.toString().replace(/-/g, '/'));
  },

  loadHabits() {
    const habits = wx.getStorageSync('habits') || [];
    const categories = wx.getStorageSync('categories') || []; 
    const todayStr = this.getTodayStr();

    const processedHabits = habits.map(h => {
      if (!h.logs) h.logs = [];
      
      const todayCount = h.logs.filter(log => {
         const t = typeof log === 'string' ? log : log.time;
         return t && t.startsWith(todayStr);
      }).length;

      const hoursData = new Array(24).fill(0);
      h.logs.forEach(l => {
          const t = typeof l === 'string' ? l : l.time;
          if (t) {
              const d = this.safeDate(t);
              const hour = d.getHours();
              if (!isNaN(hour) && hour >= 0 && hour < 24) {
                  hoursData[hour]++;
              }
          }
      });

      return { 
        ...h, 
        count: todayCount,
        heatmap: this.generateHeatmapData(h.logs, h.color),

        hoursData: hoursData, 
        ec: { lazyLoad: true } 
      };
    });

    this.setData({ allHabits: processedHabits, categories: categories });
    this.filterHabits();
  },

  toggleDropdown() { this.setData({ showDropdown: !this.data.showDropdown }); },
  closeDropdown() { if (this.data.showDropdown) this.setData({ showDropdown: false }); },
  
  switchCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ currentCategory: cat, showDropdown: false });
    this.filterHabits();
  },

  filterHabits() {
    const { allHabits, currentCategory } = this.data;
    if (currentCategory === 'All' || currentCategory === 'All') {
      this.setData({ filteredHabits: allHabits });
    } else {
      this.setData({ filteredHabits: allHabits.filter(h => h.category === currentCategory) });
    }
  },

  checkIn(e) {
    const id = e.currentTarget.dataset.id;
    const habit = this.data.allHabits.find(h => h.id === id);
    if (!habit) return;

    const now = new Date();
    const timeDisplay = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    wx.vibrateShort({ type: 'medium' });

    this.setData({ showModal: true, currentHabit: habit, currentTime: timeDisplay, note: '' });
  },

  confirmCheckIn() {
    const { currentHabit, note } = this.data;
    const now = new Date();
    // ISO 格式
    const fullTime = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}T${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    
    const logRecord = { time: fullTime, note: note || '' };
    
    let rawHabits = wx.getStorageSync('habits') || [];
    const targetIndex = rawHabits.findIndex(h => h.id === currentHabit.id);
    if (targetIndex !== -1) {
        if (!rawHabits[targetIndex].logs) rawHabits[targetIndex].logs = [];
        rawHabits[targetIndex].logs.push(logRecord);
        wx.setStorageSync('habits', rawHabits);
    }

    this.setData({ showModal: false });
    this.loadHabits();
    wx.showToast({ title: 'Recorded!', icon: 'success' });
  },

  closeModal() { this.setData({ showModal: false }); },
  bindNoteInput(e) { this.setData({ note: e.detail.value }); },
  stopProp() {}, 

  generateHeatmapData(logs, baseColor) {
    const weeksNeeded = 26; const daysPerWeek = 7; let heatmap = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); 
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + (6 - dayOfWeek)); 
    let currentDate = new Date(endDate);
    currentDate.setDate(currentDate.getDate() - (weeksNeeded * 7) + 1);

    const logMap = {};
    logs.forEach(logItem => {
        let timeStr = (typeof logItem === 'string') ? logItem : logItem.time;
        if (timeStr) {
          const datePart = timeStr.substring(0, 10); 
          logMap[datePart] = (logMap[datePart] || 0) + 1;
        }
    });

    for (let w = 0; w < weeksNeeded; w++) {
      let weekColumn = [];
      for (let d = 0; d < daysPerWeek; d++) {
        const dateStr = this.formatDate(currentDate);
        const count = logMap[dateStr] || 0;
        let level = 0;
        if (count > 0) level = count >= 4 ? 4 : count;
        weekColumn.push({ date: dateStr, count, level, isToday: dateStr === this.getTodayStr() });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      heatmap.push(weekColumn);
    }
    return heatmap;
  },

  formatDate(d) { return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`; },
  getTodayStr() { return this.formatDate(new Date()); },
  goToAdd() { wx.navigateTo({ url: '/packageA/add/index' }); },
  
  // Add Edit and Delte button
  showHabitAction(e) {
    const id = e.currentTarget.dataset.id;
    const habit = this.data.allHabits.find(h => h.id === id);
    if (!habit) return;

    wx.showActionSheet({
      itemList: ['View Detail', 'Edit Habit', 'Delete'],
      itemColor: '#333333',
      success: (res) => {
        if (res.tapIndex === 0) {
          // 1. View Detail 
          wx.navigateTo({ url: `/packageA/detail/index?id=${id}` });
        } else if (res.tapIndex === 1) {
          // 2. Edit Habit 
          wx.navigateTo({ url: `/packageA/add/index?id=${id}` });
        } else if (res.tapIndex === 2) {
          // 3. Delete
          this.deleteHabitConfirm(id, habit.name);
        }
      }
    });
  },

  deleteHabitConfirm(id, name) {
    wx.showModal({
      title: 'Delete Habit?',
      content: `Delete "${name}" permanently?`,
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          let habits = wx.getStorageSync('habits') || [];
          const newHabits = habits.filter(h => h.id !== id);
          wx.setStorageSync('habits', newHabits);
          
          this.loadHabits(); // 刷新首页列表
          wx.showToast({ title: 'Deleted', icon: 'success' });
        }
      }
    });
  },
})