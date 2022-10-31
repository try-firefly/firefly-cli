variable "aws_region" {
  description = "Enter the AWS region you wish to use. This should be the region in which your Lambda functions reside e.g. us-east-1"
  type = string
}

variable "ingest_endpoint" {
  description = "Provide a HTTPS endpoint to send metric data to e.g. https://example.com"
  type = string
}

variable "expiration_days" {
  description = "How many days would you like to keep failed metric requests in your backup s3 bucket e.g. 90"
  type = number
}

variable "namespace_list" {
  description = "List of namespaces to be included in the metric stream"
  type = list(string)
  default = [
    "AWS/Lambda",
    "AWS/LambdaInsights"
  ]
}