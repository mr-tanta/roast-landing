#!/bin/bash

# Check AWS costs for RoastMyLanding lean architecture
# Run this regularly to monitor spending

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "💰 RoastMyLanding AWS Cost Report"
echo "================================="

# Get current month costs
echo -e "${YELLOW}Current month costs (USD):${NC}"

# Get this month's date range
START_DATE=$(date +%Y-%m-01)
END_DATE=$(date +%Y-%m-%d)

# Get total costs for this month
TOTAL_COST=$(aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
    --output text 2>/dev/null || echo "0.00")

echo "Total month-to-date: $${TOTAL_COST}"

# Get costs by service
echo -e "\n${YELLOW}Breakdown by service:${NC}"

aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE \
    --query 'ResultsByTime[0].Groups[?Total.BlendedCost.Amount!=`0`].[Keys[0], Total.BlendedCost.Amount]' \
    --output table 2>/dev/null | head -20 || echo "Unable to fetch service breakdown"

# Budget check
BUDGET_LIMIT=80.00
if (( $(echo "$TOTAL_COST > $BUDGET_LIMIT" | bc -l) )); then
    echo -e "\n${RED}⚠️  WARNING: Current costs (\$$TOTAL_COST) exceed budget (\$$BUDGET_LIMIT)${NC}"
elif (( $(echo "$TOTAL_COST > $(echo "$BUDGET_LIMIT * 0.8" | bc -l)" | bc -l) )); then
    echo -e "\n${YELLOW}⚠️  CAUTION: Current costs (\$$TOTAL_COST) are at 80% of budget (\$$BUDGET_LIMIT)${NC}"
else
    echo -e "\n${GREEN}✅ Costs (\$$TOTAL_COST) are within budget (\$$BUDGET_LIMIT)${NC}"
fi

# Yesterday's costs
echo -e "\n${YELLOW}Yesterday's costs:${NC}"

YESTERDAY=$(date -d "yesterday" +%Y-%m-%d)
YESTERDAY_END=$(date +%Y-%m-%d)

YESTERDAY_COST=$(aws ce get-cost-and-usage \
    --time-period Start="$YESTERDAY",End="$YESTERDAY_END" \
    --granularity DAILY \
    --metrics BlendedCost \
    --query 'ResultsByTime[0].Total.BlendedCost.Amount' \
    --output text 2>/dev/null || echo "0.00")

echo "Yesterday: $${YESTERDAY_COST}"

# Estimate monthly cost based on daily average
DAYS_ELAPSED=$(date +%d)
if [ "$DAYS_ELAPSED" -gt 1 ]; then
    DAILY_AVG=$(echo "$TOTAL_COST / $DAYS_ELAPSED" | bc -l)
    MONTHLY_ESTIMATE=$(echo "$DAILY_AVG * 30" | bc -l)
    echo -e "\nEstimated monthly total: $$(printf "%.2f" "$MONTHLY_ESTIMATE")"
    
    if (( $(echo "$MONTHLY_ESTIMATE > $BUDGET_LIMIT" | bc -l) )); then
        echo -e "${RED}📈 Projected to exceed budget by: $$(printf "%.2f" "$(echo "$MONTHLY_ESTIMATE - $BUDGET_LIMIT" | bc -l)")${NC}"
    fi
fi

# Top cost drivers
echo -e "\n${YELLOW}Highest cost services this month:${NC}"
aws ce get-cost-and-usage \
    --time-period Start="$START_DATE",End="$END_DATE" \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=DIMENSION,Key=SERVICE \
    --query 'ResultsByTime[0].Groups | sort_by(@, &Total.BlendedCost.Amount) | reverse(@) | [:5].[Keys[0], Total.BlendedCost.Amount]' \
    --output table 2>/dev/null | head -10 || echo "Unable to fetch top services"

# Optimization suggestions
echo -e "\n${YELLOW}💡 Cost optimization tips:${NC}"
echo "1. Use Spot instances for EC2 (save 70%+)"
echo "2. Set up CloudWatch billing alarms"
echo "3. Delete unused S3 objects older than 90 days (lifecycle policy)"
echo "4. Reduce Lambda memory if possible (currently 512MB)"
echo "5. Use shorter CloudWatch log retention"

# Resource check
echo -e "\n${YELLOW}Current resources:${NC}"

# Check EC2 instances
EC2_COUNT=$(aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query 'length(Reservations[*].Instances[*])' --output text 2>/dev/null || echo "0")
echo "Running EC2 instances: $EC2_COUNT"

# Check Lambda functions  
LAMBDA_COUNT=$(aws lambda list-functions --query 'length(Functions[?starts_with(FunctionName, `roastmylanding`)])' --output text 2>/dev/null || echo "0")
echo "Lambda functions: $LAMBDA_COUNT"

# Check DynamoDB tables
DDB_COUNT=$(aws dynamodb list-tables --query 'length(TableNames[?starts_with(@, `roast`)])' --output text 2>/dev/null || echo "0")
echo "DynamoDB tables: $DDB_COUNT"

# Check S3 buckets
S3_COUNT=$(aws s3 ls | grep -c "roastmylanding" || echo "0")
echo "S3 buckets: $S3_COUNT"

echo -e "\n${GREEN}Cost report complete!${NC}"
echo "Run this script daily to monitor costs: ./scripts/check-costs.sh"