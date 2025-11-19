# Comprehensive Feature Testing Guide

## Overview

This guide provides step-by-step instructions for testing all features of the Transcript Analytics Platform using the provided test data.

---

## 📋 Pre-Testing Setup

### 1. Ensure Application is Running

```bash
# Install dependencies (if not already done)
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

The application should be accessible at: http://localhost:3000

### 2. Verify Database Connection

Check that PostgreSQL is running and the pgvector extension is enabled:

```bash
# Check database health
curl http://localhost:3000/api/health/database
```

---

## 📊 Test Data Overview

### Test Data File: `test-data-comprehensive.csv`

**Location:** Root directory of the project

**Contents:**
- **5 Clients** (4 production, 1 UAT environment)
- **Daily data** from January 1, 2024 to March 29, 2024
- **~300 total records** across all clients
- **Growth trends** showing 150-400% increase over 3 months
- **1 Anomaly** on February 13 (Stanford spike from ~57 to 120)

**Clients:**
1. **ASU-prod**: 45 → 135 transcripts (+200% growth)
2. **MIT-prod**: 30 → 95 transcripts (+217% growth)
3. **Stanford-prod**: 25 → 90 transcripts (+260% growth, with anomaly)
4. **UCLA-prod**: 40 → 105 transcripts (+162% growth)
5. **Berkeley-uat**: 15 → 80 transcripts (+433% growth)

---

## 🧪 Automated Testing

### Run Automated Test Suite

```bash
node scripts/test-all-features.js
```

This will test:
- ✅ System health endpoints
- ✅ Client CRUD operations
- ✅ API connectivity
- ✅ Prediction generation
- ✅ Anomaly detection
- ✅ Analytics data retrieval

Expected Output:
- Passed tests: 10+
- Failed tests: 0
- Info messages: Various
- Test results saved to: `test-results.json`

---

## 🖱️ Manual Testing Checklist

### Test Suite 1: Client Management

#### 1.1 Create Clients

**URL:** http://localhost:3000/data/import

**Steps:**
1. Navigate to the Data Import page
2. Upload `test-data-comprehensive.csv`
3. Ensure "Clean Data" is checked
4. Click "Import Data"
5. Wait for import to complete

**Expected Result:**
- ✅ 5 clients created automatically from data
- ✅ Success message displayed
- ✅ Import status shows "completed"

#### 1.2 View Clients

**URL:** http://localhost:3000/clients

**Steps:**
1. Navigate to the Clients page
2. Verify all 5 clients are listed

**Expected Result:**
- ✅ ASU-prod
- ✅ MIT-prod
- ✅ Stanford-prod
- ✅ UCLA-prod
- ✅ Berkeley-uat

#### 1.3 Search & Filter

**Steps:**
1. Use search box to search for "ASU"
2. Filter by environment: "prod"
3. Filter by environment: "uat"

**Expected Result:**
- ✅ Search shows only ASU-prod
- ✅ Prod filter shows 4 clients
- ✅ UAT filter shows 1 client (Berkeley)

#### 1.4 Edit Client

**Steps:**
1. Click on any client
2. Click "Edit" button
3. Change email address
4. Save changes

**Expected Result:**
- ✅ Client updated successfully
- ✅ Changes reflected immediately
- ✅ No errors

#### 1.5 Deactivate/Reactivate Client

**Steps:**
1. Select a client
2. Click "Deactivate"
3. Verify client is marked inactive
4. Click "Reactivate"

**Expected Result:**
- ✅ Client status changes to inactive
- ✅ Client reactivates successfully
- ✅ Historical data preserved

---

### Test Suite 2: Data Import & Processing

#### 2.1 Import with All Options

**URL:** http://localhost:3000/data/import

**Steps:**
1. Upload `test-data-comprehensive.csv`
2. Enable ALL processing options:
   - ✅ Clean Data
   - ✅ Generate Embeddings
   - ✅ Train Models
   - ✅ Detect Anomalies
3. Click "Import Data"
4. Monitor progress

**Expected Result:**
- ✅ Import completes without errors
- ✅ ~300 records processed
- ✅ Progress bar shows 100%
- ✅ Success message displayed

**Processing Time:**
- Data cleaning: ~5-10 seconds
- Embeddings generation: ~30-60 seconds
- Model training: ~2-5 minutes
- Anomaly detection: ~10-30 seconds

#### 2.2 Verify Data Integrity

**API Test:**
```bash
curl http://localhost:3000/api/analytics/comprehensive-data
```

**Expected Result:**
- ✅ All 5 clients in response
- ✅ Time series data present
- ✅ Transcript counts match CSV
- ✅ No missing data points

---

### Test Suite 3: ML Predictions & Forecasting

#### 3.1 Generate 7-Day Forecast

**URL:** http://localhost:3000/analytics/dashboard

**Steps:**
1. Navigate to Analytics Dashboard
2. Select "ASU-prod" client
3. Click "Generate Forecast"
4. Select horizon: "7 days"
5. Set confidence level: "95%"
6. Click "Generate"

**Expected Result:**
- ✅ Forecast generated within 3-5 seconds
- ✅ 7 prediction points displayed
- ✅ Confidence intervals shown (upper/lower bounds)
- ✅ Predicted values: ~138-145 transcripts
- ✅ Trend continues upward

#### 3.2 Generate 30-Day Forecast

**Steps:**
1. Select "MIT-prod" client
2. Generate 30-day forecast
3. Review predictions

**Expected Forecast:**
- ✅ Next 30 days: 98-115 transcripts
- ✅ Confidence intervals widen over time
- ✅ Growth trend maintained
- ✅ Seasonality patterns detected

#### 3.3 Compare Multiple Models

**URL:** http://localhost:3000/analytics/interactive-dashboard

**Steps:**
1. Navigate to Interactive Dashboard
2. Select "Model Comparison" widget
3. Choose client: "UCLA-prod"
4. Select models: ARIMA, Prophet, XGBoost, LSTM

**Expected Result:**
- ✅ All 4 models generate predictions
- ✅ Model accuracy metrics displayed:
  - XGBoost: MAE ~4-7
  - LSTM: MAE ~3-6
  - Prophet: MAE ~8-12
  - ARIMA: MAE ~12-15
- ✅ Best model highlighted (likely XGBoost or LSTM)
- ✅ Ensemble prediction shown

#### 3.4 Test Prediction Accuracy

**Steps:**
1. Review historical predictions
2. Compare predicted vs actual values
3. Check accuracy metrics

**Expected Metrics:**
- ✅ MAE: <5 transcripts
- ✅ MAPE: <10%
- ✅ R² score: >0.9
- ✅ Directional accuracy: >85%

---

### Test Suite 4: Anomaly Detection

#### 4.1 Detect Stanford Anomaly

**URL:** http://localhost:3000/analytics/dashboard

**Steps:**
1. Select "Stanford-prod" client
2. Navigate to "Anomaly Detection" tab
3. Set date range: Jan 1 - Mar 31, 2024
4. Set sensitivity: 0.8 (80%)
5. Click "Detect Anomalies"

**Expected Result:**
- ✅ At least 1 anomaly detected
- ✅ Anomaly on February 13, 2024
- ✅ Shows: 120 transcripts (vs baseline ~57)
- ✅ Severity: HIGH
- ✅ Confidence: >90%

#### 4.2 Anomaly Explanation

**Expected AI Explanation:**
```
Anomaly Type: Spike
Detected Value: 120 transcripts
Baseline Value: 57 transcripts
Deviation: +110% above normal

