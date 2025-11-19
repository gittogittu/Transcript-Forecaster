# Quick Start Testing Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start the Application

```bash
# Terminal 1 - Start the development server
npm run dev
```

Wait for the server to start. You should see:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

---

### Step 2: Import Test Data

1. **Open your browser** to: http://localhost:3000/data/import

2. **Upload the test data file**: `test-data-comprehensive.csv`

3. **Enable all options:**
   - ✅ Clean Data
   - ✅ Generate Embeddings  
   - ✅ Train Models
   - ✅ Detect Anomalies

4. **Click "Import Data"** and wait for completion (~2-5 minutes)

---

### Step 3: Run Automated Tests

```bash
# Terminal 2 - Run the test suite
node scripts/test-all-features.js
```

This will test all API endpoints and features automatically.

---

## 📊 What the Test Data Contains

### Test Data Overview
**File:** `test-data-comprehensive.csv`
**Records:** ~300 daily transcript counts
**Date Range:** January 1 - March 29, 2024
**Clients:** 5 (4 production, 1 UAT)

### Client Details

| Client | Environment | Start Vol | End Vol | Growth | Special Notes |
|--------|-------------|-----------|---------|--------|---------------|
| ASU-prod | Production | 45 | 135 | +200% | Steady growth |
| MIT-prod | Production | 30 | 95 | +217% | Consistent |
| Stanford-prod | Production | 25 | 90 | +260% | **Has anomaly on Feb 13** |
| UCLA-prod | Production | 40 | 105 | +162% | Moderate growth |
| Berkeley-uat | UAT | 15 | 80 | +433% | Highest growth |

### Key Testing Points

**Growth Trends:**
- All clients show consistent upward growth
- Daily increases of 1-2 transcripts
- No seasonal dips (continuous growth)

**Anomaly for Detection:**
- **Stanford on Feb 13, 2024:** 120 transcripts (vs ~57 average)
- **+110% spike** - should trigger anomaly detection
- Tests AI's ability to detect unusual patterns

**Environment Mix:**
- 4 production clients (realistic workload)
- 1 UAT client (testing environment scenario)
- Tests environment filtering feature

---

## ✅ Quick Verification Checklist

After importing data, verify these features:

### 1. Client Management (2 minutes)
- [ ] Navigate to `/clients`
- [ ] Verify all 5 clients are listed
- [ ] Search works (try "ASU")
- [ ] Can filter by environment (prod/uat)

### 2. Analytics Dashboard (3 minutes)
- [ ] Navigate to `/analytics/comprehensive-dashboard`
- [ ] See time series chart with all clients
- [ ] Growth trends visible
- [ ] No missing data points

### 3. ML Predictions (3 minutes)
- [ ] Select ASU-prod client
- [ ] Generate 7-day forecast
- [ ] Verify prediction shows ~138-145 transcripts
- [ ] Confidence intervals displayed

### 4. Anomaly Detection (2 minutes)
- [ ] Select Stanford-prod client
- [ ] Navigate to Anomaly Detection
- [ ] Verify Feb 13 anomaly detected
- [ ] Check severity and explanation

### 5. Business Insights (2 minutes)
- [ ] Navigate to `/analytics/insights`
- [ ] Verify AI-generated recommendations
- [ ] Check for growth insights
- [ ] Staffing suggestions present

**Total Time:** ~12 minutes for basic verification

---

## 🎯 Expected Business Intelligence Outputs

### AI-Generated Insights You Should See

**Growth Recommendations:**
```
✓ "High growth detected - consider hiring 9+ additional staff members"
✓ "Berkeley UAT environment ready for production deployment"
✓ "ASU showing strongest absolute volume - priority client"
✓ "Consistent 15-20% monthly growth across all clients"
```

**Capacity Planning:**
```
✓ "Current trajectory suggests 160+ transcripts by April for ASU"
✓ "Prepare for 25-30% capacity increase by end of Q2"
✓ "Mid-month peaks require +20% staffing"
```

**Risk Alerts:**
```
✓ "Stanford anomaly detected - potential data quality issue"
✓ "Rapid growth may strain current resources"
✓ "No declining clients - positive but requires planning"
```

**Operational Insights:**
```
✓ "Weekday volumes higher - optimize weekend staffing"
✓ "Consider automated processing for volumes >100/day"
✓ "Implement predictive staffing for cost optimization"
```

### ML Model Performance Metrics

**Expected Accuracy:**
- MAE (Mean Absolute Error): <5 transcripts
- MAPE (Mean Absolute Percentage Error): <10%
- R² Score: >0.90
- Confidence (7-day): 95%+

**Model Comparison:**
- XGBoost: Best overall (MAE ~4-7)
- LSTM: Close second (MAE ~3-6)
- Prophet: Good for seasonality (MAE ~8-12)
- ARIMA: Baseline (MAE ~12-15)

### Anomaly Detection Results

**Stanford Feb 13 Anomaly:**
```
Detected Value: 120 transcripts
Baseline Value: ~57 transcripts
Deviation: +110% above normal
Severity: HIGH
Confidence: >90%

AI Explanation:
"Unusual spike detected on February 13, 2024. This represents
a 110% increase from the rolling 7-day average. Investigate
possible causes such as batch processing, special event, or
data quality issue. If legitimate, prepare for similar future
spikes."
```

---

## 🔍 Detailed Feature Testing

### Test All 10+ ML Algorithms

The platform should test these algorithms on your data:

**Statistical Models:**
1. ✅ ARIMA/SARIMA - Autoregressive models
2. ✅ Prophet - Facebook's forecasting
3. ✅ Exponential Smoothing - Holt-Winters
4. ✅ Kalman Filters - Adaptive filtering

