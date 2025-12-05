import asyncio
import httpx
import time
import random
import logging
from collections import Counter
import statistics
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000/api/v1"
ENDPOINTS = [
    ("/catalog/products", 0.4),
    ("/catalog/categories", 0.2),
    ("/catalog/products/stress-product", 0.1),  # Detail page (Stress Product)
    ("/blog/articles/", 0.2),
    ("/blog/articles/test-article", 0.1) # Detail page (Test Article)
]
CONCURRENCY = 100
DURATION_SECONDS = 30
LOG_FILE = "log_stresstest.log"
RESULT_FILE = "resultat_stress.log"

# Setup logging
file_handler = logging.FileHandler(LOG_FILE, mode='w')
console_handler = logging.StreamHandler(sys.stdout)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S",
    handlers=[file_handler, console_handler]
)
logger = logging.getLogger("stress_test")

async def fetch(client, endpoint):
    start_time = time.time()
    try:
        response = await client.get(f"{BASE_URL}{endpoint}")
        elapsed = time.time() - start_time
        return response.status_code, elapsed
    except Exception as e:
        logger.error(f"Request failed: {e}")
        return 0, time.time() - start_time

async def worker(stop_event, stats):
    async with httpx.AsyncClient(timeout=10.0) as client:
        while not stop_event.is_set():
            # Select endpoint based on weight
            r = random.random()
            cumulative_weight = 0
            selected_endpoint = ENDPOINTS[0][0]
            for endpoint, weight in ENDPOINTS:
                cumulative_weight += weight
                if r <= cumulative_weight:
                    selected_endpoint = endpoint
                    break
            
            status, elapsed = await fetch(client, selected_endpoint)
            stats.append((status, elapsed))

async def monitor(stop_event, stats):
    start_time = time.time()
    while not stop_event.is_set():
        await asyncio.sleep(5)
        current_time = time.time()
        elapsed_total = current_time - start_time
        count = len(stats)
        if count > 0:
            rps = count / elapsed_total
            logger.info(f"Progress: {elapsed_total:.1f}s | Requests: {count} | RPS: {rps:.2f}")

async def main():
    logger.info(f"Starting stress test for {DURATION_SECONDS} seconds with {CONCURRENCY} concurrency")
    logger.info(f"Logs will be saved to {LOG_FILE}")
    logger.info(f"Results will be saved to {RESULT_FILE}")
    
    stop_event = asyncio.Event()
    stats = []
    
    workers = [asyncio.create_task(worker(stop_event, stats)) for _ in range(CONCURRENCY)]
    monitor_task = asyncio.create_task(monitor(stop_event, stats))
    
    await asyncio.sleep(DURATION_SECONDS)
    stop_event.set()
    
    await asyncio.gather(*workers)
    try:
        monitor_task.cancel()
        await monitor_task
    except asyncio.CancelledError:
        pass
    
    # Analysis
    total_requests = len(stats)
    if total_requests == 0:
        logger.warning("No requests completed.")
        return

    status_codes = [s[0] for s in stats]
    times = [s[1] for s in stats]
    
    summary_lines = []
    summary_lines.append("--- Stress Test Results ---")
    summary_lines.append(f"Total Requests: {total_requests}")
    summary_lines.append(f"Duration: {DURATION_SECONDS}s")
    summary_lines.append(f"Average RPS: {total_requests / DURATION_SECONDS:.2f}")
    summary_lines.append(f"Status Codes: {Counter(status_codes)}")
    
    if times:
        summary_lines.append(f"Avg Latency: {statistics.mean(times):.4f}s")
        summary_lines.append(f"Median Latency: {statistics.median(times):.4f}s")
        summary_lines.append(f"P95 Latency: {statistics.quantiles(times, n=20)[18]:.4f}s")
        summary_lines.append(f"Max Latency: {max(times):.4f}s")

    # Log to console/log file
    for line in summary_lines:
        logger.info(line)
        
    # Write to result file
    with open(RESULT_FILE, "w") as f:
        f.write("\n".join(summary_lines) + "\n")
    
    logger.info(f"Results saved to {RESULT_FILE}")

if __name__ == "__main__":
    asyncio.run(main())