Possible Causes:
- Unusual spike in activity on this date
- Data quality issue (verify source data)
- Special event or batch processing
- External factor affecting volume

Recommendation:
Investigate the cause of this spike. If legitimate,
consider staffing adjustments for similar future events.
```

#### 4.3 Real-time Anomaly Monitoring

**Steps:**
1. Enable real-time monitoring
2. Set alert thresholds
3. Configure notification channels

**Expected Result:**
- ✅ Monitoring active
- ✅ Alerts configured
- ✅ Email/webhook notifications can be set
- ✅ Historical anomalies displayed

---

### Test Suite 5: Analytics & Dashboards

#### 5.1 Comprehensive Dashboard

**URL:** http://localhost:3000/analytics/comprehensive-dashboard

**Elements to Verify:**

**Overview Metrics Card:**
- ✅ Total Clients: 5
- ✅ Total Transcripts: ~24,000+
- ✅ Active Clients: 5
- ✅ Average Monthly Growth: ~15-20%

**Time Series Chart:**
- ✅ Shows all 5 clients
- ✅ Data from Jan 1 - Mar 29
- ✅ Growth trends visible
- ✅ Smooth curves (no gaps)

**Client Performance Table:**
- ✅ Lists all 5 clients
- ✅ Shows total transcripts
- ✅ Growth rate percentages
- ✅ Last activity date

**Trend Analysis:**
- ✅ Identifies upward trend
- ✅ Shows growth velocity
- ✅ Highlights fastest growing (Berkeley)

#### 5.2 Interactive Dashboard

**URL:** http://localhost:3000/analytics/interactive-dashboard

**Steps:**
1. Drag and drop widgets
2. Customize layout
3. Save custom dashboard

**Widgets to Test:**
- ✅ Forecast Chart
- ✅ Accuracy Meter
- ✅ Trend Indicator
- ✅ Capacity Gauge
- ✅ Anomaly Alert Widget
- ✅ Client Comparison Widget

**Expected Result:**
- ✅ Widgets responsive and interactive
- ✅ Real-time data updates
- ✅ Custom layouts save correctly
- ✅ Drill-down functionality works

#### 5.3 Demo Dashboard

**URL:** http://localhost:3000/demo/dashboard

**Steps:**
1. Navigate to demo dashboard
2. Explore sample visualizations

**Expected Result:**
- ✅ Pre-configured widgets
- ✅ Sample data displayed
- ✅ All chart types working
- ✅ Responsive design

---

### Test Suite 6: Business Intelligence & Recommendations

#### 6.1 AI-Generated Insights

**URL:** http://localhost:3000/analytics/insights

**Expected Insights:**

**Growth Insights:**
```
✅ "Significant growth across all clients - 200%+ increase over Q1"
✅ "Berkeley (UAT) shows exceptional growth (+433%) - ready for production"
✅ "ASU leads in absolute volume - requires priority staffing"
✅ "Consistent daily growth of 1-2 transcripts across all clients"
```

**Operational Insights:**
```
✅ "Mid-month shows peak activity - allocate more resources"
✅ "Weekend volumes lower - optimize weekend staffing"
✅ "Q1 ending strong - prepare for Q2 continuation"
```

**Risk Insights:**
```
✅ "Stanford anomaly on Feb 13 - investigate root cause"
✅ "Rapid growth may strain current capacity"
✅ "No clients showing decline - positive trend"
```

**Opportunity Insights:**
```
✅ "Scale operations to handle projected 150-180 transcripts by April"
✅ "Consider automated processing for high-volume clients"
✅ "Berkeley ready for production promotion"
```

#### 6.2 Recommendation Engine

**Expected Recommendations:**

**Staffing Recommendations:**
```
Date Range: Next 30 days
Recommended Staff:
- ASU: +3 agents (current: ~5, recommended: 8)
- MIT: +2 agents (current: ~3, recommended: 5)
- Stanford: +2 agents (current: ~3, recommended: 5)
- UCLA: +2 agents (current: ~4, recommended: 6)
- Berkeley: +2 agents (current: ~2, recommended: 4)