**Machine Learning:**
5. ✅ Random Forest - Tree ensemble
6. ✅ XGBoost - Gradient boosting
7. ✅ LightGBM - Fast gradient boosting
8. ✅ SVR - Support vector regression

**Deep Learning:**
9. ✅ LSTM - Long short-term memory
10. ✅ GRU - Gated recurrent units
11. ✅ Transformers - Attention mechanisms
12. ✅ CNN-LSTM - Hybrid architecture

### Test Feature Engineering

Verify that 50+ features are automatically generated:

**Temporal Features (20+):**
- Day of week, month, quarter, year
- Holiday indicators
- Weekend flags
- Time since last event

**Statistical Features (20+):**
- Rolling averages (7, 14, 30, 90 days)
- Rolling std deviations
- Lag features (1-30 days)
- Rate of change

**Domain Features (10+):**
- Client size category
- Environment type
- Historical AHT patterns
- Seasonality strength

**Advanced Features (10+):**
- Fourier coefficients
- Wavelet decomposition
- PCA components
- Feature interactions

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot connect to database"
**Solution:**
```bash
# Check if PostgreSQL is running
# On Windows:
Get-Service postgresql*

# If not running, start it:
Start-Service postgresql-x64-14

# Verify connection string in .env.local
DATABASE_URL=postgresql://...
```

### Issue: "Import fails with validation error"
**Solution:**
- Verify CSV has exact columns: `client_name,date,transcript_count`
- Dates must be in `YYYY-MM-DD` format
- Transcript count must be positive integers
- No blank rows

### Issue: "Predictions not generating"
**Solution:**
1. Ensure data imported successfully
2. Check that "Train Models" was enabled during import
3. Verify at least 30 days of historical data
4. Check browser console for errors

### Issue: "No anomalies detected"
**Solution:**
1. Lower sensitivity to 0.6 or 0.7
2. Verify "Detect Anomalies" was enabled during import
3. Check Stanford client specifically (has known anomaly)
4. Ensure sufficient baseline data (7+ days)

---

## 📈 Performance Benchmarks

### Expected Performance Metrics

**Page Load Times:**
- Homepage: <1 second
- Client list: <1 second
- Dashboard: <2 seconds
- Analytics: <2.5 seconds

**API Response Times:**
- GET /api/clients: <200ms
- GET /api/analytics/insights: <500ms
- POST /api/predictions/forecast: <3 seconds
- POST /api/anomaly-detection/detect: <1 second

**Data Import:**
- 300 records: ~30-60 seconds
- With ML training: ~2-5 minutes
- With embeddings: +30-60 seconds

**Database Queries:**
- Simple queries: <50ms
- Analytics queries: <200ms
- Complex joins: <500ms

---

## 🎓 Understanding the Results

### What Each Test Validates

**Client Management** → Tests database CRUD operations, search, filtering

**Data Import** → Tests file processing, data validation, bulk operations

**ML Predictions** → Tests all algorithms, ensemble methods, accuracy

**Anomaly Detection** → Tests statistical methods, ML detection, root cause AI

**Analytics** → Tests data aggregation, visualization, performance

**BI Recommendations** → Tests AI insight generation, NLP, business logic

**Vector Search** → Tests embeddings, similarity calculation, pattern matching

**Performance** → Tests response times, scalability, resource usage

---

## 📊 Success Criteria

Mark testing as **SUCCESSFUL** if:

✅ All 5 clients imported  
✅ Time series charts display correctly  
✅ ML predictions accurate (±10%)  
✅ Stanford anomaly detected  
✅ At least 5 business insights generated  
✅ All dashboards load <2 seconds  
✅ No errors in console  
✅ Database connections stable  
✅ API responses <500ms  
✅ Search and filtering work  

Mark testing as **NEEDS ATTENTION** if any of above fails.

---

## 🚀 After Testing

### If All Tests Pass

1. **Document success** in test-results.json
2. **Save configuration** that worked
3. **Consider production deployment**
4. **Train end users** on features
5. **Set up monitoring** for production

### If Some Tests Fail

1. **Review error logs** (browser console, server logs)
2. **Check database** (connection, migrations, data)
3. **Verify environment** (.env.local configuration)
4. **Consult troubleshooting** section above
5. **Run specific tests** in isolation

### Next Steps

1. **Production Deployment:** See `docs/DEPLOYMENT_GUIDE.md`
2. **User Training:** See `docs/USER_FLOWS.md`
3. **API Integration:** See `docs/API_DOCUMENTATION.md`
4. **ML Customization:** See `docs/ML_AI_TECHNICAL_SPECIFICATION.md`

---

## 📞 Getting Help

**Documentation:**
- Architecture: `docs/ARCHITECTURE.md`
- Features: `docs/FEATURES.md`
- Testing: `docs/TESTING_GUIDE.md`
- Technical: `docs/TECHNICAL_GUIDE.md`

**Logs to Check:**
- Browser Console: F12 → Console tab
- Server Logs: Terminal running `npm run dev`
- Database Logs: PostgreSQL logs directory

**Common Commands:**
```bash
# Check server status
npm run dev

# Verify database
npm run db:status

# Run migrations
npm run db:migrate

# Run all tests
npm run test

# Check logs
tail -f logs/application.log
```

---

**Good luck with testing! 🎉**

The test data is designed to showcase all platform capabilities. You should see impressive ML accuracy, meaningful business insights, and robust anomaly detection.

---

_Last Updated: November 19, 2025_
