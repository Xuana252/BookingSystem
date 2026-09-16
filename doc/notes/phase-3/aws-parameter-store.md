# AWS Systems Manager Parameter Store

**Status:** Research only (not yet built)
**OJT tracker category:** DevOps

## Summary

AWS Systems Manager Parameter Store is a managed service that provides secure, hierarchical storage for configuration data management and secrets management. It allows you to store data such as database strings, API keys, and configuration variables, with built-in encryption using AWS KMS and granular access control via IAM.

## Key Concepts

*   **Hierarchical Structure:** Organize parameters into hierarchies using forward slashes (e.g., `/BookingSystem/prod/db-password`).
*   **Parameter Types:**
    *   **String:** Plain text for standard configuration data.
    *   **StringList:** A comma-separated list of values.
    *   **SecureString:** Sensitive data that needs to be encrypted via KMS.
*   **Access Control:** Use IAM policies to restrict who/what can read or write specific parameters based on their hierarchy.
*   **Version Control:** Parameters are automatically versioned upon updates.
*   **Tiers:**
    *   **Standard:** Free, max 4 KB, up to 10k parameters per region.
    *   **Advanced:** Paid, max 8 KB, up to 100k parameters per region, supports parameter policies and cross-account sharing.
*   **Compared to Secrets Manager:** Parameter Store is cost-effective and suited for config/static secrets, whereas Secrets Manager is for highly sensitive credentials requiring automatic rotation.

## Reference / Cheatsheet

### AWS CLI Commands

**Create a plain string parameter:**
```bash
aws ssm put-parameter --name "/myapp/dev/db-url" --value "db.example.com" --type "String"
```

**Create a secure string parameter (encrypted):**
```bash
aws ssm put-parameter --name "/myapp/prod/db-password" --value "secret123" --type "SecureString"
```

**Get a parameter value:**
```bash
aws ssm get-parameter --name "/myapp/dev/db-url" --with-decryption
```

**Get parameters by path (hierarchy):**
```bash
aws ssm get-parameters-by-path --path "/myapp/prod/" --recursive --with-decryption
```

## Applied In This Project

Research-only — no build dependency. This can be used for centralized configuration and secret management for the backend services if deployed to AWS.

## Related Notes

* [[aws-ec2]] — EC2 instances can retrieve configuration data from Parameter Store.
* [[aws-cloudwatch]] — EventBridge can trigger actions based on Parameter Store changes (Advanced tier).
* [[aws-vpc]] — Applications within the VPC might securely access Parameter Store via VPC endpoints.

## Open Questions / Next Steps

* Determine if we should migrate existing hardcoded configurations or environment variables to Parameter Store when deploying the Booking System.
