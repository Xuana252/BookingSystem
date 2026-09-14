# AWS VPC (Virtual Private Cloud)

**Status:** Research only (not yet built)
**OJT tracker category:** DevOps / Architecture

## Summary

AWS VPC (Virtual Private Cloud) allows you to launch AWS resources into a logically isolated virtual network that you define. It is the foundational networking layer for securely hosting applications, databases, and services on AWS.

## Key Concepts

- **VPC & CIDR Blocks:** A VPC is defined by a range of IP addresses (CIDR block) determining what IPs can be assigned to resources inside it.
- **Subnets:** Smaller chunks of the VPC's IP range tied to specific Availability Zones (AZs).
  - **Public Subnet:** Has a route to the internet via an Internet Gateway.
  - **Private Subnet:** No direct internet route; used for secure backend/database hosting.
- **Internet Gateway (IGW):** Allows communication between instances in your VPC (public subnets) and the internet.
- **NAT Gateway:** Placed in a public subnet to allow private subnet resources to fetch outbound internet data (e.g., updates) without allowing inbound connections.
- **Security Groups (SGs):** Instance-level, stateful virtual firewalls controlling inbound and outbound traffic.
- **Network Access Control Lists (NACLs):** Subnet-level, stateless firewalls acting as a secondary defense layer.

## Reference / Cheatsheet

### Standard 2-Tier Architecture Setup
- **Public Subnets (2 AZs):** Contains the Application Load Balancer (ALB) and NAT Gateway.
- **Private Subnets (2 AZs):** Contains App Servers (EC2/ECS) and Databases (RDS).
- **Traffic Flow:**
  - Internet -> ALB (Public Subnet) -> App Server (Private Subnet) -> Database (Private Subnet).
- **Security Group Chaining:**
  - ALB SG: Allow inbound HTTP/HTTPS from `0.0.0.0/0`.
  - App Server SG: Allow inbound from ALB SG *only*.
  - DB SG: Allow inbound from App Server SG *only*.

### Architecture Diagram

```mermaid
graph TD
    Internet((Internet)) --> IGW[Internet Gateway]
    
    subgraph VPC [AWS VPC - 10.0.0.0/16]
        IGW --> ALB
        
        subgraph AZ1 [Availability Zone 1]
            subgraph Public1 [Public Subnet 1]
                ALB[Application Load Balancer]
                NAT1[NAT Gateway 1]
            end
            
            subgraph Private1 [Private Subnet 1]
                App1[App Server 1]
                DB1[(RDS Database Primary)]
            end
        end
        
        subgraph AZ2 [Availability Zone 2]
            subgraph Public2 [Public Subnet 2]
                ALB2[Application Load Balancer]
                NAT2[NAT Gateway 2]
            end
            
            subgraph Private2 [Private Subnet 2]
                App2[App Server 2]
                DB2[(RDS Database Standby)]
            end
        end
        
        ALB --> App1
        ALB2 --> App2
        App1 --> DB1
        App2 --> DB1
        
        App1 -. outbound .-> NAT1
        App2 -. outbound .-> NAT2
        NAT1 -.-> IGW
        NAT2 -.-> IGW
    end
```


## Applied In This Project

- Research-only — no build dependency yet, but serves as architectural reference for future cloud deployment of the Booking System.

## Related Notes

- [[docker]] — Containerized applications would be deployed within the VPC (e.g., via ECS/Fargate).
- [[postgresql_fundamentals]] — The RDS instance would reside in a private subnet.

## Open Questions / Next Steps

- Determine if the project will use Infrastructure as Code (e.g., AWS CDK, Terraform) to provision the VPC.
