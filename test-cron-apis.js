// 🚀 Test Cron APIs Script
// Run: node test-cron-apis.js

const BASE_URL = 'http://localhost:3000';

async function testCronAPI(endpoint, name) {
    console.log(`\n🧪 Testing ${name}...`);
    console.log(`URL: ${BASE_URL}${endpoint}`);

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        console.log(`Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(data, null, 2));

        if (data.success) {
            console.log(`✅ ${name} - SUCCESS`);
        } else {
            console.log(`❌ ${name} - FAILED: ${data.message}`);
        }

    } catch (error) {
        console.log(`❌ ${name} - ERROR: ${error.message}`);
    }
}

async function runTests() {
    console.log('🚀 Testing Cron API Endpoints');
    console.log('=' .repeat(50));

    // Test Health Check
    console.log('\n🏥 Testing Health Check...');
    try {
        const health = await fetch(`${BASE_URL}/health`);
        const healthData = await health.json();
        console.log(`Health Status: ${health.status}`);
        console.log(`Health Response:`, JSON.stringify(healthData, null, 2));
    } catch (error) {
        console.log(`❌ Health Check failed: ${error.message}`);
        console.log('💡 Make sure API is running: npm run dev');
        return;
    }

    // Test Cron APIs
    await testCronAPI('/citizen/cron/process-pending-reports', 'Process Pending Reports');
    await testCronAPI('/citizen/cron/handle-timeout-attempts', 'Handle Timeout Attempts');

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Testing completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Setup external cron service (see EXTERNAL_CRON_SETUP.md)');
    console.log('2. Configure ENABLE_CRON=true in production');
    console.log('3. Monitor logs for cron job execution');
}

runTests().catch(console.error);
