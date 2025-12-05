import asyncio
import httpx
import time
import statistics
from collections import Counter

# Configuration
URL = "http://127.0.0.1:8000/api/v1/catalog/products"
TOTAL_REQUESTS = 1000
CONCURRENCY = 50

async def fetch(client):
    start_time = time.time()
    try:
        response = await client.get(URL)
        elapsed = time.time() - start_time
        return response.status_code, elapsed
    except Exception as e:
        return "Error", time.time() - start_time

async def worker(queue, results):
    async with httpx.AsyncClient() as client:
        while True:
            try:
                _ = queue.get_nowait()
            except asyncio.QueueEmpty:
                break
            
            status, elapsed = await fetch(client)
            results.append((status, elapsed))
            queue.task_done()

async def main():
    print(f"Starting load test on {URL}")
    print(f"Total requests: {TOTAL_REQUESTS}")
    print(f"Concurrency: {CONCURRENCY}")
    
    queue = asyncio.Queue()
    for _ in range(TOTAL_REQUESTS):
        queue.put_nowait(_)
    
    results = []
    start_total = time.time()
    
    tasks = []
    for _ in range(CONCURRENCY):
        task = asyncio.create_task(worker(queue, results))
        tasks.append(task)
    
    await asyncio.gather(*tasks)
    
    total_time = time.time() - start_total
    
    # Analyze results
    status_codes = [r[0] for r in results]
    times = [r[1] for r in results]
    
    print("\n--- Results ---")
    print(f"Total time: {total_time:.2f} seconds")
    print(f"Requests per second: {TOTAL_REQUESTS / total_time:.2f}")
    print(f"Status codes: {Counter(status_codes)}")
    
    if times:
        print(f"Average response time: {statistics.mean(times):.4f}s")
        print(f"Median response time: {statistics.median(times):.4f}s")
        print(f"Min response time: {min(times):.4f}s")
        print(f"Max response time: {max(times):.4f}s")
        print(f"P95 response time: {statistics.quantiles(times, n=20)[18]:.4f}s")

if __name__ == "__main__":
    asyncio.run(main())
