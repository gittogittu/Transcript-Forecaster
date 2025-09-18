# User Flow Diagrams

This document contains comprehensive user flow diagrams using Mermaid to visualize how different users interact with the Transcript Analytics Platform.

## Primary User Flow: ML-Powered Transcript Prediction

```mermaid
flowchart TD
    START([User Opens Platform]) --> LOGIN{Authenticated?}
    
    LOGIN -->|No| AUTH[Login via Auth0]
    LOGIN -->|Yes| DASHBOARD[View Dashboard]
    AUTH --> DASHBOARD
    
    DASHBOARD --> CHOOSE{Choose Action}
    
    CHOOSE -->|View Predictions| PRED_FLOW[Prediction Flow]
    CHOOSE -->|Manage Clients| CLIENT_FLOW[Client Management Flow]
    CHOOSE -->|Import Data| IMPORT_FLOW[Data Import Flow]
    CHOOSE -->|View Analytics| ANALYTICS_FLOW[Analytics Flow]
    
    PRED_FLOW --> SELECT_CLIENT[Select Client]
    SELECT_CLIENT --> VIEW_PRED[View ML Predictions]
    VIEW_PRED --> CONFIDENCE[Review Confidence Scores]
    CONFIDENCE --> FORECAST_HORIZON{Choose Forecast Horizon}
    
    FORECAST_HORIZON -->|Next Day| DAILY_PRED[Daily Predictions]
    FORECAST_HORIZON -->|Next Week| WEEKLY_PRED[Weekly Predictions]
    FORECAST_HORIZON -->|Next Month| MONTHLY_PRED[Monthly Predictions]
    
    DAILY_PRED --> RESOURCE_PLAN[Resource Planning]
    WEEKLY_PRED --> CAPACITY_PLAN[Capacity Planning]
    MONTHLY_PRED --> BUDGET_PLAN[Budget Planning]
    
    RESOURCE_PLAN --> ACTION_TAKEN[Take Action]
    CAPACITY_PLAN --> ACTION_TAKEN
    BUDGET_PLAN --> ACTION_TAKEN
    
    ACTION_TAKEN --> END([End])
    
    style START fill:#e1f5fe
    style PRED_FLOW fill:#e8f5e8
    style VIEW_PRED fill:#fff3e0
    style ACTION_TAKEN fill:#f3e5f5
```

## Client Management User Flow

