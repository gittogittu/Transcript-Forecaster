#!/usr/bin/env node

/**
 * Daily Monitoring Script for Transcript Analytics Platform
 * Runs feature verification and tracks trends over time
 */

const fs = require('fs');
const path = require('path');
const { SimpleFeatureVerification } = require('./tmp_rovodev_simple_verification');

class DailyMonitor {
  constructor() {
    this.historyFile = 'tmp_rovodev_monitoring_history.json';
    this.alertThresholds = {
      minSuccessRate: 70, // Alert if success rate drops below 70%
      maxResponseTime: 5000, // Alert if any endpoint takes >5s
      criticalEndpoints: ['Server Health Check', 'Database Health', 'ML Prediction Engine']
    };
  }

  async runDailyCheck() {
    console.log('🕐 Starting Daily Feature Monitoring...\n');
    console.log(`📅 Date: ${new Date().toLocaleString()}\n`);

    // Run verification
    const verifier = new SimpleFeatureVerification();
    const report = await verifier.runVerification();

    if (report.status === 'offline') {
      console.log('\n🚨 CRITICAL: Server is offline! Manual intervention required.');
      this.sendAlert('Server offline', 'critical');
      return;
    }

    // Analyze results and store history
    const analysis = this.analyzeResults(report);
    this.storeResults(report, analysis);
    
    // Check for alerts
    this.checkAlerts(report, analysis);
    
    // Generate trend report
    this.generateTrendReport();
    
    console.log('\n✅ Daily monitoring completed successfully!');
  }

  analyzeResults(report) {
    const successRate = parseFloat(report.summary.success_rate);
    const criticalFailures = report.results.filter(r => 
      r.status === 'failed' && this.alertThresholds.criticalEndpoints.includes(r.name)
    );
    const slowEndpoints = report.results.filter(r => 
      r.duration > this.alertThresholds.maxResponseTime
    );

    return {
      timestamp: new Date().toISOString(),
      successRate,
      criticalFailures: criticalFailures.length,
      slowEndpoints: slowEndpoints.length,
      totalTests: report.summary.total,
      passed: report.summary.passed,
      failed: report.summary.failed,
      averageResponseTime: this.calculateAverageResponseTime(report.results),
      status: this.determineOverallStatus(successRate, criticalFailures.length)
    };
  }

  calculateAverageResponseTime(results) {
    const validResults = results.filter(r => r.duration > 0);
    if (validResults.length === 0) return 0;
    
    const total = validResults.reduce((sum, r) => sum + r.duration, 0);
    return Math.round(total / validResults.length);
  }

  determineOverallStatus(successRate, criticalFailures) {
    if (criticalFailures > 0) return 'critical';
    if (successRate < this.alertThresholds.minSuccessRate) return 'warning';
    if (successRate >= 90) return 'excellent';
    if (successRate >= 80) return 'good';
    return 'fair';
  }

  storeResults(report, analysis) {
    let history = [];
    
    // Load existing history
    if (fs.existsSync(this.historyFile)) {
      try {
        const historyData = fs.readFileSync(this.historyFile, 'utf8');
        history = JSON.parse(historyData);
      } catch (error) {
        console.log('⚠️ Could not load history file, starting fresh');
        history = [];
      }
    }

    // Add new entry
    history.push({
      timestamp: analysis.timestamp,
      analysis,
      report: {
        summary: report.summary,
        critical_failures: report.critical_failures,
        results: report.results.map(r => ({
          name: r.name,
          status: r.status,
          duration: r.duration,
          error: r.error
        }))
      }
    });

    // Keep only last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    history = history.filter(entry => new Date(entry.timestamp) > thirtyDaysAgo);

    // Save updated history
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    console.log(`📊 Results stored. History contains ${history.length} entries.`);
  }

