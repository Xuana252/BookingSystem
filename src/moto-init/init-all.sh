#!/bin/sh
set -e

# AWS_ENDPOINT_URL is injected via docker-compose environment
REGION="us-east-1"
ENDPOINT_URL="${AWS_ENDPOINT_URL:-http://moto:5000}"

echo "=== BookingSystem Moto Init ==="

echo "Waiting for Moto at $ENDPOINT_URL..."
for i in $(seq 1 30); do
    if aws sqs list-queues --endpoint-url "$ENDPOINT_URL" --region "$REGION" > /dev/null 2>&1; then
        echo "Moto is ready!"
        break
    fi
    echo "Moto not ready yet (attempt $i/30)..."
    sleep 2
done

# --------------------------------------------------
# 1. SQS: dead-letter queue + main event queue
# --------------------------------------------------
echo "Initializing SQS..."

if aws sqs get-queue-url --queue-name booking-events-dlq --endpoint-url "$ENDPOINT_URL" > /dev/null 2>&1; then
    echo "  [SKIP] booking-events-dlq already exists."
    DLQ_URL=$(aws sqs get-queue-url --queue-name booking-events-dlq --endpoint-url "$ENDPOINT_URL" --query 'QueueUrl' --output text)
else
    echo "  [CREATE] booking-events-dlq..."
    aws sqs create-queue \
        --queue-name booking-events-dlq \
        --attributes '{"ReceiveMessageWaitTimeSeconds":"1","VisibilityTimeout":"30"}' \
        --endpoint-url "$ENDPOINT_URL"
    DLQ_URL=$(aws sqs get-queue-url --queue-name booking-events-dlq --endpoint-url "$ENDPOINT_URL" --query 'QueueUrl' --output text)
fi

DLQ_ARN=$(aws sqs get-queue-attributes \
    --queue-url "$DLQ_URL" \
    --attribute-names QueueArn \
    --query 'Attributes.QueueArn' \
    --output text \
    --endpoint-url "$ENDPOINT_URL")
echo "  DLQ ARN: $DLQ_ARN"

if aws sqs get-queue-url --queue-name booking-events-queue --endpoint-url "$ENDPOINT_URL" > /dev/null 2>&1; then
    echo "  [SKIP] booking-events-queue already exists."
else
    echo "  [CREATE] booking-events-queue..."
    aws sqs create-queue \
        --queue-name booking-events-queue \
        --attributes "{\"VisibilityTimeout\":\"30\",\"ReceiveMessageWaitTimeSeconds\":\"5\",\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}" \
        --endpoint-url "$ENDPOINT_URL"
fi
QUEUE_URL=$(aws sqs get-queue-url --queue-name booking-events-queue --endpoint-url "$ENDPOINT_URL" --query 'QueueUrl' --output text)
QUEUE_ARN=$(aws sqs get-queue-attributes \
    --queue-url "$QUEUE_URL" \
    --attribute-names QueueArn \
    --query 'Attributes.QueueArn' \
    --output text \
    --endpoint-url "$ENDPOINT_URL")

# --------------------------------------------------
# 2. SNS: topic + subscribe the queue
# --------------------------------------------------
echo "Initializing SNS..."
TOPIC_ARN=$(aws sns list-topics \
    --query "Topics[?ends_with(TopicArn, ':booking-events')].TopicArn" \
    --output text \
    --endpoint-url "$ENDPOINT_URL")

if [ -n "$TOPIC_ARN" ] && [ "$TOPIC_ARN" != "None" ]; then
    echo "  [SKIP] booking-events topic already exists: $TOPIC_ARN"
else
    echo "  [CREATE] booking-events topic..."
    TOPIC_ARN=$(aws sns create-topic \
        --name booking-events \
        --query TopicArn \
        --output text \
        --endpoint-url "$ENDPOINT_URL")
    echo "  Topic ARN: $TOPIC_ARN"

    sleep 1

    echo "  Subscribing booking-events-queue to booking-events..."
    aws sns subscribe \
        --topic-arn "$TOPIC_ARN" \
        --protocol sqs \
        --notification-endpoint "$QUEUE_ARN" \
        --endpoint-url "$ENDPOINT_URL"
fi

echo "=== Moto Init Complete ==="
exit 0
