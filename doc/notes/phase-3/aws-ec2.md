# AWS EC2 (Elastic Compute Cloud)

**Status:** Research only (not yet built)
**OJT tracker category:** DevOps

## Summary

Amazon Elastic Compute Cloud (Amazon EC2) is a core AWS service that provides secure, resizable compute capacity (virtual machines) in the cloud. It offers high flexibility and control for running workloads compared to managed or serverless options.

## Key Concepts

- **Instances:** Virtual servers in the cloud running your chosen OS.
- **Amazon Machine Images (AMIs):** Templates used to create instances, containing the OS and pre-installed software.
- **Instance Types:** Hardware configurations categorized by use case (e.g., General Purpose, Compute Optimized, Memory Optimized).
- **Amazon Elastic Block Store (EBS):** Persistent, block-level storage volumes attached to instances (acts like an external hard drive).
- **EC2 Instance Store:** Temporary block storage physically attached to the host computer; data is lost if the instance stops.
- **Security Groups:** Virtual firewalls at the instance level that control inbound and outbound traffic.
- **Key Pairs:** Public-key cryptography used to securely log into the instance via SSH or RDP.
- **Auto Scaling:** Automatically adds or removes instances based on defined conditions to handle varying loads.

## Reference / Cheatsheet

### Comparison to Other AWS Compute Services:
- **EC2 vs. Lambda (Serverless):** EC2 gives full control but requires managing OS/servers. Lambda requires no server management, pay per execution, but has less control.
- **EC2 vs. ECS/EKS (Containers):** EC2 runs apps directly on the OS. ECS/EKS orchestrate containers. (Fargate abstracts EC2 away entirely).
- **EC2 vs. Elastic Beanstalk (PaaS):** Beanstalk automates deployment, provisioning, and scaling of applications while managing the underlying EC2 instances for you.
- **EC2 vs. Lightsail (VPS):** Lightsail provides simpler, predictable pricing for small workloads like blogs; EC2 is more configurable for enterprise needs.

## Applied In This Project

Research-only — no build dependency. (Currently exploring how EC2 fits into our broader AWS infrastructure compared to containerized/serverless options).

## Related Notes

- [[aws-vpc]] - EC2 instances are launched within a VPC.
- [[docker]] - Containers (like Docker) are often orchestrated on EC2 (via ECS/EKS) or run directly on it.

## Open Questions / Next Steps

- Determine if the booking system backend will eventually be hosted on raw EC2 instances, or if we will use a containerized deployment (ECS/EKS) or Elastic Beanstalk instead.
