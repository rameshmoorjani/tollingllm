#!/usr/bin/env python3
"""
Simple script to deploy Hugging Face Flan-T5 XL to SageMaker endpoint
Uses pre-authorized containers to avoid IAM issues
"""

import boto3
import time

def deploy_huggingface_endpoint():
    """Deploy Flan-T5 XL from Hugging Face"""
    
    region = "us-east-1"
    endpoint_name = "tolling-llm-endpoint"
    
    sm = boto3.client("sagemaker", region_name=region)
    
    print("\n" + "="*60)
    print("🚀 Deploying Flan-T5 XL to SageMaker")
    print("="*60)
    
    # Check if endpoint already exists
    try:
        response = sm.describe_endpoint(EndpointName=endpoint_name)
        print(f"\n✅ Endpoint already exists!")
        print(f"   Name: {endpoint_name}")
        print(f"   Status: {response['EndpointStatus']}")
        return True
    except sm.exceptions.ValidationException:
        print(f"Creating new endpoint: {endpoint_name}\n")
    
    timestamp = int(time.time())
    model_name = f"flan-t5-xl-{timestamp}"
    config_name = f"flan-t5-config-{timestamp}"
    
    try:
        # Step 1: Create Model
        print("📦 Step 1: Creating model...")
        sm.create_model(
            ModelName=model_name,
            PrimaryContainer={
                "Image": "763104330519.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-inference:2.0.0-transformers4.26.0-gpu-py310-cu118-ubuntu20.04",
                "ModelDataUrl": "s3://sagemaker-us-east-1-471112715502/huggingface-pytorch-inference/model.tar.gz",
                "Environment": {
                    "HF_MODEL_ID": "google/flan-t5-xl",
                    "HF_TASK": "text2text-generation",
                }
            },
            ExecutionRoleArn="arn:aws:iam::1057266922206:role/SageMakerRole",
        )
        print(f"   ✅ Model created: {model_name}\n")
        
        # Step 2: Create Endpoint Config
        print("⚙️  Step 2: Creating endpoint configuration...")
        sm.create_endpoint_config(
            EndpointConfigName=config_name,
            ProductionVariants=[
                {
                    "VariantName": "primary",
                    "ModelName": model_name,
                    "InitialInstanceCount": 1,
                    "InstanceType": "ml.t2.medium",
                }
            ],
        )
        print(f"   ✅ Config created: {config_name}\n")
        
        # Step 3: Create Endpoint
        print("🎯 Step 3: Creating endpoint...")
        print("   (This takes 10-15 minutes...)\n")
        
        sm.create_endpoint(
            EndpointName=endpoint_name,
            EndpointConfigName=config_name,
        )
        
        # Step 4: Wait for endpoint
        print("⏳ Waiting for endpoint to be ready...")
        waiter = sm.get_waiter("endpoint_in_service")
        waiter.wait(
            EndpointName=endpoint_name,
            WaiterConfig={"Delay": 30, "MaxAttempts": 40}
        )
        
        print("\n" + "="*60)
        print("✅ SUCCESS!")
        print("="*60)
        print(f"Endpoint: {endpoint_name}")
        print(f"Region: {region}")
        print(f"Status: In Service\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = deploy_huggingface_endpoint()
    exit(0 if success else 1)
