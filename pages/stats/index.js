import * as echarts from '../../ec-canvas/echarts';

Page({
  data: {
    // --- 全局 ---
    statType: 'habit', // 'habit' | 'plan'
    
    // --- Habit 数据 ---
    allHabits: [], filteredHabits: [], categories: [], 
    currentCategory: 'All', showDropdown: false, displayMode: 'trend',
    
    // --- Plan 数据 ---
    planCategories: [], 
    planSummary: { totalHours: 0, count: 0, activeDays: 0, topCat: '-' },
    planTrendData: { y: [], series: [] },
    planFilterCats: [], currentPlanCategory: 'All', showPlanDropdown: false,
    
    // --- 视图 ---
    heatmapGrid: [], 
    isYearView: false, 
    trendHeight: 300,
    currentView: 'week', 
    dateRangeStr: '',
    anchorDate: new Date().getTime(),
    
    // Footer Data
    footerData: {
        heatmap: { label1: '-', val1: '-', label2: '-', val2: '-' },
        trend:   { label1: '-', val1: '-', label2: '-', val2: '-' },
        dist:    { label1: '-', val1: '-', label2: '-', val2: '-' },
        curve:   { label1: '-', val1: '-', label2: '-', val2: '-' }
    },
    
    // ECharts 配置 (Plan用)
    ecPie: { lazyLoad: true },
    ecStackBar: { lazyLoad: true },
    ecLine: { lazyLoad: true }
  },

  // 图表实例缓存 (Plan用)
  chartInstances: {},

  onShow() {
    this.updateDateRangeStr();
    // 强制自动跳转到有 Plan 数据的日期
    if(this.data.statType === 'plan') this.autoJumpToData();
    // 延迟加载确保数据读取成功
    setTimeout(() => this.loadData(), 200);
  },

  // --- 辅助：安全日期 ---
  safeDate(dateStr) {
    if (!dateStr) return new Date();
    const cleanStr = dateStr.toString().replace(/-/g, '/').split(' ')[0]; 
    return new Date(cleanStr);
  },
  
  // 辅助：安全时间 (带时分秒)
  safeDateTime(dateStr) {
      if(!dateStr) return new Date();
      return new Date(dateStr.toString().replace(/-/g, '/'));
  },

  // 格式化 YYYY-MM-DD
  fmt(d) {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  },
  
  pad(n) { return n.toString().padStart(2, '0'); },

  // --- 交互 ---
  switchStatType(e) {
    this.chartInstances = {}; // 切换大类清空缓存
    this.setData({ statType: e.currentTarget.dataset.type });
    if(e.currentTarget.dataset.type === 'plan') this.autoJumpToData();
    setTimeout(() => { 
        this.updateDateRangeStr(); 
        this.loadData(); 
    }, 100);
  },
  
  switchView(e) {
    this.chartInstances = {}; // 切换视图清空缓存
    this.setData({ currentView: e.currentTarget.dataset.view });
    this.updateDateRangeStr();
    this.loadData();
  },

  loadData() {
    console.log('Loading Data Mode:', this.data.statType);
    if (this.data.statType === 'habit') this.loadHabitStats();
    else this.loadPlanStats();
  },

  // --- Date Nav ---
  prevRange() { this.shiftRange(-1); },
  nextRange() { this.shiftRange(1); },
  shiftRange(dir) {
    const d = new Date(this.data.anchorDate);
    const v = this.data.currentView;
    if (v === 'week') d.setDate(d.getDate() + (7 * dir));
    else if (v === 'month') d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    this.setData({ anchorDate: d.getTime() });
    this.updateDateRangeStr();
    this.loadData();
  },
  updateDateRangeStr() {
    const d = new Date(this.data.anchorDate);
    const v = this.data.currentView;
    let str = '';
    const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (v === 'week') {
      const day = d.getDay() || 7; 
      const start = new Date(d); start.setDate(d.getDate() - day + 1);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      str = `${start.getMonth()+1}/${start.getDate()} - ${end.getMonth()+1}/${end.getDate()}`;
    } else if (v === 'month') { str = `${mNames[d.getMonth()]} ${d.getFullYear()}`; }
    else { str = `${d.getFullYear()}`; }
    this.setData({ dateRangeStr: str });
  },

  // --- Auto Jump (Plan) ---
  autoJumpToData() {
    const plans = wx.getStorageSync('plans') || [];
    if (plans.length > 0) {
        const lastPlan = plans[plans.length - 1];
        const lastDate = this.safeDate(lastPlan.date);
        const anchor = new Date(this.data.anchorDate);
        if (lastDate.getFullYear() !== anchor.getFullYear() || lastDate.getMonth() !== anchor.getMonth()) {
            this.setData({ anchorDate: lastDate.getTime() });
            this.updateDateRangeStr();
        }
    }
  },

  // =================================================================
  // 1. PLAN STATS
  // =================================================================
  loadPlanStats() {
    const plans = wx.getStorageSync('plans') || [];
    const view = this.data.currentView;
    const anchor = new Date(this.data.anchorDate);
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    const d = anchor.getDate();
    
    // 1. 确定筛选范围
    let startStr = '', endStr = '';
    let yLabels = [];
    let dataLength = 0;
    let getIndex = () => -1;
    let tHeight = 250;

    if (view === 'week') {
        const day = anchor.getDay() || 7; 
        const start = new Date(anchor); start.setDate(d - day + 1);
        const end = new Date(start); end.setDate(start.getDate() + 6);
        startStr = this.fmt(start); endStr = this.fmt(end);
        
        yLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        dataLength = 7;
        getIndex = (dateStr) => (this.safeDate(dateStr).getDay() || 7) - 1;
        tHeight = 300;
        
    } else if (view === 'month') {
        startStr = `${y}-${this.pad(m+1)}-01`;
        const lastDay = new Date(y, m + 1, 0).getDate();
        endStr = `${y}-${this.pad(m+1)}-${lastDay}`;
        
        yLabels = ['W1', 'W2', 'W3', 'W4', 'W5'];
        dataLength = 5;
        getIndex = (dateStr) => {
            const day = parseInt(dateStr.split('-')[2]);
            let w = Math.floor((day - 1) / 7);
            if(w > 4) w = 4;
            return w;
        };
        tHeight = 300;
        
    } else { // Year
        startStr = `${y}-01-01`;
        endStr = `${y}-12-31`;
        
        yLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        dataLength = 12;
        getIndex = (dateStr) => parseInt(dateStr.split('-')[1]) - 1;
        tHeight = 400;
    }

    // 2. 筛选
    let filteredPlans = plans.filter(p => {
        const pDate = this.fmt(this.safeDate(p.date));
        return pDate >= startStr && pDate <= endStr;
    });

    const allUniqueCats = [...new Set(plans.map(p => p.category))];
    if (this.data.currentPlanCategory !== 'All') {
        filteredPlans = filteredPlans.filter(p => p.category === this.data.currentPlanCategory);
    }
    
    // 3. Heatmap Grid
    let heatmapGrid = [];
    let isYearView = (view === 'year');
    const valMap = {};
    filteredPlans.forEach(p => {
        const key = this.fmt(this.safeDate(p.date));
        if(!valMap[key]) valMap[key] = 0;
        valMap[key] += parseFloat(p.duration);
    });
    const activeDaysCount = Object.keys(valMap).length;

    if (view === 'year') {
        isYearView = true;
        let dIter = new Date(y, 0, 1);
        const startDay = dIter.getDay() || 7; 
        dIter.setDate(dIter.getDate() - startDay + 1); 
        
        for(let i=0; i<371; i++) { 
            const dStr = this.fmt(dIter);
            const val = valMap[dStr] || 0;
            const isCurrentYear = dIter.getFullYear() === y;
            let color = '#e0e0e0'; let opacity = 1;
            if (isCurrentYear && val > 0) {
                color = '#54a0ff';
                if(val < 1) opacity = 0.4; else if(val < 3) opacity = 0.7; else opacity = 1;
            }
            heatmapGrid.push({ value: val, color: isCurrentYear ? color : 'transparent', opacity });
            dIter.setDate(dIter.getDate() + 1);
        }
    } else {
        isYearView = false;
        let loopLimit = 7;
        if (view === 'month') {
            const firstDay = new Date(y, m, 1);
            let dayOfWeek = firstDay.getDay(); if(dayOfWeek===0) dayOfWeek=7;
            for(let i=1; i<dayOfWeek; i++) heatmapGrid.push({ empty: true });
            loopLimit = new Date(y, m+1, 0).getDate();
            for(let i=1; i<=loopLimit; i++) {
                const dStr = `${y}-${this.pad(m+1)}-${this.pad(i)}`;
                const val = valMap[dStr] || 0;
                let color = val > 0 ? '#54a0ff' : '#e0e0e0';
                let opacity = val > 0 ? (val < 2 ? 0.4 : 1) : 1;
                heatmapGrid.push({ value: val, color, opacity });
            }
        } else {
            const day = anchor.getDay() || 7;
            const dIter = new Date(anchor); dIter.setDate(dIter.getDate() - day + 1);
            for(let i=0; i<7; i++) {
                const dStr = this.fmt(dIter);
                const val = valMap[dStr] || 0;
                let color = val > 0 ? '#54a0ff' : '#e0e0e0';
                let opacity = val > 0 ? (val < 2 ? 0.4 : 1) : 1;
                heatmapGrid.push({ value: val, color, opacity });
                dIter.setDate(dIter.getDate() + 1);
            }
        }
    }

    // 4. Trends & Dist
    const catMap = {}; 
    let total = 0;
    const usedCategories = new Set();
    const catColorMap = {};

    filteredPlans.forEach(p => {
        const dur = parseFloat(p.duration);
        if (!catMap[p.category]) catMap[p.category] = { name: p.category, value: 0, color: p.color };
        catMap[p.category].value += dur;
        total += dur;
        usedCategories.add(p.category);
        catColorMap[p.category] = p.color;
    });
    
    const pieData = Object.values(catMap).map(c => ({
        ...c, hours: c.value.toFixed(1), percent: total > 0 ? Math.round((c.value / total) * 100) : 0
    })).sort((a,b) => b.value - a.value);

    // Stacked Bar Series
    const seriesList = Array.from(usedCategories).map(catName => ({
        name: catName, type: 'bar', stack: 'total', barWidth: '60%',
        itemStyle: { color: catColorMap[catName], borderRadius: 0 },
        data: new Array(dataLength).fill(0)
    }));

    filteredPlans.forEach(p => {
        const idx = getIndex(p.date);
        if (idx >= 0 && idx < dataLength) {
            const series = seriesList.find(s => s.name === p.category);
            if (series) {
                let v = series.data[idx] + parseFloat(p.duration);
                series.data[idx] = parseFloat(v.toFixed(1));
            }
        }
    });

    // 5. Curve
    const hourCounts = new Array(24).fill(0);
    filteredPlans.forEach(p => {
        const [sh, sm] = (p.startTime || '00:00').split(':');
        const [eh] = (p.endTime || '00:00').split(':');
        const s = parseInt(sh);
        const e = parseInt(eh);
        for(let h=s; h<=e; h++) if(h<24) hourCounts[h]++;
    });
    const maxHourVal = Math.max(...hourCounts);
    const peakHour = hourCounts.indexOf(maxHourVal);

    const avgDur = activeDaysCount > 0 ? (total / activeDaysCount).toFixed(1) : 0;
    const topCat = pieData.length>0 ? pieData[0].name : '-';

    this.setData({
        planCategories: pieData,
        heatmapGrid, isYearView,
        trendHeight: tHeight,
        planFilterCats: allUniqueCats,
        planSummary: { totalHours: total.toFixed(1), count: filteredPlans.length, activeDays: activeDaysCount, topCat },
        footerData: {
            heatmap: { label1: 'Active Days', val1: activeDaysCount, label2: 'Total Hours', val2: total.toFixed(1) },
            trend:   { label1: 'Daily Avg', val1: avgDur+'h', label2: 'Top Cat', val2: topCat },
            dist:    { label1: 'Categories', val1: pieData.length, label2: 'Coverage', val2: '100%' },
            curve:   { label1: 'Peak Hour', val1: maxHourVal>0?`${peakHour}:00`:'-', label2: 'Intensity', val2: maxHourVal }
        }
    });

    setTimeout(() => {
        this.initPlanBar(yLabels, seriesList);
        this.initPlanPie();
        this.initPlanCurve(hourCounts);
    }, 300);
  },

  // --- Plan Charts ---
  initPlanBar(yLabels, series) {
    if (this.chartInstances['planBar']) {
        const isHoriz = (this.data.currentView === 'week');
        this.chartInstances['planBar'].setOption({
            yAxis: isHoriz ? { data: yLabels } : { show: false },
            xAxis: isHoriz ? { show: false } : { data: yLabels },
            series: series.length > 0 ? series : [{type:'bar', data:[]}]
        }, {notMerge: true});
        return;
    }
    const comp = this.selectComponent('#chart-plan-bar');
    if(!comp) return;
    comp.init((canvas, width, height, dpr) => {
        const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
        const view = this.data.currentView;
        const isHoriz = (view === 'week');
        const option = {
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true },
            grid: { left: '3%', right: '5%', bottom: '2%', top: '2%', containLabel: true },
            xAxis: isHoriz ? { type: 'value', show: false } : { type: 'category', data: yLabels, axisLine:{show:false}, axisTick:{show:false}, axisLabel:{color:'#666', fontSize:10, fontWeight:'bold', interval: 0} },
            yAxis: isHoriz ? { type: 'category', data: yLabels, inverse: true, axisLine:{show:false}, axisTick:{show:false}, axisLabel:{color:'#666', fontSize:10, fontWeight:'bold', interval: 0} } : { type: 'value', show: false },
            series: series.length > 0 ? series : [{type:'bar', data:[]}]
        };
        chart.setOption(option);
        this.chartInstances['planBar'] = chart;
        return chart;
    });
  },

  initPlanCurve(data) {
    if (this.chartInstances['planCurve']) {
        this.chartInstances['planCurve'].setOption({ series: [{data}] });
        return;
    }
    const comp = this.selectComponent('#chart-plan-curve');
    if(!comp) return;
    comp.init((canvas, width, height, dpr) => {
        const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
        const option = {
            grid: { left: 0, right: 0, top: 10, bottom: 0 },
            tooltip: { trigger: 'axis', formatter: '{b}:00 : {c}' },
            xAxis: { type: 'category', data: Array.from({length:24},(_,i)=>i), show: false },
            yAxis: { type: 'value', show: false },
            series: [{
                data: data, type: 'line', smooth: true, symbol: 'none',
                lineStyle: { width: 3, color: '#54a0ff' }, 
                areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [{offset:0, color:'#54a0ff'}, {offset:1, color:'rgba(84,160,255,0)'}]) }
            }]
        };
        chart.setOption(option);
        this.chartInstances['planCurve'] = chart;
        return chart;
    });
  },

  initPlanPie() {
    const pieData = this.data.planCategories.map(c => ({
        value: c.value,
        name: c.name,
        itemStyle: { color: c.color }
    }));
    
    if (this.chartInstances['planPie']) {
        this.chartInstances['planPie'].setOption({ series: [{ data: pieData }] });
        return;
    }
    const comp = this.selectComponent('#chart-plan-pie');
    if(!comp) return;
    comp.init((canvas, width, height, dpr) => {
        const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
        const option = {
            backgroundColor: '#ffffff',
            tooltip: { trigger: 'item', formatter: '{b}: {c}h' },
            series: [{
                type: 'pie', radius: ['60%', '85%'], center: ['50%', '50%'],
                itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
                label: { show: false }, 
                data: pieData
            }]
        };
        chart.setOption(option);
        this.chartInstances['planPie'] = chart;
        return chart;
    });
  },

  // =================================================================
  // 2. HABIT STATS (Curved Data Fix)
  // =================================================================
  loadHabitStats() {
    const habits = wx.getStorageSync('habits') || [];
    const categories = wx.getStorageSync('categories') || [];
    this.setData({ categories, allHabits: habits });
    
    let targetHabits = habits;
    if(this.data.currentCategory !== 'All') {
        targetHabits = habits.filter(h => h.category === this.data.currentCategory);
    }
    
    const anchor = new Date(this.data.anchorDate);
    const weekLabels = ['日','一','二','三','四','五','六'];
    
    const last7Days = []; for(let i=6; i>=0; i--) { const d = new Date(anchor); d.setDate(d.getDate() - i); last7Days.push({ str: this.fmt(d), label: weekLabels[d.getDay()] }); }
    const last30Days = []; for(let i=29; i>=0; i--) { const d = new Date(anchor); d.setDate(d.getDate() - i); last30Days.push(this.fmt(d)); }
    const now = new Date(); const currentYearStr = now.getFullYear().toString();
    const monthsOfYear = []; for(let i=0; i<12; i++) { const m = (i + 1).toString().padStart(2, '0'); monthsOfYear.push(`${currentYearStr}-${m}`); }

    const processed = targetHabits.map(h => {
        const logs = h.logs || [];
        const color = h.color || '#FF9F43';

        const weekData = last7Days.map(dayCfg => {
            const count = logs.filter(l => (typeof l==='string'?l:l.time).startsWith(dayCfg.str)).length;
            let heightPct = count > 0 ? Math.min(30 + count * 20, 100) : 0;
            return { weekDay: dayCfg.label, count, heightPct };
        });
        const weekTotal = weekData.reduce((acc, cur) => acc + (cur.count>0?1:0), 0);

        const monthData = last30Days.map(dateStr => {
            const count = logs.filter(l => (typeof l==='string'?l:l.time).startsWith(dateStr)).length;
            let opacity = count === 1 ? 0.6 : (count >= 2 ? (count >= 3 ? 1 : 0.8) : 0);
            return { date: dateStr, count, opacity };
        });
        const monthTotal = monthData.reduce((acc, cur) => acc + cur.count, 0);

        const yearData = monthsOfYear.map(monthStr => {
            const count = logs.filter(l => (typeof l==='string'?l:l.time).startsWith(monthStr)).length;
            let opacity = count > 0 ? (count > 5 ? (count > 15 ? 1 : 0.85) : 0.6) : 0;
            return { month: monthStr, count, opacity };
        });
        const yearTotal = yearData.reduce((acc, cur) => acc + cur.count, 0);

        // ★★★ Curve Logic ★★★
        const hoursData = new Array(24).fill(0);
        logs.forEach(l => { 
            const t = typeof l === 'string' ? l : l.time; 
            if(t) { 
                const d = this.safeDateTime(t);
                const hour = d.getHours(); 
                if(!isNaN(hour) && hour >= 0 && hour < 24) hoursData[hour]++; 
            } 
        });

        return { ...h, color, weekData, weekTotal, monthData, monthTotal, yearData, yearTotal, hoursData, ec: { lazyLoad: true } };
    });

    this.setData({ filteredHabits: processed });
    // 如果在 Time 模式，强制初始化 Habit Curve
    if (this.data.displayMode === 'time') { 
        setTimeout(() => this.initAllHabitTimeCharts(3), 300); 
    }
  },

  toggleDropdown() { this.setData({ showDropdown: !this.data.showDropdown }); },
  closeDropdown() { if(this.data.showDropdown) this.setData({ showDropdown: false }); if(this.data.showPlanDropdown) this.setData({ showPlanDropdown: false }); },
  switchCategory(e) { this.setData({ currentCategory: e.currentTarget.dataset.cat, showDropdown: false }); this.loadHabitStats(); },
  switchPlanCategory(e) { this.setData({ currentPlanCategory: e.currentTarget.dataset.cat, showPlanDropdown: false }); this.loadPlanStats(); },
  switchDisplayMode(e) { 
      this.setData({ displayMode: e.currentTarget.dataset.mode }); 
      if(e.currentTarget.dataset.mode==='time') {
          setTimeout(() => {
             if(this.data.statType === 'habit') this.initAllHabitTimeCharts(3);
             else this.initPlanCurve(this.data.curveData || []);
          }, 300);
      }
  },
  togglePlanDropdown() { this.setData({ showPlanDropdown: !this.data.showPlanDropdown }); },
  
  // ★★★ Habit Curve (Retry) ★★★
  initAllHabitTimeCharts(retry) {
    if(retry <= 0) return;
    this.data.filteredHabits.forEach(habit => {
      const comp = this.selectComponent(`#chart-time-${habit.id}`);
      if(comp) {
        // 如果是复用列表图表，这里每次 init 其实问题不大，因为列表是变化的
        comp.init((canvas, width, height, dpr) => {
          const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
          const option = {
            grid: { left: 5, right: 5, top: 10, bottom: 20 },
            xAxis: { type: 'category', data: Array.from({length:24},(_,i)=>i), show: true, axisLine: {show:false}, axisTick: {show:false}, axisLabel: { interval: 5, color: '#ccc', fontSize: 9 } },
            yAxis: { show: false },
            series: [{ data: habit.hoursData, type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: habit.color }, areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [{offset:0, color:habit.color}, {offset:1, color:'rgba(255,255,255,0)'}]) } }]
          };
          chart.setOption(option);
          return chart;
        });
      } else {
          setTimeout(() => this.initAllHabitTimeCharts(retry - 1), 200);
      }
    });
  },
  goToDetail(e) { wx.navigateTo({ url: `/packageA/detail/index?id=${e.currentTarget.dataset.id}` }); }
})