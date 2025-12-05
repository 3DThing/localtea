import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine
from backend.models.cart import Cart

async def main():
    query = select(Cart)
    try:
        if query:
            print("Query is truthy")
        else:
            print("Query is falsy")
    except TypeError as e:
        print(f"Caught expected error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