```mermaid
flowchart TD
    START([Access Client Management]) --> CLIENT_LIST[View Client List]
    
    CLIENT_LIST --> FILTER{Apply Filters?}
    FILTER -->|Yes| SEARCH[Search/Filter Clients]
    FILTER -->|No| VIEW_OPTIONS{Choose Action}
    SEARCH --> VIEW_OPTIONS
    
    VIEW_OPTIONS -->|Add New| CREATE_FLOW[Create Client Flow]
    VIEW_OPTIONS -->|Edit Existing| EDIT_FLOW[Edit Client Flow]
    VIEW_OPTIONS -->|View Details| DETAIL_FLOW[Client Details Flow]
    VIEW_OPTIONS -->|Bulk Operations| BULK_FLOW[Bulk Operations Flow]
    VIEW_OPTIONS -->|Export Data| EXPORT_FLOW[Export Flow]
    
    CREATE_FLOW --> ENTER_CODE[Enter Client Code]
    ENTER_CODE --> AUTO_DERIVE[System Auto-derives Name/Environment]
    AUTO_DERIVE --> OPTIONAL_INFO[Add Optional Info]
    OPTIONAL_INFO --> VALIDATE[Validate Input]
    VALIDATE --> SAVE_CLIENT[Save Client]
    SAVE_CLIENT --> SUCCESS_MSG[Show Success Message]
    SUCCESS_MSG --> CLIENT_LIST
    
    EDIT_FLOW --> SELECT_CLIENT[Select Client to Edit]
    SELECT_CLIENT --> INLINE_EDIT[Inline Editing Form]
    INLINE_EDIT --> UPDATE_FIELDS[Update Fields]
    UPDATE_FIELDS --> SAVE_CHANGES[Save Changes]
    SAVE_CHANGES --> CLIENT_LIST
    
    DETAIL_FLOW --> CLIENT_DETAILS[Open Client Details Page]
    CLIENT_DETAILS --> TAB_NAV{Navigate Tabs}
    TAB_NAV -->|Overview| OVERVIEW_TAB[View Overview Metrics]
    TAB_NAV -->|Analytics| ANALYTICS_TAB[View Analytics Charts]
    TAB_NAV -->|Predictions| PREDICTIONS_TAB[View ML Predictions]
    TAB_NAV -->|Settings| SETTINGS_TAB[Edit Client Settings]
    
    BULK_FLOW --> SELECT_MULTIPLE[Select Multiple Clients]
    SELECT_MULTIPLE --> BULK_ACTION{Choose Bulk Action}
    BULK_ACTION -->|Activate| BULK_ACTIVATE[Bulk Activate Clients]
    BULK_ACTION -->|Deactivate| BULK_DEACTIVATE[Bulk Deactivate Clients]
    BULK_ACTIVATE --> CONFIRM[Confirm Action]
    BULK_DEACTIVATE --> CONFIRM
    CONFIRM --> PROCESS[Process Bulk Operation]
    PROCESS --> CLIENT_LIST
    
    EXPORT_FLOW --> CHOOSE_FORMAT[Choose Export Format]
    CHOOSE_FORMAT --> CSV_EXPORT[Export to CSV]
    CSV_EXPORT --> DOWNLOAD[Download File]
    DOWNLOAD --> CLIENT_LIST
    
    style START fill:#e1f5fe
    style CREATE_FLOW fill:#e8f5e8
    style DETAIL_FLOW fill:#fff3e0
    style BULK_FLOW fill:#f3e5f5
```

## Data Import and ML Training Flow

```mermaid
flowchart TD
    START([Access Data Import]) --> IMPORT_PAGE[View Import Interface]
    
    IMPORT_PAGE --> UPLOAD_METHOD{Choose Upload Method}
    UPLOAD_METHOD -->|Drag & Drop| DRAG_DROP[Drag & Drop Files]
    UPLOAD_METHOD -->|File Picker| FILE_PICKER[Select Files]
    
    DRAG_DROP --> VALIDATE_FILE[Validate File Format]
    FILE_PICKER --> VALIDATE_FILE
    
    VALIDATE_FILE --> FORMAT_CHECK{Valid Format?}
    FORMAT_CHECK -->|No| ERROR_MSG[Show Format Error]
    ERROR_MSG --> IMPORT_PAGE
    
    FORMAT_CHECK -->|Yes| PREVIEW_DATA[Preview Data Sample]
    PREVIEW_DATA --> PROCESSING_OPTIONS[Choose Processing Options]
    
    PROCESSING_OPTIONS --> CLEAN_DATA{Clean Data?}
    PROCESSING_OPTIONS --> GEN_EMBEDDINGS{Generate Embeddings?}
    PROCESSING_OPTIONS --> TRAIN_MODELS{Train ML Models?}
    PROCESSING_OPTIONS --> DETECT_ANOMALIES{Detect Anomalies?}
    
    CLEAN_DATA -->|Yes| DATA_CLEANING[Data Cleaning Process]
    GEN_EMBEDDINGS -->|Yes| EMBEDDING_GEN[Generate Vector Embeddings]
    TRAIN_MODELS -->|Yes| ML_TRAINING[ML Model Training]
    DETECT_ANOMALIES -->|Yes| ANOMALY_DETECT[Anomaly Detection]
    
    DATA_CLEANING --> PROGRESS_TRACK[Track Import Progress]
    EMBEDDING_GEN --> PROGRESS_TRACK
    ML_TRAINING --> DAILY_SCHEDULE[Schedule Daily Retraining]
    ANOMALY_DETECT --> PROGRESS_TRACK
    
    DAILY_SCHEDULE --> AUTO_RETRAIN[Automated Daily Retraining]
    AUTO_RETRAIN --> MODEL_UPDATE[Update ML Models]
    MODEL_UPDATE --> PREDICTION_REFRESH[Refresh Predictions]
    PREDICTION_REFRESH --> ACCURACY_CHECK[Check Model Accuracy]
    
    ACCURACY_CHECK --> DRIFT_DETECT{Concept Drift Detected?}
    DRIFT_DETECT -->|Yes| TRIGGER_RETRAIN[Trigger Model Retraining]
    DRIFT_DETECT -->|No| CONTINUE_MONITORING[Continue Monitoring]
    
    TRIGGER_RETRAIN --> MODEL_UPDATE
    CONTINUE_MONITORING --> AUTO_RETRAIN
    
    PROGRESS_TRACK --> IMPORT_COMPLETE[Import Complete]
    IMPORT_COMPLETE --> SUCCESS_SUMMARY[Show Success Summary]
    SUCCESS_SUMMARY --> END([End])
    
    style START fill:#e1f5fe
    style ML_TRAINING fill:#e8f5e8
    style AUTO_RETRAIN fill:#fff3e0
    style ACCURACY_CHECK fill:#f3e5f5
```