Reasoning: Growth trends indicate 15-20% monthly increase
Confidence: 92%
```

**Capacity Planning:**
```
Peak Demand Periods:
- Mid-month (15th-25th): +25% volume
- Month-end (28th-31st): +15% volume
- Mondays: +10% vs daily average

Resource Optimization:
- Redistribute weekend staff to weekdays
- Consider flex staff for peak periods
- Implement batch processing for non-urgent items

Cost Savings Potential: $12,000/month
```

**Process Optimization:**
```
Efficiency Improvements:
- Automate routine transcript processing (save 30% time)
- Implement priority queuing for high-volume clients
- Use predictive staffing based on ML forecasts

Automation Opportunities:
- Auto-categorization of transcript types
- Intelligent routing based on complexity
- Automated quality checks
```

---

### Test Suite 7: Vector Search & Embeddings

#### 7.1 Verify Embeddings Generation

**API Test:**
```bash
curl http://localhost:3000/api/embeddings/status
```

**Expected Result:**
- ✅ Embeddings generated for all clients
- ✅ Vector dimension: 768
- ✅ Similarity index created
- ✅ No errors

#### 7.2 Similarity Search

**Steps:**
1. Navigate to Vector Search page
2. Select "ASU-prod" as reference client
3. Click "Find Similar Patterns"

**Expected Result:**
- ✅ Similar clients ranked by similarity score
- ✅ UCLA-prod shows high similarity (similar growth)
- ✅ MIT-prod shows moderate similarity
- ✅ Berkeley-uat shows lower similarity (different scale)

#### 7.3 Pattern Recognition

**Steps:**
1. Navigate to Pattern Analysis
2. Select "Growth Pattern" detection
3. Run analysis

**Expected Patterns Detected:**
- ✅ Consistent daily growth pattern (all clients)
- ✅ Mid-month volume peaks
- ✅ Weekend volume dips
- ✅ Monthly acceleration trend

---

### Test Suite 8: Performance & Monitoring

#### 8.1 Performance Metrics

**Measurements:**

**Page Load Times:**
- ✅ Homepage: <1 second
- ✅ Dashboard: <2 seconds
- ✅ Analytics page: <2.5 seconds

**API Response Times:**
- ✅ Client list: <200ms
- ✅ Analytics data: <500ms
- ✅ Prediction generation: <3 seconds
- ✅ Anomaly detection: <1 second

**Database Performance:**
- ✅ Query time: <100ms average
- ✅ Connection pool: <20 connections
- ✅ No connection timeouts

#### 8.2 System Health Monitoring

**URL:** http://localhost:3000/api/health

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-03-29T10:00:00Z",
  "services": {
    "database": "healthy",
    "vertexAI": "healthy"
  },
  "performance": {
    "responseTime": "45ms",
    "memory": "256MB",
    "cpu": "15%"
  }
}
```

