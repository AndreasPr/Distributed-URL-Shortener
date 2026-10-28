resource "aws_security_group" "alb" {
  name_prefix = "${var.name}-alb-"
  description = "Public HTTPS only"
  vpc_id      = var.vpc_id
}
resource "aws_vpc_security_group_ingress_rule" "web" {
  for_each          = toset(["443"])
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = tonumber(each.key)
  to_port           = tonumber(each.key)
  description       = "Public HTTPS listener"
}
resource "aws_vpc_security_group_egress_rule" "api" {
  security_group_id            = aws_security_group.alb.id
  referenced_security_group_id = var.application_sg_id
  ip_protocol                  = "tcp"
  from_port                    = 8000
  to_port                      = 8000
  description                  = "ALB to API target only"
}
resource "aws_vpc_security_group_ingress_rule" "api" {
  security_group_id            = var.application_sg_id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 8000
  to_port                      = 8000
  description                  = "API traffic only from ALB"
}
resource "aws_lb" "this" {
  #checkov:skip=CKV_AWS_91:ALB access-log S3 storage is omitted to limit dev costs. CloudWatch request/error/latency metrics remain; enable an encrypted log bucket before production deployment.
  #checkov:skip=CKV2_AWS_28:AWS WAF adds recurring per-ACL/rule/request charges; omitted in this undeployed dev design. Application validation/auth/rate limits do not replace WAF protection.
  #checkov:skip=CKV2_AWS_76:No WAF ACL is purchased in the dev design; attach a reviewed managed-rule ACL before public production traffic.
  name                       = var.name
  internal                   = false
  load_balancer_type         = "application"
  subnets                    = var.subnet_ids
  security_groups            = [aws_security_group.alb.id]
  drop_invalid_header_fields = true
  enable_deletion_protection = true
  desync_mitigation_mode     = "strictest"
}
resource "aws_lb_target_group" "api" {
  name                 = "${var.name}-api"
  vpc_id               = var.vpc_id
  port                 = 8000
  protocol             = "HTTP"
  target_type          = "ip"
  deregistration_delay = 30
  health_check {
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
resource "aws_lb_listener_rule" "private_metrics" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 1
  condition {
    path_pattern {
      values = ["/metrics", "/metrics/*"]
    }
  }
  action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Not available publicly"
      status_code  = "403"
    }
  }
}
