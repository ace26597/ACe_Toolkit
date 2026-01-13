"""
Multi-model AI provider abstraction for OpenAI and Anthropic APIs.

This module provides a unified interface for interacting with different AI providers,
enabling seamless switching between OpenAI GPT-4o and Anthropic Claude models.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any, AsyncIterator
from dataclasses import dataclass
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
import base64
import logging

logger = logging.getLogger(__name__)


@dataclass
class ModelConfig:
    """User-selected model configuration"""
    provider: str  # "openai" | "anthropic"
    model_name: str  # "gpt-4o" | "claude-sonnet-4-20250514"


@dataclass
class AIResponse:
    """Standardized response across providers"""
    content: str
    tool_calls: Optional[List[Dict]] = None
    stop_reason: str = "end_turn"
    tokens_used: int = 0


class AIProvider(ABC):
    """Abstract base class for multi-model support"""

    @abstractmethod
    async def chat(
        self,
        messages: List[Dict],
        tools: Optional[List[Dict]] = None,
        stream: bool = False,
        max_tokens: int = 4096
    ) -> AIResponse | AsyncIterator[str]:
        """
        Send chat request with optional tool calling

        Args:
            messages: List of message dicts with 'role' and 'content'
            tools: Optional list of tool schemas
            stream: Whether to stream the response
            max_tokens: Maximum tokens to generate

        Returns:
            AIResponse object or AsyncIterator for streaming
        """
        pass

    @abstractmethod
    async def vision(
        self,
        image_data: bytes,
        prompt: str
    ) -> str:
        """
        Analyze image using AI vision

        Args:
            image_data: Raw image bytes
            prompt: Analysis prompt

        Returns:
            Extracted text/description
        """
        pass


class OpenAIProvider(AIProvider):
    """OpenAI GPT-4o implementation"""

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model
        logger.info(f"Initialized OpenAI provider with model: {model}")

    async def chat(
        self,
        messages: List[Dict],
        tools: Optional[List[Dict]] = None,
        stream: bool = False,
        max_tokens: int = 4096
    ) -> AIResponse:
        """Call OpenAI Chat Completions API"""

        try:
            # Convert messages to OpenAI format
            openai_messages = self._convert_messages(messages)

            # Prepare request parameters
            request_params = {
                "model": self.model,
                "messages": openai_messages,
                "max_tokens": max_tokens
            }

            # Add tools if provided
            if tools:
                request_params["tools"] = self._convert_tools_to_openai(tools)
                request_params["tool_choice"] = "auto"

            # Make API call
            response = await self.client.chat.completions.create(**request_params)

            # Extract response
            message = response.choices[0].message
            content = message.content or ""

            # Extract tool calls if any
            tool_calls = None
            if message.tool_calls:
                tool_calls = [
                    {
                        "id": tc.id,
                        "name": tc.function.name,
                        "input": eval(tc.function.arguments)  # Parse JSON string
                    }
                    for tc in message.tool_calls
                ]

            return AIResponse(
                content=content,
                tool_calls=tool_calls,
                stop_reason=response.choices[0].finish_reason,
                tokens_used=response.usage.total_tokens if response.usage else 0
            )

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise

    async def vision(self, image_data: bytes, prompt: str) -> str:
        """Use GPT-4o vision API to analyze images"""

        try:
            # Base64 encode image
            base64_image = base64.b64encode(image_data).decode('utf-8')

            # Determine image type (assume PNG, could be improved)
            image_type = "image/png"
            if image_data[:4] == b'\xff\xd8\xff':
                image_type = "image/jpeg"

            # Create vision message
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{image_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ]

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=1024
            )

            return response.choices[0].message.content or ""

        except Exception as e:
            logger.error(f"OpenAI vision API error: {e}")
            raise

    def _convert_messages(self, messages: List[Dict]) -> List[Dict]:
        """Convert standard messages to OpenAI format"""
        return messages  # Already in correct format

    def _convert_tools_to_openai(self, tools: List[Dict]) -> List[Dict]:
        """Convert tool schemas to OpenAI format"""
        openai_tools = []
        for tool in tools:
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool.get("input_schema", {})
                }
            })
        return openai_tools


class AnthropicProvider(AIProvider):
    """Anthropic Claude implementation"""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model
        logger.info(f"Initialized Anthropic provider with model: {model}")

    async def chat(
        self,
        messages: List[Dict],
        tools: Optional[List[Dict]] = None,
        stream: bool = False,
        max_tokens: int = 4096
    ) -> AIResponse:
        """Call Anthropic Messages API"""

        try:
            # Convert messages to Anthropic format
            anthropic_messages = self._convert_messages(messages)

            # Prepare request parameters
            request_params = {
                "model": self.model,
                "max_tokens": max_tokens,
                "messages": anthropic_messages
            }

            # Add tools if provided
            if tools:
                request_params["tools"] = tools  # Already in Anthropic format

            # Make API call
            response = await self.client.messages.create(**request_params)

            # Extract text content
            content_blocks = response.content
            text_content = ""
            tool_calls = []

            for block in content_blocks:
                if block.type == "text":
                    text_content += block.text
                elif block.type == "tool_use":
                    tool_calls.append({
                        "id": block.id,
                        "name": block.name,
                        "input": block.input
                    })

            return AIResponse(
                content=text_content,
                tool_calls=tool_calls if tool_calls else None,
                stop_reason=response.stop_reason,
                tokens_used=response.usage.input_tokens + response.usage.output_tokens
            )

        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise

    async def vision(self, image_data: bytes, prompt: str) -> str:
        """Use Claude vision to analyze images"""

        try:
            # Base64 encode image
            base64_image = base64.b64encode(image_data).decode('utf-8')

            # Determine media type
            media_type = "image/png"
            if image_data[:4] == b'\xff\xd8\xff':
                media_type = "image/jpeg"

            # Create vision message
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64_image
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]

            response = await self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=messages
            )

            # Extract text from response
            text = ""
            for block in response.content:
                if block.type == "text":
                    text += block.text

            return text

        except Exception as e:
            logger.error(f"Anthropic vision API error: {e}")
            raise

    def _convert_messages(self, messages: List[Dict]) -> List[Dict]:
        """Convert standard messages to Anthropic format"""
        # Anthropic uses the same format, but we need to ensure tool results are properly formatted
        return messages


def get_ai_provider(provider: str, model: str, api_keys: Dict[str, str]) -> AIProvider:
    """
    Factory function to create appropriate AI provider instance

    Args:
        provider: "openai" or "anthropic"
        model: Model name to use
        api_keys: Dictionary with 'openai' and 'anthropic' keys

    Returns:
        AIProvider instance

    Raises:
        ValueError: If provider is unknown
    """
    if provider == "openai":
        return OpenAIProvider(api_keys["openai"], model)
    elif provider == "anthropic":
        return AnthropicProvider(api_keys["anthropic"], model)
    else:
        raise ValueError(f"Unknown provider: {provider}. Must be 'openai' or 'anthropic'")
