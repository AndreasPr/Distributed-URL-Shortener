# Kubernetes deployment

Use [docs/kubernetes.md](../docs/kubernetes.md) for the supported Kustomize overlays,
Secret/image setup, deployment gates, access, and rollback.
See [diagnosis](../docs/kubernetes-diagnosis.md) and
[verified results](../docs/kubernetes-verification.md) for observed cluster behavior.

The local overlay requires Kafka (KRaft, no ZooKeeper); CI uses Redis Streams.
Frontend runs outside the cluster. Do not apply this directory recursively.
