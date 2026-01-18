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
    
    // 拖拽相关
    isDragging: false,
    dragTargetId: null,
    dragType: '',
    dragStartY: 0,
    initialTop: 0,
    initialHeight: 0,
    activePlanId: null, 
    lastTapTime: 0,  
  },

  goToHelp() {
    wx.navigateTo({ url: '/packageA/help/index' });
  },

  onShow() {
    const today = new Date();
    const dateStr = this.data.selectedDate || this.formatDate(today);
    this.initCalendar(new Date(dateStr));
    this.generateTimeSlots();
  },

  // ... (normalizeDate, initCalendar, generateCalendarGrid, selectDay 保持不变) ...
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
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = dateObj.getMonth();
    const finalMonthStr = `${monthNames[monthIndex]} ${year}`;

    this.setData({
      year, month,
      monthStr: finalMonthStr, // 使用手动拼接的字符串
      selectedDate: dateStr
    });
    this.generateCalendarGrid(year, month);
    this.loadTimeline(dateStr);
  },

  generateCalendarGrid(year, month) {
    let firstDayIndex = new Date(year, month - 1, 1).getDay(); 
    let emptyDaysCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysInMonth = new Date(year, month, 0).getDate();
    const allPlans = wx.getStorageSync('plans') || [];
    const days = [];
    
    for (let i = 0; i < emptyDaysCount; i++) days.push({ empty: true });

    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${year}-${month.toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
      const dayPlans = allPlans.filter(p => this.normalizeDate(p.date) === dStr);
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
        // 注意 z-index: 如果是被拖拽的或者是被激活的，层级要高
        style: `top: ${top}px; height: ${height}px; background: ${color}40; border-left: 3px solid ${color}; color: ${color}; box-sizing: border-box; z-index: ${this.data.dragTargetId === p.id || this.data.activePlanId === p.id ? 10 : 5};`
      };
    }).filter(p => p !== null); 

    this.setData({ 
      timelinePlans: processed,
      totalHours: total.toFixed(1),
      categoryStats: Object.values(catMap)
    });
  },

  // 判断单击 vs 双击
  handlePlanTap(e) {
    const id = e.currentTarget.dataset.id;
    const now = Date.now();
    const lastTap = this.data.lastTapTime;

    // 如果两次点击间隔小于 300ms -> 视为双击
    if (now - lastTap < 300) {
      this.setData({ activePlanId: id });
      wx.vibrateShort({ type: 'light' });
    } else {
      if (this.data.activePlanId !== id) {
      }
    }
    this.setData({ lastTapTime: now });
  },

  handlePlanLongPress(e) {
    const id = e.currentTarget.dataset.id;

    wx.vibrateShort({ type: 'medium' });

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

  // 复制功能
  copyPlan(id) {
    let plans = wx.getStorageSync('plans') || [];
    const target = plans.find(p => p.id === id);
    if (!target) return;
    wx.setStorageSync('copied_plan_buffer', target);
    wx.vibrateShort({ type: 'medium' });
    wx.showToast({ title: 'Copied!\r\n Tap time slot to paste', icon: 'none', duration: 2000 });
  },
  
  onPasteTimeSlot(e) {
    if (this.data.activePlanId !== null) {
      this.setData({ activePlanId: null });
      return; // 结束，不执行粘贴
    }

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
    const MAX_HEIGHT = 24 * 50; 

    const { dragType, initialTop, initialHeight, dragTargetId } = this.data;

    let newTop = initialTop;
    let newHeight = initialHeight;

    if (dragType === 'bottom') {

      newTop = initialTop; 
      let rawHeight = initialHeight + rawDeltaY;
      newHeight = Math.round(rawHeight / SNAP_STEP) * SNAP_STEP;

    } else if (dragType === 'top') {

      const originalBottom = initialTop + initialHeight;
      let rawTop = initialTop + rawDeltaY;
      newTop = Math.round(rawTop / SNAP_STEP) * SNAP_STEP;
      newHeight = originalBottom - newTop;
    }
    
    if (newHeight < SNAP_STEP) {
      newHeight = SNAP_STEP;
      if (dragType === 'top') {
        newTop = (initialTop + initialHeight) - SNAP_STEP;
      }
    }

    if (newTop < 0) {
      newTop = 0;
      if (dragType === 'top') {
        newHeight = initialTop + initialHeight; 
      }
    }

    if (newTop + newHeight > MAX_HEIGHT) {
      newHeight = MAX_HEIGHT - newTop;
    }

    const updatedPlans = this.data.timelinePlans.map(p => {
      if (p.id === dragTargetId) {
        return {
          ...p,
          top: newTop,
          height: newHeight,
          style: `top: ${newTop}px; height: ${newHeight}px; background: ${p.color}60; border-left: 3px solid ${p.color}; color: ${p.color}; box-sizing: border-box; z-index: 10;`
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
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      plans[index].duration = ((eh*60+em - (sh*60+sm)) / 60).toFixed(1);
      wx.setStorageSync('plans', plans);
      wx.vibrateShort({ type: 'light' }); 
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