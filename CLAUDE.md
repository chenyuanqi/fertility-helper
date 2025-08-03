# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WeChat Mini Program (备小孕小程序) for fertility tracking and ovulation prediction. The app helps users record basal body temperature (BBT), menstrual flow, and intercourse data with intelligent ovulation prediction and data visualization.

**Key Features:**
- 30-second quick recording of temperature, menstrual flow, and intercourse
- Three-in-one chart visualization (temperature line + flow background + intercourse markers)
- AI-powered ovulation prediction algorithm
- Calendar view with comprehensive data display
- Complete local data storage (no backend required)

## Development Commands

### Testing
```bash
# Run in miniprogram/ directory
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
npm run test:unit          # Run utils unit tests
npm run test:integration   # Run integration tests
npm run test:ux           # Run UX tests
npm run test:boundary     # Run boundary tests
```

### Development Workflow
1. Open project in WeChat Developer Tools
2. Select `miniprogram/` as project directory
3. Use your AppID or test AppID for development
4. Click "Compile" to build and preview
5. Code changes trigger automatic recompilation

### Project Structure
```
miniprogram/miniprogram/          # Main source code
├── pages/                        # Page components
│   ├── index/                   # Homepage - data overview
│   ├── record/                  # Recording page - data input
│   ├── chart/                   # Chart page - data visualization
│   ├── calendar/                # Calendar page - calendar view
│   └── settings/                # Settings page - user configuration
├── components/                   # Reusable components
│   ├── keyboard/                # Custom numeric keyboard for temperature
│   ├── slider/                  # Slider component for flow selection
│   ├── chart/                   # Chart components
│   ├── calendar/                # Calendar components
│   └── modal/                   # Modal dialogs
├── utils/                        # Utility functions
│   ├── storage.js               # Local storage management
│   ├── ovulationAlgorithm.js    # Ovulation prediction algorithms
│   ├── dataAnalysis.js          # Data analysis functions
│   ├── date.js                  # Date handling utilities
│   └── validator.js             # Data validation
└── tests/                        # Test files
```

## Architecture

### Technology Stack
- **Framework**: WeChat Mini Program native framework
- **Language**: TypeScript + JavaScript
- **UI**: Native components + custom components
- **Charts**: ECharts for WeChat Mini Program
- **Storage**: WeChat local storage (wx.setStorageSync/wx.getStorageSync)
- **Testing**: Jest

### Data Storage Strategy
Uses WeChat's local storage with structured data management:
- `fertility_day_records`: Daily temperature, flow, and intercourse records
- `fertility_cycles`: Menstrual cycle data and analysis
- `fertility_user_settings`: User preferences and settings
- `fertility_statistics`: Calculated statistics and trends

### Key Components

#### 1. Recording System (`pages/record/`)
- Unified interface for all three data types
- Custom numeric keyboard for temperature input (components/keyboard/)
- Slider component for menstrual flow selection (components/slider/)
- One-touch intercourse recording
- Real-time data validation

#### 2. Visualization System (`pages/chart/`)
- Three-in-one chart combining temperature line chart, menstrual flow background, and intercourse markers
- Dynamic chart scaling and horizontal scrolling
- Cycle navigation (previous/next/current)
- Interactive data points with hover effects

#### 3. Calendar System (`pages/calendar/`)
- 42-day month view (6 weeks × 7 days)
- Multi-data type indicators on each date
- Cross-month data support
- Date detail panel with editing capabilities

#### 4. AI Analysis System (`utils/ovulationAlgorithm.js`)
- Temperature-based ovulation detection using moving averages
- Cover-line calculation for ovulation prediction
- Cycle regularity analysis
- Fertility window prediction with confidence levels
- Anomaly detection for temperature and cycle data

#### 5. Data Management (`utils/storage.js`, `utils/dataManager.js`)
- StorageManager: Generic storage operations
- FertilityStorage: Business-specific storage wrapper
- DataManager: Singleton pattern for data consistency
- Caching mechanism for performance optimization

## Development Guidelines

### Code Conventions
- Follow WeChat Mini Program development standards
- Use TypeScript for type safety where applicable
- Component-based architecture for reusability
- Consistent naming: camelCase for variables, PascalCase for components
- File naming: kebab-case for pages and components

### Data Flow Patterns
1. **Data Input**: User Input → Validation → Storage → UI Update
2. **Data Display**: Storage Read → Data Processing → UI Render
3. **Real-time Sync**: Immediate save on user input, cache for performance

### Testing Strategy
- Unit tests for utility functions (algorithms, data processing)
- Integration tests for component interactions
- UX tests for user experience validation
- Boundary tests for edge cases and error conditions

### Performance Considerations
- Local storage for offline capability
- Lazy loading for large datasets
- Efficient chart rendering with data point limits
- Memory management for long-term usage

## Key Algorithms

### Ovulation Prediction
The app uses a sophisticated algorithm based on:
1. **Basal Body Temperature Analysis**: Detects temperature rise patterns using 3-day moving averages
2. **Cover-line Calculation**: Automatically draws cover-lines based on temperature elevation
3. **Cycle Pattern Recognition**: Analyzes historical cycle data for pattern-based predictions
4. **Confidence Scoring**: Provides high/medium/low confidence levels for predictions

### Data Analysis Features
- Cycle length calculation and regularity assessment
- Temperature trend analysis with linear regression
- Anomaly detection for unusual patterns
- Health recommendations based on data quality

## Important Notes

### Development Environment
- Requires WeChat Developer Tools
- Node.js 16+ for testing framework
- Uses WeChat Mini Program's native build system
- No external build tools required

### Data Privacy
- All data stored locally on user device
- No backend API calls for core functionality
- Export/import functionality for data backup
- Follows WeChat Mini Program privacy guidelines

### User Experience Goals
- 30-second recording target for all data types
- Intuitive visual design with gradient backgrounds and glass-morphism effects
- Responsive design for different screen sizes
- Comprehensive help system integrated in settings

### Testing and Quality Assurance
Always run the test suite before making significant changes:
```bash
cd miniprogram && npm test
```

The test suite includes coverage for core algorithms, data validation, and user interaction flows.