## Analytics Dashboard User Flow

```mermaid
flowchart TD
    START([Access Analytics]) --> DASHBOARD_TYPE{Choose Dashboard}
    
    DASHBOARD_TYPE -->|Interactive| INTERACTIVE_DASH[Interactive Dashboard]
    DASHBOARD_TYPE -->|Comprehensive| COMPREHENSIVE_DASH[Comprehensive Dashboard]
    DASHBOARD_TYPE -->|Simple| SIMPLE_DASH[Simple Dashboard]
    
    INTERACTIVE_DASH --> CUSTOMIZE[Customize Dashboard Layout]
    CUSTOMIZE --> WIDGET_LIBRARY[Access Widget Library]
    WIDGET_LIBRARY --> DRAG_WIDGETS[Drag & Drop Widgets]
    DRAG_WIDGETS --> CONFIGURE_WIDGETS[Configure Widget Settings]
    CONFIGURE_WIDGETS --> SAVE_LAYOUT[Save Custom Layout]
    
    COMPREHENSIVE_DASH --> OVERVIEW_METRICS[View Overview Metrics]
    OVERVIEW_METRICS --> DRILL_DOWN{Drill Down Into Metrics}
    
    DRILL_DOWN -->|Client Analysis| CLIENT_METRICS[Client-Specific Metrics]
    DRILL_DOWN -->|Time Series| TIME_ANALYSIS[Time Series Analysis]
    DRILL_DOWN -->|Predictions| PREDICTION_ANALYSIS[Prediction Analysis]
    DRILL_DOWN -->|Anomalies| ANOMALY_ANALYSIS[Anomaly Analysis]
    
    CLIENT_METRICS --> FILTER_CLIENT[Filter by Client]
    TIME_ANALYSIS --> TIME_RANGE[Select Time Range]
    PREDICTION_ANALYSIS --> MODEL_COMPARISON[Compare ML Models]
    ANOMALY_ANALYSIS --> ANOMALY_DETAILS[View Anomaly Details]
    
    FILTER_CLIENT --> INSIGHTS[Generate Insights]
    TIME_RANGE --> TRENDS[Identify Trends]
    MODEL_COMPARISON --> ACCURACY_METRICS[View Accuracy Metrics]
    ANOMALY_DETAILS --> ROOT_CAUSE[Root Cause Analysis]
    
    INSIGHTS --> RECOMMENDATIONS[AI Recommendations]
    TRENDS --> FORECASTS[View Forecasts]
    ACCURACY_METRICS --> MODEL_SELECTION[Select Best Model]
    ROOT_CAUSE --> CORRECTIVE_ACTION[Suggest Corrective Actions]
    
    RECOMMENDATIONS --> EXPORT_INSIGHTS[Export Insights]
    FORECASTS --> RESOURCE_PLANNING[Resource Planning]
    MODEL_SELECTION --> UPDATE_PRODUCTION[Update Production Models]
    CORRECTIVE_ACTION --> IMPLEMENT_FIXES[Implement Fixes]
    
    EXPORT_INSIGHTS --> END([End])
    RESOURCE_PLANNING --> END
    UPDATE_PRODUCTION --> END
    IMPLEMENT_FIXES --> END
    
    SAVE_LAYOUT --> END
    
    style START fill:#e1f5fe
    style INTERACTIVE_DASH fill:#e8f5e8
    style INSIGHTS fill:#fff3e0
    style RECOMMENDATIONS fill:#f3e5f5
```

