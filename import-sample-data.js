#!/usr/bin/env node

/**
 * Import Sample AHT and Monthly Transcript Data
 * 
 * This script imports the provided client data with AHT metrics and monthly counts
 */

require('dotenv').config({ path: '.env.local' });

// Your sample data
const sampleData = `Client	Overall AHT	Review AHT	Validation AHT	Jun-2024	Jul-2024	Aug-2024	Sep-2024	Oct-2024	Nov-2024	Dec-2024	Jan-2025	Feb-2025	Mar-2025	Apr-2025	May-2025	Jun-2025	Grand total
sia-asc-prod	16	12	4	0	0	0	0	0	0	1284	4143	2424	2302	2026	1178	8740
sia-con-prod	21.1	16.1	5	3862	5232	8309	5564	5140	3465	4364	0942	7450	5405	412
sia-csu-prod-slate	9.9	6.9	3	1524	1516	1019	3602	7071	5431	2628	4510	5178	7560	4621	2511
sia-gon-prod	15	11	4	0	0	0	0	0	0	4271	5626	9956	5268	4103	0677	8
sia-gvsu-prod	6	4	2	0	0	0	0	0	0	0	0	0	0	0	310	1310	1
sia-hu-prod	21	15	6	1835	3025	8711	9212	3241	5523	1
sia-jku-prod	11	0	5	0	1231	1744	0179	4044	1068	6472	5964	2644	5502	5066
sia-lin-prod	11.7	8.7	3	0	0	0	0	1020	2022	3664	4161	1,152	1,454	1241	1051	9641	6729
sia-ltu-prod	20	15	5	0	0	0	1413	5978	5613	8117	1289	9311	147
sia-msu-prod	20	15	5	0	0	0	0	0	9963	1118	6543	5194	67
sia-ncsu-prod	12	8.5	3.5	0	0	0	0	1620	1040	1194	2502	3679	1240	1252	3132	1738	17397
sia-nightingale-prod	14.2	10.2	4	0	0	0	0	0	0	1661	1715	4614	8866	9205	0456	0
sia-nmsu-prod	---	0	2560	0	0	0	0	0	0	0	0	31
sia-nova-prod	22	18	4	8474	5998	4195	2705	5081	8916	3923	8178	7815	3171	2618	3324	4519	6891	7
sia-oregon-prod	10	7	3	0	0	0	0	0	5079	9571	7965	8416	0115	9962	25
sia-scr-prod	---	0	0	0	0	0	0	0	0	0	0	0	33
sia-spel-prod	14	10	4	0	0	0	0	0	0	0	0	0	0	0	1192	193
sia-stcu-prod	23	19	4	8185	1106	8726	8855	8393	9391	2917	37
sia-tex-prod	10	6	4	0	0	0	0	0	1606	1407	6703	2004	4015	2085	5119	4108	92
sia-uga-prod	7	5	2	0	0	0	0	0	0	0	0	1555	1349	2250	1322	6476
sia-uom-prod	27	20	7	3688	0442	1238	2101	9218	8832	2726	5195	2022	5336	46
sia-uttyler-prod	15	10	5	0	0	0	0	0	2129	2257	9130	2144	2148	9183	1143	4122	08
sia-amu-uat	---	0	0	0	0	0	0	0	0	0	0	0	200	20
sia-asc-uat	16	12	4	0	0	0	0	1152	1186	0	0	0	0	160
sia-bpu-uat	---	0	0	0	0	0	0	0	0	0	0	0	592	3863	0
sia-gon-uat	15	11	4	0	0	0	8030	2108	0	0	0	0	0	220
sia-gvsu-uat	6	4	2	0	0	0	0	0	0	0	0	0	0	661	0216	8
sia-hu-uat	21	15	6	0	0	0	0	2540	7000	0	0	36
sia-jku-uat	11	0	0	0	0	0	0	4000	0	0	0	4
sia-lin-uat	11.7	8.7	3	0	0	0	7373	1000	0	0	1657	1094	1
sia-mccc-uat	---	0	0	0	0	0	0	0	0	0	0	770	784
sia-msu-uat	20	15	5	0	0	0	0	5550	0120	0	0	72
sia-ncsu-uat	12	8.5	3.5	0	0	1000	0273	4451	0929	9273	8186	9
sia-nightingale-uat	14	10	4	0	0	0	0	0	0	1180	0210	0	0	121
sia-nku-uat	14	10	4	0	0	0	0	0	0	0	1512	7133	2822	325
sia-nova-uat	22	16	6	2015	3144	5419	4604	6135	1226	763
sia-oregon-uat	17	12	5	0	0	0	0	0	4948	2010	0110	1
sia-scr-uat	29	22	7	0	0	0	0	0	0	0	0	0	293	5299	3
sia-spel-uat	14	10	4	0	0	0	0	0	0	0	2541	6822	0	0	426
sia-uga-uat	15	10	5	0	0	0	0	0	0	0	8053	0	0	0	133
sia-uoa-uat	27	20	7	0	0	0	0	0	0	0	0	0	0	213	213
sia-uom-uat	27	20	7	0	0	4000	0	0	0	0	0	0	4
sia-utah-uat	---	0	0	0	0	1100	0	0	0	0	0	0	11
Grand Total		1135	4907	6538	5400	6100	3624	3501	5760	2726	9243	1714	1911	4215	1775	2207	2319	8434`;

