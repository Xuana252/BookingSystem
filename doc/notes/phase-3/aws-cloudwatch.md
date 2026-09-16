# AWS CloudWatch

**Status:** Research only (not yet built)
**OJT tracker category:** DevOps / Architecture

## Summary

Amazon CloudWatch is a comprehensive monitoring and observability service provided by AWS. It allows you to collect and track metrics, monitor log files, and respond to state changes in your AWS resources, providing a unified view of operational health.

## Key Concepts

- **Metrics:** Numerical data points over time representing resource performance (e.g., CPU utilization, network traffic). Custom metrics can also be published.
- **Logs (CloudWatch Logs):** Collection and storage of text records and events from services, allowing for deep analysis and troubleshooting via CloudWatch Logs Insights.
- **Alarms:** Triggers that monitor specific metric thresholds and automatically execute actions (like auto-scaling or sending SNS alerts) when breached.
- **Events (EventBridge):** Tracks state changes in AWS resources to trigger automated workflows.
- **Dashboards:** Customizable visualizations to monitor system health in a single pane of glass.

## Reference / Cheatsheet

- **Core focus:** Unified observability across AWS resources, hybrid setups, and on-premises environments.
- **Pricing:** Pay-as-you-go based on metrics, log ingestion/storage volume, and number of dashboards/alarms. (Generous free tier available for getting started).
- **Common use case:** Set an alarm on EC2 CPU utilization > 80% to trigger an Auto Scaling group to add more instances.

## Applied In This Project

Research only — no build dependency yet.

## Related Notes

- [[aws-ec2]] — CloudWatch is commonly used to monitor metrics (like CPU and network) for EC2 instances.
- [[new-relic]] — Alternative observability platform; useful for comparison when deciding on a monitoring stack.
- [[pagerduty]] — Can be integrated with CloudWatch Alarms to handle incident response and alerting.

## Open Questions / Next Steps

- Determine if CloudWatch is preferred over New Relic for the final monitoring stack of the BookingSystem.
