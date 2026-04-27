#!/usr/bin/env python3
"""
Deploy Flan-T5 XL Model to SageMaker Endpoint using JumpStart
"""

import boto3
import sys
from datetime import datetime

# Configuration
ENDPOINT_NAME = "tolling-llm-endpoint"
REGION = "us-east-1"
INSTANCE_TYPE = "ml.t2.medium"

# JumpStart Flan-T5 XL model configuration
MODEL_ID = "huggingface-text2text-flan-t5-xl"
JUMPSTART_BUCKET = "jumpstart-cache-prod-us-east-1"

def get_sagemaker_clients():
    """Initialize SageMaker clients"""
    session = boto3.Session(region_name=REGION)
    sm_client = session.client("sagemaker")
    iam_client = session.client("iam")
    sts_client = session.client("sts")
    return sm_client, iam_client, sts_client

def get_execution_role_arn(iam_client, sts_client):
    """Get the execution role ARN"""
    try:
        # Get current account ID
        account_id = sts_client.get_caller_identity()["Account"]
        role_name = "SageMakerExecutionRole"
        role_arn = f"arn:aws:iam::{account_id}:role/{role_name}"
        
        # Check if role exists
        try:
            iam_client.get_role(RoleName=role_name)
            print(f"✅ Using existing role: {role_arn}")
            return role_arn
        except iam_client.exceptions.NoSuchEntityException:
            print(f"⚠️  Role {role_name} not found. Using direct account ARN.")
            return role_arn
    except Exception as e:
        print(f"❌ Error getting role: {e}")
        return None

def deploy_endpoint():
    """Deploy Flan-T5 XL to SageMaker endpoint using JumpStart"""
    try:
        sm_client, iam_client, sts_client = get_sagemaker_clients()
        
        print("\n" + "="*60)
        print("🚀 Deploying Flan-T5 XL to SageMaker Endpoint")
        print("="*60)
        print(f"Endpoint Name: {ENDPOINT_NAME}")
        print(f"Region: {REGION}")
        print(f"Instance Type: {INSTANCE_TYPE}")
        print("="*60 + "\n")
        
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        model_name = f"flan-t5-xl-{timestamp}"
        config_name = f"flan-t5-config-{timestamp}"
        
        role_arn = get_execution_role_arn(iam_client, sts_client)
        if not role_arn:
            raise Exception("Unable to determine execution role ARN")
        
        # Step 1: Create the model
        print("📦 Step 1: Creating SageMaker model...")
        model_uri = f"s3://{JUMPSTART_BUCKET}/huggingface-text2text/huggingface-text2text-flan-t5-xl-hf.tar.gz"
        
        sm_client.create_model(
            ModelName=model_name,
            PrimaryContainer={
                "Image": "382416733822.dkr.ecr.us-east-1.amazonaws.com/huggingface-text2text:latest",
                "ModelDataUrl": model_uri,
                "Environment": {
                    "HF_MODEL_ID": "google/flan-t5-xl",
                    "HF_TASK": "text2text-generation",
                }
            },
            ExecutionRoleArn=role_arn,
        )
        print(f"   ✅ Model created: {model_name}\n")
        
        # Step 2: Create endpoint configuration
        print("⚙️  Step 2: Creating endpoint configuration...")
        sm_client.create_endpoint_config(
            EndpointConfigName=config_name,
            ProductionVariants=[
                {
                    "VariantName": "primary",
                    "ModelName": model_name,
                    "InitialInstanceCount": 1,
                    "InstanceType": INSTANCE_TYPE,
                }
            ],
        )
        print(f"   ✅ Config created: {config_name}\n")
        
        # Step 3: Create endpoint
        print("🎯 Step 3: Creating SageMaker endpoint...")
        print(f"   (This will take 10-15 minutes...)\n")
        
        sm_client.create_endpoint(
            EndpointName=ENDPOINT_NAME,
            EndpointConfigName=config_name,
        )
        
        print(f"   ✅ Endpoint creation initiated\n")
        print("⏳ Waiting for endpoint to reach 'In Service' status...\n")
        
        # Wait for endpoint to be ready
        waiter = sm_client.get_waiter("endpoint_in_service")
        waiter.wait(
            EndpointName=ENDPOINT_NAME,
            WaiterConfig={
                "Delay": 30,  # Check every 30 seconds
                "MaxAttempts": 40,  # Max 20 minutes
            }
        )
        
        # Get endpoint details
        endpoint_info = sm_client.describe_endpoint(EndpointName=ENDPOINT_NAME)
        status = endpoint_info["EndpointStatus"]
        
        print("\n" + "="*60)
        print("✅ SUCCESS! Endpoint is Ready")
        print("="*60)
        print(f"Endpoint Name: {ENDPOINT_NAME}")
        print(f"Status: {status}")
        print(f"Instance Type: {INSTANCE_TYPE}")
        print("="*60)
        
        print("\n📝 Next Steps:")
        print(f"1. Endpoint is ready to use: {ENDPOINT_NAME}")
        print(f"2. Your .env file already has: SAGEMAKER_ENDPOINT_NAME=tolling-llm-endpoint")
        print(f"3. Restart Docker:")
        print(f"   $ docker-compose down")
        print(f"   $ docker-compose up --build")
        print(f"4. Go to http://localhost:3000/agent and test the Chat Agent!")
        
        return True
        
    except sm_client.exceptions.ValidationException as e:
        if "Cannot create already existing endpoint" in str(e):
            print(f"\n✅ Endpoint already exists: {ENDPOINT_NAME}")
            print("Your .env file is already configured correctly.")
            print("Just restart Docker:")
            print("   $ docker-compose down")
            print("   $ docker-compose up --build")
            return True
        else:
            print(f"\n❌ Validation Error: {e}")
            return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        success = deploy_endpoint()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Deployment cancelled by user")
        sys.exit(1)