async function importData() {
  console.log('🚀 Importing AHT and Monthly Transcript Data...\n');

  try {
    // Use tsx to run the TypeScript module
    const { execSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    // Create a temporary script to handle the import
    const tempScript = `
      import { dataImporter } from './src/lib/database/data-import.js';
      
      const sampleData = \`${sampleData.replace(/`/g, '\\`')}\`;
      
      async function runImport() {
        try {
          console.log('📊 Parsing raw data...');
          const parsedData = dataImporter.parseRawData(sampleData);
          console.log(\`✅ Parsed \${parsedData.length} client records\`);
          
          console.log('\\n📋 Sample parsed data:');
          parsedData.slice(0, 3).forEach(row => {
            console.log(\`  \${row.client}: AHT(\${row.overallAht}/\${row.reviewAht}/\${row.validationAht}) Total: \${row.grandTotal}\`);
          });
          
          console.log('\\n💾 Importing to database...');
          const result = await dataImporter.importData(parsedData);
          
          if (result.success) {
            console.log('\\n🎉 Import completed successfully!');
            console.log('\\n📈 Import Summary:');
            console.log(\`   Clients processed: \${result.clientsProcessed}\`);
            console.log(\`   Monthly records: \${result.monthsProcessed}\`);
            console.log(\`   Total transcripts: \${result.summary.totalTranscripts.toLocaleString()}\`);
            console.log(\`   Date range: \${result.summary.dateRange.start} to \${result.summary.dateRange.end}\`);
            
            if (result.summary.topClients.length > 0) {
              console.log('\\n🏆 Top Clients by Volume:');
              result.summary.topClients.slice(0, 5).forEach((client, i) => {
                console.log(\`   \${i + 1}. \${client.name}: \${client.total.toLocaleString()} transcripts\`);
              });
            }
            
            if (result.errors.length > 0) {
              console.log(\`\\n⚠️  \${result.errors.length} warnings/errors occurred:\`);
              result.errors.slice(0, 5).forEach(error => {
                console.log(\`   - \${error}\`);
              });
            }
            
            console.log('\\n📊 Getting final statistics...');
            const stats = await dataImporter.getImportStats();
            
            console.log('\\n📋 Database Statistics:');
            console.log(\`   Total clients: \${stats.overview.total_clients}\`);
            console.log(\`   Production clients: \${stats.overview.prod_clients}\`);
            console.log(\`   UAT clients: \${stats.overview.uat_clients}\`);
            console.log(\`   Total monthly records: \${stats.overview.total_monthly_records}\`);
            console.log(\`   Total transcripts: \${parseInt(stats.overview.total_transcripts || 0).toLocaleString()}\`);
            console.log(\`   Date range: \${stats.overview.earliest_month} to \${stats.overview.latest_month}\`);
            console.log(\`   Average Overall AHT: \${parseFloat(stats.overview.avg_overall_aht || 0).toFixed(1)}\`);
            console.log(\`   Average Review AHT: \${parseFloat(stats.overview.avg_review_aht || 0).toFixed(1)}\`);
            console.log(\`   Average Validation AHT: \${parseFloat(stats.overview.avg_validation_aht || 0).toFixed(1)}\`);
            
          } else {
            console.log('\\n❌ Import failed!');
            result.errors.forEach(error => {
              console.log(\`   - \${error}\`);
            });
            process.exit(1);
          }
        } catch (error) {
          console.error('Import error:', error);
          process.exit(1);
        }
      }
      
      runImport();
    `;
    
    const tempFile = path.join(__dirname, 'temp-import.mjs');
    fs.writeFileSync(tempFile, tempScript);
    
    // Run with tsx
    execSync(`npx tsx ${tempFile}`, { stdio: 'inherit' });
    
    // Clean up
    fs.unlinkSync(tempFile);

    
  } catch (error) {
    console.error('\n❌ Import script failed:', error);
    process.exit(1);
  }
}

importData();