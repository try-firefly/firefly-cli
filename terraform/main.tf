# CloudWatch metric stream
resource "aws_cloudwatch_metric_stream" "main" {
  name          = "firefly-metric-stream"
  role_arn      = aws_iam_role.firefly_metric_stream.arn             
  firehose_arn  = aws_kinesis_firehose_delivery_stream.firefly.arn
  output_format = "json"

  dynamic "include_filter" {
    for_each = var.namespace_list
    iterator = item

    content {
      namespace = item.value
    }
  }
}

resource "aws_iam_role" "firefly_metric_stream" {
  name = "firefly_metric_stream_role"
  assume_role_policy = data.aws_iam_policy_document.firefly_metric_stream_assume.json
}

data "aws_iam_policy_document" "firefly_metric_stream_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      identifiers = ["streams.metrics.cloudwatch.amazonaws.com"]
      type        = "Service"
    }
  }
}

resource "aws_iam_role_policy" "firefly_metric_stream_firehose" {
  name   = "firehose"
  policy = data.aws_iam_policy_document.firefly_metric_stream_firehose.json
  role   = aws_iam_role.firefly_metric_stream.id
}

data "aws_iam_policy_document" "firefly_metric_stream_firehose" {
  statement {
    actions = [
      "firehose:PutRecord",
      "firehose:PutRecordBatch",
    ]

    resources = [aws_kinesis_firehose_delivery_stream.firefly.arn]
  }
}

# Firehose
resource "aws_kinesis_firehose_delivery_stream" "firefly" {
  name        = "firefly"
  destination = "http_endpoint"

  http_endpoint_configuration {
    url                = var.ingest_endpoint
    name               = "firefly"
    buffering_size     = 1 # MB
    buffering_interval = 60 # seconds
    retry_duration     = 60 # seconds
    role_arn           = aws_iam_role.firefly_firehose.arn
    s3_backup_mode     = "FailedDataOnly"

    processing_configuration {
      enabled = false
    }

    request_configuration {
      content_encoding = "GZIP"
    }

    cloudwatch_logging_options {
      enabled = false
    } 
  }

  s3_configuration {
    bucket_arn      = aws_s3_bucket.firefly_firehose_backup.arn
    buffer_interval = 300 # seconds
    buffer_size     = 5   # MB
    prefix          = "metrics/"
    role_arn        = aws_iam_role.firefly_firehose.arn

    cloudwatch_logging_options {
      enabled = false
    }
  }

  server_side_encryption {
    enabled = false
  }
}

resource "aws_iam_role" "firefly_firehose" {
  name               = "firefly-firehose"
  assume_role_policy = data.aws_iam_policy_document.firefly_firehose_assume.json
}

data "aws_iam_policy_document" "firefly_firehose_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      identifiers = ["firehose.amazonaws.com"]
      type        = "Service"
    }
  }
}

resource "aws_iam_role_policy" "firefly_firehose_s3_backup" {
  name   = "firefly-firehose-s3-backup"
  policy = data.aws_iam_policy_document.firefly_firehose_s3_backup.json
  role   = aws_iam_role.firefly_firehose.id
}

data "aws_iam_policy_document" "firefly_firehose_s3_backup" {
  statement {
    actions = [
      "s3:GetBucketLocation",
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads",
    ]

    resources = [aws_s3_bucket.firefly_firehose_backup.arn]
  }

  statement {
    actions = [
      "s3:AbortMultipartUpload",
      "s3:GetObject",
      "s3:PutObject",
    ]

    resources = ["${aws_s3_bucket.firefly_firehose_backup.arn}/*"]
  }
}

# S3 backup bucket for firehose -- receives undelivered data
resource "aws_s3_bucket" "firefly_firehose_backup" {
  bucket = "firefly-firehose-s3-backup-${data.aws_caller_identity.current.account_id}"
}

## no public access allowed to the backup bucket
resource "aws_s3_bucket_public_access_block" "backup_bucket_no_public_access" {
  bucket = aws_s3_bucket.firefly_firehose_backup.id

  block_public_acls = true
  block_public_policy = true
  restrict_public_buckets = true
  ignore_public_acls = true
}

resource "aws_s3_bucket_lifecycle_configuration" "firefly-s3-configuration" {
  bucket = aws_s3_bucket.firefly_firehose_backup.id

  rule {
    id = "expiration"

    expiration {
      days = var.expiration_days
    }

    status = "Enabled"
  }
}
