const HOUR_HEIGHT = 50; 

Page({
  data: {
    year: 0, month: 0, monthStr: '',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    calendarDays: [],
    selectedDate: '',
    timeSlots: [],
    timelinePlans: [],
    totalHours: 0,
    categoryStats: [],
    isDragging: false,
    dragTargetId: null,
    dragType: '',
    dragStartY: 0,
    initialTop: 0,
    initialHeight: 0
  },

  onShow() {
    const today = new Date();
    const dateStr = this.data.selectedDate || this.formatDate(today);
    
    // const allPlans = wx.getStorageSync('plans') || [];
    // console.log('【Plan页面】读取缓存总数:', allPlans.length);
    // console.log('【Plan页面】当前选中日期:', dateStr);
    
    this.initCalendar(new Date(dateStr));
    this.generateTimeSlots();

    // if (this.data.selectedDate) {
    //   this.loadTimeline(this.data.selectedDate);
    // }
  },

  normalizeDate(dateInput) {
    if (!dateInput) return '';
    const dateObj = new Date(dateInput.toString().replace(/-/g, '/'));
    if (isNaN(dateObj.getTime())) return dateInput; 
    const y = dateObj.getFullYear();
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const d = dateObj.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  initCalendar(dateObj) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const dateStr = this.normalizeDate(this.formatDate(dateObj));

    this.setData({
      year, month,
      monthStr: dateObj.toLocaleString('default', { month: 'long', year: 'numeric' }),
      selectedDate: dateStr
    });
    this.generateCalendarGrid(year, month);
    this.loadTimeline(dateStr);
  },

  generateCalendarGrid(year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay(); 
    const daysInMonth = new Date(year, month, 0).getDate();
    const allPlans = wx.getStorageSync('plans') || [];
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ empty: true });
    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${year}-${month.toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
      const dayPlans = allPlans.filter(p => this.normalizeDate(p.date) === dStr);
      // 提取颜色点
      const dots = [...new Set(dayPlans.map(p => p.color))].slice(0, 3);
      days.push({ day: i, fullDate: dStr, dots });
    }
    this.setData({ calendarDays: days });
  },

  selectDay(e) {
    const date = e.currentTarget.dataset.date;
    if (!date) return;
    this.setData({ selectedDate: date });
    this.loadTimeline(date);
  },

  loadTimeline(dateStr) {
    const allPlans = wx.getStorageSync('plans') || [];
    const targetDate = this.normalizeDate(dateStr);
    const todayPlans = allPlans.filter(p => this.normalizeDate(p.date) === targetDate);
    // console.log(`【Plan页面】日期 ${targetDate} 匹配到计划数:`, todayPlans.length);
    let total = 0;
    const catMap = {};
    
    const processed = todayPlans.map(p => {
      if (!p.startTime || !p.endTime) return null;
      const [startH, startM] = p.startTime.split(':').map(Number);
      const [endH, endM] = p.endTime.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const durationMinutes = endMinutes - startMinutes;
      const hours = durationMinutes / 60;

      total += hours;
      const color = p.color || '#54a0ff';
      if (!catMap[p.category]) catMap[p.category] = { name: p.category, hours: 0, color: color };
      catMap[p.category].hours += hours;

      const top = (startMinutes / 60) * HOUR_HEIGHT;
      const height = (durationMinutes / 60) * HOUR_HEIGHT;

      return {
        ...p,
        color, top, height,
        // box-sizing 避免边框导致高度计算误差
        style: `top: ${top}px; height: ${height}px; background: ${color}40; border-left: 3px solid ${color}; color: ${color}; box-sizing: border-box;z-index: ${this.data.dragTargetId === p.id ? 10 : 5};`
      };
    }).filter(p => p !== null); 

    this.setData({ 
      timelinePlans: processed,
      totalHours: total.toFixed(1),
      categoryStats: Object.values(catMap)
    });
  },

  showPlanAction(e) {
    const id = e.currentTarget.dataset.id;
    wx.showActionSheet({
        itemList: ['Edit', 'Copy', 'Delete'], 
        success: (res) => {
          if (res.tapIndex === 0) {
              wx.navigateTo({ url: `/packageA/plan_add/index?id=${id}` });
          } else if (res.tapIndex === 1) {
              this.copyPlan(id);
          } else if (res.tapIndex === 2) {
              this.deletePlan(id);
          }
        }
    });
  },

  copyPlan(id) {
    let plans = wx.getStorageSync('plans') || [];
    const target = plans.find(p => p.id === id);
    if (!target) return;
    wx.setStorageSync('copied_plan_buffer', target);
    wx.vibrateShort({ type: 'medium' });
    wx.showToast({ title: 'Copied! Tap + to paste', icon: 'none', duration: 2000 });
  },
  
  onPasteTimeSlot(e) {
    const timeStr = e.currentTarget.dataset.time;
    if (!timeStr) return;

    const copiedPlan = wx.getStorageSync('copied_plan_buffer');

    if (!copiedPlan) {
      wx.navigateTo({ url: `/packageA/plan_add/index?date=${this.data.selectedDate}&startTime=${timeStr}` });
      return;
    }

    const [sh, sm] = timeStr.split(':').map(Number);
    const startMins = sh * 60 + sm;
    
    let durationMins = 60; 
    if (copiedPlan.duration) {
        durationMins = Math.round(parseFloat(copiedPlan.duration) * 60);
    }
    
    const endMins = startMins + durationMins;
    const newEnd = this.minsToTime(endMins);

    let plans = wx.getStorageSync('plans') || [];
    const newPlan = {
        ...copiedPlan,
        id: Date.now(),
        date: this.data.selectedDate,
        startTime: timeStr, 
        endTime: newEnd,
        duration: (durationMins / 60).toFixed(1)
    };
    
    plans.push(newPlan);
    wx.setStorageSync('plans', plans);

    this.loadTimeline(this.data.selectedDate);
    
    wx.removeStorageSync('copied_plan_buffer'); 
    wx.vibrateShort({ type: 'heavy' });
    wx.showToast({ title: 'Pasted!', icon: 'success' });
  },

  onDragStart(e) {
    const { id, type } = e.currentTarget.dataset;
    const touch = e.touches[0];
    const plan = this.data.timelinePlans.find(p => p.id === id);
    if (!plan) return;

    this.setData({
      isDragging: true,
      dragTargetId: id,
      dragType: type, 
      dragStartY: touch.pageY,
      initialTop: plan.top,
      initialHeight: plan.height
    });
  },

  onDragMove(e) {
    if (!this.data.isDragging) return;
    const touch = e.touches[0];

    const rawDeltaY = touch.pageY - this.data.dragStartY;
    const SNAP_STEP = 25; 

    const { dragType, initialTop, initialHeight, dragTargetId } = this.data;

    let rawNewTop = initialTop;
    let rawNewHeight = initialHeight;

    if (dragType === 'top') {
      rawNewTop = initialTop + rawDeltaY;
      rawNewHeight = initialHeight - rawDeltaY;
    } else {
      rawNewHeight = initialHeight + rawDeltaY;
    }

    let snappedTop = Math.round(rawNewTop / SNAP_STEP) * SNAP_STEP;
    let snappedHeight = Math.round(rawNewHeight / SNAP_STEP) * SNAP_STEP;

    if (snappedHeight < SNAP_STEP) {
      if (dragType === 'top') {
        snappedTop = (initialTop + initialHeight) - SNAP_STEP;
      }
      snappedHeight = SNAP_STEP;
    }

    if (snappedTop < 0) {
      snappedTop = 0;
      if (dragType === 'top') snappedHeight = initialTop + initialHeight; 
    }

    const MAX_HEIGHT = 24 * 50; // HOUR_HEIGHT = 50
    if (snappedTop + snappedHeight > MAX_HEIGHT) {
      snappedHeight = MAX_HEIGHT - snappedTop;
    }

    if (dragType === 'bottom') {
        snappedTop = Math.round(initialTop / SNAP_STEP) * SNAP_STEP;
    }

    const updatedPlans = this.data.timelinePlans.map(p => {
      if (p.id === dragTargetId) {
        return {
          ...p,
          top: snappedTop,
          height: snappedHeight,
          style: `top: ${snappedTop}px; height: ${snappedHeight}px; background: ${p.color}60; border-left: 3px solid ${p.color}; color: ${p.color}; box-sizing: border-box; z-index: 10;`
        };
      }
      return p;
    });

    this.setData({ timelinePlans: updatedPlans });
  },

  onDragEnd() {
    if (!this.data.isDragging) return;
    const { dragTargetId, timelinePlans } = this.data;
    const plan = timelinePlans.find(p => p.id === dragTargetId);
    if (plan) {
      const startMins = Math.round((plan.top / HOUR_HEIGHT) * 60);
      const durationMins = Math.round((plan.height / HOUR_HEIGHT) * 60);
      const endMins = startMins + durationMins;

      const newStart = this.minsToTime(startMins);
      const newEnd = this.minsToTime(endMins);

      this.updatePlanTime(dragTargetId, newStart, newEnd);
    }

    this.setData({
      isDragging: false,
      dragTargetId: null,
      dragType: ''
    });
    this.loadTimeline(this.data.selectedDate);
  },

  minsToTime(totalMins) {
    let h = Math.floor(totalMins / 60);
    let m = totalMins % 60;
    if (h >= 24) { h = 23; m = 59; } 
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
  },

  updatePlanTime(id, start, end) {
    let plans = wx.getStorageSync('plans') || [];
    const index = plans.findIndex(p => p.id === id);
    if (index !== -1) {
      plans[index].startTime = start;
      plans[index].endTime = end;
      // 重新计算时长字符串用于显示
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      plans[index].duration = ((eh*60+em - (sh*60+sm)) / 60).toFixed(1);
      wx.setStorageSync('plans', plans);
      wx.vibrateShort({ type: 'light' }); // 震动反馈
    }
  },

  deletePlan(id) {
    let plans = wx.getStorageSync('plans') || [];
    const newPlans = plans.filter(p => p.id !== id);
    wx.setStorageSync('plans', newPlans);
    this.generateCalendarGrid(this.data.year, this.data.month);
    this.loadTimeline(this.data.selectedDate);
    wx.showToast({ title: 'Deleted', icon: 'success' });
  },

  generateTimeSlots() {
    const slots = [];
    for(let i=0; i<24; i++) {
        const h = i.toString().padStart(2,'0');
        slots.push({
            label: `${h}:00`,   
            full: `${h}:00`, 
            half: `${h}:30` 
        });
    }
    this.setData({ timeSlots: slots });
  },

  prevMonth() {
    let { year, month } = this.data; month--; if(month<1){month=12;year--} 
    this.initCalendar(new Date(year, month-1, 1));
  },
  nextMonth() {
    let { year, month } = this.data; month++; if(month>12){month=1;year++} 
    this.initCalendar(new Date(year, month-1, 1));
  },
  goToAdd() { wx.navigateTo({ url: `/packageA/plan_add/index?date=${this.data.selectedDate}` }); },
  
  formatDate(d) { 
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`; 
  }
})