## ML Model Management Flow

```mermaid
flowchart TD
    START([ML Model Management]) --> MODEL_REGISTRY[Access Model Registry]
    
    MODEL_REGISTRY --> VIEW_MODELS[View Available Models]
    VIEW_MODELS --> MODEL_ACTION{Choose Action}
    
    MODEL_ACTION -->|Train New| TRAINING_FLOW[Model Training Flow]
    MODEL_ACTION -->|Compare Models| COMPARISON_FLOW[Model Comparison Flow]
    MODEL_ACTION -->|Deploy Model| DEPLOYMENT_FLOW[Model Deployment Flow]
    MODEL_ACTION -->|Monitor Performance| MONITORING_FLOW[Model Monitoring Flow]
    
    TRAINING_FLOW --> SELECT_ALGORITHM[Select ML Algorithm]
    SELECT_ALGORITHM --> FEATURE_SELECTION[Select Features]
    FEATURE_SELECTION --> HYPERPARAMETER[Set Hyperparameters]
    HYPERPARAMETER --> TRAINING_DATA[Prepare Training Data]
    TRAINING_DATA --> TRAIN_MODEL[Train Model]
    TRAIN_MODEL --> VALIDATE_MODEL[Validate Model Performance]
    VALIDATE_MODEL --> SAVE_MODEL[Save to Model Registry]
    
    COMPARISON_FLOW --> SELECT_MODELS[Select Models to Compare]
    SELECT_MODELS --> PERFORMANCE_METRICS[Compare Performance Metrics]
    PERFORMANCE_METRICS --> ACCURACY_COMPARISON[Compare Accuracy Scores]
    ACCURACY_COMPARISON --> SPEED_COMPARISON[Compare Training/Inference Speed]
    SPEED_COMPARISON --> RESOURCE_USAGE[Compare Resource Usage]
    RESOURCE_USAGE --> CHOOSE_BEST[Choose Best Model]
    
    DEPLOYMENT_FLOW --> STAGING_DEPLOY[Deploy to Staging]
    STAGING_DEPLOY --> AB_TESTING[A/B Testing Setup]
    AB_TESTING --> PERFORMANCE_TEST[Performance Testing]
    PERFORMANCE_TEST --> PRODUCTION_DEPLOY[Deploy to Production]
    PRODUCTION_DEPLOY --> UPDATE_ENDPOINTS[Update Prediction Endpoints]
    
    MONITORING_FLOW --> ACCURACY_TRACKING[Track Prediction Accuracy]
    ACCURACY_TRACKING --> DRIFT_DETECTION[Monitor Concept Drift]
    DRIFT_DETECTION --> PERFORMANCE_ALERTS[Set up Performance Alerts]
    PERFORMANCE_ALERTS --> AUTO_RETRAINING[Configure Auto-retraining]
    
    AUTO_RETRAINING --> RETRAIN_TRIGGERS[Define Retrain Triggers]
    RETRAIN_TRIGGERS --> RETRAIN_SCHEDULE[Set Retraining Schedule]
    RETRAIN_SCHEDULE --> VALIDATION_PIPELINE[Automated Validation Pipeline]
    VALIDATION_PIPELINE --> DEPLOYMENT_PIPELINE[Automated Deployment Pipeline]
    
    SAVE_MODEL --> END([End])
    CHOOSE_BEST --> DEPLOYMENT_FLOW
    UPDATE_ENDPOINTS --> END
    DEPLOYMENT_PIPELINE --> END
    
    style START fill:#e1f5fe
    style TRAINING_FLOW fill:#e8f5e8
    style COMPARISON_FLOW fill:#fff3e0
    style MONITORING_FLOW fill:#f3e5f5
```

