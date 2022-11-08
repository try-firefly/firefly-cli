variable "aws_region" {
  description = "AWS region"
  type = string
}

variable "ingest_endpoint" {
  description = "HTTPS endpoint"
  type = string
}

variable "expiration_days" {
  description = "Number of days to keep metric data in backup S3 bucket"
  type = number
}

variable "namespace_list" {
  description = "List of namespaces to be included in the metric stream"
  type = list(string)
  default = [
    "AWS/Lambda",
    "LambdaInsights"
  ]
}
