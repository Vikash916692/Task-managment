import json
import logging
from typing import Any, Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("taskflow.redis")


class RedisService:
    def __init__(self):
        self.client: Optional[aioredis.Redis] = None
        self._is_connected: bool = False

    async def connect(self):
        if not settings.REDIS_ENABLED:
            logger.info("Redis is disabled in settings.")
            return
        try:
            self.client = aioredis.from_url(
                settings.redis_connection_url,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=2.0,
                socket_connect_timeout=2.0,
            )
            # Test ping
            await self.client.ping()
            self._is_connected = True
            logger.info("Connected to Redis server successfully.")
        except Exception as e:
            self._is_connected = False
            self.client = None
            logger.warning(f"Could not connect to Redis ({e}). Running with cache disabled (direct DB mode).")

    async def disconnect(self):
        if self.client and self._is_connected:
            await self.client.close()
            self._is_connected = False
            logger.info("Disconnected from Redis.")

    @property
    def is_available(self) -> bool:
        return self._is_connected and self.client is not None

    async def get(self, key: str) -> Optional[Any]:
        if not self.is_available:
            return None
        try:
            val = await self.client.get(key)
            if val:
                return json.loads(val)
            return None
        except Exception as e:
            logger.debug(f"Redis get error on {key}: {e}")
            return None

    async def set(self, key: str, value: Any, expire_seconds: int = 120) -> bool:
        if not self.is_available:
            return False
        try:
            serialized = json.dumps(value, default=str)
            await self.client.set(key, serialized, ex=expire_seconds)
            return True
        except Exception as e:
            logger.debug(f"Redis set error on {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        if not self.is_available:
            return False
        try:
            await self.client.delete(key)
            return True
        except Exception as e:
            logger.debug(f"Redis delete error on {key}: {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        if not self.is_available:
            return 0
        try:
            keys = await self.client.keys(pattern)
            if keys:
                return await self.client.delete(*keys)
            return 0
        except Exception as e:
            logger.debug(f"Redis delete_pattern error on {pattern}: {e}")
            return 0


redis_service = RedisService()
