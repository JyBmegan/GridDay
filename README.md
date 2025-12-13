# Habit-Tracker

## Introduction

**GridDay** is a WeChat Mini Program focused on visualizing personal growth. 

### 1. Habit Tracker
- **Multi-dimensional Statistics**: View habit records by Week, Month, or Year.
- **Visual Feedback**:
  - **Habit Curve**: Uses ECharts to render a 24-hour distribution curve of your check-in times.
  - **GitHub Style Heatmap**: Intuitively displays your consistency frequency over the entire year.
- **Streaks & Motivation**: Tracks current streaks and total check-in counts to keep you motivated.

### 2. Plan & Time Manager
- **Time Logging**: Record time spent on different categories (e.g., Study, Workout, Work).
- **Data Analytics**:
  - **Trends**: Bar charts displaying duration rankings by Week/Month/Year.
  - **Intensity Map**: A heatmap based on duration, where color depth represents focus intensity .
  - **Distribution**: Pie charts showing the time percentage of each category.
- **Dynamic Filtering**: Filter statistics by category; chart colors automatically adapt to the selected category.

### 3. Technical Highlights
- **Subpackage Loading**: Non-core pages are isolated in `packageA` to optimize the main package size.
- **Lazy Loading**: ECharts components are encapsulated and loaded on demand to improve page performance.
- **Complex Data Processing**: Pure frontend logic handles date range calculations, data aggregation, and zero-filling.

## Directory Structure

GridDay/
├── app.js              # Global logic (Launch, Local Storage init)
├── app.json            # Global config (Subpackages, TabBar)
├── app.wxss            # Global styles
├── pages/              # Main Package
│   ├── index/          # Home (Habit List)
│   ├── stats/          # Statistics (Core Visualization Logic)
│   └── plan/           # Plan List
├── packageA/           # Subpackage
│   ├── pages/
│   │   ├── detail/     # Habit Details
│   │   └── add/        # Add/Edit Page
├── ec-canvas/          # ECharts Component Library
└── assets/             # Static Assets (Logo, Icons, Screenshots)