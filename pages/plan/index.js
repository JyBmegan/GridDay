const HOUR_HEIGHT = 50; // 必须与 CSS .time-row 高度一致

Page({
  data: {
    year: 0, month: 0, monthStr: '',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    calendarDays: [],
    selectedDate: '',
    timeSlots: [],
    timelinePlans: [],
    totalHours: 0,
    categoryStats: []
  },

  onShow() {
    const today = new Date();
    const dateStr = this.data.selectedDate || this.formatDate(today);
    
    // --- 调试日志 ---
    const allPlans = wx.getStorageSync('plans') || [];
    console.log('【Plan页面】读取缓存总数:', allPlans.length);
    console.log('【Plan页面】当前选中日期:', dateStr);
    // ----------------
    
    this.initCalendar(new Date(dateStr));
    this.generateTimeSlots();
  },

  // ★★★ 核心修复：日期标准化工具 ★★★
  // 无论输入 "2024-6-1", "2024/06/01", "2024-06-1"，统一输出 "2024-06-01"
  normalizeDate(dateInput) {
    if (!dateInput) return '';
    const dateObj = new Date(dateInput.toString().replace(/-/g, '/'));
    if (isNaN(dateObj.getTime())) return dateInput; // 如果解析失败，返回原值
    
    const y = dateObj.getFullYear();
    const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const d = dateObj.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  initCalendar(dateObj) {
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    // 确保 selectedDate 也是标准格式
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
      // 生成标准格式：2024-06-01
      const dStr = `${year}-${month.toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
      
      // ★★★ 修复：使用 normalizeDate 进行宽松匹配 ★★★
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
    
    // ★★★ 修复：使用宽松匹配筛选今日计划 ★★★
    const targetDate = this.normalizeDate(dateStr);
    const todayPlans = allPlans.filter(p => this.normalizeDate(p.date) === targetDate);

    console.log(`【Plan页面】日期 ${targetDate} 匹配到计划数:`, todayPlans.length);

    let total = 0;
    const catMap = {};
    
    const processed = todayPlans.map(p => {
      // 安全处理时间字符串
      if (!p.startTime || !p.endTime) return null;

      const [startH, startM] = p.startTime.split(':').map(Number);
      const [endH, endM] = p.endTime.split(':').map(Number);
      
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const durationMinutes = endMinutes - startMinutes;
      const hours = durationMinutes / 60;

      total += hours;
      // 颜色兜底
      const color = p.color || '#54a0ff';
      if (!catMap[p.category]) catMap[p.category] = { name: p.category, hours: 0, color: color };
      catMap[p.category].hours += hours;

      // 计算 CSS 位置
      const top = (startMinutes / 60) * HOUR_HEIGHT;
      const height = (durationMinutes / 60) * HOUR_HEIGHT;

      return {
        ...p,
        color, 
        // 关键：box-sizing 避免边框导致高度计算误差
        style: `top: ${top}px; height: ${height}px; background: ${color}20; border-left: 3px solid ${color}; color: ${color}; box-sizing: border-box;`
      };
    }).filter(p => p !== null); // 过滤掉无效数据

    this.setData({ 
      timelinePlans: processed,
      totalHours: total.toFixed(1),
      categoryStats: Object.values(catMap)
    });
  },

  showPlanAction(e) {
    const id = e.currentTarget.dataset.id;
    const plan = this.data.timelinePlans.find(p => p.id === id);
    if (!plan) return;

    wx.showActionSheet({
        itemList: [`删除 "${plan.title}"`],
        itemColor: '#ff6b6b',
        success: (res) => {
            if (res.tapIndex === 0) {
                this.deletePlan(id);
            }
        }
    });
  },

  deletePlan(id) {
    let plans = wx.getStorageSync('plans') || [];
    const newPlans = plans.filter(p => p.id !== id);
    wx.setStorageSync('plans', newPlans);
    
    // 刷新
    this.generateCalendarGrid(this.data.year, this.data.month);
    this.loadTimeline(this.data.selectedDate);
    wx.showToast({ title: '已删除', icon: 'success' });
  },

  generateTimeSlots() {
    const slots = [];
    for(let i=0; i<24; i++) slots.push(`${i.toString().padStart(2,'0')}:00`);
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