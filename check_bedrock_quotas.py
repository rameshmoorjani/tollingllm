#!/usr/bin/env python3

import boto3
import json
from datetime import datetime

# Initialize Bedrock client
bedrock = boto3.client('bedrock', region_name='us-east-1')
service_quotas = boto3.client('service-quotas', region_name='us-east-1')

print("=" * 80)
print("🔍 BEDROCK QUOTAS & RESOURCE UTILIZATION CHECK")
print("=" * 80)

try:
    # Check Bedrock models
    print("\n📊 Available Bedrock Models:")
    models = bedrock.list_foundation_models()
    
    for model in models['modelSummaries'][:5]:  # Show first 5
        print(f"  ✓ {model['modelId']}")
    
    print(f"\n  Total available: {len(models['modelSummaries'])} models")
    
except Exception as e:
    print(f"❌ Error listing models: {e}")

try:
    # Check quota for Bedrock on-demand throughput
    print("\n📈 Bedrock Service Quotas:")
    
    quotas = service_quotas.list_service_quotas(ServiceCode='bedrock')
    
    bedrock_quotas = {q['QuotaName']: q for q in quotas.get('Quotas', [])}
    
    if bedrock_quotas:
        for name, quota in list(bedrock_quotas.items())[:10]:
            used = quota.get('UsageMetric', {}).get('MetricValue', 0)
            limit = quota.get('Value', 'N/A')
            status = "✓" if (isinstance(limit, (int, float)) and used < limit) else "⚠️"
            print(f"  {status} {name}: {used}/{limit}")
    else:
        print("  No Bedrock quotas found - may not be enabled in this region")
    
except Exception as e:
    print(f"⚠️ Note: Could not check quotas: {e}")
    print("  This is normal if Service Quotas API is not enabled")

print("\n" + "=" * 80)
print("💡 RECOMMENDATIONS:")
print("=" * 80)
print("""
1. Check AWS Console → Service Quotas → Bedrock
   - Look for models you're using (e.g., meta.llama3-8b-instruct-v1:0)
   - Check if any usage is approaching limits
   
2. To increase quotas:
   - Go to AWS Service Quotas console
   - Find Bedrock service
   - Select the quota you want to increase
   - Click "Request quota increase"
   - Set desired value and submit
   
3. Temporary fixes:
   - Reduce batch sizes (fewer transactions per prompt)
   - Add request throttling on frontend
   - Use smaller model (meta.llama3-8b-instruct-v1:0) instead of 70b
   - Limit transaction history window
""")
print("=" * 80)
