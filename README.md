This project implements multiple load balancing algorithms including Round Robin, FIFO, and Weighted Round Robin using NodeJS. It includes rate limiting and health checks for backend servers.

## Design Choices

1. **Load Balancers**:

   - **Round Robin Load Balancer**: Distributes incoming requests sequentially to backend servers.
   - **FIFO Load Balancer**: Uses a first-in, first-out approach to handle requests in a queue.
   - **Weighted Round Robin Load Balancer**: Distributes requests based on server weights to balance the load more effectively.

2. **Health Checks**:

   - Each load balancer performs periodic health checks on backend servers to ensure they are available and healthy.
   - If a server is found to be unhealthy, it is temporarily removed from the pool of servers to which requests are distributed.

3. **Rate Limiting**:
   - Implemented rate limiting using the `express-rate-limit` library to prevent abuse and ensure fair usage. Each IP is limited to 10 requests per 2 minutes.

## Setup Instructions

### Prerequisites

- Node.js installed on your machine.
- npm (Node Package Manager).

## Installation

### Clone the repository:

```sh
git clone https://github.com/HimanshuRahul/wasserstoff-BackendTask
```

```
cd load-balancer-project
```

### Install the dependencies:

```
npm install
```

### To run the whole repository in one go

npm start at the root of the directory and it will start the project on http://localhost:3000

```
npm start
```

Below are the end-points for respective load-balancers

Round Robin Load Balancer: http://localhost:3000/load-balancer

FIFO Load Balancer: http://localhost:3000/fifo-load-balancer

Weighted Round Robin Load Balancer: http://localhost:3000/weight-load-balancer

### Health Checks

Health checks are performed every 10 seconds to ensure that backend servers are healthy. If a server is found to be unhealthy, it will be excluded from the pool of available servers until it is healthy again.

### Logs

Each load balancer generates logs using the winston library:

Round Robin Load Balancer: loadBalancer.log

FIFO Load Balancer: fifoLoadBalancer.log

Weighted Round Robin Load Balancer: weightLoadBalancer.log

These logs include information about incoming requests, selected servers, and any errors that occur.

### Rate Limiting

Rate limiting is configured to allow a maximum of 10 requests per IP per 2 minutes. This is to prevent abuse and ensure fair usage across users.

### Deployment

The project is deployed on Render.Below are the links for all the load balancer:

Round Robin Load Balancer: https://wasserstoff-backendtask-znc1.onrender.com/load-balancer

FIFO Load Balancer: https://wasserstoff-backendtask-znc1.onrender.com/fifo-load-balancer

Weighted Round Robin Load Balancer: https://wasserstoff-backendtask-znc1.onrender.com/weight-load-balancer

### Conclusion

This project showcases a robust implementation of load balancing algorithms with additional features such as rate limiting and health checks. The documentation provides clear instructions on setup and usage, ensuring ease of deployment and testing.
