Page({
  data: {
    allHabits: [],
    filteredHabits: [],
    categories: [],
    currentCategory: '全部',
    // 弹窗数据
    showModal: false,
    currentHabit: null,
    currentTime: '',
    note: '',
    // ★★★ 下拉菜单状态 ★★★
    showDropdown: false
  },

  onShow() {
    this.loadHabits();
  },

  // 只需修改 loadHabits 函数，其他函数保持不变
  loadHabits() {
    const habits = wx.getStorageSync('habits') || [];
    // ★★★ 修改：只读缓存，无缓存就是空数组 ★★★
    const categories = wx.getStorageSync('categories') || []; 
    const todayStr = this.getTodayStr();

    const processedHabits = habits.map(h => {
      if (!h.logs) h.logs = [];
      const todayCount = h.logs.filter(log => {
         const t = typeof log === 'string' ? log : log.time;
         return t && t.startsWith(todayStr);
      }).length;
      return { 
        ...h, 
        count: todayCount,
        heatmap: this.generateHeatmapData(h.logs, h.color)
      };
    });

    this.setData({ allHabits: processedHabits, categories: categories });
    this.filterHabits();
  },

  // ★★★ 切换下拉菜单 ★★★
  toggleDropdown() {
    this.setData({ showDropdown: !this.data.showDropdown });
  },

  // ★★★ 关闭下拉菜单 (点击空白处触发) ★★★
  closeDropdown() {
    if (this.data.showDropdown) {
      this.setData({ showDropdown: false });
    }
  },

  // ★★★ 切换分类并关闭菜单 ★★★
  switchCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ 
      currentCategory: cat,
      showDropdown: false // 选完自动关
    });
    this.filterHabits();
  },

  filterHabits() {
    const { allHabits, currentCategory } = this.data;
    if (currentCategory === '全部') {
      this.setData({ filteredHabits: allHabits });
    } else {
      this.setData({ filteredHabits: allHabits.filter(h => h.category === currentCategory) });
    }
  },

  // ... 以下保持不变 ...
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
    const fullTime = `${this.formatDate(now)}T${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    
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
    wx.showToast({ title: '记录已保存', icon: 'success' });
  },

  closeModal() { this.setData({ showModal: false }); },
  bindNoteInput(e) { this.setData({ note: e.detail.value }); },
  stopProp() {}, // 阻止冒泡

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
  goToDetail(e) { wx.navigateTo({ url: `/packageA/detail/index?id=${e.currentTarget.dataset.id}` }); }
})