#### 8.3 Error Handling

**Test Scenarios:**

1. **Invalid Data Input:**
   - Upload corrupted CSV
   - Expected: Clear error message, no system crash

2. **Missing Client:**
   - Request data for non-existent client
   - Expected: 404 error with helpful message

3. **Network Timeout:**
   - Simulate slow connection
   - Expected: Loading state, retry mechanism

4. **Database Disconnection:**
   - Stop database temporarily
   - Expected: Graceful degradation, cached data served

---

## 📈 Expected Results Summary

### Data Import
- ✅ 300+ records imported
- ✅ 5 clients created
- ✅ 0 errors
- ✅ <30 seconds processing time

### ML Predictions
- ✅ Accuracy: MAE <5, MAPE <10%
- ✅ Confidence: 90%+ for next 7 days
- ✅ Multiple algorithms working
- ✅ Ensemble predictions accurate

### Anomaly Detection
- ✅ 1+ anomaly detected (Stanford Feb 13)
- ✅ Correct baseline calculation
- ✅ AI explanation provided
- ✅ Severity classification accurate

### Business Insights
- ✅ 10+ insights generated
- ✅ Staffing recommendations provided
- ✅ Growth trends identified
- ✅ Risk alerts generated

### Performance
- ✅ All pages load <2 seconds
- ✅ API responses <500ms
- ✅ No memory leaks
- ✅ Database connections stable

---

## 🐛 Troubleshooting

### Issue: Import Fails

**Solutions:**
1. Check database connection
2. Verify CSV format (client_name, date, transcript_count)
3. Ensure dates are in YYYY-MM-DD format
4. Check file size (<50MB)

### Issue: Predictions Not Generating

**Solutions:**
1. Verify sufficient historical data (min 30 days)
2. Check ML models are trained
3. Review model training logs
4. Ensure Vertex AI credentials configured

### Issue: Anomalies Not Detected

**Solutions:**
1. Adjust sensitivity level (try 0.6-0.9)
2. Ensure enough baseline data
3. Verify anomaly detection enabled during import
4. Check anomaly detection logs

### Issue: Dashboard Not Loading

**Solutions:**
1. Check browser console for errors
2. Clear browser cache
3. Verify API endpoints responding
4. Check database connection

---

## 📝 Test Completion Checklist

Before marking testing as complete, verify:

- [ ] All automated tests passing
- [ ] All 5 clients imported successfully
- [ ] ML predictions generating accurately
- [ ] Anomaly detection working (Stanford spike detected)
- [ ] Business insights being generated
- [ ] Dashboards displaying data correctly
- [ ] Vector embeddings created
- [ ] Performance within acceptable limits
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] Database queries optimized
- [ ] All API endpoints responding

---

## 🎯 Success Criteria

**Testing is considered successful when:**

1. **Functionality**: All features working as documented
2. **Accuracy**: ML predictions within ±10% error margin
3. **Performance**: Page loads <2s, API calls <500ms
4. **Reliability**: No crashes or data loss
5. **Usability**: UI intuitive and responsive
6. **Data Integrity**: All imported data accurate
7. **Intelligence**: BI recommendations sensible and actionable

---

## 📊 Next Steps After Testing

1. **Document Findings**: Record any issues or improvements
2. **Performance Tuning**: Optimize based on test results
3. **Production Deployment**: If all tests pass
4. **User Acceptance Testing**: Have stakeholders review
5. **Monitoring Setup**: Configure production monitoring
6. **Training**: Train end users on features
7. **Continuous Improvement**: Iterate based on feedback

---

_Last Updated: November 19, 2025_
