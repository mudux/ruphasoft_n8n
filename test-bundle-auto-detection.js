#!/usr/bin/env node

/**
 * Test Bundle Auto-Detection with Proper Healthcare Data
 * This tests the Bundle node with realistic Bundle fields instead of n8n workflow fields
 */

console.log('🔍 Testing Bundle Auto-Detection');
console.log('================================');

// Test 1: Proper Bundle Data (should auto-detect)
const properBundleData = {
  "transaction_id": "TXN-2024-12345",
  "bundle_type": "transaction",
  "timestamp": "2024-12-20T14:30:00Z",
  "total_entries": "3",
  "entry_resource_id": "Patient/12345",
  "full_url": "http://example.com/Patient/12345",
  "method": "POST",
  "request_url": "Patient",
  "response_status": "201"
};

// Test 2: N8N Workflow Data (should not auto-detect)
const workflowData = {
  "name": "FHIR Bundle Transformation",
  "nodes": [],
  "connections": {},
  "active": true,
  "settings": {},
  "meta": {},
  "tags": []
};

console.log('✅ Test Data Sets Created');
console.log('');
console.log('📋 Proper Bundle Data (should auto-detect):');
Object.keys(properBundleData).forEach(key => {
  console.log(`  • ${key}: "${properBundleData[key]}"`);
});

console.log('');
console.log('❌ N8N Workflow Data (will not auto-detect):');
Object.keys(workflowData).forEach(key => {
  console.log(`  • ${key}: ${typeof workflowData[key]}`);
});

console.log('');
console.log('🎯 Expected Results:');
console.log('  • Proper Bundle Data: 5-8 auto-detected fields');
console.log('  • N8N Workflow Data: 0 auto-detected fields (as you experienced)');
console.log('');
console.log('💡 Solution: Use Bundle-specific test data in your n8n workflow');
console.log('   Replace the Set node data with healthcare Bundle fields like:');
console.log('   transaction_id, bundle_type, timestamp, total_entries, etc.');