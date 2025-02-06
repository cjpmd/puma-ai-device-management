
# GPU-Enabled Video Processing Server

This server provides video processing capabilities using GPU acceleration for player tracking and analysis.

## Prerequisites

- Docker
- NVIDIA Container Toolkit
- NVIDIA GPU with CUDA support

## Setup Instructions

1. Install NVIDIA Container Toolkit:
```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker
```

2. Build and run the container:
```bash
docker-compose up --build
```

## Usage

The server will be available at `http://localhost:8000`.

## Environment Variables

- `NVIDIA_VISIBLE_DEVICES`: Controls which GPUs are visible to the container
