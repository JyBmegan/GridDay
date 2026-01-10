import * as echarts from '../../ec-canvas/echarts';

Page({
  data: {
    habit: {},
    ec: { lazyLoad: true },
    
    viewDate: new Date().getTime(), 
    dateRangeStr: '', 

    weekStats: { days: 0, count: 0, rate: 0, notes: 0 },
    monthStats: { days: 0, count: 0, rate: 0 },
    
    // 日历数据
    calendarDays: [],
    calendarEmptyDays: [],
    
    logsList: []
  },

  onLoad(options) {
    if (options.id) {
      this.habitId = Number(options.id);
      this.loadHabit();
    }
    this.updateDateRangeStr();
  },

  onShow() {

    if (this.habitId) {
      this.loadHabit();
    }
  },

  goToEdit() {
    const url = `/packageA/add/index?id=${this.data.habit.id}`;
    wx.navigateTo({ url });
  },

  loadHabit() {
    const habits = wx.getStorageSync('habits') || [];
    const habit = habits.find(h => h.id === this.habitId);
    
    if (!habit) {
      wx.showToast({ title: 'Habit not found', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    if (!habit.color) habit.color = '#FF9F43';

    this.setData({ habit });
    
    this.processLogs(habit.logs || []);
    
    this.refreshCharts();
    
    if (!this.chartComp) {
        this.chartComp = this.selectComponent('#mychart-week');
        this.initChart();
    }
  },

  refreshCharts() {
      this.updateMonthView();
      this.updateWeekView();
  },

  prevRange() {
      const d = new Date(this.data.viewDate);
      d.setMonth(d.getMonth() - 1); 
      this.setData({ viewDate: d.getTime() });
      this.updateDateRangeStr();
      this.refreshCharts();
  },

  nextRange() {
      const d = new Date(this.data.viewDate);
      d.setMonth(d.getMonth() + 1); // 往后推一个月
      this.setData({ viewDate: d.getTime() });
      this.updateDateRangeStr();
      this.refreshCharts();
  },

  updateDateRangeStr() {
      const d = new Date(this.data.viewDate);
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const str = `${months[d.getMonth()]} ${d.getFullYear()}`;
      this.setData({ dateRangeStr: str });
  },

  updateMonthView() {
      const d = new Date(this.data.viewDate);
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-12
      
      const firstDay = new Date(year, month-1, 1);
      const lastDay = new Date(year, month, 0); 
      
      let startDay = firstDay.getDay(); 
      if(startDay === 0) startDay = 7; // 把周日变成7
      
      const calendarDays = [];
      let doneDays = 0;
      let totalCount = 0;

      for(let i=1; i<=lastDay.getDate(); i++) {
          const dateStr = `${year}-${month.toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
          
          // 检查这一天是否有 log
          // 注意：logs 里的 time 是 ISO 格式 "2025-12-07T..."
          const logs = (this.data.habit.logs || []).filter(l => {
            const t = typeof l === 'string' ? l : l.time;
            return t && t.startsWith(dateStr);
          });
          
          if(logs.length > 0) doneDays++;
          totalCount += logs.length;

          calendarDays.push({ 
            day: i, 
            isDone: logs.length > 0 
          });
      }

      this.setData({
          calendarEmptyDays: new Array(startDay - 1).fill(0),
          calendarDays: calendarDays,
          monthStats: {
              days: doneDays,
              count: totalCount,
              rate: Math.round((doneDays/lastDay.getDate())*100)
          }
      });
  },

  updateWeekView() {
    const targetDate = new Date(this.data.viewDate);
    const dayOfWeek = targetDate.getDay() || 7; 
    const monday = new Date(targetDate);
    monday.setHours(0,0,0,0);
    monday.setDate(monday.getDate() - dayOfWeek + 1);

    const xLabels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const dataCounts = [];
    let doneDays = 0;
    let totalCount = 0;

    for(let i=0; i<7; i++) {
        const temp = new Date(monday);
        temp.setDate(temp.getDate() + i);
        const dateStr = this.formatDate(temp);
        
        const count = (this.data.habit.logs || []).filter(l => {
           const t = typeof l === 'string' ? l : l.time;
           return t && t.startsWith(dateStr);
        }).length;
        
        if(count > 0) doneDays++;
        totalCount += count;
        dataCounts.push(count);
    }

    this.setData({
        weekStats: {
            days: doneDays,
            count: totalCount,
            rate: Math.round((doneDays/7)*100),
            notes: this.data.logsList.filter(l => l.note).length
        }
    });

    if(this.chartInstance) {
        this.setChartOption(this.chartInstance, xLabels, dataCounts);
    }
  },

  processLogs(logs) {
    const list = logs.map(log => {
      const timeStr = typeof log === 'string' ? log : log.time;
      const note = typeof log === 'string' ? '' : log.note;
      
      if (!timeStr) return null;
      
      const d = new Date(timeStr);
      return {
        ts: d.getTime(), 
        date: `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`,
        time: `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`,
        note: note
      };
    }).filter(item => item !== null);

    list.sort((a, b) => b.ts - a.ts); // 倒序排列

    this.setData({ 
      logsList: list.slice(0, 50) 
    }); 
  },

  initChart() {
    this.chartComp.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      this.chartInstance = chart;
      setTimeout(() => { this.updateWeekView(); }, 200);
      return chart;
    });
  },

  setChartOption(chart, xLabels, data) {
    const color = this.data.habit.color;
    const option = {
        grid: { top: 30, bottom: 20, left: 0, right: 0 },
        tooltip: { trigger: 'axis', confine: true, formatter: '{b}: {c}' },
        xAxis: { 
            type: 'category', 
            data: xLabels, 
            axisLine: {show: false}, 
            axisTick: {show: false},
            axisLabel: { color: '#999', fontSize: 11, margin: 14 } 
        },
        yAxis: { show: false, minInterval: 1 },
        series: [{
            type: 'bar', 
            data: data, 
            barWidth: 16, 
            itemStyle: { borderRadius: [4,4,4,4], color: color },
            showBackground: true,
            backgroundStyle: { color: '#f5f6fa', borderRadius: 4 },
            label: { show: true, position: 'top', color: color, fontSize: 12, formatter: p => p.value > 0 ? p.value : '' }
        }]
    };
    chart.setOption(option);
  },

  formatDate(d) {
      return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
  },

  deleteHabit() {
     wx.showModal({
      title: '⚠️ Delete Habit?',
      content: `Permanently delete "${this.data.habit.name}"?`,
      confirmColor: '#ff6b6b',
      success: (res) => {
        if (res.confirm) {
          let habits = wx.getStorageSync('habits') || [];
          const newHabits = habits.filter(h => h.id !== this.data.habit.id);
          wx.setStorageSync('habits', newHabits);
          wx.navigateBack();
        }
      }
    })
  }
});