## Error Handling and Recovery Flow

```mermaid
flowchart TD
    START([User Action]) --> EXECUTE[Execute Action]
    
    EXECUTE --> ERROR_CHECK{Error Occurred?}
    ERROR_CHECK -->|No| SUCCESS[Action Successful]
    ERROR_CHECK -->|Yes| ERROR_TYPE{Error Type}
    
    ERROR_TYPE -->|Validation Error| VALIDATION_ERROR[Input Validation Error]
    ERROR_TYPE -->|Authentication Error| AUTH_ERROR[Authentication Error]
    ERROR_TYPE -->|Authorization Error| AUTHZ_ERROR[Authorization Error]
    ERROR_TYPE -->|Database Error| DB_ERROR[Database Error]
    ERROR_TYPE -->|ML Service Error| ML_ERROR[ML Service Error]
    ERROR_TYPE -->|Network Error| NETWORK_ERROR[Network Error]
    ERROR_TYPE -->|Unknown Error| UNKNOWN_ERROR[Unknown Error]
    
    VALIDATION_ERROR --> SHOW_VALIDATION[Show Validation Message]
    SHOW_VALIDATION --> HIGHLIGHT_FIELDS[Highlight Invalid Fields]
    HIGHLIGHT_FIELDS --> USER_CORRECTION[User Corrects Input]
    USER_CORRECTION --> EXECUTE
    
    AUTH_ERROR --> REDIRECT_LOGIN[Redirect to Login]
    REDIRECT_LOGIN --> LOGIN_FLOW[Authentication Flow]
    LOGIN_FLOW --> EXECUTE
    
    AUTHZ_ERROR --> SHOW_PERMISSION[Show Permission Error]
    SHOW_PERMISSION --> CONTACT_ADMIN[Contact Administrator]
    CONTACT_ADMIN --> END([End])
    
    DB_ERROR --> RETRY_LOGIC{Retry Possible?}
    RETRY_LOGIC -->|Yes| EXPONENTIAL_BACKOFF[Exponential Backoff Retry]
    RETRY_LOGIC -->|No| FALLBACK_DATA[Use Cached/Fallback Data]
    EXPONENTIAL_BACKOFF --> EXECUTE
    FALLBACK_DATA --> SHOW_WARNING[Show Data Staleness Warning]
    
    ML_ERROR --> MODEL_FALLBACK[Use Fallback Model]
    MODEL_FALLBACK --> DEGRADED_SERVICE[Degraded Service Mode]
    DEGRADED_SERVICE --> NOTIFY_ADMIN[Notify Administrators]
    
    NETWORK_ERROR --> OFFLINE_MODE[Enable Offline Mode]
    OFFLINE_MODE --> QUEUE_ACTIONS[Queue Actions for Later]
    QUEUE_ACTIONS --> RETRY_WHEN_ONLINE[Retry When Online]
    
    UNKNOWN_ERROR --> LOG_ERROR[Log Error Details]
    LOG_ERROR --> GENERIC_MESSAGE[Show Generic Error Message]
    GENERIC_MESSAGE --> CONTACT_SUPPORT[Provide Support Contact]
    
    SUCCESS --> END
    SHOW_WARNING --> END
    NOTIFY_ADMIN --> END
    RETRY_WHEN_ONLINE --> END
    CONTACT_SUPPORT --> END
    
    style START fill:#e1f5fe
    style ERROR_TYPE fill:#ffebee
    style SUCCESS fill:#e8f5e8
    style FALLBACK_DATA fill:#fff3e0
```