  checkAlerts(report, analysis) {
    const alerts = [];

    // Check success rate
    if (analysis.successRate < this.alertThresholds.minSuccessRate) {
      alerts.push({
        type: 'warning',
        message: `Success rate dropped to ${analysis.successRate}% (threshold: ${this.alertThresholds.minSuccessRate}%)`
      });
    }

    // Check critical failures
    if (analysis.criticalFailures > 0) {
      alerts.push({
        type: 'critical',
        message: `${analysis.criticalFailures} critical endpoint(s) failing: ${report.critical_failures.join(', ')}`
      });
    }

    // Check slow endpoints
    if (analysis.slowEndpoints > 0) {
      alerts.push({
        type: 'warning',
        message: `${analysis.slowEndpoints} endpoint(s) responding slowly (>${this.alertThresholds.maxResponseTime}ms)`
      });
    }

    // Display alerts
    if (alerts.length > 0) {
      console.log('\n🚨 ALERTS TRIGGERED:');
      alerts.forEach(alert => {
        const icon = alert.type === 'critical' ? '🔴' : '🟡';
        console.log(`   ${icon} ${alert.type.toUpperCase()}: ${alert.message}`);
      });
      
      // Save alerts to file for external monitoring systems
      const alertsFile = `tmp_rovodev_alerts_${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
      console.log(`   📄 Alerts saved to: ${alertsFile}`);
    } else {
      console.log('\n✅ No alerts triggered - all systems nominal!');
    }
  }

  generateTrendReport() {
    if (!fs.existsSync(this.historyFile)) {
      console.log('\n📈 Trend Report: Insufficient data (first run)');
      return;
    }

    try {
      const history = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
      
      if (history.length < 2) {
        console.log('\n📈 Trend Report: Need more data points for trends');
        return;
      }

      // Calculate trends
      const recent = history.slice(-7); // Last 7 days
      const avgSuccessRate = recent.reduce((sum, h) => sum + h.analysis.successRate, 0) / recent.length;
      const avgResponseTime = recent.reduce((sum, h) => sum + h.analysis.averageResponseTime, 0) / recent.length;
      
      // Compare with previous period
      const previous = history.slice(-14, -7);
      if (previous.length > 0) {
        const prevAvgSuccess = previous.reduce((sum, h) => sum + h.analysis.successRate, 0) / previous.length;
        const prevAvgResponse = previous.reduce((sum, h) => sum + h.analysis.averageResponseTime, 0) / previous.length;
        
        const successTrend = avgSuccessRate - prevAvgSuccess;
        const responseTrend = avgResponseTime - prevAvgResponse;
        
        console.log('\n📈 TREND REPORT (Last 7 days vs Previous 7):');
        console.log(`   Success Rate: ${avgSuccessRate.toFixed(1)}% (${successTrend > 0 ? '+' : ''}${successTrend.toFixed(1)}%)`);
        console.log(`   Avg Response: ${avgResponseTime.toFixed(0)}ms (${responseTrend > 0 ? '+' : ''}${responseTrend.toFixed(0)}ms)`);
        
        if (successTrend > 5) {
          console.log('   🟢 Success rate improving significantly!');
        } else if (successTrend < -5) {
          console.log('   🔴 Success rate declining - investigate!');
        }
      }

      // Most reliable endpoints
      const endpointStats = {};
      recent.forEach(entry => {
        entry.report.results.forEach(result => {
          if (!endpointStats[result.name]) {
            endpointStats[result.name] = { passed: 0, total: 0, avgDuration: 0 };
          }
          endpointStats[result.name].total++;
          if (result.status === 'passed') {
            endpointStats[result.name].passed++;
          }
          endpointStats[result.name].avgDuration += result.duration || 0;
        });
      });

      console.log('\n🏆 MOST RELIABLE ENDPOINTS (Last 7 days):');
      Object.entries(endpointStats)
        .sort(([,a], [,b]) => (b.passed/b.total) - (a.passed/a.total))
        .slice(0, 3)
        .forEach(([name, stats]) => {
          const reliability = ((stats.passed / stats.total) * 100).toFixed(1);
          const avgDuration = Math.round(stats.avgDuration / stats.total);
          console.log(`   ✅ ${name}: ${reliability}% reliable, ${avgDuration}ms avg`);
        });

    } catch (error) {
      console.log('\n📈 Trend Report: Error analyzing history:', error.message);
    }
  }

  // Method to set up automated scheduling (example for different platforms)
  setupAutomatedScheduling() {
    console.log('\n⏰ To set up automated daily monitoring:');
    console.log('\n📋 OPTION 1 - Windows Task Scheduler:');
    console.log('   1. Open Task Scheduler');
    console.log('   2. Create Basic Task: "Feature Monitoring"');
    console.log('   3. Trigger: Daily at 6:00 AM');
    console.log('   4. Action: Start Program');
    console.log(`   5. Program: node`);
    console.log(`   6. Arguments: ${path.resolve(__filename)}`);
    console.log(`   7. Start in: ${process.cwd()}`);
    
    console.log('\n📋 OPTION 2 - NPM Script (package.json):');
    console.log('   "scripts": {');
    console.log('     "monitor": "node scripts/tmp_rovodev_daily_monitor.js"');
    console.log('   }');
    console.log('   Then run: npm run monitor');
    
    console.log('\n📋 OPTION 3 - CI/CD Pipeline:');
    console.log('   Add to your GitHub Actions workflow:');
    console.log('   - name: Daily Feature Monitoring');
    console.log('     run: node scripts/tmp_rovodev_daily_monitor.js');
    console.log('     schedule: "0 6 * * *"  # Daily at 6 AM UTC');
  }
}

// Run if executed directly
if (require.main === module) {
  const monitor = new DailyMonitor();
  
  // Check if user wants setup instructions
  if (process.argv.includes('--setup')) {
    monitor.setupAutomatedScheduling();
    process.exit(0);
  }
  
  monitor.runDailyCheck()
    .then(() => {
      console.log('\n💡 TIP: Run with --setup flag for automated scheduling instructions');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Daily monitoring failed:', error);
      process.exit(1);
    });
}

module.exports = { DailyMonitor };