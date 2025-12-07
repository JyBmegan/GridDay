Page({
  data: {
    habits: [],
    todayStr: ''
  },
  onShow() {
    // 复用首页的逻辑来获取今日状态
    const habits = wx.getStorageSync('habits') || [];
    const now = new Date();
    const today = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
    
    // 简单计算一下每个习惯今天的进度，为了显示
    const processed = habits.map(h => {
      const doneCount = (h.logs || []).filter(d => d === today).length;
      return { ...h, count: doneCount };
    });

    this.setData({
      habits: processed,
      todayStr: now.toDateString() // 显示如 "Sun Dec 07 2025"
    });
  }
})