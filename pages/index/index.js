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
    showDropdown: false
  },

  onShow() {
    this.loadHabits();
  },

  // ★★★ 1. 新增：安全日期解析 (修复 iOS/模拟器 数据为0的问题) ★★★
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

      // ★★★ 2. 核心修复：计算 Hours 数据 (Curve 图表源数据) ★★★
      const hoursData = new Array(24).fill(0);
      h.logs.forEach(l => {
          const t = typeof l === 'string' ? l : l.time;
          if (t) {
              // 使用 safeDate 解析时间，确保能读出 getHours
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
        
        // ★★★ 3. 必须返回这两个字段，Stats 页面才能画图 ★★★
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
    if (currentCategory === '全部' || currentCategory === 'All') {
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
    wx.showToast({ title: '记录已保存', icon: 'success' });
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
  goToDetail(e) { wx.navigateTo({ url: `/packageA/detail/index?id=${e.currentTarget.dataset.id}` }); }
})