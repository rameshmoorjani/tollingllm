# EC2 Management Utilities

## Connect to Instance
function Connect-ToInstance {
    param(
        [string]$InstanceId,
        [string]$KeyPairPath = "tolling-llm-key.pem"
    )
    
    $ip = aws ec2 describe-instances --instance-ids $InstanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
    ssh -i $KeyPairPath "ec2-user@$ip"
}

## Get Instance Status
function Get-InstanceStatus {
    param([string]$InstanceId)
    
    aws ec2 describe-instances --instance-ids $InstanceId --query 'Reservations[0].Instances[0].[InstanceId,State.Name,PublicIpAddress]' --output table
}

## View Application Logs
function Get-AppLogs {
    param(
        [string]$InstanceId,
        [string]$KeyPairPath = "tolling-llm-key.pem",
        [string]$Service = "all"  # all, backend, mongodb, nginx
    )
    
    $ip = aws ec2 describe-instances --instance-ids $InstanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
    
    if ($Service -eq "all") {
        ssh -i $KeyPairPath "ec2-user@$ip" "cd /opt/tolling-llm && docker-compose logs --tail=100"
    } else {
        ssh -i $KeyPairPath "ec2-user@$ip" "cd /opt/tolling-llm && docker-compose logs --tail=100 $Service"
    }
}

## Restart Application
function Restart-Application {
    param(
        [string]$InstanceId,
        [string]$KeyPairPath = "tolling-llm-key.pem"
    )
    
    $ip = aws ec2 describe-instances --instance-ids $InstanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
    ssh -i $KeyPairPath "ec2-user@$ip" "cd /opt/tolling-llm && docker-compose restart"
}

## Update and Redeploy
function Update-Application {
    param(
        [string]$InstanceId,
        [string]$KeyPairPath = "tolling-llm-key.pem"
    )
    
    $ip = aws ec2 describe-instances --instance-ids $InstanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
    
    Write-Host "Connecting to instance..." -ForegroundColor Yellow
    ssh -i $KeyPairPath "ec2-user@$ip" @"
        set -e
        cd /opt/tolling-llm
        echo "Pulling latest code..."
        git pull
        echo "Pulling latest Docker images..."
        docker-compose pull
        echo "Restarting services..."
        docker-compose up -d
        echo "Waiting for services to start..."
        sleep 10
        docker-compose ps
        echo "✓ Update complete!"
"@
}

## Stop Application
function Stop-Application {
    param(
        [string]$InstanceId,
        [string]$KeyPairPath = "tolling-llm-key.pem"
    )
    
    $ip = aws ec2 describe-instances --instance-ids $InstanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
    ssh -i $KeyPairPath "ec2-user@$ip" "cd /opt/tolling-llm && docker-compose down"
}

## Get Application URLs
function Get-ApplicationURLs {
    param([string]$InstanceId)
    
    $ip = aws ec2 describe-instances --instance-ids $InstanceId --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
    
    Write-Host "TollingLLM Application URLs:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Frontend (React):  http://$ip:3000" -ForegroundColor Green
    Write-Host "Backend API:       http://$ip:5000" -ForegroundColor Green
    Write-Host "Health Check:      http://$ip:5000/api/health" -ForegroundColor Green
    Write-Host ""
}

# Export functions
Export-ModuleMember -Function Connect-ToInstance, Get-InstanceStatus, Get-AppLogs, Restart-Application, Update-Application, Stop-Application, Get-ApplicationURLs
