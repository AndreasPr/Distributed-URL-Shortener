resource "aws_cloudwatch_metric_alarm" "errors" {
  alarm_name          = "${var.name}-alb-5xx-rate"
  alarm_description   = "Combined ALB/target 5xx exceed 1 percent for 2 of 3 minutes; not a redirect-only SLO"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 2
  threshold           = 1
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions
  metric_query {
    id          = "rate"
    expression  = "IF((FILL(requests,0)+FILL(alb_errors,0))>0,100*(FILL(target_errors,0)+FILL(alb_errors,0))/(FILL(requests,0)+FILL(alb_errors,0)),0)"
    label       = "5xx percentage"
    return_data = true
  }
  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }
  metric_query {
    id = "target_errors"
    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }
  metric_query {
    id = "alb_errors"
    metric {
      metric_name = "HTTPCode_ELB_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        LoadBalancer = var.alb_arn_suffix
      }
    }
  }
}
resource "aws_cloudwatch_metric_alarm" "latency" {
  alarm_name          = "${var.name}-alb-p95"
  alarm_description   = "ALB target p95 exceeds 500ms; does not distinguish cache hits"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 2
  threshold           = 0.5
  namespace           = "AWS/ApplicationELB"
  metric_name         = "TargetResponseTime"
  extended_statistic  = "p95"
  period              = 60
  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
  treat_missing_data = "notBreaching"
  alarm_actions      = var.alarm_actions
  ok_actions         = var.alarm_actions
}
resource "aws_cloudwatch_metric_alarm" "cpu" {
  for_each            = var.service_names
  alarm_name          = "${var.name}-${each.key}-cpu"
  alarm_description   = "Sustained ECS CPU above 80 percent after scaling"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = 80
  namespace           = "AWS/ECS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = 60
  dimensions = {
    ClusterName = var.cluster_name, ServiceName = each.value
  }
  treat_missing_data = "missing"
  alarm_actions      = var.alarm_actions
  ok_actions         = var.alarm_actions
}
